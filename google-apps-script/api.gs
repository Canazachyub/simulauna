/**
 * SimulaUNA - API REST para Google Apps Script
 *
 * INSTRUCCIONES DE CONFIGURACIÓN:
 * 1. Crear un nuevo proyecto en Google Apps Script (script.google.com)
 * 2. Copiar este código en el archivo Code.gs
 * 3. Actualizar SPREADSHEET_ID con el ID de tu Google Sheets
 * 4. Implementar como aplicación web:
 *    - Extensiones > Apps Script > Implementar > Nueva implementación
 *    - Tipo: Aplicación web
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquier persona
 * 5. Copiar la URL generada y usarla en el frontend
 */

// ============================================
// CONFIGURACIÓN - ACTUALIZAR CON TU SPREADSHEET
// ============================================
const SPREADSHEET_ID = '1U6Di8dSy-UZVkt7_L6VEexHPyBurEH0suDrUogcugVk';

// Nombres de las hojas de configuración
const CONFIG_SHEETS = {
  'Ingenierías': 'Configuración_Ingenierías',
  'Sociales': 'Configuración_Sociales',
  'Biomédicas': 'Configuración_Biomédicas'
};

// Mapeo de asignaturas a hojas de banco de preguntas (Bancos Históricos)
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

// ============================================
// CEPREUNA - Mapeo de hojas por curso
// ============================================
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

  // Idiomas - usar hojas del banco histórico (no hay CEPRE específico)
  'Inglés': 'Banco_Inglés',
  'Quechua y aimara': 'Banco_Quechua y aimara',
  'Quechua y Aimara': 'Banco_Quechua y aimara',

  // Cursos específicos por área
  'Biología': 'CEPRE_Biología',
  'Anatomía': 'CEPRE_Anatomía',
  'Biología y Anatomía': 'CEPRE_BiologíaAnatomía',
  'Matemática': 'CEPRE_Matemática',
  'Comunicación': 'CEPRE_Comunicación',
  'Comunicación y Literatura': 'CEPRE_ComunicaciónLiteratura',
  'Literatura': 'CEPRE_Literatura',
  'Geografía': 'CEPRE_Geografía'
};

// Cursos disponibles por área CEPREUNA (incluye Idiomas)
const CEPRE_COURSES_BY_AREA = {
  'ING': [
    'Aritmética', 'Álgebra', 'Geometría', 'Trigonometría',
    'Física', 'Química', 'Biología y Anatomía',
    'Psicología y Filosofía', 'Historia', 'Educación Cívica',
    'Economía', 'Comunicación y Literatura',
    'Razonamiento Matemático', 'Razonamiento Verbal',
    'Inglés', 'Quechua y aimara'
  ],
  'BIO': [
    'Aritmética', 'Matemática', 'Física', 'Química',
    'Biología', 'Anatomía', 'Psicología y Filosofía',
    'Historia', 'Educación Cívica', 'Economía',
    'Comunicación y Literatura', 'Razonamiento Matemático',
    'Razonamiento Verbal', 'Inglés', 'Quechua y aimara'
  ],
  'SOC': [
    'Matemática', 'Física', 'Química', 'Biología y Anatomía',
    'Psicología y Filosofía', 'Historia', 'Geografía',
    'Educación Cívica', 'Economía', 'Comunicación', 'Literatura',
    'Razonamiento Matemático', 'Razonamiento Verbal',
    'Inglés', 'Quechua y aimara'
  ]
};

// Semanas válidas CEPREUNA
const CEPRE_SEMANAS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'S14', 'S15', 'S16'];

// ============================================
// FUNCIÓN PRINCIPAL - ENDPOINT REST
// ============================================
function doGet(e) {
  try {
    const action = e.parameter.action;
    let result;

    switch (action) {
      case 'config':
        result = getConfig();
        break;
      case 'questions':
        const area = e.parameter.area;
        if (!area) {
          return createErrorResponse('Parámetro "area" requerido');
        }
        result = getQuestions(area);
        break;
      case 'register':
        const dni = e.parameter.dni || '';
        const fullName = e.parameter.fullName || '';
        const email = e.parameter.email || '';
        const phone = e.parameter.phone || '';
        const processType = e.parameter.processType || '';
        const areaReg = e.parameter.area || '';
        const career = e.parameter.career || '';
        result = registerUser(dni, fullName, email, phone, processType, areaReg, career);
        break;
      case 'saveScore':
        const scoreDni = e.parameter.dni || '';
        const score = parseFloat(e.parameter.score) || 0;
        const maxScore = parseFloat(e.parameter.maxScore) || 0;
        const scoreArea = e.parameter.area || '';
        const correctCount = parseInt(e.parameter.correct) || 0;
        const totalCount = parseInt(e.parameter.total) || 0;
        result = saveUserScore(scoreDni, score, maxScore, scoreArea, correctCount, totalCount);
        break;
      case 'getHistory':
        const historyDni = e.parameter.dni || '';
        if (!historyDni) {
          return createErrorResponse('Parámetro "dni" requerido');
        }
        result = getUserHistory(historyDni);
        break;
      case 'checkAccess':
        const accessDni = e.parameter.dni || '';
        const accessEmail = e.parameter.email || '';
        if (!accessDni) {
          return createErrorResponse('Parámetro "dni" requerido');
        }
        result = checkUserAccess(accessDni, accessEmail);
        break;
      case 'checkBanqueoAccess':
        const banqueoDni = e.parameter.dni || '';
        const banqueoEmail = e.parameter.email || '';
        if (!banqueoDni) {
          return createErrorResponse('Parámetro "dni" requerido');
        }
        result = checkBanqueoAccess(banqueoDni, banqueoEmail);
        break;
      case 'getBanqueoQuestions':
        const courseName = e.parameter.course || '';
        const questionCount = parseInt(e.parameter.count) || 10;
        if (!courseName) {
          return createErrorResponse('Parámetro "course" requerido');
        }
        result = getBanqueoQuestions(courseName, questionCount);
        break;
      // ============================================
      // CEPREUNA ENDPOINTS
      // ============================================
      case 'getCepreQuestions':
        const cepreCourse = e.parameter.course || '';
        const cepreArea = e.parameter.area || '';
        const cepreSemana = e.parameter.semana || '';
        const cepreCount = e.parameter.count ? parseInt(e.parameter.count) : null;
        if (!cepreCourse) {
          return createErrorResponse('Parámetro "course" requerido');
        }
        result = getCepreQuestions(cepreCourse, cepreArea, cepreSemana, cepreCount);
        break;
      case 'getCepreSimulacro':
        const simArea = e.parameter.area || '';
        const simSemana = e.parameter.semana || '';
        if (!simArea) {
          return createErrorResponse('Parámetro "area" requerido');
        }
        result = getCepreSimulacro(simArea, simSemana);
        break;
      case 'getCepreCourses':
        const coursesArea = e.parameter.area || '';
        result = getCepreCourses(coursesArea);
        break;
      case 'getCepreSemanas':
        const semanaCourse = e.parameter.course || '';
        const semanaArea = e.parameter.area || '';
        result = getCepreSemanas(semanaCourse, semanaArea);
        break;
      case 'test':
        result = { status: 'ok', message: 'API funcionando correctamente', timestamp: new Date().toISOString() };
        break;
      default:
        return createErrorResponse('Acción no válida. Use: config, questions, register, saveScore, getHistory, checkAccess, checkBanqueoAccess, getBanqueoQuestions, o test');
    }

    return createSuccessResponse(result);

  } catch (error) {
    return createErrorResponse(error.toString());
  }
}

// ============================================
// FUNCIONES DE RESPUESTA
// ============================================
function createSuccessResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function createErrorResponse(message) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// OBTENER CONFIGURACIÓN DE TODAS LAS ÁREAS
// ============================================
function getConfig() {
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

    // Encontrar índices de columnas
    const colIndices = {
      cod: headers.indexOf('COD.'),
      asignatura: headers.indexOf('ASIGNATURA'),
      puntajePregunta: headers.indexOf('PREGUNTA BIEN CONTESTADA'),
      cantidad: headers.indexOf('CANTIDAD DE PREGUNTAS'),
      ponderacion: headers.indexOf('PONDERACIÓN'),
      puntaje: headers.indexOf('PUNTAJE')
    };

    // Procesar filas de datos (saltar encabezado)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const asignatura = row[colIndices.asignatura];

      // Saltar filas vacías o la fila TOTAL
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

// ============================================
// OBTENER PREGUNTAS POR ÁREA (ORDENADAS POR ASIGNATURA)
// ============================================
function getQuestions(areaName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Validar área
  if (!CONFIG_SHEETS[areaName]) {
    throw new Error(`Área "${areaName}" no válida. Use: Ingenierías, Sociales, o Biomédicas`);
  }

  // Obtener configuración del área
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
  let questionNumber = 1; // Numeración global de preguntas

  // Por cada asignatura en la configuración (en orden)
  for (let i = 1; i < configData.length; i++) {
    const row = configData[i];
    const subjectName = row[colIndices.asignatura];
    const questionCount = parseInt(row[colIndices.cantidad]) || 0;
    const maxScore = parseFloat(row[colIndices.puntaje]) || 0;

    // Saltar filas vacías o TOTAL
    if (!subjectName || subjectName === 'TOTAL' || subjectName === '' || questionCount === 0) continue;

    // Obtener preguntas aleatorias de esta asignatura
    const subjectQuestions = getRandomQuestionsFromSubject(ss, subjectName, questionCount, maxScore, questionNumber);
    questions.push(...subjectQuestions);
    questionNumber += subjectQuestions.length;
  }

  // NO mezclar - mantener orden por asignatura según configuración
  return questions;
}

// ============================================
// OBTENER PREGUNTAS ALEATORIAS DE UNA ASIGNATURA
// ============================================
function getRandomQuestionsFromSubject(ss, subjectName, count, maxScore, startingNumber) {
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
  if (data.length <= 1) return []; // Solo encabezado o vacía

  const headers = data[0];

  // Encontrar índices de columnas del banco
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

  // Obtener todas las preguntas válidas (saltar encabezado)
  const allQuestions = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const questionText = row[colIndices.questionText];

    // Saltar filas sin pregunta
    if (!questionText || questionText === '') continue;

    allQuestions.push({
      rowIndex: i,
      data: row
    });
  }

  // Seleccionar N preguntas aleatorias
  const selectedQuestions = selectRandomItems(allQuestions, count);

  // Calcular puntos por pregunta
  const pointsPerQuestion = count > 0 ? maxScore / count : 0;

  // Formatear preguntas
  return selectedQuestions.map((q, index) => {
    const row = q.data;

    // Crear opciones (NO mezclar para mantener orden original)
    const options = [
      row[colIndices.option1],
      row[colIndices.option2],
      row[colIndices.option3],
      row[colIndices.option4],
      row[colIndices.option5]
    ].filter(opt => opt && opt !== ''); // Filtrar opciones vacías

    // La respuesta correcta es el índice 1-based, convertir a 0-based
    const correctAnswerIndex = (parseInt(row[colIndices.correctAnswer]) || 1) - 1;

    return {
      id: `${subjectName}-${q.rowIndex}`,
      number: startingNumber + index, // Número de pregunta global
      questionText: row[colIndices.questionText],
      questionType: row[colIndices.questionType] || 'Multiple Choice',
      options: options,
      correctAnswer: correctAnswerIndex, // Índice 0-based
      timeSeconds: 180, // 3 minutos por pregunta
      imageLink: row[colIndices.imageLink] || null,
      subject: subjectName,
      points: pointsPerQuestion,
      sourceFile: row[colIndices.sourceFile] || null, // Nombre del archivo fuente
      justification: row[colIndices.justification] || null, // Justificación de la respuesta
      metadata: {
        numero: row[colIndices.numero],
        tema: row[colIndices.tema],
        subtema: row[colIndices.subtema]
      }
    };
  });
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Mezcla un array usando el algoritmo Fisher-Yates
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Selecciona N elementos aleatorios de un array
 */
function selectRandomItems(array, count) {
  if (count >= array.length) {
    return shuffleArray(array);
  }

  const shuffled = shuffleArray(array);
  return shuffled.slice(0, count);
}

// ============================================
// REGISTRO DE USUARIOS
// ============================================

/**
 * Registra un usuario en la hoja "usuarios"
 * Columnas: Fecha | DNI | Nombre | Email | Celular | Proceso | Área | Carrera
 *
 * OPTIMIZACIÓN: Si el DNI ya existe, no duplica el registro.
 * Solo actualiza si el email o teléfono cambió.
 */
function registerUser(dni, fullName, email, phone, processType, area, career) {
  if (!dni) {
    return { registered: false, message: 'DNI requerido' };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('usuarios');

  // Crear hoja si no existe
  if (!sheet) {
    sheet = ss.insertSheet('usuarios');
    // Agregar encabezados
    sheet.appendRow(['Fecha', 'DNI', 'Nombre', 'Email', 'Celular', 'Proceso', 'Área', 'Carrera']);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
    // Ajustar ancho de columnas
    sheet.setColumnWidth(1, 150); // Fecha
    sheet.setColumnWidth(3, 250); // Nombre
    sheet.setColumnWidth(4, 220); // Email
    sheet.setColumnWidth(8, 350); // Carrera
  }

  // Buscar si el DNI ya existe
  const data = sheet.getDataRange().getValues();
  let existingRow = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === dni || data[i][1] === parseInt(dni)) {
      existingRow = i + 1; // +1 porque getRange es 1-indexed
      break;
    }
  }

  const timestamp = new Date();

  if (existingRow > 0) {
    // Usuario existe - actualizar solo si cambió email, teléfono o carrera
    const oldEmail = data[existingRow - 1][3];
    const oldPhone = data[existingRow - 1][4];
    const oldCareer = data[existingRow - 1][7];

    if (email !== oldEmail || phone !== oldPhone || career !== oldCareer) {
      // Actualizar datos que cambiaron
      sheet.getRange(existingRow, 1).setValue(timestamp); // Actualizar fecha
      sheet.getRange(existingRow, 4).setValue(email);
      sheet.getRange(existingRow, 5).setValue(phone);
      sheet.getRange(existingRow, 6).setValue(processType);
      sheet.getRange(existingRow, 7).setValue(area);
      sheet.getRange(existingRow, 8).setValue(career);
      return { registered: true, message: 'Datos de usuario actualizados', updated: true };
    }

    return { registered: true, message: 'Usuario ya registrado', existing: true };
  }

  // Usuario nuevo - agregar registro
  sheet.appendRow([timestamp, dni, fullName, email, phone, processType, area, career]);

  return { registered: true, message: 'Usuario registrado correctamente', new: true };
}

// ============================================
// HISTORIAL DE PUNTAJES
// ============================================

/**
 * Guarda el puntaje de un usuario en la hoja "historial_puntajes"
 * Busca al usuario por DNI y añade su puntaje con fecha
 */
function saveUserScore(dni, score, maxScore, area, correct, total) {
  if (!dni) {
    return { saved: false, message: 'DNI requerido' };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('historial_puntajes');

  // Crear hoja si no existe
  if (!sheet) {
    sheet = ss.insertSheet('historial_puntajes');
    // Encabezados
    sheet.appendRow(['DNI', 'Fecha', 'Área', 'Puntaje', 'Puntaje Máx', 'Correctas', 'Total', 'Porcentaje']);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
    sheet.setColumnWidth(1, 100);
    sheet.setColumnWidth(2, 150);
    sheet.setColumnWidth(3, 100);
  }

  // Calcular porcentaje
  const percentage = maxScore > 0 ? ((score / maxScore) * 100).toFixed(2) : 0;

  // Agregar nuevo registro
  const timestamp = new Date();
  sheet.appendRow([dni, timestamp, area, score.toFixed(2), maxScore.toFixed(2), correct, total, percentage + '%']);

  return { saved: true, message: 'Puntaje guardado correctamente' };
}

/**
 * Obtiene el historial de puntajes de un usuario por DNI
 */
function getUserHistory(dni) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('historial_puntajes');

  if (!sheet) {
    return { history: [], message: 'No hay historial disponible' };
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { history: [], message: 'No hay registros en el historial' };
  }

  // Buscar todos los registros del usuario por DNI
  const history = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] === dni || row[0] === parseInt(dni)) {
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

  // Ordenar por fecha (más reciente primero)
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
// FUNCIONES DE PRUEBA (ejecutar desde el editor)
// ============================================

/**
 * Prueba la función de configuración
 */
function testGetConfig() {
  const config = getConfig();
  console.log(JSON.stringify(config, null, 2));
}

/**
 * Prueba la función de preguntas
 */
function testGetQuestions() {
  const questions = getQuestions('Ingenierías');
  console.log(`Total preguntas: ${questions.length}`);
  console.log(JSON.stringify(questions.slice(0, 2), null, 2));
}

/**
 * Simula una llamada GET para pruebas
 */
function testDoGet() {
  // Test config
  const configResult = doGet({ parameter: { action: 'config' } });
  console.log('Config:', configResult.getContent());

  // Test questions
  const questionsResult = doGet({ parameter: { action: 'questions', area: 'Ingenierías' } });
  console.log('Questions:', questionsResult.getContent());
}

// ============================================
// VERIFICACIÓN DE ACCESO - DETECCIÓN DE FRAUDE
// ============================================

/**
 * Verifica si un usuario puede dar el simulacro con detección de fraude
 * - Primer registro: LIBRE (usuario nuevo, no existe en "usuarios")
 * - Si ya existe en "usuarios": Solo puede continuar si está en "confirmado"
 * - FRAUDE: Si el DNI o Email ya fueron usados con datos diferentes
 *
 * FLUJO:
 * 1. Usuario nuevo se registra → va a "usuarios" → primer simulacro gratis
 * 2. Si el DNI ya existe en "usuarios" → requiere estar en "confirmado"
 * 3. Admin mueve usuarios de "usuarios" a "confirmado" para dar acceso
 *
 * @param {string} dni - DNI del usuario
 * @param {string} email - Email del usuario
 * @returns {object} { canAccess: boolean, reason: string, attemptCount: number, isFraudAttempt: boolean }
 */
function checkUserAccess(dni, email) {
  if (!dni) {
    return { canAccess: false, reason: 'DNI requerido', attemptCount: 0 };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const emailLower = (email || '').toLowerCase().trim();

  // 1. Verificar en tabla "usuarios" si el DNI o Email ya existe
  const usersSheet = ss.getSheetByName('usuarios');
  let existsInUsuarios = false;
  let fraudAttempt = false;
  let fraudReason = '';
  let attemptCount = 0; // Cuenta registros en tabla usuarios

  if (usersSheet) {
    const usersData = usersSheet.getDataRange().getValues();
    // Columnas: Fecha | DNI | Nombre | Email | Celular | Proceso | Área | Carrera

    for (let i = 1; i < usersData.length; i++) {
      const rowDni = String(usersData[i][1]).trim();
      const rowEmail = String(usersData[i][3] || '').toLowerCase().trim();

      // Verificar si el DNI ya existe
      if (rowDni === dni || rowDni === String(parseInt(dni))) {
        existsInUsuarios = true;
        attemptCount++;

        // Verificar si es con DIFERENTE email (posible fraude)
        if (rowEmail !== '' && emailLower !== '' && rowEmail !== emailLower) {
          fraudAttempt = true;
          fraudReason = 'Este DNI ya está registrado con otro email';
        }
      }

      // Verificar si el Email ya existe con DIFERENTE DNI (posible fraude)
      if (rowEmail !== '' && emailLower !== '' && rowEmail === emailLower) {
        if (rowDni !== dni && rowDni !== String(parseInt(dni))) {
          fraudAttempt = true;
          fraudReason = 'Este email ya está registrado con otro DNI';
        }
      }
    }
  }

  // 2. Si detectamos fraude, denegar acceso
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

  // 3. Si NO existe en usuarios, es primer intento → LIBRE
  if (!existsInUsuarios) {
    return {
      canAccess: true,
      reason: 'Primer simulacro gratuito',
      attemptCount: 0,
      isFirstAttempt: true,
      isFraudAttempt: false
    };
  }

  // 4. Si YA existe en usuarios, verificar si está en hoja "confirmado"
  // AMBOS: DNI Y Email deben coincidir
  let confirmadoSheet = ss.getSheetByName('confirmado');

  // Crear hoja si no existe (con encabezados)
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

    // AMBOS deben coincidir para estar confirmado
    const dniMatch = (confDni === dni || confDni === String(parseInt(dni)));
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

  // Usuario ya registrado pero NO confirmado → denegar acceso
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
// BANQUEO HISTÓRICO - SOLO USUARIOS CONFIRMADOS
// ============================================

/**
 * Verifica si un usuario puede acceder al Banqueo Histórico
 * SOLO usuarios confirmados pueden acceder (NO hay intento gratis)
 *
 * @param {string} dni - DNI del usuario
 * @param {string} email - Email del usuario
 * @returns {object} { canAccess: boolean, reason: string }
 */
function checkBanqueoAccess(dni, email) {
  if (!dni) {
    return { canAccess: false, reason: 'DNI requerido' };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const emailLower = (email || '').toLowerCase().trim();

  // Verificar si está en hoja "confirmado"
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

    // AMBOS deben coincidir
    const dniMatch = (confDni === dni || confDni === String(parseInt(dni)));
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
 * Obtiene preguntas aleatorias de un curso específico para el Banqueo
 *
 * @param {string} courseName - Nombre del curso (ej: 'Aritmética', 'Física')
 * @param {number} count - Cantidad de preguntas (10, 15, o 20)
 * @returns {object} { course, totalQuestions, questions }
 */
function getBanqueoQuestions(courseName, count) {
  // Validar cantidad
  const validCounts = [10, 15, 20];
  if (!validCounts.includes(count)) {
    count = 10; // Default
  }

  // Validar que el curso existe
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

  // Encontrar índices de columnas
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

  // Obtener todas las preguntas válidas
  const allQuestions = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const questionText = row[colIndices.questionText];

    if (!questionText || questionText === '') continue;

    allQuestions.push({
      rowIndex: i,
      data: row
    });
  }

  // Si no hay suficientes preguntas, ajustar count
  if (count > allQuestions.length) {
    count = allQuestions.length;
  }

  // Seleccionar preguntas aleatorias
  const selectedQuestions = selectRandomItems(allQuestions, count);

  // Formatear preguntas
  const questions = selectedQuestions.map((q, index) => {
    const row = q.data;

    const options = [
      row[colIndices.option1],
      row[colIndices.option2],
      row[colIndices.option3],
      row[colIndices.option4],
      row[colIndices.option5]
    ].filter(opt => opt && opt !== '');

    const correctAnswerIndex = (parseInt(row[colIndices.correctAnswer]) || 1) - 1;

    return {
      id: `banqueo-${courseName}-${q.rowIndex}`,
      number: index + 1,
      questionText: row[colIndices.questionText],
      questionType: row[colIndices.questionType] || 'Multiple Choice',
      options: options,
      correctAnswer: correctAnswerIndex,
      imageLink: row[colIndices.imageLink] || null,
      subject: courseName,
      sourceFile: row[colIndices.sourceFile] || null,
      justification: row[colIndices.justification] || null,
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
 * Obtiene la lista de cursos disponibles para el Banqueo
 */
function getAvailableCourses() {
  return Object.keys(SUBJECT_SHEETS);
}

// ============================================
// CEPREUNA - FUNCIONES DE BANQUEO Y SIMULACRO
// ============================================

/**
 * Obtiene preguntas CEPREUNA para el Banqueo
 *
 * MODO 1 - Cuadernillo: area + semana + course (sin count → trae TODAS)
 * MODO 2 - Curso General: course + area=ALL + count (mezcla 3 áreas)
 *
 * @param {string} course - Nombre del curso
 * @param {string} area - Área (ING, BIO, SOC) o 'ALL' para mezclar
 * @param {string} semana - Semana (S1-S16) o vacío para todas
 * @param {number|null} count - Cantidad de preguntas (null = todas)
 */
function getCepreQuestions(course, area, semana, count) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Validar curso
  const sheetName = CEPRE_SUBJECT_SHEETS[course];
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
  const colIndices = getCepreColumnIndices(headers);

  // Filtrar preguntas según área y semana
  const filteredQuestions = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const questionText = row[colIndices.questionText];
    if (!questionText || questionText === '') continue;

    const rowArea = String(row[colIndices.area] || '').trim().toUpperCase();
    const rowSemana = String(row[colIndices.semana] || '').trim().toUpperCase();

    // Filtrar por área (si no es ALL)
    if (area && area !== 'ALL' && rowArea !== area.toUpperCase()) continue;

    // Filtrar por semana (si se especifica)
    if (semana && rowSemana !== semana.toUpperCase()) continue;

    filteredQuestions.push({ rowIndex: i, data: row });
  }

  // Si count es null, traer TODAS (modo cuadernillo)
  // Si count tiene valor, seleccionar aleatoriamente
  let selectedQuestions;
  if (count === null || count === undefined) {
    selectedQuestions = filteredQuestions; // Todas las preguntas
  } else {
    const validCount = Math.min(count, filteredQuestions.length);
    selectedQuestions = selectRandomItems(filteredQuestions, validCount);
  }

  // Formatear preguntas
  const questions = selectedQuestions.map((q, index) => {
    return formatCepreQuestion(q.data, colIndices, course, index + 1, q.rowIndex);
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
 * Obtiene un simulacro completo CEPREUNA de 60 preguntas
 * Usa la misma configuración que el simulacro de admisión
 * pero toma preguntas de las hojas CEPRE_
 *
 * @param {string} area - Área del simulacro (Ingenierías, Biomédicas, Sociales)
 * @param {string} semana - Semana específica o vacío para todas
 */
function getCepreSimulacro(area, semana) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Validar área
  if (!CONFIG_SHEETS[area]) {
    return { error: `Área "${area}" no válida. Use: Ingenierías, Sociales, o Biomédicas` };
  }

  // Mapear área a código CEPRE
  const areaCodes = {
    'Ingenierías': 'ING',
    'Biomédicas': 'BIO',
    'Sociales': 'SOC'
  };
  const areaCode = areaCodes[area];

  // Obtener configuración del área (distribución de preguntas)
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

  // Por cada asignatura en la configuración
  for (let i = 1; i < configData.length; i++) {
    const row = configData[i];
    const subjectName = row[colIndices.asignatura];
    const questionCount = parseInt(row[colIndices.cantidad]) || 0;
    const maxScore = parseFloat(row[colIndices.puntaje]) || 0;

    if (!subjectName || subjectName === 'TOTAL' || questionCount === 0) continue;

    // Obtener preguntas del banco CEPRE
    const subjectQuestions = getCepreQuestionsForSimulacro(
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
 * Obtiene preguntas CEPRE para el simulacro
 */
function getCepreQuestionsForSimulacro(ss, subjectName, areaCode, semana, count, maxScore, startingNumber) {
  // Mapear nombre de asignatura a hoja CEPRE correspondiente según área
  let cepreSheetName = mapSubjectToCepreSheet(subjectName, areaCode);

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
  const colIndices = getCepreColumnIndices(headers);

  // Detectar si es una hoja del banco histórico (no tiene columnas AREA/SEMANA)
  // Las hojas Banco_ no tienen estas columnas, así que no debemos filtrar por ellas
  const isBancoSheet = cepreSheetName.startsWith('Banco_');

  // Filtrar por área y semana (solo para hojas CEPRE_, no para Banco_)
  const filteredQuestions = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const questionText = row[colIndices.questionText];
    if (!questionText || questionText === '') continue;

    // Solo aplicar filtros de AREA/SEMANA si NO es hoja de banco histórico
    if (!isBancoSheet) {
      const rowArea = String(row[colIndices.area] || '').trim().toUpperCase();
      const rowSemana = String(row[colIndices.semana] || '').trim().toUpperCase();

      // Filtrar por área
      if (rowArea !== areaCode) continue;

      // Filtrar por semana (si se especifica)
      if (semana && rowSemana !== semana.toUpperCase()) continue;
    }

    filteredQuestions.push({ rowIndex: i, data: row });
  }

  // Seleccionar aleatoriamente
  const selectedQuestions = selectRandomItems(filteredQuestions, count);
  const pointsPerQuestion = count > 0 ? maxScore / count : 0;

  return selectedQuestions.map((q, index) => {
    const formatted = formatCepreQuestion(q.data, colIndices, subjectName, startingNumber + index, q.rowIndex);
    formatted.points = pointsPerQuestion;
    return formatted;
  });
}

/**
 * Mapea un nombre de asignatura del config a la hoja CEPRE correspondiente
 */
function mapSubjectToCepreSheet(subjectName, areaCode) {
  // Casos especiales según área
  if (subjectName === 'Biología y Anatomía') {
    if (areaCode === 'BIO') {
      // BIO tiene Biología y Anatomía separados - usar BiologíaAnatomía combinado
      // o alternar entre ambas hojas
      return 'CEPRE_Biología'; // O podríamos hacer una lógica especial
    }
    return CEPRE_SUBJECT_SHEETS['Biología y Anatomía'];
  }

  if (subjectName === 'Comunicación' || subjectName === 'Literatura') {
    if (areaCode === 'ING' || areaCode === 'BIO') {
      return CEPRE_SUBJECT_SHEETS['Comunicación y Literatura'];
    }
    return CEPRE_SUBJECT_SHEETS[subjectName];
  }

  // Para aritmética/álgebra/geometría/trigonometría en BIO y SOC → Matemática
  const mathSubjects = ['Aritmética', 'Álgebra', 'Geometría', 'Trigonometría'];
  if (mathSubjects.includes(subjectName) && (areaCode === 'SOC')) {
    return CEPRE_SUBJECT_SHEETS['Matemática'];
  }

  // Caso general
  return CEPRE_SUBJECT_SHEETS[subjectName];
}

/**
 * Obtiene índices de columnas para hojas CEPRE
 */
function getCepreColumnIndices(headers) {
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
 * Formatea una pregunta CEPRE
 */
function formatCepreQuestion(row, colIndices, course, number, rowIndex) {
  const options = [
    row[colIndices.option1],
    row[colIndices.option2],
    row[colIndices.option3],
    row[colIndices.option4],
    row[colIndices.option5]
  ].filter(opt => opt && opt !== '');

  const correctAnswerIndex = (parseInt(row[colIndices.correctAnswer]) || 1) - 1;

  return {
    id: `cepre-${course}-${rowIndex}`,
    number: number,
    questionText: row[colIndices.questionText],
    questionType: row[colIndices.questionType] || 'Multiple Choice',
    options: options,
    correctAnswer: correctAnswerIndex,
    timeSeconds: 180,
    imageLink: row[colIndices.imageLink] || null,
    subject: course,
    sourceFile: row[colIndices.sourceFile] || null,
    justification: row[colIndices.justification] || null,
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
 * Obtiene la lista de cursos CEPREUNA disponibles por área
 */
function getCepreCourses(area) {
  if (area && CEPRE_COURSES_BY_AREA[area.toUpperCase()]) {
    return {
      area: area.toUpperCase(),
      courses: CEPRE_COURSES_BY_AREA[area.toUpperCase()]
    };
  }

  // Si no se especifica área, retornar todos
  return {
    areas: Object.keys(CEPRE_COURSES_BY_AREA),
    coursesByArea: CEPRE_COURSES_BY_AREA,
    allCourses: [...new Set(Object.values(CEPRE_COURSES_BY_AREA).flat())]
  };
}

/**
 * Obtiene las semanas disponibles para un curso CEPREUNA
 */
function getCepreSemanas(course, area) {
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
    return { semanas: CEPRE_SEMANAS }; // Retornar todas por defecto
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

    // Filtrar por área si se especifica
    if (area && rowArea !== area.toUpperCase()) continue;

    if (rowSemana) {
      semanasSet.add(rowSemana);
    }
  }

  // Ordenar semanas
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
// FUNCIONES DE PRUEBA ADICIONALES
// ============================================

function testCheckAccess() {
  const result = checkUserAccess('12345678', 'test@email.com');
  console.log(JSON.stringify(result, null, 2));
}

function testBanqueo() {
  const result = getBanqueoQuestions('Aritmética', 10);
  console.log(`Total preguntas: ${result.totalQuestions}`);
  console.log(JSON.stringify(result.questions.slice(0, 2), null, 2));
}
