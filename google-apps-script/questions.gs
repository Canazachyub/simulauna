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

  const data = sheet.getDataRange().getValues();
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

/** Formatea una fila de Banco_ (v2) al formato de pregunta del contrato. */
function v2FormatQuestion_(row, ci, curso, number, pointsPerQuestion) {
  const options = [
    formatCellValue(row[ci.option1]),
    formatCellValue(row[ci.option2]),
    formatCellValue(row[ci.option3]),
    formatCellValue(row[ci.option4]),
    formatCellValue(row[ci.option5])
  ].filter(function (opt) { return opt && opt !== ''; });

  const correctAnswerIndex = (parseInt(row[ci.correctAnswer], 10) || 1) - 1;
  const idHash = ci.idHash !== -1 ? row[ci.idHash] : null;

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

function v2ReadConfigExamen_(spreadsheetId, proceso) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName('config_examen');
  if (!sheet) throw new Error('Hoja "config_examen" no encontrada');

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0].map(function (h) { return String(h).trim(); });
  const idx = {
    proceso: headers.indexOf('proceso'),
    division: headers.indexOf('division'),
    divisionTipo: headers.indexOf('division_tipo'),
    curso: headers.indexOf('curso'),
    nPreguntas: headers.indexOf('n_preguntas'),
    puntosCorrecta: headers.indexOf('puntos_correcta'),
    puntosIncorrecta: headers.indexOf('puntos_incorrecta'),
    peso: headers.indexOf('peso'),
    orden: headers.indexOf('orden')
  };

  const procesoUpper = (proceso || 'ORDINARIO').toUpperCase();
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const cursoName = row[idx.curso];
    if (!cursoName) continue;

    const rowProceso = String(row[idx.proceso] || '').trim().toUpperCase() || 'ORDINARIO';
    if (rowProceso !== procesoUpper) continue;

    rows.push({
      proceso: rowProceso,
      division: String(row[idx.division] || '').trim(),
      divisionTipo: String(row[idx.divisionTipo] || '').trim() || 'area',
      curso: String(cursoName).trim(),
      nPreguntas: parseInt(row[idx.nPreguntas], 10) || 0,
      puntosCorrecta: parseFloat(row[idx.puntosCorrecta]) || 0,
      puntosIncorrecta: parseFloat(row[idx.puntosIncorrecta]) || 0,
      peso: parseFloat(row[idx.peso]) || 0,
      orden: Number(row[idx.orden]) || 0
    });
  }
  return rows;
}

function v2ReadConfigEscala_(spreadsheetId, proceso) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName('config_escala');
  if (!sheet) throw new Error('Hoja "config_escala" no encontrada');

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) throw new Error('Hoja "config_escala" está vacía');

  const headers = data[0].map(function (h) { return String(h).trim(); });
  const idx = {
    proceso: headers.indexOf('proceso'),
    motor: headers.indexOf('motor'),
    escalaTotal: headers.indexOf('escala_total'),
    umbralExcelente: headers.indexOf('umbral_excelente'),
    umbralBueno: headers.indexOf('umbral_bueno'),
    umbralRegular: headers.indexOf('umbral_regular'),
    duracionMin: headers.indexOf('duracion_min'),
    nPreguntasTotal: headers.indexOf('n_preguntas_total')
  };

  function toEscala(row) {
    return {
      motor: String(row[idx.motor] || 'suma_ponderada').trim(),
      escalaTotal: parseFloat(row[idx.escalaTotal]) || 0,
      umbrales: {
        excelente: parseFloat(row[idx.umbralExcelente]) || 0,
        bueno: parseFloat(row[idx.umbralBueno]) || 0,
        regular: parseFloat(row[idx.umbralRegular]) || 0
      },
      duracionMin: parseInt(row[idx.duracionMin], 10) || 0,
      nPreguntasTotal: parseInt(row[idx.nPreguntasTotal], 10) || 0
    };
  }

  const procesoUpper = (proceso || 'ORDINARIO').toUpperCase();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowProceso = String(row[idx.proceso] || '').trim().toUpperCase();
    if (rowProceso === procesoUpper) return toEscala(row);
  }

  // Si no hay fila para el proceso pedido, usar la primera disponible.
  return toEscala(data[1]);
}

/**
 * Action `getConfig` (v2). Para 'una' delega en el adaptador.
 */
function getConfigForTenant(tenant, proceso) {
  if (tenant.layout === 'legacy') {
    return unaGetConfigV2(proceso);
  }

  const rows = v2ReadConfigExamen_(tenant.spreadsheetId, proceso);
  const escala = v2ReadConfigEscala_(tenant.spreadsheetId, proceso);

  const divisionesMap = {};
  const divisionOrder = [];

  rows.forEach(function (r) {
    if (!divisionesMap[r.division]) {
      divisionesMap[r.division] = {
        codigo: r.division,
        nombre: r.division,
        tipo: r.divisionTipo,
        subjects: [],
        totalQuestions: 0,
        totalMaxScore: 0,
        orden: r.orden
      };
      divisionOrder.push(r.division);
    }
    const d = divisionesMap[r.division];
    const maxScore = r.puntosCorrecta * r.nPreguntas;
    d.subjects.push({
      name: r.curso,
      questionCount: r.nPreguntas,
      pointsPerQuestion: r.puntosCorrecta,
      weight: r.peso,
      maxScore: maxScore,
      orden: r.orden
    });
    d.totalQuestions += r.nPreguntas;
    d.totalMaxScore += maxScore;
    if (r.orden && r.orden < d.orden) d.orden = r.orden;
  });

  const divisiones = divisionOrder
    .map(function (code) { return divisionesMap[code]; })
    .sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); });

  divisiones.forEach(function (d) {
    d.subjects.sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); });
  });

  return {
    universidad: tenant.codigo,
    proceso: proceso || 'ORDINARIO',
    divisiones: divisiones,
    escala: escala
  };
}

// ============================================
// EXAMEN (pool de preguntas para getExam, usado por scoring.gs)
// ============================================

/**
 * Arma el pool de preguntas COMPLETAS (con correctAnswer/justification) de
 * un examen para `division` + `proceso` (+ `semana` opcional). Devuelve
 * {subjectsPlan:[{name,questionCount,pointsPerQuestion,maxScore}], questions:[]}.
 * scoring.gs se encarga de esconder correctAnswer/justification antes de
 * enviar las preguntas al cliente y de guardar la clave en la sesion.
 */
function buildExamPoolForTenant(tenant, division, proceso, semana) {
  if (tenant.layout === 'legacy') {
    return unaBuildExamPool_(division, proceso, semana);
  }

  const rows = v2ReadConfigExamen_(tenant.spreadsheetId, proceso).filter(function (r) {
    return r.division === division;
  });

  if (rows.length === 0) {
    throw new Error(`No hay configuración de examen para la división "${division}" (proceso ${proceso || 'ORDINARIO'})`);
  }

  const questions = [];
  const subjectsPlan = [];
  let questionNumber = 1;

  rows.forEach(function (r) {
    const cursoCanonico = getCursoCanonical(r.curso) || r.curso;
    const pool = v2ReadActiveQuestions_(tenant.spreadsheetId, cursoCanonico, { proceso: proceso, division: division, semana: semana });
    const selected = selectRandomItems(pool.rows, Math.min(r.nPreguntas, pool.rows.length));

    const subjectQuestions = selected.map(function (q, index) {
      return v2FormatQuestion_(q.data, pool.colIndices, r.curso, questionNumber + index, r.puntosCorrecta);
    });

    questions.push.apply(questions, subjectQuestions);
    questionNumber += subjectQuestions.length;

    subjectsPlan.push({
      name: r.curso,
      questionCount: subjectQuestions.length,
      pointsPerQuestion: r.puntosCorrecta,
      puntosIncorrecta: r.puntosIncorrecta,
      weight: r.peso,
      maxScore: r.puntosCorrecta * subjectQuestions.length
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
    if (simulacro.error) throw new Error(simulacro.error);
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
  const questions = selected.map(function (q, index) {
    return v2FormatQuestion_(q.data, pool.colIndices, cursoCanonico, index + 1, 0);
  });

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
  const cached = getCachedJson(key);
  if (cached) return cached;

  const ss = SpreadsheetApp.openById(tenant.spreadsheetId);
  const cursosMap = {};

  v2ListBancoSheetNames_(ss).forEach(function (sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();
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

  const result = { totalCursos: cursos.length, cursos: cursos, universidad: tenant.codigo };
  setCachedJson(key, result, 1800);
  return result;
}

function getTemasPorCursoForTenant(tenant, curso) {
  if (tenant.layout === 'legacy') {
    const result = unaGetTemasPorCurso(curso);
    result.universidad = 'una';
    return result;
  }

  const cursoCanonicalBuscado = getCursoCanonical(curso) || curso;
  const key = cacheKey(tenant.codigo, 'temas_' + cursoCanonicalBuscado.replace(/\s/g, '_'));
  const cached = getCachedJson(key);
  if (cached) return cached;

  const ss = SpreadsheetApp.openById(tenant.spreadsheetId);
  const temasMap = {};

  v2ListBancoSheetNames_(ss).forEach(function (sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();
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
  const result = {
    curso: cursoCanonicalBuscado,
    totalPreguntas: totalPreguntas,
    totalTemas: temas.length,
    temas: temas,
    universidad: tenant.codigo
  };
  setCachedJson(key, result, 1800);
  return result;
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
    const data = sheet.getDataRange().getValues();
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
    const data = sheet.getDataRange().getValues();
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

  let selected;
  if (count === null || count === undefined || count >= allQuestions.length) {
    selected = shuffleArray(allQuestions);
  } else {
    selected = selectRandomItems(allQuestions, count);
  }

  const questions = selected.map(function (q, index) {
    const formatted = v2FormatQuestion_(q.data, q.colIndices, q.curso, index + 1, 0);
    formatted.tema = String(q.data[q.colIndices.tema] || '').trim();
    formatted.subtema = String(q.data[q.colIndices.subtema] || '').trim();
    return formatted;
  });

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
    selected = pool.rows;
  } else {
    selected = selectRandomItems(pool.rows, Math.min(count, pool.rows.length));
  }

  const questions = selected.map(function (q, index) {
    return v2FormatQuestion_(q.data, pool.colIndices, cursoCanonico, index + 1, 0);
  });

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
