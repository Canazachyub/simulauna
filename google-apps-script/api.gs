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

// Mapeo de asignaturas a hojas de banco de preguntas
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
      case 'test':
        result = { status: 'ok', message: 'API funcionando correctamente', timestamp: new Date().toISOString() };
        break;
      default:
        return createErrorResponse('Acción no válida. Use: config, questions, register, saveScore, getHistory, o test');
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
    sourceFile: headers.indexOf('NOMBRE DEL ARCHIVO')
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
