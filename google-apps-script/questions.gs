/**
 * SimulaUNA - QUESTIONS
 * ============================================
 * Preguntas para el layout v2 (universidades nuevas): getExam, banqueo,
 * temas/subtemas, cepre. Para universidad='una' (layout legacy) delega
 * en las funciones `una*` de adapter_una.gs y agrega los campos nuevos
 * del contrato v2 (p.ej. `universidad`).
 *
 * REGLA DURA (layout v2): solo se sirven preguntas con ESTADO='activa'
 * y `Correct Answer` en el rango 1-5.
 */

// ============================================
// LECTURA DE HOJAS Banco_<CursoCanonico> (layout v2)
// ============================================

function v2BancoSheetName_(cursoCanonico) {
  return 'Banco_' + cursoCanonico;
}

/**
 * Curso cuya hoja Banco_<…> se usa para un curso de config_examen. Primero el nombre EXACTO del
 * curso oficial (p. ej. UNSA califica «Filosofía» y «Psicología» por separado y cada uno tiene su
 * hoja); si esa hoja no existe, el nombre canónico (p. ej. «Biología» → la hoja que ya existiera).
 */
function v2CursoHoja_(ss, curso) {
  if (ss && ss.getSheetByName(v2BancoSheetName_(curso))) return curso;
  return getCursoCanonical(curso) || curso;
}

function v2ColIndices_(headers) {
  return {
    questionText: headers.indexOf('Question Text'),
    questionType: headers.indexOf('Question Type'),
    option1: headers.indexOf('Option 1'),
    option2: headers.indexOf('Option 2'),
    option3: headers.indexOf('Option 3'),
    option4: headers.indexOf('Option 4'),
    option5: headers.indexOf('Option 5'),
    correctAnswer: headers.indexOf('Correct Answer'),
    timeSeconds: headers.indexOf('Time in seconds'),
    imageLink: headers.indexOf('Image Link'),
    numero: headers.indexOf('NUMERO'),
    curso: headers.indexOf('CURSO'),
    tema: headers.indexOf('TEMA'),
    subtema: headers.indexOf('SUBTEMA'),
    sourceFile: headers.indexOf('NOMBRE DEL ARCHIVO'),
    justification: headers.indexOf('JUSTIFICACION'),
    idHash: headers.indexOf('ID_HASH'),
    proceso: headers.indexOf('PROCESO'),
    anioPeriodo: headers.indexOf('ANIO_PERIODO'),
    division: headers.indexOf('DIVISION'),
    semana: headers.indexOf('SEMANA'),
    estado: headers.indexOf('ESTADO')
  };
}

/**
 * Lee una hoja Banco_<curso> del spreadsheet v2 y devuelve solo las filas
 * ESTADO='activa' con Correct Answer 1-5, aplicando filtros opcionales de
 * proceso/division/semana (cuando esas columnas existen en la hoja).
 */
function v2ReadActiveQuestions_(spreadsheetId, cursoCanonico, filtros) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheetName = v2BancoSheetName_(cursoCanonico);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { sheetName: sheetName, rows: [], colIndices: null };

  const data = leerHojaBancoCacheada_(ss, sheetName);
  if (data.length <= 1) return { sheetName: sheetName, rows: [], colIndices: null };

  const headers = data[0];
  const ci = v2ColIndices_(headers);
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const questionText = row[ci.questionText];
    if (!questionText || questionText === '') continue;

    // REGLA DURA: solo ESTADO='activa' con Correct Answer 1-5
    const estado = ci.estado !== -1 ? String(row[ci.estado] || '').trim().toLowerCase() : 'activa';
    if (estado !== 'activa') continue;

    const correctRaw = parseInt(row[ci.correctAnswer], 10);
    if (!(correctRaw >= 1 && correctRaw <= 5)) continue;

    if (filtros) {
      if (filtros.proceso && ci.proceso !== -1) {
        const rowProceso = String(row[ci.proceso] || '').trim().toUpperCase();
        if (rowProceso && rowProceso !== filtros.proceso.toUpperCase()) continue;
      }
      if (filtros.division && ci.division !== -1) {
        const rowDivision = String(row[ci.division] || '').trim().toUpperCase();
        if (rowDivision && rowDivision !== filtros.division.toUpperCase()) continue;
      }
      if (filtros.semana && ci.semana !== -1) {
        const rowSemana = String(row[ci.semana] || '').trim().toUpperCase();
        if (rowSemana !== filtros.semana.toUpperCase()) continue;
      }
    }

    rows.push({ rowIndex: i, data: row });
  }

  return { sheetName: sheetName, rows: rows, colIndices: ci };
}

/**
 * Formatea una fila de Banco_ (v2) al formato de pregunta del contrato.
 * Filtra opciones vacías REMAPEANDO el índice de la correcta; si la
 * opción correcta está vacía, la pregunta es inválida: se loguea y se
 * devuelve null (los llamadores la omiten con .filter(Boolean)).
 */
function v2FormatQuestion_(row, ci, curso, number, pointsPerQuestion) {
  const built = buildOptionsWithAnswer_([
    formatCellValue(row[ci.option1]),
    formatCellValue(row[ci.option2]),
    formatCellValue(row[ci.option3]),
    formatCellValue(row[ci.option4]),
    formatCellValue(row[ci.option5])
  ], row[ci.correctAnswer]);

  const idHash = ci.idHash !== -1 ? row[ci.idHash] : null;

  if (!built.valid) {
    console.error('[BANCO] Pregunta omitida: la opción correcta (' + row[ci.correctAnswer] + ') está vacía. curso=' + curso +
      ' id=' + (idHash || '') + ' numero=' + (ci.numero !== -1 ? row[ci.numero] : ''));
    return null;
  }

  const options = built.options;
  const correctAnswerIndex = built.correctAnswer;

  return {
    id: idHash ? String(idHash) : (curso + '-' + number),
    number: number,
    questionText: formatCellValue(row[ci.questionText]),
    questionType: row[ci.questionType] || 'Multiple Choice',
    options: options,
    correctAnswer: correctAnswerIndex,
    timeSeconds: (ci.timeSeconds !== -1 && row[ci.timeSeconds]) ? row[ci.timeSeconds] : 180,
    imageLink: row[ci.imageLink] || null,
    subject: curso,
    points: pointsPerQuestion || 0,
    sourceFile: row[ci.sourceFile] || null,
    justification: formatCellValue(row[ci.justification]) || null,
    metadata: {
      numero: row[ci.numero],
      tema: row[ci.tema],
      subtema: row[ci.subtema]
    }
  };
}

/** Enumera dinamicamente las hojas `Banco_*` de un spreadsheet v2. */
function v2ListBancoSheetNames_(ss) {
  return ss.getSheets()
    .map(function (s) { return s.getName(); })
    .filter(function (n) { return n.indexOf('Banco_') === 0; });
}

// ============================================
// CONFIG (v2): config_examen + config_escala
// ============================================

// Lectura BLINDADA (config_guard.gs): las hojas se validan celda por celda;
// si una edición las deja inválidas se sirve la última configuración buena
// y nunca se califica con una inválida. Ver cfgCargarConfig_.

/** Filas validadas de config_examen del proceso (forma {proceso, division, divisionTipo, curso, nPreguntas, puntosCorrecta, puntosIncorrecta, peso, orden}). */
function v2ReadConfigExamen_(tenant, proceso) {
  return cfgCargarConfig_(tenant, proceso).config.rows;
}

/** Escala validada de config_escala del proceso (nunca la de otro proceso). */
function v2ReadConfigEscala_(tenant, proceso) {
  return cfgCargarConfig_(tenant, proceso).config.escala;
}

/**
 * Action `getConfig` (v2). Para 'una' delega en el adaptador.
 */
function getConfigForTenant(tenant, proceso) {
  const resp = tenant.layout === 'legacy'
    ? unaGetConfigV2(proceso)
    : buildConfigV2Response_(tenant.codigo, proceso || 'ORDINARIO', cfgCargarConfig_(tenant, proceso).config);
  // Carreras del registro (hoja opcional config_carreras). Nunca lanza: sin hoja = sin carreras.
  return cfgAdjuntarCarreras_(tenant, resp);
}

// ============================================
// EXAMEN (pool de preguntas para getExam, usado por scoring.gs)
// ============================================

/**
 * Arma el pool de preguntas COMPLETAS (con correctAnswer/justification) de
 * un examen para `division` + `proceso` (+ `semana` opcional). Devuelve
 * {subjectsPlan:[{name,questionCount,pointsPerQuestion,puntosIncorrecta,puntosBlanco,factor,weight,maxScore}], questions:[]}.
 * pointsPerQuestion/puntosIncorrecta/puntosBlanco van en puntos BRUTOS; `factor`
 * (factor_escala, default 1) los lleva a la escala oficial al calificar.
 * scoring.gs se encarga de esconder correctAnswer/justification antes de
 * enviar las preguntas al cliente y de guardar la clave en la sesion.
 */
function buildExamPoolForTenant(tenant, division, proceso, semana) {
  if (tenant.layout === 'legacy') {
    return unaBuildExamPool_(division, proceso, semana);
  }

  const rows = v2ReadConfigExamen_(tenant, proceso).filter(function (r) {
    return r.division === division;
  });

  if (rows.length === 0) {
    throw publicError_(`No hay configuración de examen para la división "${division}" (proceso ${proceso || 'ORDINARIO'})`);
  }

  const questions = [];
  const subjectsPlan = [];
  let questionNumber = 1;
  const ss = SpreadsheetApp.openById(tenant.spreadsheetId);
  // Filas ya elegidas por hoja: si dos cursos comparten hoja, no se repite ninguna pregunta.
  const usadas = {};

  rows.forEach(function (r) {
    const cursoHoja = v2CursoHoja_(ss, r.curso);
    const pool = v2ReadActiveQuestions_(tenant.spreadsheetId, cursoHoja, { proceso: proceso, division: division, semana: semana });
    const usadasHoja = usadas[cursoHoja] || (usadas[cursoHoja] = {});
    const libres = pool.rows.filter(function (q) { return !usadasHoja[q.rowIndex]; });
    const selected = selectRandomItems(libres, Math.min(r.nPreguntas, libres.length));
    selected.forEach(function (q) { usadasHoja[q.rowIndex] = true; });

    const factor = r.factor || 1;
    const subjectQuestions = renumberQuestions_(selected.map(function (q, index) {
      return v2FormatQuestion_(q.data, pool.colIndices, r.curso, questionNumber + index, r.puntosCorrecta * factor);
    }).filter(Boolean), questionNumber);

    questions.push.apply(questions, subjectQuestions);
    questionNumber += subjectQuestions.length;

    subjectsPlan.push({
      name: r.curso,
      questionCount: subjectQuestions.length,
      pointsPerQuestion: r.puntosCorrecta,
      puntosIncorrecta: r.puntosIncorrecta,
      puntosBlanco: r.puntosBlanco || 0,
      factor: factor,
      weight: r.peso,
      maxScore: r.puntosCorrecta * subjectQuestions.length * factor
    });
  });

  return { subjectsPlan: subjectsPlan, questions: questions };
}

/**
 * Version legacy del pool de examen para 'una': reusa unaGetQuestions
 * (ORDINARIO) o unaGetCepreSimulacro (CEPRE), que ya devuelven preguntas
 * completas con correctAnswer/justification/points.
 */
function unaBuildExamPool_(division, proceso, semana) {
  const procesoUpper = (proceso || 'ORDINARIO').toUpperCase();
  let questions;

  if (procesoUpper === 'CEPRE') {
    const simulacro = unaGetCepreSimulacro(division, semana);
    if (simulacro.error) throw publicError_(simulacro.error);
    questions = simulacro.questions;
  } else {
    questions = unaGetQuestions(division);
  }

  const subjectsMap = {};
  const subjectsOrder = [];
  questions.forEach(function (q) {
    if (!subjectsMap[q.subject]) {
      subjectsMap[q.subject] = { name: q.subject, questionCount: 0, pointsPerQuestion: q.points, maxScore: 0 };
      subjectsOrder.push(q.subject);
    }
    subjectsMap[q.subject].questionCount++;
    subjectsMap[q.subject].maxScore += (q.points || 0);
  });

  return {
    subjectsPlan: subjectsOrder.map(function (s) { return subjectsMap[s]; }),
    questions: questions
  };
}

// ============================================
// BANQUEO (curso completo)
// ============================================

function getBanqueoQuestionsForTenant(tenant, curso, count) {
  if (tenant.layout === 'legacy') {
    const result = unaGetBanqueoQuestions(curso, count);
    result.universidad = 'una';
    return result;
  }

  const cursoCanonico = getCursoCanonical(curso) || curso;
  const pool = v2ReadActiveQuestions_(tenant.spreadsheetId, cursoCanonico, null);

  if (!pool.colIndices) {
    return { error: 'Banco de preguntas no encontrado', questions: [], universidad: tenant.codigo };
  }

  const validCounts = [10, 15, 20];
  let n = validCounts.includes(count) ? count : 10;
  if (n > pool.rows.length) n = pool.rows.length;

  const selected = selectRandomItems(pool.rows, n);
  const questions = renumberQuestions_(selected.map(function (q, index) {
    return v2FormatQuestion_(q.data, pool.colIndices, cursoCanonico, index + 1, 0);
  }).filter(Boolean), 1);

  return {
    course: cursoCanonico,
    universidad: tenant.codigo,
    totalQuestions: questions.length,
    totalAvailable: pool.rows.length,
    questions: questions
  };
}

// ============================================
// BANQUEO POR TEMA
// ============================================

function getCursosConTemasForTenant(tenant) {
  if (tenant.layout === 'legacy') {
    const result = unaGetCursosConTemas();
    result.universidad = 'una';
    return result;
  }

  const key = cacheKey(tenant.codigo, 'cursos_con_temas');
  // Anti-estampida: solo una ejecución recorre todas las hojas Banco_.
  return getOrBuildCachedJson_(key, 1800, function () {
    return buildCursosConTemasV2_(tenant);
  });
}

function buildCursosConTemasV2_(tenant) {
  const ss = SpreadsheetApp.openById(tenant.spreadsheetId);
  const cursosMap = {};

  v2ListBancoSheetNames_(ss).forEach(function (sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    const data = leerHojaBancoCacheada_(ss, sheetName);
    if (data.length <= 1) return;

    const headers = data[0];
    const ci = v2ColIndices_(headers);
    if (ci.curso === -1 || ci.questionText === -1) return;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const cursoRaw = String(row[ci.curso] || '').trim();
      const questionText = row[ci.questionText];
      if (!cursoRaw || !questionText) continue;

      const estado = ci.estado !== -1 ? String(row[ci.estado] || '').trim().toLowerCase() : 'activa';
      if (estado !== 'activa') continue;

      const cursoCanonical = getCursoCanonical(cursoRaw);
      if (!cursoCanonical) continue;

      cursosMap[cursoCanonical] = (cursosMap[cursoCanonical] || 0) + 1;
    }
  });

  const cursos = Object.entries(cursosMap)
    .map(function ([nombre, count]) { return { nombre: nombre, count: count }; })
    .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });

  return { totalCursos: cursos.length, cursos: cursos, universidad: tenant.codigo };
}

function getTemasPorCursoForTenant(tenant, curso) {
  if (tenant.layout === 'legacy') {
    const result = unaGetTemasPorCurso(curso);
    result.universidad = 'una';
    return result;
  }

  const cursoCanonicalBuscado = getCursoCanonical(curso) || curso;
  const key = cacheKey(tenant.codigo, 'temas_' + cursoCanonicalBuscado.replace(/\s/g, '_'));
  return getOrBuildCachedJson_(key, 1800, function () {
    return buildTemasPorCursoV2_(tenant, cursoCanonicalBuscado);
  });
}

function buildTemasPorCursoV2_(tenant, cursoCanonicalBuscado) {
  const ss = SpreadsheetApp.openById(tenant.spreadsheetId);
  const temasMap = {};

  v2ListBancoSheetNames_(ss).forEach(function (sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    const data = leerHojaBancoCacheada_(ss, sheetName);
    if (data.length <= 1) return;

    const headers = data[0];
    const ci = v2ColIndices_(headers);
    if (ci.curso === -1 || ci.questionText === -1) return;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowCursoRaw = String(row[ci.curso] || '').trim();
      const tema = String(row[ci.tema] || '').trim();
      const questionText = row[ci.questionText];
      if (!questionText || !rowCursoRaw) continue;

      const estado = ci.estado !== -1 ? String(row[ci.estado] || '').trim().toLowerCase() : 'activa';
      if (estado !== 'activa') continue;

      const rowCursoCanonical = getCursoCanonical(rowCursoRaw);
      if (!rowCursoCanonical || rowCursoCanonical !== cursoCanonicalBuscado) continue;

      const temaKey = tema || 'Sin tema';
      temasMap[temaKey] = (temasMap[temaKey] || 0) + 1;
    }
  });

  const temas = Object.entries(temasMap)
    .map(function ([nombre, count]) { return { nombre: nombre, count: count }; })
    .sort(function (a, b) {
      if (a.nombre === 'Sin tema') return 1;
      if (b.nombre === 'Sin tema') return -1;
      return a.nombre.localeCompare(b.nombre, 'es');
    });

  const totalPreguntas = temas.reduce(function (sum, t) { return sum + t.count; }, 0);
  return {
    curso: cursoCanonicalBuscado,
    totalPreguntas: totalPreguntas,
    totalTemas: temas.length,
    temas: temas,
    universidad: tenant.codigo
  };
}

function getSubtemasPorTemaForTenant(tenant, curso, tema) {
  if (tenant.layout === 'legacy') {
    const result = unaGetSubtemasPorTema(curso, tema);
    result.universidad = 'una';
    return result;
  }

  const cursoCanonicalBuscado = getCursoCanonical(curso) || curso;
  const ss = SpreadsheetApp.openById(tenant.spreadsheetId);
  const subtemasMap = {};

  v2ListBancoSheetNames_(ss).forEach(function (sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    const data = leerHojaBancoCacheada_(ss, sheetName);
    if (data.length <= 1) return;

    const headers = data[0];
    const ci = v2ColIndices_(headers);
    if (ci.curso === -1 || ci.questionText === -1) return;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowCursoRaw = String(row[ci.curso] || '').trim();
      const rowTema = String(row[ci.tema] || '').trim();
      const subtema = String(row[ci.subtema] || '').trim();
      const questionText = row[ci.questionText];
      if (!questionText || !rowCursoRaw) continue;

      const estado = ci.estado !== -1 ? String(row[ci.estado] || '').trim().toLowerCase() : 'activa';
      if (estado !== 'activa') continue;

      const rowCursoCanonical = getCursoCanonical(rowCursoRaw);
      if (!rowCursoCanonical || rowCursoCanonical !== cursoCanonicalBuscado) continue;
      if (normalizeString(rowTema) !== normalizeString(tema)) continue;

      const subtemaKey = subtema || 'Sin subtema';
      subtemasMap[subtemaKey] = (subtemasMap[subtemaKey] || 0) + 1;
    }
  });

  const subtemas = Object.entries(subtemasMap)
    .map(function ([nombre, count]) { return { nombre: nombre, count: count }; })
    .sort(function (a, b) {
      if (a.nombre === 'Sin subtema') return 1;
      if (b.nombre === 'Sin subtema') return -1;
      return a.nombre.localeCompare(b.nombre, 'es');
    });

  const totalPreguntas = subtemas.reduce(function (sum, s) { return sum + s.count; }, 0);
  return {
    curso: cursoCanonicalBuscado,
    tema: tema,
    totalPreguntas: totalPreguntas,
    totalSubtemas: subtemas.length,
    subtemas: subtemas,
    universidad: tenant.codigo
  };
}

function getBanqueoByTemaForTenant(tenant, curso, tema, subtema, count) {
  if (tenant.layout === 'legacy') {
    const result = unaGetBanqueoByTema(curso, tema, subtema, count);
    result.universidad = 'una';
    return result;
  }

  const cursoCanonicalBuscado = getCursoCanonical(curso) || curso;
  const ss = SpreadsheetApp.openById(tenant.spreadsheetId);
  const allQuestions = [];

  v2ListBancoSheetNames_(ss).forEach(function (sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    const data = leerHojaBancoCacheada_(ss, sheetName);
    if (data.length <= 1) return;

    const headers = data[0];
    const ci = v2ColIndices_(headers);
    if (ci.curso === -1 || ci.questionText === -1) return;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const questionText = row[ci.questionText];
      const rowCursoRaw = String(row[ci.curso] || '').trim();
      const rowTema = String(row[ci.tema] || '').trim();
      const rowSubtema = String(row[ci.subtema] || '').trim();
      if (!questionText || !rowCursoRaw) continue;

      const estado = ci.estado !== -1 ? String(row[ci.estado] || '').trim().toLowerCase() : 'activa';
      if (estado !== 'activa') continue;

      const correctRaw = parseInt(row[ci.correctAnswer], 10);
      if (!(correctRaw >= 1 && correctRaw <= 5)) continue;

      const rowCursoCanonical = getCursoCanonical(rowCursoRaw);
      if (!rowCursoCanonical || rowCursoCanonical !== cursoCanonicalBuscado) continue;
      if (tema && normalizeString(rowTema) !== normalizeString(tema)) continue;
      if (subtema && normalizeString(rowSubtema) !== normalizeString(subtema)) continue;

      allQuestions.push({ rowIndex: i, data: row, colIndices: ci, curso: cursoCanonicalBuscado });
    }
  });

  // Tope: nunca todo el banco (antes, sin `count` se devolvía todo).
  const n = clampCount_(count, QUESTIONS_DEFAULT_COUNT_, QUESTIONS_MAX_COUNT_);
  const selected = selectRandomItems(allQuestions, Math.min(n, allQuestions.length));

  const questions = renumberQuestions_(selected.map(function (q, index) {
    const formatted = v2FormatQuestion_(q.data, q.colIndices, q.curso, index + 1, 0);
    if (!formatted) return null;
    formatted.tema = String(q.data[q.colIndices.tema] || '').trim();
    formatted.subtema = String(q.data[q.colIndices.subtema] || '').trim();
    return formatted;
  }).filter(Boolean), 1);

  return {
    curso: cursoCanonicalBuscado,
    tema: tema || 'TODOS',
    subtema: subtema || 'TODOS',
    totalQuestions: questions.length,
    totalAvailable: allQuestions.length,
    questions: questions,
    universidad: tenant.codigo
  };
}

// ============================================
// CEPRE / PROCESO ESPECIAL (v2 usa el mismo Banco_ con PROCESO='CEPRE')
// ============================================

function getCepreQuestionsForTenant(tenant, curso, division, semana, count) {
  if (tenant.layout === 'legacy') {
    // area legado se envía en el parámetro `division`
    const result = unaGetCepreQuestions(curso, division, semana, count);
    result.universidad = 'una';
    return result;
  }

  const cursoCanonico = getCursoCanonical(curso) || curso;
  const pool = v2ReadActiveQuestions_(tenant.spreadsheetId, cursoCanonico, { proceso: 'CEPRE', division: division, semana: semana });

  if (!pool.colIndices) {
    return { error: 'Curso no válido para CEPRE', questions: [], universidad: tenant.codigo };
  }

  let selected;
  if (count === null || count === undefined) {
    // Modo cuadernillo: en orden, pero con tope (antes devolvía todo el banco).
    selected = pool.rows.slice(0, QUESTIONS_MAX_COUNT_);
  } else {
    const n = clampCount_(count, QUESTIONS_DEFAULT_COUNT_, QUESTIONS_MAX_COUNT_);
    selected = selectRandomItems(pool.rows, Math.min(n, pool.rows.length));
  }

  const questions = renumberQuestions_(selected.map(function (q, index) {
    return v2FormatQuestion_(q.data, pool.colIndices, cursoCanonico, index + 1, 0);
  }).filter(Boolean), 1);

  return {
    course: cursoCanonico,
    division: division || 'ALL',
    semana: semana || 'TODAS',
    totalQuestions: questions.length,
    totalAvailable: pool.rows.length,
    questions: questions,
    universidad: tenant.codigo
  };
}

function getSemanasForTenant(tenant, curso, division) {
  if (tenant.layout === 'legacy') {
    const result = unaGetCepreSemanas(curso, division);
    result.universidad = 'una';
    return result;
  }

  if (!curso) {
    return { semanas: CEPRE_SEMANAS, universidad: tenant.codigo };
  }

  const cursoCanonico = getCursoCanonical(curso) || curso;
  const pool = v2ReadActiveQuestions_(tenant.spreadsheetId, cursoCanonico, division ? { division: division } : null);

  if (!pool.colIndices || pool.colIndices.semana === -1) {
    return { semanas: CEPRE_SEMANAS, universidad: tenant.codigo };
  }

  const semanasSet = new Set();
  pool.rows.forEach(function (q) {
    const rowSemana = String(q.data[pool.colIndices.semana] || '').trim().toUpperCase();
    if (rowSemana) semanasSet.add(rowSemana);
  });

  const semanas = Array.from(semanasSet).sort(function (a, b) {
    return (parseInt(a.replace('S', ''), 10) || 0) - (parseInt(b.replace('S', ''), 10) || 0);
  });

  return { course: cursoCanonico, division: division || 'TODAS', semanas: semanas, universidad: tenant.codigo };
}
