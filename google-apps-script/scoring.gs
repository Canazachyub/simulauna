/**
 * SimulaUNA - SCORING
 * ============================================
 * getExam / submitExam: arma la sesion de examen, guarda la clave de
 * respuestas SOLO en el servidor (CacheService + fila espejo en
 * CORE.sesiones) y califica con el motor configurado en config_escala
 * (suma_ponderada | decimas | vector_canal), segun contrato §3.
 */

const EXAM_SESSION_TTL_SECONDS_ = 21600; // 6 horas

// ============================================
// getExam
// ============================================

/**
 * Arma un examen para `division`/`proceso` (+ `semana` opcional), genera
 * un examSessionId y guarda la clave de respuestas en el servidor. Las
 * preguntas devueltas al cliente NO llevan correctAnswer ni justification.
 */
function getExamForTenant(tenant, division, proceso, semana) {
  if (!division) throw new Error('Parámetro "division" requerido');

  const procesoNorm = (proceso || 'ORDINARIO').toUpperCase();
  const pool = buildExamPoolForTenant(tenant, division, procesoNorm, semana);

  if (!pool.questions || pool.questions.length === 0) {
    throw new Error(`No hay preguntas disponibles para "${division}" (proceso ${procesoNorm})`);
  }

  const escala = tenant.layout === 'legacy'
    ? UNA_ESCALA_ORDINARIO_
    : v2ReadConfigEscala_(tenant.spreadsheetId, procesoNorm);

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
    answerKey: answerKey,
    createdAt: new Date().toISOString()
  };

  CacheService.getScriptCache().put('exam:' + examSessionId, JSON.stringify(sessionPayload), EXAM_SESSION_TTL_SECONDS_);
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

/**
 * Escribe una fila espejo de la sesion en CORE.sesiones (respaldo si el
 * cache expira). Crea la hoja si no existe. Nunca lanza: si el CORE no
 * esta configurado o falla, solo se pierde el respaldo (el cache sigue
 * siendo la fuente principal durante sus 6h de vida).
 */
function saveExamSessionMirror_(sessionPayload) {
  try {
    if (!CORE_SPREADSHEET_ID) return;
    const ss = SpreadsheetApp.openById(CORE_SPREADSHEET_ID);
    let sheet = ss.getSheetByName('sesiones');
    if (!sheet) {
      sheet = ss.insertSheet('sesiones');
      sheet.appendRow(['exam_session_id', 'universidad', 'division', 'proceso', 'payload_json', 'creado']);
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    }
    sheet.appendRow([
      sessionPayload.examSessionId,
      sessionPayload.universidad,
      sessionPayload.division,
      sessionPayload.proceso,
      JSON.stringify(sessionPayload),
      new Date()
    ]);
  } catch (err) {
    console.log('No se pudo escribir la fila espejo de sesión en CORE.sesiones: ' + err);
  }
}

/** Recupera una sesion de examen: cache primero, luego CORE.sesiones. */
function recoverExamSession_(examSessionId) {
  const cached = CacheService.getScriptCache().get('exam:' + examSessionId);
  if (cached) return JSON.parse(cached);

  if (!CORE_SPREADSHEET_ID) return null;

  try {
    const ss = SpreadsheetApp.openById(CORE_SPREADSHEET_ID);
    const sheet = ss.getSheetByName('sesiones');
    if (!sheet) return null;

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return null;

    const headers = data[0];
    const idIdx = headers.indexOf('exam_session_id');
    const payloadIdx = headers.indexOf('payload_json');
    if (idIdx === -1 || payloadIdx === -1) return null;

    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][idIdx]) === examSessionId) {
        return JSON.parse(data[i][payloadIdx]);
      }
    }
  } catch (err) {
    console.log('Error recuperando sesión desde CORE.sesiones: ' + err);
  }
  return null;
}

// ============================================
// submitExam
// ============================================

/**
 * Recupera la sesion (cache -> CORE.sesiones), califica con el motor del
 * config_escala y persiste en el historial. Devuelve el resultado
 * completo + review con claves y justificaciones.
 */
function submitExamForTenant(tenant, examSessionId, dni, answers) {
  if (!examSessionId) throw new Error('Parámetro "examSessionId" requerido');
  if (!dni) throw new Error('Parámetro "dni" requerido');

  const session = recoverExamSession_(examSessionId);
  if (!session) {
    throw new Error('Sesión de examen no encontrada o expirada. Vuelve a iniciar el examen.');
  }

  const answerKey = session.answerKey;
  const answersMap = {};
  (answers || []).forEach(function (a) {
    if (a && a.questionId !== undefined) answersMap[a.questionId] = a.selectedOption;
  });

  const subjectStats = {};
  const review = [];

  Object.keys(answerKey).forEach(function (questionId) {
    const key = answerKey[questionId];
    const hasAnswer = Object.prototype.hasOwnProperty.call(answersMap, questionId) && answersMap[questionId] !== null && answersMap[questionId] !== undefined;
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

  const result = {
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

  persistHistorial_(tenant, dni, result);

  return result;
}

// ============================================
// MOTORES DE PUNTUACION
// ============================================

/**
 * Aplica el motor indicado en `escala.motor` sobre las estadisticas por
 * asignatura (correct/incorrect/unanswered/total) usando el plan de
 * puntajes (pointsPerQuestion/puntosIncorrecta/maxScore por asignatura).
 *
 * - suma_ponderada: puntos = correctas * (maxScore/questionCount). Sin
 *   penalización (caso UNA actual: el cliente solo sumaba aciertos).
 * - decimas: puntos = correctas*puntos_correcta + incorrectas*puntos_incorrecta.
 * - vector_canal: igual a decimas, agrupado por división/canal (el
 *   agrupamiento por canal ya viene resuelto en subjectsPlan/config_examen
 *   vía `division_tipo=canal`; aquí se aplica la misma fórmula por fila).
 */
function scoreBySubject_(escala, subjectsPlan, subjectStats) {
  const motor = (escala && escala.motor) || 'suma_ponderada';
  const planMap = {};
  (subjectsPlan || []).forEach(function (p) { planMap[p.name] = p; });

  const subjectResults = Object.keys(subjectStats).map(function (subjectName) {
    const stat = subjectStats[subjectName];
    const plan = planMap[subjectName] || {};
    const pointsPerQuestion = plan.pointsPerQuestion || 0;
    const puntosIncorrecta = plan.puntosIncorrecta || 0;
    const maxScore = (plan.maxScore !== undefined && plan.maxScore !== null) ? plan.maxScore : (pointsPerQuestion * stat.total);

    let points;
    if (motor === 'decimas' || motor === 'vector_canal') {
      points = stat.correct * pointsPerQuestion + stat.incorrect * puntosIncorrecta;
    } else {
      // suma_ponderada: solo se premian las correctas, sin penalización
      points = stat.correct * pointsPerQuestion;
    }

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

  const totalScore = subjectResults.reduce(function (sum, s) { return sum + s.points; }, 0);
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
 * transición.
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
        result.proceso,
        new Date(),
        result.division,
        result.totalScore,
        result.maxScore,
        correctasTotal,
        totalPreguntas,
        result.percentage
      ]);
    }
  } catch (err) {
    console.log('No se pudo escribir en CORE.historial: ' + err);
  }

  if (tenant.codigo === 'una') {
    try {
      unaSaveUserScore(dni, result.totalScore, result.maxScore, result.division, correctasTotal, totalPreguntas);
    } catch (err) {
      console.log('No se pudo escribir doble en historial_puntajes (legado): ' + err);
    }
  }

  // Consumir el "intento" (1er simulacro gratis POR universidad) al
  // completar el examen. recordIntento_ está definida en users.gs.
  try {
    recordIntento_(tenant.codigo, String(dni).trim(), result.proceso);
  } catch (err) {
    console.log('No se pudo registrar intento: ' + err);
  }
}
