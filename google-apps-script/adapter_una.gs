/**
 * SimulaUNA - ADAPTADOR UNA (layout legado)
 * ============================================
 * Traduce el layout de hojas legado de UNA Puno (Configuracion_*, Banco_*,
 * CEPRE_*, usuarios, confirmado, acceso_banqueo, historial_puntajes) al
 * contrato v2, y expone tambien las funciones EXACTAS que consumen las
 * actions legadas (deben responder byte-identico a la produccion actual).
 *
 * Todas las funciones publicas de este archivo llevan el prefijo `una`
 * para no colisionar con los nombres de accion del router (main.gs) ni
 * con las funciones de layout v2 (questions.gs / scoring.gs / users.gs).
 *
 * Las funciones internas (privadas) llevan sufijo `_`.
 */

// ============================================
// CONSTANTES LEGADAS (copiadas de api.gs, sin cambios)
// ============================================

// Nombres de las hojas de configuracion
const CONFIG_SHEETS = {
  'Ingenierías': 'Configuración_Ingenierías',
  'Sociales': 'Configuración_Sociales',
  'Biomédicas': 'Configuración_Biomédicas'
};

// Mapeo de asignaturas a hojas de banco de preguntas (Bancos Historicos)
const SUBJECT_SHEETS = {
  'Aritmética': 'Banco_Aritmética',
  'Álgebra': 'Banco_Álgebra',
  'Geometría': 'Banco_Geometría',
  'Trigonometría': 'Banco_Trigonometría',
  'Física': 'Banco_Física',
  'Química': 'Banco_Química',
  'Biología y Anatomía': 'Banco_Biología y Anatomía',
  'Psicología y Filosofía': 'Banco_Psicología y Filosofía',
  'Geografía': 'Banco_Geografía',
  'Historia': 'Banco_Historia',
  'Educación Cívica': 'Banco_Educación Cívica',
  'Economía': 'Banco_Economía',
  'Comunicación': 'Banco_Comunicación',
  'Literatura': 'Banco_Literatura',
  'Razonamiento Matemático': 'Banco_Razonamiento Matemático',
  'Razonamiento Verbal': 'Banco_Razonamiento Verbal',
  'Inglés': 'Banco_Inglés',
  'Quechua y aimara': 'Banco_Quechua y aimara'
};

// CEPREUNA - Mapeo de hojas por curso
const CEPRE_SUBJECT_SHEETS = {
  // Cursos comunes
  'Aritmética': 'CEPRE_Aritmética',
  'Álgebra': 'CEPRE_Álgebra',
  'Geometría': 'CEPRE_Geometría',
  'Trigonometría': 'CEPRE_Trigonometría',
  'Física': 'CEPRE_Física',
  'Química': 'CEPRE_Química',
  'Psicología y Filosofía': 'CEPRE_PsicologíaFilosofía',
  'Historia': 'CEPRE_Historia',
  'Educación Cívica': 'CEPRE_EducaciónCívica',
  'Economía': 'CEPRE_Economía',
  'Razonamiento Matemático': 'CEPRE_RazonamientoMatemático',
  'RM': 'CEPRE_RazonamientoMatemático',
  'Razonamiento Verbal': 'CEPRE_RazonamientoVerbal',

  // Idiomas - usar hojas del banco historico (no hay CEPRE especifico)
  'Inglés': 'Banco_Inglés',
  'Quechua y aimara': 'Banco_Quechua y aimara',
  'Quechua y Aimara': 'Banco_Quechua y aimara',

  // Cursos especificos por area
  'Biología': 'CEPRE_Biología',
  'Anatomía': 'CEPRE_Anatomía',
  'Biología y Anatomía': 'CEPRE_BiologíaAnatomía',
  'Matemática': 'CEPRE_Matemática',
  'Comunicación': 'CEPRE_Comunicación',
  'Comunicación y Literatura': 'CEPRE_ComunicaciónLiteratura',
  'Literatura': 'CEPRE_Literatura',
  'Geografía': 'CEPRE_Geografía'
  // NOTA: "Historia y Geografía" NO existe como hoja - se usan hojas separadas
};

// Cursos disponibles por area CEPREUNA
// Total por area: ING=15, BIO=13, SOC=13 (sin Ingles ni Quechua)
const CEPRE_COURSES_BY_AREA = {
  'ING': [
    'Aritmética', 'Álgebra', 'Geometría', 'Trigonometría',
    'Física', 'Química', 'Biología y Anatomía',
    'Psicología y Filosofía',
    'Historia', 'Geografía',
    'Educación Cívica', 'Economía',
    'Comunicación y Literatura',
    'Razonamiento Matemático', 'Razonamiento Verbal'
  ], // 15 cursos
  'BIO': [
    'Matemática',
    'Física', 'Química',
    'Biología', 'Anatomía',
    'Psicología y Filosofía',
    'Historia', 'Geografía',
    'Educación Cívica', 'Economía',
    'Comunicación y Literatura',
    'Razonamiento Matemático', 'Razonamiento Verbal'
  ], // 13 cursos
  'SOC': [
    'Matemática',
    'Física', 'Química',
    'Biología y Anatomía',
    'Psicología y Filosofía',
    'Historia', 'Geografía',
    'Educación Cívica', 'Economía',
    'Comunicación', 'Literatura',
    'Razonamiento Matemático', 'Razonamiento Verbal'
  ] // 13 cursos
};

// Semanas validas CEPREUNA
const CEPRE_SEMANAS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'S14', 'S15', 'S16'];

/**
 * Lista de todas las hojas de banco (historico + CEPRE)
 */
const ALL_BANCO_SHEETS = [
  // Bancos historicos
  'Banco_Aritmética', 'Banco_Álgebra', 'Banco_Geometría', 'Banco_Trigonometría',
  'Banco_Física', 'Banco_Química', 'Banco_Biología y Anatomía',
  'Banco_Psicología y Filosofía', 'Banco_Geografía', 'Banco_Historia',
  'Banco_Educación Cívica', 'Banco_Economía', 'Banco_Comunicación',
  'Banco_Literatura', 'Banco_Razonamiento Matemático', 'Banco_Razonamiento Verbal',
  'Banco_Inglés', 'Banco_Quechua y aimara',
  // Hojas CEPRE
  'CEPRE_Aritmética', 'CEPRE_Álgebra', 'CEPRE_Geometría', 'CEPRE_Trigonometría',
  'CEPRE_Matemática', 'CEPRE_Física', 'CEPRE_Química',
  'CEPRE_Biología', 'CEPRE_Anatomía', 'CEPRE_BiologíaAnatomía',
  'CEPRE_PsicologíaFilosofía', 'CEPRE_Historia', 'CEPRE_Geografía',
  'CEPRE_EducaciónCívica', 'CEPRE_Economía',
  'CEPRE_Comunicación', 'CEPRE_Literatura', 'CEPRE_ComunicaciónLiteratura',
  'CEPRE_RazonamientoMatemático', 'CEPRE_RazonamientoVerbal'
];

/**
 * MAPEO DE CURSOS: Normaliza variantes de nombres de cursos a un nombre canonico
 * Sirve ademas como FALLBACK de la hoja `cursos_canonicos` del CORE
 * (ver core.gs -> getCursosCanonicosMap_).
 */
const CURSOS_CANONICOS = {
  'algebra': 'Álgebra',
  'aritmetica': 'Aritmética',
  'geometria': 'Geometría',
  'trigonometria': 'Trigonometría',
  'matematica': 'Matemática',
  'matematicas': 'Matemática',
  'geometria y trigonometria': 'Geometría',

  'fisica': 'Física',
  'quimica': 'Química',
  'biologia': 'Biología',
  'anatomia': 'Anatomía',
  'biologia y anatomia': 'Biología y Anatomía',
  'biologia anatomia': 'Biología y Anatomía',

  'historia': 'Historia',
  'historia universal': 'Historia',
  'historia conquista y virreinato': 'Historia',
  'historia del peru autonomo': 'Historia',
  'historia republica siglo xix': 'Historia',
  'historia republica siglo xx-xxi': 'Historia',

  'geografia': 'Geografía',
  'geografia del peru': 'Geografía',
  'geografia general': 'Geografía',
  'geografia peru': 'Geografía',

  'filosofia': 'Psicología y Filosofía',
  'psicologia': 'Psicología y Filosofía',
  'psicologia y filosofia': 'Psicología y Filosofía',

  'educacion civica': 'Educación Cívica',
  'civica constitucion': 'Educación Cívica',
  'economia': 'Economía',
  'macroeconomia': 'Economía',
  'microeconomia': 'Economía',

  'comunicacion': 'Comunicación',
  'literatura': 'Literatura',
  'comunicacion y literatura': 'Comunicación y Literatura',

  'razonamiento matematico': 'Razonamiento Matemático',
  'raz. matematico': 'Razonamiento Matemático',
  'razonamiento verbal': 'Razonamiento Verbal',

  'ingles': 'Inglés',
  'quechua y aimara': 'Quechua y Aimara',
  'quechua y aymara': 'Quechua y Aimara'
};

/**
 * Valores que NO son cursos validos (errores en los datos)
 */
const CURSOS_INVALIDOS = ['72', 'curso', ''];

// Escala legada de UNA para el simulacro de admision (ver contrato SS3):
// motor=suma_ponderada, escalaTotal=3000, umbrales 2400/1800/1200, 180 min, 60 preguntas.
const UNA_ESCALA_ORDINARIO_ = {
  motor: 'suma_ponderada',
  escalaTotal: 3000,
  umbrales: { excelente: 2400, bueno: 1800, regular: 1200 },
  duracionMin: 180,
  nPreguntasTotal: 60
};

// Areas legadas de UNA <-> codigos de "division" del contrato v2.
const UNA_AREAS_ = ['Ingenierías', 'Sociales', 'Biomédicas'];
const UNA_AREA_CODES_ = {
  'Ingenierías': 'ING',
  'Sociales': 'SOC',
  'Biomédicas': 'BIO'
};

// ============================================
// CONFIGURACION (accion legada `config`)
// ============================================

/**
 * OBTENER CONFIGURACION DE TODAS LAS AREAS (forma legada, sin cambios).
 */
function unaGetConfig() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const config = {};

  for (const [areaName, sheetName] of Object.entries(CONFIG_SHEETS)) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Hoja "${sheetName}" no encontrada`);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const subjects = [];
    let totalQuestions = 0;
    let totalMaxScore = 0;

    const colIndices = {
      cod: headers.indexOf('COD.'),
      asignatura: headers.indexOf('ASIGNATURA'),
      puntajePregunta: headers.indexOf('PREGUNTA BIEN CONTESTADA'),
      cantidad: headers.indexOf('CANTIDAD DE PREGUNTAS'),
      ponderacion: headers.indexOf('PONDERACIÓN'),
      puntaje: headers.indexOf('PUNTAJE')
    };

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const asignatura = row[colIndices.asignatura];

      if (!asignatura || asignatura === 'TOTAL' || asignatura === '') continue;

      const cantidad = parseInt(row[colIndices.cantidad]) || 0;
      const puntaje = parseFloat(row[colIndices.puntaje]) || 0;

      subjects.push({
        code: row[colIndices.cod],
        name: asignatura,
        pointsPerQuestion: parseFloat(row[colIndices.puntajePregunta]) || 0,
        questionCount: cantidad,
        weight: parseFloat(row[colIndices.ponderacion]) || 0,
        maxScore: puntaje
      });

      totalQuestions += cantidad;
      totalMaxScore += puntaje;
    }

    config[areaName] = {
      name: areaName,
      subjects: subjects,
      totalQuestions: totalQuestions,
      totalMaxScore: totalMaxScore
    };
  }

  return config;
}

/**
 * Version v2 de la configuracion de UNA: traduce las 3 areas legadas al
 * contrato `getConfig` (divisiones[] + escala). Solo soporta proceso
 * ORDINARIO (UNA no tiene config_examen propia; CEPRE usa el mismo banco
 * de asignaturas via CEPRE_SUBJECT_SHEETS).
 */
function unaGetConfigV2(proceso) {
  const legacyConfig = unaGetConfig();
  const divisiones = UNA_AREAS_.map(function (areaName, index) {
    const area = legacyConfig[areaName];
    const subjects = area.subjects.map(function (s, i) {
      return {
        name: s.name,
        questionCount: s.questionCount,
        pointsPerQuestion: s.pointsPerQuestion,
        weight: s.weight,
        maxScore: s.maxScore,
        orden: i + 1
      };
    });
    return {
      codigo: areaName,
      nombre: areaName,
      tipo: 'area',
      subjects: subjects,
      totalQuestions: area.totalQuestions,
      totalMaxScore: area.totalMaxScore,
      orden: index + 1
    };
  });

  return {
    universidad: 'una',
    proceso: proceso || 'ORDINARIO',
    divisiones: divisiones,
    escala: {
      motor: UNA_ESCALA_ORDINARIO_.motor,
      escalaTotal: UNA_ESCALA_ORDINARIO_.escalaTotal,
      umbrales: UNA_ESCALA_ORDINARIO_.umbrales,
      duracionMin: UNA_ESCALA_ORDINARIO_.duracionMin,
      nPreguntasTotal: UNA_ESCALA_ORDINARIO_.nPreguntasTotal
    }
  };
}

// ============================================
// PREGUNTAS - SIMULACRO (accion legada `questions`)
// ============================================

/**
 * OBTENER PREGUNTAS POR AREA (ORDENADAS POR ASIGNATURA) - forma legada.
 * Las preguntas incluyen correctAnswer/justification (el modelo legado
 * calificaba en el cliente).
 */
function unaGetQuestions(areaName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  if (!CONFIG_SHEETS[areaName]) {
    throw new Error(`Área "${areaName}" no válida. Use: Ingenierías, Sociales, o Biomédicas`);
  }

  const configSheet = ss.getSheetByName(CONFIG_SHEETS[areaName]);
  if (!configSheet) {
    throw new Error(`Hoja de configuración para "${areaName}" no encontrada`);
  }

  const configData = configSheet.getDataRange().getValues();
  const headers = configData[0];

  const colIndices = {
    asignatura: headers.indexOf('ASIGNATURA'),
    cantidad: headers.indexOf('CANTIDAD DE PREGUNTAS'),
    puntaje: headers.indexOf('PUNTAJE')
  };

  const questions = [];
  let questionNumber = 1;

  for (let i = 1; i < configData.length; i++) {
    const row = configData[i];
    const subjectName = row[colIndices.asignatura];
    const questionCount = parseInt(row[colIndices.cantidad]) || 0;
    const maxScore = parseFloat(row[colIndices.puntaje]) || 0;

    if (!subjectName || subjectName === 'TOTAL' || subjectName === '' || questionCount === 0) continue;

    const subjectQuestions = unaGetRandomQuestionsFromSubject_(ss, subjectName, questionCount, maxScore, questionNumber);
    questions.push(...subjectQuestions);
    questionNumber += subjectQuestions.length;
  }

  return questions;
}

/**
 * OBTENER PREGUNTAS ALEATORIAS DE UNA ASIGNATURA (banco historico).
 */
function unaGetRandomQuestionsFromSubject_(ss, subjectName, count, maxScore, startingNumber) {
  const sheetName = SUBJECT_SHEETS[subjectName];
  if (!sheetName) {
    console.log(`Advertencia: No se encontró mapeo para "${subjectName}"`);
    return [];
  }

  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    console.log(`Advertencia: Hoja "${sheetName}" no encontrada`);
    return [];
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const colIndices = {
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
    justification: headers.indexOf('JUSTIFICACION')
  };

  const allQuestions = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const questionText = row[colIndices.questionText];
    if (!questionText || questionText === '') continue;
    allQuestions.push({ rowIndex: i, data: row });
  }

  const selectedQuestions = selectRandomItems(allQuestions, count);
  const pointsPerQuestion = count > 0 ? maxScore / count : 0;

  return selectedQuestions.map((q, index) => {
    const row = q.data;

    const options = [
      formatCellValue(row[colIndices.option1]),
      formatCellValue(row[colIndices.option2]),
      formatCellValue(row[colIndices.option3]),
      formatCellValue(row[colIndices.option4]),
      formatCellValue(row[colIndices.option5])
    ].filter(opt => opt && opt !== '');

    const correctAnswerIndex = (parseInt(row[colIndices.correctAnswer]) || 1) - 1;

    return {
      id: `${subjectName}-${q.rowIndex}`,
      number: startingNumber + index,
      questionText: formatCellValue(row[colIndices.questionText]),
      questionType: row[colIndices.questionType] || 'Multiple Choice',
      options: options,
      correctAnswer: correctAnswerIndex,
      timeSeconds: 180,
      imageLink: row[colIndices.imageLink] || null,
      subject: subjectName,
      points: pointsPerQuestion,
      sourceFile: row[colIndices.sourceFile] || null,
      justification: formatCellValue(row[colIndices.justification]) || null,
      metadata: {
        numero: row[colIndices.numero],
        tema: row[colIndices.tema],
        subtema: row[colIndices.subtema]
      }
    };
  });
}

// ============================================
// REGISTRO DE USUARIOS (hoja legada `usuarios`)
// ============================================

/**
 * Registra un usuario en la hoja "usuarios" (forma y comportamiento legados).
 * Columnas: Fecha | DNI | Nombre | Email | Celular | Proceso | Área | Carrera
 */
function unaRegisterUser(dni, fullName, email, phone, processType, area, career) {
  if (!dni) {
    return { registered: false, message: 'DNI requerido' };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('usuarios');

  if (!sheet) {
    sheet = ss.insertSheet('usuarios');
    sheet.appendRow(['Fecha', 'DNI', 'Nombre', 'Email', 'Celular', 'Proceso', 'Área', 'Carrera']);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(3, 250);
    sheet.setColumnWidth(4, 220);
    sheet.setColumnWidth(8, 350);
  }

  const data = sheet.getDataRange().getValues();
  let existingRow = -1;
  const dniStr = String(dni).trim();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === dniStr) {
      existingRow = i + 1;
      break;
    }
  }

  const timestamp = new Date();

  if (existingRow > 0) {
    const oldEmail = data[existingRow - 1][3];
    const oldPhone = data[existingRow - 1][4];
    const oldCareer = data[existingRow - 1][7];

    if (email !== oldEmail || phone !== oldPhone || career !== oldCareer) {
      sheet.getRange(existingRow, 1).setValue(timestamp);
      sheet.getRange(existingRow, 4).setValue(email);
      sheet.getRange(existingRow, 5).setValue(phone);
      sheet.getRange(existingRow, 6).setValue(processType);
      sheet.getRange(existingRow, 7).setValue(area);
      sheet.getRange(existingRow, 8).setValue(career);
      return { registered: true, message: 'Datos de usuario actualizados', updated: true };
    }

    return { registered: true, message: 'Usuario ya registrado', existing: true };
  }

  sheet.appendRow([timestamp, dni, fullName, email, phone, processType, area, career]);

  return { registered: true, message: 'Usuario registrado correctamente', new: true };
}

// ============================================
// HISTORIAL DE PUNTAJES (hoja legada `historial_puntajes`)
// ============================================

/**
 * Guarda el puntaje de un usuario en la hoja "historial_puntajes" (legado).
 */
function unaSaveUserScore(dni, score, maxScore, area, correct, total) {
  if (!dni) {
    return { saved: false, message: 'DNI requerido' };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('historial_puntajes');

  if (!sheet) {
    sheet = ss.insertSheet('historial_puntajes');
    sheet.appendRow(['DNI', 'Fecha', 'Área', 'Puntaje', 'Puntaje Máx', 'Correctas', 'Total', 'Porcentaje']);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
    sheet.setColumnWidth(1, 100);
    sheet.setColumnWidth(2, 150);
    sheet.setColumnWidth(3, 100);
  }

  const percentage = maxScore > 0 ? ((score / maxScore) * 100).toFixed(2) : 0;
  const timestamp = new Date();
  sheet.appendRow([dni, timestamp, area, score.toFixed(2), maxScore.toFixed(2), correct, total, percentage + '%']);

  return { saved: true, message: 'Puntaje guardado correctamente' };
}

/**
 * Obtiene el historial de puntajes de un usuario por DNI (forma legada).
 */
function unaGetUserHistory(dni) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('historial_puntajes');

  if (!sheet) {
    return { history: [], message: 'No hay historial disponible' };
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { history: [], message: 'No hay registros en el historial' };
  }

  const dniStr = String(dni).trim();
  const history = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[0]).trim() === dniStr) {
      history.push({
        fecha: row[1],
        area: row[2],
        puntaje: parseFloat(row[3]) || 0,
        puntajeMax: parseFloat(row[4]) || 0,
        correctas: parseInt(row[5]) || 0,
        total: parseInt(row[6]) || 0,
        porcentaje: parseFloat(row[7]) || 0
      });
    }
  }

  history.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return {
    dni: dni,
    totalIntentos: history.length,
    history: history,
    mejorPuntaje: history.length > 0 ? Math.max(...history.map(h => h.puntaje)) : 0,
    ultimoPuntaje: history.length > 0 ? history[0].puntaje : 0
  };
}

// ============================================
// VERIFICACION DE ACCESO - DETECCION DE FRAUDE (hojas legadas)
// ============================================

/**
 * Verifica si un usuario puede dar el simulacro con deteccion de fraude
 * (forma y comportamiento legados, byte-identico a produccion actual).
 * NOTA: el DNI se compara SIEMPRE como String(x).trim() (nunca parseInt,
 * para no perder ceros a la izquierda).
 */
function unaCheckUserAccess(dni, email) {
  if (!dni) {
    return { canAccess: false, reason: 'DNI requerido', attemptCount: 0 };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const dniStr = String(dni).trim();
  const emailLower = (email || '').toLowerCase().trim();

  const usersSheet = ss.getSheetByName('usuarios');
  let existsInUsuarios = false;
  let fraudAttempt = false;
  let fraudReason = '';
  let attemptCount = 0;

  if (usersSheet) {
    const usersData = usersSheet.getDataRange().getValues();

    for (let i = 1; i < usersData.length; i++) {
      const rowDni = String(usersData[i][1]).trim();
      const rowEmail = String(usersData[i][3] || '').toLowerCase().trim();

      if (rowDni === dniStr) {
        existsInUsuarios = true;
        attemptCount++;

        if (rowEmail !== '' && emailLower !== '' && rowEmail !== emailLower) {
          fraudAttempt = true;
          fraudReason = 'Este DNI ya está registrado con otro email';
        }
      }

      if (rowEmail !== '' && emailLower !== '' && rowEmail === emailLower) {
        if (rowDni !== dniStr) {
          fraudAttempt = true;
          fraudReason = 'Este email ya está registrado con otro DNI';
        }
      }
    }
  }

  if (fraudAttempt) {
    return {
      canAccess: false,
      reason: fraudReason,
      attemptCount: attemptCount,
      isFirstAttempt: false,
      isConfirmed: false,
      isFraudAttempt: true
    };
  }

  if (!existsInUsuarios) {
    return {
      canAccess: true,
      reason: 'Primer simulacro gratuito',
      attemptCount: 0,
      isFirstAttempt: true,
      isFraudAttempt: false
    };
  }

  let confirmadoSheet = ss.getSheetByName('confirmado');

  if (!confirmadoSheet) {
    confirmadoSheet = ss.insertSheet('confirmado');
    confirmadoSheet.appendRow(['DNI', 'Nombre', 'Email']);
    confirmadoSheet.getRange(1, 1, 1, 3).setFontWeight('bold');
    confirmadoSheet.setColumnWidth(1, 100);
    confirmadoSheet.setColumnWidth(2, 250);
    confirmadoSheet.setColumnWidth(3, 220);
  }

  const confirmadoData = confirmadoSheet.getDataRange().getValues();
  let isConfirmed = false;

  for (let i = 1; i < confirmadoData.length; i++) {
    const confDni = String(confirmadoData[i][0]).trim();
    const confEmail = String(confirmadoData[i][2] || '').toLowerCase().trim();

    const dniMatch = (confDni === dniStr);
    const emailMatch = (confEmail === emailLower) || (confEmail === '' && emailLower === '');

    if (dniMatch && emailMatch) {
      isConfirmed = true;
      break;
    }
  }

  if (isConfirmed) {
    return {
      canAccess: true,
      reason: 'Usuario confirmado',
      attemptCount: attemptCount,
      isFirstAttempt: false,
      isConfirmed: true,
      isFraudAttempt: false
    };
  }

  return {
    canAccess: false,
    reason: 'Ya realizaste tu simulacro gratuito. Contáctanos para obtener más intentos.',
    attemptCount: attemptCount,
    isFirstAttempt: false,
    isConfirmed: false,
    isFraudAttempt: false
  };
}

// ============================================
// BANQUEO HISTORICO - SOLO USUARIOS CONFIRMADOS (hoja legada `confirmado`)
// ============================================

/**
 * Verifica si un usuario puede acceder al Banqueo Historico (forma legada).
 */
function unaCheckBanqueoAccess(dni, email) {
  if (!dni) {
    return { canAccess: false, reason: 'DNI requerido' };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const dniStr = String(dni).trim();
  const emailLower = (email || '').toLowerCase().trim();

  let confirmadoSheet = ss.getSheetByName('confirmado');

  if (!confirmadoSheet) {
    return {
      canAccess: false,
      reason: 'El Banqueo Histórico es exclusivo para usuarios inscritos',
      isConfirmed: false
    };
  }

  const confirmadoData = confirmadoSheet.getDataRange().getValues();
  let isConfirmed = false;

  for (let i = 1; i < confirmadoData.length; i++) {
    const confDni = String(confirmadoData[i][0]).trim();
    const confEmail = String(confirmadoData[i][2] || '').toLowerCase().trim();

    const dniMatch = (confDni === dniStr);
    const emailMatch = (confEmail === emailLower) || (confEmail === '' && emailLower === '');

    if (dniMatch && emailMatch) {
      isConfirmed = true;
      break;
    }
  }

  if (isConfirmed) {
    return {
      canAccess: true,
      reason: 'Acceso autorizado al Banqueo Histórico',
      isConfirmed: true
    };
  }

  return {
    canAccess: false,
    reason: 'El Banqueo Histórico es exclusivo para usuarios inscritos',
    isConfirmed: false
  };
}

/**
 * Obtiene preguntas aleatorias de un curso especifico para el Banqueo
 * (forma legada, incluye correctAnswer/justification: feedback inmediato).
 */
function unaGetBanqueoQuestions(courseName, count) {
  const validCounts = [10, 15, 20];
  if (!validCounts.includes(count)) {
    count = 10;
  }

  if (!SUBJECT_SHEETS[courseName]) {
    return { error: 'Curso no válido', questions: [], availableCourses: Object.keys(SUBJECT_SHEETS) };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetName = SUBJECT_SHEETS[courseName];
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return { error: 'Banco de preguntas no encontrado', questions: [] };
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { error: 'No hay preguntas disponibles', questions: [] };
  }

  const headers = data[0];
  const colIndices = {
    questionText: headers.indexOf('Question Text'),
    questionType: headers.indexOf('Question Type'),
    option1: headers.indexOf('Option 1'),
    option2: headers.indexOf('Option 2'),
    option3: headers.indexOf('Option 3'),
    option4: headers.indexOf('Option 4'),
    option5: headers.indexOf('Option 5'),
    correctAnswer: headers.indexOf('Correct Answer'),
    imageLink: headers.indexOf('Image Link'),
    numero: headers.indexOf('NUMERO'),
    tema: headers.indexOf('TEMA'),
    subtema: headers.indexOf('SUBTEMA'),
    sourceFile: headers.indexOf('NOMBRE DEL ARCHIVO'),
    justification: headers.indexOf('JUSTIFICACION')
  };

  const allQuestions = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const questionText = row[colIndices.questionText];
    if (!questionText || questionText === '') continue;
    allQuestions.push({ rowIndex: i, data: row });
  }

  if (count > allQuestions.length) {
    count = allQuestions.length;
  }

  const selectedQuestions = selectRandomItems(allQuestions, count);

  const questions = selectedQuestions.map((q, index) => {
    const row = q.data;

    const options = [
      formatCellValue(row[colIndices.option1]),
      formatCellValue(row[colIndices.option2]),
      formatCellValue(row[colIndices.option3]),
      formatCellValue(row[colIndices.option4]),
      formatCellValue(row[colIndices.option5])
    ].filter(opt => opt && opt !== '');

    const correctAnswerIndex = (parseInt(row[colIndices.correctAnswer]) || 1) - 1;

    return {
      id: `banqueo-${courseName}-${q.rowIndex}`,
      number: index + 1,
      questionText: formatCellValue(row[colIndices.questionText]),
      questionType: row[colIndices.questionType] || 'Multiple Choice',
      options: options,
      correctAnswer: correctAnswerIndex,
      imageLink: row[colIndices.imageLink] || null,
      subject: courseName,
      sourceFile: row[colIndices.sourceFile] || null,
      justification: formatCellValue(row[colIndices.justification]) || null,
      metadata: {
        numero: row[colIndices.numero],
        tema: row[colIndices.tema],
        subtema: row[colIndices.subtema]
      }
    };
  });

  return {
    course: courseName,
    totalQuestions: questions.length,
    totalAvailable: allQuestions.length,
    questions: questions
  };
}

/**
 * Obtiene la lista de cursos disponibles para el Banqueo (legado).
 */
function unaGetAvailableCourses() {
  return Object.keys(SUBJECT_SHEETS);
}

// ============================================
// CEPREUNA - FUNCIONES DE BANQUEO Y SIMULACRO (legadas)
// ============================================

/**
 * Obtiene preguntas CEPREUNA para el Banqueo (forma legada).
 */
function unaGetCepreQuestions(course, area, semana, count) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  let sheetName;
  if (area && area !== 'ALL') {
    sheetName = unaMapSubjectToCepreSheet_(course, area);
  } else {
    sheetName = CEPRE_SUBJECT_SHEETS[course];
  }

  if (!sheetName) {
    return {
      error: 'Curso no válido para CEPREUNA',
      questions: [],
      availableCourses: Object.keys(CEPRE_SUBJECT_SHEETS)
    };
  }

  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return { error: `Hoja "${sheetName}" no encontrada`, questions: [] };
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { error: 'No hay preguntas disponibles', questions: [] };
  }

  const headers = data[0];
  const colIndices = unaGetCepreColumnIndices_(headers);

  const filteredQuestions = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const questionText = row[colIndices.questionText];
    if (!questionText || questionText === '') continue;

    const rowArea = String(row[colIndices.area] || '').trim().toUpperCase();
    const rowSemana = String(row[colIndices.semana] || '').trim().toUpperCase();

    if (area && area !== 'ALL' && rowArea !== area.toUpperCase()) continue;
    if (semana && rowSemana !== semana.toUpperCase()) continue;

    filteredQuestions.push({ rowIndex: i, data: row });
  }

  let selectedQuestions;
  if (count === null || count === undefined) {
    selectedQuestions = filteredQuestions;
  } else {
    const validCount = Math.min(count, filteredQuestions.length);
    selectedQuestions = selectRandomItems(filteredQuestions, validCount);
  }

  const questions = selectedQuestions.map((q, index) => {
    return unaFormatCepreQuestion_(q.data, colIndices, course, index + 1, q.rowIndex);
  });

  return {
    course: course,
    area: area || 'ALL',
    semana: semana || 'TODAS',
    totalQuestions: questions.length,
    totalAvailable: filteredQuestions.length,
    questions: questions
  };
}

/**
 * Obtiene un simulacro completo CEPREUNA (forma legada).
 */
function unaGetCepreSimulacro(area, semana) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  if (!CONFIG_SHEETS[area]) {
    return { error: `Área "${area}" no válida. Use: Ingenierías, Sociales, o Biomédicas` };
  }

  const areaCodes = { 'Ingenierías': 'ING', 'Biomédicas': 'BIO', 'Sociales': 'SOC' };
  const areaCode = areaCodes[area];

  const configSheet = ss.getSheetByName(CONFIG_SHEETS[area]);
  if (!configSheet) {
    return { error: `Hoja de configuración para "${area}" no encontrada` };
  }

  const configData = configSheet.getDataRange().getValues();
  const headers = configData[0];
  const colIndices = {
    asignatura: headers.indexOf('ASIGNATURA'),
    cantidad: headers.indexOf('CANTIDAD DE PREGUNTAS'),
    puntaje: headers.indexOf('PUNTAJE')
  };

  const questions = [];
  let questionNumber = 1;

  for (let i = 1; i < configData.length; i++) {
    const row = configData[i];
    const subjectName = row[colIndices.asignatura];
    const questionCount = parseInt(row[colIndices.cantidad]) || 0;
    const maxScore = parseFloat(row[colIndices.puntaje]) || 0;

    if (!subjectName || subjectName === 'TOTAL' || questionCount === 0) continue;

    const subjectQuestions = unaGetCepreQuestionsForSimulacro_(
      ss, subjectName, areaCode, semana, questionCount, maxScore, questionNumber
    );

    questions.push(...subjectQuestions);
    questionNumber += subjectQuestions.length;
  }

  return {
    area: area,
    semana: semana || 'TODAS',
    totalQuestions: questions.length,
    questions: questions
  };
}

/**
 * Obtiene preguntas CEPRE para el simulacro.
 */
function unaGetCepreQuestionsForSimulacro_(ss, subjectName, areaCode, semana, count, maxScore, startingNumber) {
  let cepreSheetName = unaMapSubjectToCepreSheet_(subjectName, areaCode);

  if (!cepreSheetName) {
    console.log(`No hay hoja CEPRE para "${subjectName}" en área ${areaCode}`);
    return [];
  }

  const sheet = ss.getSheetByName(cepreSheetName);
  if (!sheet) {
    console.log(`Hoja "${cepreSheetName}" no encontrada`);
    return [];
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const colIndices = unaGetCepreColumnIndices_(headers);

  const isBancoSheet = cepreSheetName.startsWith('Banco_');

  const filteredQuestions = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const questionText = row[colIndices.questionText];
    if (!questionText || questionText === '') continue;

    if (!isBancoSheet) {
      const rowArea = String(row[colIndices.area] || '').trim().toUpperCase();
      const rowSemana = String(row[colIndices.semana] || '').trim().toUpperCase();

      if (rowArea !== areaCode) continue;
      if (semana && rowSemana !== semana.toUpperCase()) continue;
    }

    filteredQuestions.push({ rowIndex: i, data: row });
  }

  const selectedQuestions = selectRandomItems(filteredQuestions, count);
  const pointsPerQuestion = count > 0 ? maxScore / count : 0;

  return selectedQuestions.map((q, index) => {
    const formatted = unaFormatCepreQuestion_(q.data, colIndices, subjectName, startingNumber + index, q.rowIndex);
    formatted.points = pointsPerQuestion;
    return formatted;
  });
}

/**
 * Mapea un nombre de asignatura del config a la hoja CEPRE correspondiente.
 */
function unaMapSubjectToCepreSheet_(subjectName, areaCode) {
  if (subjectName === 'Historia' || subjectName === 'Geografía') {
    return CEPRE_SUBJECT_SHEETS[subjectName];
  }

  if (subjectName === 'Biología y Anatomía') {
    if (areaCode === 'BIO') {
      return CEPRE_SUBJECT_SHEETS['Biología y Anatomía'];
    }
    return CEPRE_SUBJECT_SHEETS['Biología y Anatomía'];
  }

  if (subjectName === 'Comunicación' || subjectName === 'Literatura') {
    if (areaCode === 'ING' || areaCode === 'BIO') {
      return CEPRE_SUBJECT_SHEETS['Comunicación y Literatura'];
    }
    return CEPRE_SUBJECT_SHEETS[subjectName];
  }

  const mathSubjects = ['Aritmética', 'Álgebra', 'Geometría', 'Trigonometría'];
  if (mathSubjects.includes(subjectName)) {
    if (areaCode === 'BIO' || areaCode === 'SOC') {
      return CEPRE_SUBJECT_SHEETS['Matemática'];
    }
    return CEPRE_SUBJECT_SHEETS[subjectName];
  }

  return CEPRE_SUBJECT_SHEETS[subjectName];
}

/**
 * Obtiene indices de columnas para hojas CEPRE.
 */
function unaGetCepreColumnIndices_(headers) {
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
    area: headers.indexOf('AREA'),
    semana: headers.indexOf('SEMANA')
  };
}

/**
 * Formatea una pregunta CEPRE.
 */
function unaFormatCepreQuestion_(row, colIndices, course, number, rowIndex) {
  const options = [
    formatCellValue(row[colIndices.option1]),
    formatCellValue(row[colIndices.option2]),
    formatCellValue(row[colIndices.option3]),
    formatCellValue(row[colIndices.option4]),
    formatCellValue(row[colIndices.option5])
  ].filter(opt => opt && opt !== '');

  const correctAnswerIndex = (parseInt(row[colIndices.correctAnswer]) || 1) - 1;

  return {
    id: `cepre-${course}-${rowIndex}`,
    number: number,
    questionText: formatCellValue(row[colIndices.questionText]),
    questionType: row[colIndices.questionType] || 'Multiple Choice',
    options: options,
    correctAnswer: correctAnswerIndex,
    timeSeconds: 180,
    imageLink: row[colIndices.imageLink] || null,
    subject: course,
    sourceFile: row[colIndices.sourceFile] || null,
    justification: formatCellValue(row[colIndices.justification]) || null,
    area: row[colIndices.area] || null,
    semana: row[colIndices.semana] || null,
    metadata: {
      numero: row[colIndices.numero],
      tema: row[colIndices.tema],
      subtema: row[colIndices.subtema]
    }
  };
}

/**
 * Obtiene la lista de cursos CEPREUNA disponibles por area.
 */
function unaGetCepreCourses(area) {
  if (area && CEPRE_COURSES_BY_AREA[area.toUpperCase()]) {
    return {
      area: area.toUpperCase(),
      courses: CEPRE_COURSES_BY_AREA[area.toUpperCase()]
    };
  }

  return {
    areas: Object.keys(CEPRE_COURSES_BY_AREA),
    coursesByArea: CEPRE_COURSES_BY_AREA,
    allCourses: [...new Set(Object.values(CEPRE_COURSES_BY_AREA).flat())]
  };
}

/**
 * Obtiene las semanas disponibles para un curso CEPREUNA.
 */
function unaGetCepreSemanas(course, area) {
  if (!course) {
    return { semanas: CEPRE_SEMANAS };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetName = CEPRE_SUBJECT_SHEETS[course];

  if (!sheetName) {
    return { error: 'Curso no válido', semanas: [] };
  }

  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return { semanas: CEPRE_SEMANAS };
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { semanas: [] };
  }

  const headers = data[0];
  const areaIndex = headers.indexOf('AREA');
  const semanaIndex = headers.indexOf('SEMANA');

  if (semanaIndex === -1) {
    return { semanas: CEPRE_SEMANAS };
  }

  const semanasSet = new Set();
  for (let i = 1; i < data.length; i++) {
    const rowArea = String(data[i][areaIndex] || '').trim().toUpperCase();
    const rowSemana = String(data[i][semanaIndex] || '').trim().toUpperCase();

    if (area && rowArea !== area.toUpperCase()) continue;
    if (rowSemana) {
      semanasSet.add(rowSemana);
    }
  }

  const semanas = Array.from(semanasSet).sort((a, b) => {
    const numA = parseInt(a.replace('S', ''));
    const numB = parseInt(b.replace('S', ''));
    return numA - numB;
  });

  return {
    course: course,
    area: area || 'TODAS',
    semanas: semanas
  };
}

// ============================================
// BANQUEO POR TEMA (legado)
// ============================================

/**
 * Obtiene todos los cursos disponibles con conteo de preguntas.
 * Cache 30 min (misma clave que la version legada).
 */
function unaGetCursosConTemas() {
  const cache = CacheService.getScriptCache();
  const cacheKeyLegacy = 'cursos_con_temas_v2';
  const cached = cache.get(cacheKeyLegacy);

  if (cached) {
    return JSON.parse(cached);
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const cursosMap = {};

  for (const sheetName of ALL_BANCO_SHEETS) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) continue;

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) continue;

    const headers = data[0];
    const cursoIndex = headers.indexOf('CURSO');
    const questionTextIndex = headers.indexOf('Question Text');

    if (cursoIndex === -1 || questionTextIndex === -1) continue;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const cursoRaw = String(row[cursoIndex] || '').trim();
      const questionText = row[questionTextIndex];

      if (!cursoRaw || !questionText) continue;

      const cursoCanonical = getCursoCanonical(cursoRaw);
      if (!cursoCanonical) continue;

      if (!cursosMap[cursoCanonical]) {
        cursosMap[cursoCanonical] = 0;
      }
      cursosMap[cursoCanonical]++;
    }
  }

  const cursos = Object.entries(cursosMap)
    .map(([nombre, count]) => ({ nombre, count }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const result = {
    totalCursos: cursos.length,
    cursos: cursos
  };

  cache.put(cacheKeyLegacy, JSON.stringify(result), 1800);

  return result;
}

/**
 * Obtiene los temas disponibles para un curso especifico.
 */
function unaGetTemasPorCurso(curso) {
  const cache = CacheService.getScriptCache();
  const cursoCanonicalBuscado = getCursoCanonical(curso) || curso;
  const cacheKeyLegacy = 'temas_' + cursoCanonicalBuscado.replace(/\s/g, '_');
  const cached = cache.get(cacheKeyLegacy);

  if (cached) {
    return JSON.parse(cached);
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const temasMap = {};

  for (const sheetName of ALL_BANCO_SHEETS) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) continue;

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) continue;

    const headers = data[0];
    const cursoIndex = headers.indexOf('CURSO');
    const temaIndex = headers.indexOf('TEMA');
    const questionTextIndex = headers.indexOf('Question Text');

    if (cursoIndex === -1 || questionTextIndex === -1) continue;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowCursoRaw = String(row[cursoIndex] || '').trim();
      const tema = String(row[temaIndex] || '').trim();
      const questionText = row[questionTextIndex];

      if (!questionText || !rowCursoRaw) continue;

      const rowCursoCanonical = getCursoCanonical(rowCursoRaw);
      if (!rowCursoCanonical || rowCursoCanonical !== cursoCanonicalBuscado) continue;

      const temaKey = tema || 'Sin tema';
      if (!temasMap[temaKey]) {
        temasMap[temaKey] = 0;
      }
      temasMap[temaKey]++;
    }
  }

  const temas = Object.entries(temasMap)
    .map(([nombre, count]) => ({ nombre, count }))
    .sort((a, b) => {
      if (a.nombre === 'Sin tema') return 1;
      if (b.nombre === 'Sin tema') return -1;
      return a.nombre.localeCompare(b.nombre, 'es');
    });

  const totalPreguntas = temas.reduce((sum, t) => sum + t.count, 0);

  const result = {
    curso: cursoCanonicalBuscado,
    totalPreguntas: totalPreguntas,
    totalTemas: temas.length,
    temas: temas
  };

  cache.put(cacheKeyLegacy, JSON.stringify(result), 1800);

  return result;
}

/**
 * Obtiene los subtemas disponibles para un curso y tema especificos.
 */
function unaGetSubtemasPorTema(curso, tema) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const subtemasMap = {};

  const cursoCanonicalBuscado = getCursoCanonical(curso) || curso;

  for (const sheetName of ALL_BANCO_SHEETS) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) continue;

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) continue;

    const headers = data[0];
    const cursoIndex = headers.indexOf('CURSO');
    const temaIndex = headers.indexOf('TEMA');
    const subtemaIndex = headers.indexOf('SUBTEMA');
    const questionTextIndex = headers.indexOf('Question Text');

    if (cursoIndex === -1 || questionTextIndex === -1) continue;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowCursoRaw = String(row[cursoIndex] || '').trim();
      const rowTema = String(row[temaIndex] || '').trim();
      const subtema = String(row[subtemaIndex] || '').trim();
      const questionText = row[questionTextIndex];

      if (!questionText || !rowCursoRaw) continue;

      const rowCursoCanonical = getCursoCanonical(rowCursoRaw);
      if (!rowCursoCanonical || rowCursoCanonical !== cursoCanonicalBuscado) continue;
      if (normalizeString(rowTema) !== normalizeString(tema)) continue;

      const subtemaKey = subtema || 'Sin subtema';
      if (!subtemasMap[subtemaKey]) {
        subtemasMap[subtemaKey] = 0;
      }
      subtemasMap[subtemaKey]++;
    }
  }

  const subtemas = Object.entries(subtemasMap)
    .map(([nombre, count]) => ({ nombre, count }))
    .sort((a, b) => {
      if (a.nombre === 'Sin subtema') return 1;
      if (b.nombre === 'Sin subtema') return -1;
      return a.nombre.localeCompare(b.nombre, 'es');
    });

  const totalPreguntas = subtemas.reduce((sum, s) => sum + s.count, 0);

  return {
    curso: cursoCanonicalBuscado,
    tema: tema,
    totalPreguntas: totalPreguntas,
    totalSubtemas: subtemas.length,
    subtemas: subtemas
  };
}

/**
 * Obtiene preguntas filtradas por curso, tema y subtema.
 */
function unaGetBanqueoByTema(curso, tema, subtema, count) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const allQuestions = [];

  const cursoCanonicalBuscado = getCursoCanonical(curso) || curso;

  for (const sheetName of ALL_BANCO_SHEETS) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) continue;

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) continue;

    const headers = data[0];
    const colIndices = {
      questionText: headers.indexOf('Question Text'),
      questionType: headers.indexOf('Question Type'),
      option1: headers.indexOf('Option 1'),
      option2: headers.indexOf('Option 2'),
      option3: headers.indexOf('Option 3'),
      option4: headers.indexOf('Option 4'),
      option5: headers.indexOf('Option 5'),
      correctAnswer: headers.indexOf('Correct Answer'),
      imageLink: headers.indexOf('Image Link'),
      curso: headers.indexOf('CURSO'),
      tema: headers.indexOf('TEMA'),
      subtema: headers.indexOf('SUBTEMA'),
      sourceFile: headers.indexOf('NOMBRE DEL ARCHIVO'),
      justification: headers.indexOf('JUSTIFICACION')
    };

    if (colIndices.questionText === -1 || colIndices.curso === -1) continue;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const questionText = row[colIndices.questionText];
      const rowCursoRaw = String(row[colIndices.curso] || '').trim();
      const rowTema = String(row[colIndices.tema] || '').trim();
      const rowSubtema = String(row[colIndices.subtema] || '').trim();

      if (!questionText || !rowCursoRaw) continue;

      const rowCursoCanonical = getCursoCanonical(rowCursoRaw);
      if (!rowCursoCanonical || rowCursoCanonical !== cursoCanonicalBuscado) continue;

      if (tema && normalizeString(rowTema) !== normalizeString(tema)) continue;
      if (subtema && normalizeString(rowSubtema) !== normalizeString(subtema)) continue;

      allQuestions.push({ sheetName: sheetName, rowIndex: i, data: row, colIndices: colIndices });
    }
  }

  let selectedQuestions;
  if (count === null || count === undefined || count >= allQuestions.length) {
    selectedQuestions = shuffleArray(allQuestions);
  } else {
    selectedQuestions = selectRandomItems(allQuestions, count);
  }

  const questions = selectedQuestions.map((q, index) => {
    const row = q.data;
    const ci = q.colIndices;

    const options = [
      formatCellValue(row[ci.option1]),
      formatCellValue(row[ci.option2]),
      formatCellValue(row[ci.option3]),
      formatCellValue(row[ci.option4]),
      formatCellValue(row[ci.option5])
    ].filter(opt => opt && opt !== '');

    const correctAnswerIndex = (parseInt(row[ci.correctAnswer]) || 1) - 1;

    return {
      id: `tema-${q.sheetName}-${q.rowIndex}`,
      number: index + 1,
      questionText: formatCellValue(row[ci.questionText]),
      questionType: row[ci.questionType] || 'Multiple Choice',
      options: options,
      correctAnswer: correctAnswerIndex,
      imageLink: row[ci.imageLink] || null,
      subject: cursoCanonicalBuscado,
      tema: String(row[ci.tema] || '').trim(),
      subtema: String(row[ci.subtema] || '').trim(),
      sourceFile: row[ci.sourceFile] || null,
      justification: formatCellValue(row[ci.justification]) || null
    };
  });

  return {
    curso: cursoCanonicalBuscado,
    tema: tema || 'TODOS',
    subtema: subtema || 'TODOS',
    totalQuestions: questions.length,
    totalAvailable: allQuestions.length,
    questions: questions
  };
}
