/**
 * SimulaUNA - SCORING
 * ============================================
 * getExam / submitExam: arma la sesion de examen, guarda la clave de
 * respuestas SOLO en el servidor (CacheService + fila espejo en
 * CORE.sesiones) y califica con el motor configurado en config_escala
 * (suma_ponderada | decimas | vector_canal), segun contrato §3.
 *
 * Endurecimiento (fase 1):
 * - CORE.sesiones guarda solo lo necesario para calificar (ids + clave
 *   compacta + metadatos), nunca el examen con justificaciones. Las filas
 *   antiguas (payload completo con answerKey) se siguen leyendo igual.
 * - submitExam es IDEMPOTENTE: si el mismo examSessionId ya se calificó,
 *   devuelve el MISMO resultado guardado (no duplica historial ni cuenta
 *   otro intento). Si la sesión se creó con dni, rechaza otro dni.
 * - Sesiones de más de EXAM_SESSION_MAX_AGE_HOURS_ se rechazan.
 * - purgarSesionesAntiguas() + instalarTriggerPurga(): borra sesiones de
 *   más de EXAM_SESSION_PURGE_DAYS_ días (trigger diario).
 * - Coherencia de puntajes: la sesión guarda la `escala` y el
 *   `subjectsPlan` (validados por config_guard.gs) con que se armó el
 *   examen, y submitExam califica SIEMPRE con ese plan guardado, aunque la
 *   hoja de configuración cambie (o se rompa) entre getExam y submitExam.
 */

const EXAM_SESSION_TTL_SECONDS_ = 21600; // 6 horas (cache)
const EXAM_SESSION_MAX_AGE_HOURS_ = 12;
const EXAM_SESSION_PURGE_DAYS_ = 7;
const SESIONES_CELL_MAX_CHARS_ = 49000; // límite de celda de Sheets: 50.000
const SESIONES_HEADERS_ = ['exam_session_id', 'universidad', 'division', 'proceso', 'payload_json', 'creado',
  'dni', 'estado', 'resultado_json', 'calificado'];

// ============================================
// getExam
// ============================================

/**
 * Arma un examen para `division`/`proceso` (+ `semana` opcional), genera
 * un examSessionId y guarda la clave de respuestas en el servidor. Las
 * preguntas devueltas al cliente NO llevan correctAnswer ni justification.
 * `dni` (opcional): si viene, la sesión queda ligada a ese dni.
 */
function getExamForTenant(tenant, division, proceso, semana, dni) {
  if (!division) throw publicError_('Parámetro "division" requerido');

  const procesoNorm = (proceso || 'ORDINARIO').toUpperCase();
  const pool = buildExamPoolForTenant(tenant, division, procesoNorm, semana);

  if (!pool.questions || pool.questions.length === 0) {
    throw publicError_(`No hay preguntas disponibles para "${division}" (proceso ${procesoNorm})`);
  }

  const escala = tenant.layout === 'legacy'
    ? UNA_ESCALA_ORDINARIO_
    : v2ReadConfigEscala_(tenant, procesoNorm); // mismo snapshot validado que el pool (memo)

  const examSessionId = Utilities.getUuid();

  const answerKey = {};
  pool.questions.forEach(function (q) {
    answerKey[q.id] = {
      correctAnswer: q.correctAnswer,
      subject: q.subject,
      justification: q.justification || null
    };
  });

  const sessionPayload = {
    examSessionId: examSessionId,
    universidad: tenant.codigo,
    division: division,
    proceso: procesoNorm,
    escala: escala,
    subjectsPlan: pool.subjectsPlan,
    dni: dni ? String(dni).trim() : '',
    answerKey: answerKey,
    createdAt: new Date().toISOString()
  };

  putExamSessionCache_(sessionPayload);
  saveExamSessionMirror_(sessionPayload);

  const questionsForClient = pool.questions.map(function (q) {
    const copy = Object.assign({}, q);
    delete copy.correctAnswer;
    delete copy.justification;
    return copy;
  });

  return {
    examSessionId: examSessionId,
    universidad: tenant.codigo,
    division: division,
    proceso: procesoNorm,
    escala: escala,
    questions: questionsForClient
  };
}

// ============================================
// FORMATO COMPACTO DE SESIÓN (CORE.sesiones / fallback de cache)
// ============================================

/**
 * Versión compacta de la sesión: solo lo necesario para calificar.
 * `k[questionId] = [correctAnswer, índiceDeAsignatura]`, `subjects` = nombres.
 * Sin justificaciones ni textos de preguntas.
 */
function compactSessionPayload_(p) {
  const subjects = [];
  const subjIdx = {};
  const k = {};
  Object.keys(p.answerKey || {}).forEach(function (qid) {
    const key = p.answerKey[qid];
    if (subjIdx[key.subject] === undefined) {
      subjIdx[key.subject] = subjects.length;
      subjects.push(key.subject);
    }
    k[qid] = [key.correctAnswer, subjIdx[key.subject]];
  });
  return {
    v: 2,
    examSessionId: p.examSessionId,
    universidad: p.universidad,
    division: p.division,
    proceso: p.proceso,
    escala: p.escala,
    subjectsPlan: p.subjectsPlan,
    dni: p.dni || '',
    createdAt: p.createdAt,
    subjects: subjects,
    k: k
  };
}

/**
 * Devuelve la sesión en formato "completo" ({answerKey:{qid:{correctAnswer,
 * subject, justification}}}) a partir de cualquiera de los dos formatos:
 * el completo (cache / filas antiguas de CORE.sesiones) o el compacto v2.
 */
function expandSessionPayload_(p) {
  if (!p || typeof p !== 'object') return null;
  if (p.answerKey) return p;
  if (p.v === 2 && p.k) {
    const answerKey = {};
    Object.keys(p.k).forEach(function (qid) {
      const entry = p.k[qid] || [];
      answerKey[qid] = {
        correctAnswer: entry[0],
        subject: (p.subjects || [])[entry[1]],
        justification: null
      };
    });
    return Object.assign({}, p, { answerKey: answerKey });
  }
  return null;
}

/** Cache de la sesión: completo si entra en 100KB, si no el compacto. Nunca lanza. */
function putExamSessionCache_(sessionPayload) {
  const cache = CacheService.getScriptCache();
  const key = 'exam:' + sessionPayload.examSessionId;
  try {
    cache.put(key, JSON.stringify(sessionPayload), EXAM_SESSION_TTL_SECONDS_);
  } catch (err) {
    try {
      cache.put(key, JSON.stringify(compactSessionPayload_(sessionPayload)), EXAM_SESSION_TTL_SECONDS_);
    } catch (err2) {
      console.error('No se pudo cachear la sesión ' + sessionPayload.examSessionId + ': ' + err2);
    }
  }
}

function readExamSessionFromCache_(examSessionId) {
  try {
    const cached = CacheService.getScriptCache().get('exam:' + examSessionId);
    return cached ? expandSessionPayload_(JSON.parse(cached)) : null;
  } catch (err) {
    console.error('Error leyendo sesión desde cache: ' + err);
    return null;
  }
}

// ============================================
// HOJA CORE.sesiones (lectura por headers + migración de columnas)
// ============================================

/**
 * Abre CORE.sesiones (la crea si `createIfMissing`) y garantiza que tenga
 * todas las columnas de SESIONES_HEADERS_ (las agrega al final si una hoja
 * antigua no las tiene). Devuelve {sheet, headers, idx} o null si no hay CORE.
 */
function getSesionesSheet_(createIfMissing) {
  if (!CORE_SPREADSHEET_ID) return null;
  const ss = SpreadsheetApp.openById(CORE_SPREADSHEET_ID);
  let sheet = ss.getSheetByName('sesiones');
  if (!sheet) {
    if (!createIfMissing) return null;
    sheet = ss.insertSheet('sesiones');
    sheet.getRange(1, 1, 1, SESIONES_HEADERS_.length).setValues([SESIONES_HEADERS_]);
    sheet.getRange(1, 1, 1, SESIONES_HEADERS_.length).setFontWeight('bold');
  }

  function readHeaders() {
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const h = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (x) { return String(x).trim(); });
    return (h.length === 1 && h[0] === '') ? [] : h;
  }

  let headers = readHeaders();
  const faltan = SESIONES_HEADERS_.some(function (h) { return headers.indexOf(h) === -1; });
  if (faltan) {
    // Migración en caliente (una sola vez): bajo lock para no duplicar columnas.
    withScriptLock_(10000, function () {
      headers = readHeaders();
      const faltantes = SESIONES_HEADERS_.filter(function (h) { return headers.indexOf(h) === -1; });
      if (faltantes.length) {
        sheet.getRange(1, headers.length + 1, 1, faltantes.length).setValues([faltantes]);
        headers = headers.concat(faltantes);
      }
    });
  }

  const idx = {};
  headers.forEach(function (h, i) { idx[h] = i; });
  return { sheet: sheet, headers: headers, idx: idx };
}

/** Fila (1-based) del examSessionId en CORE.sesiones, o -1. Usa TextFinder (sin leer toda la hoja). */
function findSesionRow_(s, examSessionId) {
  const lastRow = s.sheet.getLastRow();
  if (lastRow < 2 || s.idx['exam_session_id'] === undefined) return -1;
  const range = s.sheet.getRange(2, s.idx['exam_session_id'] + 1, lastRow - 1, 1);
  const found = range.createTextFinder(examSessionId).matchEntireCell(true).findNext();
  return found ? found.getRow() : -1;
}

/** Lee la fila del examSessionId y verifica que el id coincida (por si la hoja cambió entre medio). */
function readSesionRow_(s, examSessionId) {
  const row = findSesionRow_(s, examSessionId);
  if (row < 0) return null;
  const values = s.sheet.getRange(row, 1, 1, s.headers.length).getValues()[0];
  if (String(values[s.idx['exam_session_id']]) !== examSessionId) return null;
  return { row: row, values: values };
}

/**
 * Escribe la fila espejo COMPACTA de la sesión en CORE.sesiones (respaldo
 * si el cache expira). Nunca lanza: si el CORE no está configurado o
 * falla, solo se pierde el respaldo (el cache sigue siendo la fuente
 * principal durante sus 6h de vida).
 */
function saveExamSessionMirror_(sessionPayload) {
  try {
    const s = getSesionesSheet_(true);
    if (!s) return;
    const json = JSON.stringify(compactSessionPayload_(sessionPayload));
    if (json.length > SESIONES_CELL_MAX_CHARS_) {
      console.error('Sesión ' + sessionPayload.examSessionId + ' demasiado grande para CORE.sesiones (' + json.length + ' chars); solo queda en cache.');
      return;
    }
    const row = new Array(s.headers.length).fill('');
    row[s.idx['exam_session_id']] = sessionPayload.examSessionId;
    row[s.idx['universidad']] = sessionPayload.universidad;
    row[s.idx['division']] = safeCell_(sessionPayload.division, 80);
    row[s.idx['proceso']] = safeCell_(sessionPayload.proceso, 30);
    row[s.idx['payload_json']] = json;
    row[s.idx['creado']] = new Date();
    row[s.idx['dni']] = sessionPayload.dni || '';
    row[s.idx['estado']] = 'pendiente';
    s.sheet.appendRow(row);
  } catch (err) {
    console.error('No se pudo escribir la fila espejo de sesión en CORE.sesiones: ' + err);
  }
}

/** Recupera una sesión de examen (formato completo): cache primero, luego CORE.sesiones. */
function recoverExamSession_(examSessionId) {
  const cached = readExamSessionFromCache_(examSessionId);
  if (cached) return cached;

  try {
    const s = getSesionesSheet_(false);
    if (!s) return null;
    const found = readSesionRow_(s, examSessionId);
    if (!found) return null;
    const raw = found.values[s.idx['payload_json']];
    if (!raw) return null;
    return expandSessionPayload_(JSON.parse(raw));
  } catch (err) {
    console.error('Error recuperando sesión desde CORE.sesiones: ' + err);
  }
  return null;
}

// ============================================
// RESULTADO GUARDADO (idempotencia de submitExam)
// ============================================

/** Resultado sin justificaciones (lo que se guarda en la celda resultado_json). */
function compactResult_(result) {
  const copy = Object.assign({}, result);
  copy.review = (result.review || []).map(function (r) {
    return { questionId: r.questionId, correctAnswer: r.correctAnswer, selectedOption: r.selectedOption, isCorrect: r.isCorrect };
  });
  return copy;
}

/**
 * Busca un resultado ya calificado para la sesión: cache 'examres:<id>' y
 * luego la columna resultado_json de CORE.sesiones. Devuelve {dni, result}
 * o null. Si la lectura falla, devuelve null (se loguea).
 */
function getStoredExamResult_(examSessionId) {
  try {
    const cached = CacheService.getScriptCache().get('examres:' + examSessionId);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.error('Error leyendo examres desde cache: ' + err);
  }

  try {
    const s = getSesionesSheet_(false);
    if (!s || s.idx['resultado_json'] === undefined) return null;
    const found = readSesionRow_(s, examSessionId);
    if (!found) return null;
    const raw = found.values[s.idx['resultado_json']];
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error leyendo resultado guardado desde CORE.sesiones: ' + err);
    return null;
  }
}

/** Guarda el resultado calificado (cache + CORE.sesiones). Llamar BAJO LOCK. Nunca lanza. */
function storeExamResult_(examSessionId, dniStr, result, session) {
  const cache = CacheService.getScriptCache();
  try {
    cache.put('examres:' + examSessionId, JSON.stringify({ dni: dniStr, result: result }), EXAM_SESSION_TTL_SECONDS_);
  } catch (err) {
    try {
      cache.put('examres:' + examSessionId, JSON.stringify({ dni: dniStr, result: compactResult_(result) }), EXAM_SESSION_TTL_SECONDS_);
    } catch (err2) {
      console.error('No se pudo cachear el resultado de ' + examSessionId + ': ' + err2);
    }
  }

  try {
    const s = getSesionesSheet_(true);
    if (!s) return;

    let record = { dni: dniStr, result: compactResult_(result) };
    let json = JSON.stringify(record);
    if (json.length > SESIONES_CELL_MAX_CHARS_) {
      record.result.review = [];
      record.result.reviewOmitido = true;
      json = JSON.stringify(record);
    }

    const found = readSesionRow_(s, examSessionId);
    if (found) {
      const values = found.values.slice();
      values[s.idx['dni']] = dniStr;
      values[s.idx['estado']] = 'calificado';
      values[s.idx['resultado_json']] = json;
      values[s.idx['calificado']] = new Date();
      s.sheet.getRange(found.row, 1, 1, values.length).setValues([values]);
    } else {
      // La fila espejo no existía (falló al crear la sesión): se crea ya calificada.
      const row = new Array(s.headers.length).fill('');
      row[s.idx['exam_session_id']] = examSessionId;
      row[s.idx['universidad']] = (session && session.universidad) || '';
      row[s.idx['division']] = safeCell_((session && session.division) || '', 80);
      row[s.idx['proceso']] = safeCell_((session && session.proceso) || '', 30);
      row[s.idx['creado']] = (session && session.createdAt) ? new Date(session.createdAt) : new Date();
      row[s.idx['dni']] = dniStr;
      row[s.idx['estado']] = 'calificado';
      row[s.idx['resultado_json']] = json;
      row[s.idx['calificado']] = new Date();
      s.sheet.appendRow(row);
    }
  } catch (err) {
    console.error('No se pudo guardar el resultado de ' + examSessionId + ' en CORE.sesiones: ' + err);
  }
}

/**
 * Devuelve un resultado previamente guardado, verificando que sea del
 * mismo dni. Completa las justificaciones desde la sesión en cache si el
 * resultado guardado es la versión compacta.
 */
function resolveStoredResult_(stored, dniStr, examSessionId) {
  if (!stored || !stored.result) return null;
  if (stored.dni && String(stored.dni).trim() !== dniStr) {
    console.warn('[SECURITY] submitExam: sesión ' + examSessionId + ' ya calificada para otro dni');
    throw publicError_('Esta sesión de examen pertenece a otro estudiante.');
  }
  const result = stored.result;
  const session = readExamSessionFromCache_(examSessionId);
  (result.review || []).forEach(function (r) {
    if (r.justification === undefined) {
      const key = session && session.answerKey ? session.answerKey[r.questionId] : null;
      r.justification = (key && key.justification) || null;
    }
  });
  return result;
}

// ============================================
// submitExam
// ============================================

/**
 * Recupera la sesion (cache -> CORE.sesiones), califica con el motor del
 * config_escala y persiste en el historial. Devuelve el resultado
 * completo + review con claves y justificaciones. Idempotente por
 * examSessionId (ver cabecera del archivo).
 */
function submitExamForTenant(tenant, examSessionId, dni, answers) {
  if (!examSessionId) throw publicError_('Parámetro "examSessionId" requerido');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(examSessionId)) {
    throw publicError_('Sesión de examen no válida. Vuelve a iniciar el examen.');
  }
  if (!dni) throw publicError_('Parámetro "dni" requerido');
  const dniStr = String(dni).trim();

  // 1) Idempotencia rápida: ¿ya se calificó esta sesión?
  const previo = getStoredExamResult_(examSessionId);
  if (previo) return resolveStoredResult_(previo, dniStr, examSessionId);

  // 2) Sesión
  const session = recoverExamSession_(examSessionId);
  if (!session) {
    throw publicError_('Sesión de examen no encontrada o expirada. Vuelve a iniciar el examen.');
  }
  validateSessionForSubmit_(session, tenant, dniStr, examSessionId);

  // 3) Calificar (sin lock: es cómputo puro)
  const result = gradeExamSession_(session, tenant, examSessionId, answers);

  // 4) Persistir bajo lock, re-chequeando que nadie la haya calificado en paralelo
  return withScriptLock_(20000, function () {
    const previo2 = getStoredExamResult_(examSessionId);
    if (previo2) return resolveStoredResult_(previo2, dniStr, examSessionId);
    persistHistorial_(tenant, dniStr, result);
    storeExamResult_(examSessionId, dniStr, result, session);
    return result;
  });
}

/** Universidad, antigüedad máxima y dni ligado a la sesión. */
function validateSessionForSubmit_(session, tenant, dniStr, examSessionId) {
  if (session.universidad && String(session.universidad) !== tenant.codigo) {
    throw publicError_('La sesión de examen no corresponde a esta universidad. Vuelve a iniciar el examen.');
  }

  if (session.createdAt) {
    const creado = new Date(session.createdAt).getTime();
    if (!isNaN(creado) && Date.now() - creado > EXAM_SESSION_MAX_AGE_HOURS_ * 3600 * 1000) {
      throw publicError_('La sesión de examen expiró (más de ' + EXAM_SESSION_MAX_AGE_HOURS_ + ' horas). Vuelve a iniciar el examen.');
    }
  }

  if (session.dni && String(session.dni).trim() !== dniStr) {
    console.warn('[SECURITY] submitExam: dni distinto al de la sesión ' + examSessionId);
    throw publicError_('Esta sesión de examen pertenece a otro estudiante.');
  }
}

/** Califica las respuestas contra la clave de la sesión (cómputo puro, sin escrituras). */
function gradeExamSession_(session, tenant, examSessionId, answers) {
  const answerKey = session.answerKey || {};
  const answersMap = Object.create(null);
  (answers || []).forEach(function (a) {
    if (!a || a.questionId === undefined || a.questionId === null) return;
    const sel = a.selectedOption;
    // Solo índices numéricos enteros cuentan como respuesta; lo demás = sin responder.
    answersMap[String(a.questionId)] = (typeof sel === 'number' && isFinite(sel) && Math.floor(sel) === sel) ? sel : null;
  });

  const subjectStats = {};
  const review = [];

  Object.keys(answerKey).forEach(function (questionId) {
    const key = answerKey[questionId];
    const hasAnswer = (questionId in answersMap) && answersMap[questionId] !== null && answersMap[questionId] !== undefined;
    const selectedOption = hasAnswer ? answersMap[questionId] : null;
    const isCorrect = hasAnswer && selectedOption === key.correctAnswer;

    if (!subjectStats[key.subject]) {
      subjectStats[key.subject] = { correct: 0, incorrect: 0, unanswered: 0, total: 0 };
    }
    const stat = subjectStats[key.subject];
    stat.total++;
    if (!hasAnswer) {
      stat.unanswered++;
    } else if (isCorrect) {
      stat.correct++;
    } else {
      stat.incorrect++;
    }

    review.push({
      questionId: questionId,
      correctAnswer: key.correctAnswer,
      selectedOption: selectedOption,
      isCorrect: isCorrect,
      justification: key.justification || null
    });
  });

  const scoring = scoreBySubject_(session.escala, session.subjectsPlan || [], subjectStats);
  const percentage = scoring.maxScore > 0 ? (scoring.totalScore / scoring.maxScore) * 100 : 0;
  const performanceLevel = computePerformanceLevel_(scoring.totalScore, session.escala && session.escala.umbrales);

  return {
    examSessionId: examSessionId,
    universidad: tenant.codigo,
    division: session.division,
    proceso: session.proceso,
    totalScore: scoring.totalScore,
    maxScore: scoring.maxScore,
    percentage: Math.round(percentage * 100) / 100,
    performanceLevel: performanceLevel,
    subjectResults: scoring.subjectResults,
    review: review
  };
}

// ============================================
// PURGA DE SESIONES (trigger diario)
// ============================================

/**
 * Borra de CORE.sesiones las filas con `creado` de más de
 * EXAM_SESSION_PURGE_DAYS_ días. Corre bajo ScriptLock (submitExam
 * escribe filas por índice). Ejecutable a mano o por el trigger diario
 * que instala instalarTriggerPurga().
 */
function purgarSesionesAntiguas() {
  const s = getSesionesSheet_(false);
  if (!s || s.idx['creado'] === undefined) {
    console.log('purgarSesionesAntiguas: no hay hoja CORE.sesiones (nada que purgar).');
    return { borradas: 0 };
  }

  return withScriptLock_(30000, function () {
    const sheet = s.sheet;
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { borradas: 0 };

    const limite = Date.now() - EXAM_SESSION_PURGE_DAYS_ * 24 * 3600 * 1000;
    const creados = sheet.getRange(2, s.idx['creado'] + 1, lastRow - 1, 1).getValues();
    const esVieja = creados.map(function (r) {
      const v = r[0];
      const d = (v instanceof Date) ? v : new Date(v);
      return !isNaN(d.getTime()) && d.getTime() < limite;
    });

    // Las filas se agregan en orden cronológico: casi todo lo viejo es un
    // bloque contiguo al inicio (se borra de una sola vez). Las viejas
    // sueltas que queden después se borran de abajo hacia arriba (tope 500).
    let prefijo = 0;
    while (prefijo < esVieja.length && esVieja[prefijo]) prefijo++;

    let sueltas = 0;
    for (let i = esVieja.length - 1; i >= prefijo && sueltas < 500; i--) {
      if (esVieja[i]) {
        sheet.deleteRow(i + 2);
        sueltas++;
      }
    }
    if (prefijo > 0) sheet.deleteRows(2, prefijo);

    const total = prefijo + sueltas;
    console.log('purgarSesionesAntiguas: ' + total + ' filas borradas (> ' + EXAM_SESSION_PURGE_DAYS_ + ' días).');
    return { borradas: total };
  });
}

/** Instala (o reinstala, sin duplicar) el trigger diario de purgarSesionesAntiguas (~3 a.m.). */
function instalarTriggerPurga() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'purgarSesionesAntiguas') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('purgarSesionesAntiguas').timeBased().everyDays(1).atHour(3).create();
  console.log('Trigger diario de purgarSesionesAntiguas instalado.');
}

// ============================================
// MOTORES DE PUNTUACION
// ============================================

/**
 * Aplica el motor indicado en `escala.motor` sobre las estadisticas por
 * asignatura (correct/incorrect/unanswered/total) usando el plan de
 * puntajes GUARDADO EN LA SESIÓN (pointsPerQuestion, puntosIncorrecta,
 * puntosBlanco, factor, maxScore por asignatura).
 *
 * Fórmula por asignatura (todos los motores):
 *   puntos = (correctas × pointsPerQuestion
 *             + incorrectas × puntosIncorrecta   [NO en suma_ponderada]
 *             + blancos × puntosBlanco) × factor
 * - suma_ponderada: no resta por incorrectas (caso UNA: solo aciertos);
 *   sí suma blancos si puntosBlanco > 0 (UNAJ +0,5).
 * - decimas / vector_canal / otro: con penalidad (UNMSM, UNFV) y blancos
 *   (UNSAAC +1). vector_canal: el agrupamiento por canal ya viene resuelto
 *   en subjectsPlan/config_examen vía `division_tipo=canal`.
 * - factor (factor_escala, default 1) lleva el bruto a la escala oficial
 *   (UNSAAC 400 × 2,5 = 1000; UNSCH 900/230 por división).
 * - maxScore por curso = n_preguntas × puntos_correcta × factor.
 * - PISO 0: el puntaje TOTAL nunca es negativo (una asignatura sí puede
 *   quedar en negativo). Si algún día una universidad permite totales
 *   negativos, agregar una columna `permite_negativo` en config_escala.
 * Sesiones antiguas sin puntosBlanco/factor: se asumen 0 y 1 (mismo
 * resultado que antes).
 */
function scoreBySubject_(escala, subjectsPlan, subjectStats) {
  const motor = (escala && escala.motor) || 'suma_ponderada';
  const conPenalidad = motor === 'decimas' || motor === 'vector_canal' || motor === 'otro';
  const planMap = {};
  (subjectsPlan || []).forEach(function (p) { planMap[p.name] = p; });

  const subjectResults = Object.keys(subjectStats).map(function (subjectName) {
    const stat = subjectStats[subjectName];
    const plan = planMap[subjectName] || {};
    const pointsPerQuestion = plan.pointsPerQuestion || 0;
    const puntosIncorrecta = plan.puntosIncorrecta || 0;
    const puntosBlanco = plan.puntosBlanco || 0;
    const factor = (typeof plan.factor === 'number' && plan.factor > 0) ? plan.factor : 1;
    const maxScore = (plan.maxScore !== undefined && plan.maxScore !== null) ? plan.maxScore : (pointsPerQuestion * stat.total * factor);

    let bruto = stat.correct * pointsPerQuestion + stat.unanswered * puntosBlanco;
    if (conPenalidad) bruto += stat.incorrect * puntosIncorrecta;
    const points = bruto * factor;

    return {
      subject: subjectName,
      correct: stat.correct,
      incorrect: stat.incorrect,
      unanswered: stat.unanswered,
      total: stat.total,
      points: Math.round(points * 100) / 100,
      maxScore: maxScore
    };
  });

  const totalScore = Math.max(0, subjectResults.reduce(function (sum, s) { return sum + s.points; }, 0));
  const maxScore = subjectResults.reduce(function (sum, s) { return sum + s.maxScore; }, 0);

  return {
    subjectResults: subjectResults,
    totalScore: Math.round(totalScore * 100) / 100,
    maxScore: maxScore
  };
}

/** performanceLevel SIEMPRE contra los umbrales del config, nunca contra constantes. */
function computePerformanceLevel_(totalScore, umbrales) {
  if (!umbrales) return 'sin_clasificar';
  if (totalScore >= umbrales.excelente) return 'excelente';
  if (totalScore >= umbrales.bueno) return 'bueno';
  if (totalScore >= umbrales.regular) return 'regular';
  return 'bajo';
}


// ============================================
// PERSISTENCIA DEL RESULTADO
// ============================================

/**
 * Persiste el resultado en CORE.historial (crea la hoja si falta) y, si
 * la universidad es 'una', hace doble escritura en historial_puntajes
 * (legado) para no romper la vista de historial actual durante la
 * transición. Se llama BAJO LOCK desde submitExamForTenant (una sola vez
 * por examSessionId). getHistoryV2 deduplica ambas fuentes al leer.
 */
function persistHistorial_(tenant, dni, result) {
  const correctasTotal = result.subjectResults.reduce(function (s, r) { return s + r.correct; }, 0);
  const totalPreguntas = result.subjectResults.reduce(function (s, r) { return s + r.total; }, 0);

  try {
    if (CORE_SPREADSHEET_ID) {
      const ss = SpreadsheetApp.openById(CORE_SPREADSHEET_ID);
      let sheet = ss.getSheetByName('historial');
      if (!sheet) {
        sheet = ss.insertSheet('historial');
        sheet.appendRow(['dni', 'universidad', 'proceso', 'fecha', 'division', 'puntaje', 'puntaje_max', 'correctas', 'total', 'porcentaje']);
        sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
      }
      sheet.appendRow([
        String(dni).trim(),
        tenant.codigo,
        safeCell_(result.proceso, 30),
        new Date(),
        safeCell_(result.division, 80),
        result.totalScore,
        result.maxScore,
        correctasTotal,
        totalPreguntas,
        result.percentage
      ]);
    }
  } catch (err) {
    console.error('No se pudo escribir en CORE.historial: ' + err);
  }

  if (tenant.codigo === 'una') {
    try {
      unaSaveUserScore(dni, result.totalScore, result.maxScore, safeCell_(result.division, 80), correctasTotal, totalPreguntas);
    } catch (err) {
      console.error('No se pudo escribir doble en historial_puntajes (legado): ' + err);
    }
  }

  // Consumir el "intento" (1er simulacro gratis POR universidad) al
  // completar el examen. recordIntento_ está definida en users.gs.
  try {
    recordIntento_(tenant.codigo, String(dni).trim(), result.proceso);
  } catch (err) {
    console.error('No se pudo registrar intento: ' + err);
  }
}
