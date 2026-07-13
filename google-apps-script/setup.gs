/**
 * SimulaUNA - SETUP
 * ============================================
 * Funciones ejecutables SOLO desde el editor de Apps Script (nunca desde
 * el router HTTP):
 * - setupCore(): crea el spreadsheet CORE con todas las hojas/headers del
 *   contrato §1, registra la fila 'una' y guarda CORE_SPREADSHEET_ID.
 * - seedPilotoUNSA(): crea un spreadsheet de ejemplo para UNSA (piloto)
 *   con config_examen/config_escala/2 bancos de ejemplo y lo registra.
 * - healthCheck(): suite 0-FAIL que compara la forma de las respuestas
 *   legadas contra lo que produce actualmente production (api.gs).
 */

// ============================================
// setupCore
// ============================================

/**
 * Crea el spreadsheet CORE (si no existe uno ya apuntado por
 * CORE_SPREADSHEET_ID), con todas las hojas y encabezados del contrato,
 * registra la fila 'una' y guarda el ID en Script Properties. Loggea el
 * ID resultante (Ver > Registros en el editor de Apps Script).
 */
function setupCore() {
  const props = PropertiesService.getScriptProperties();
  let ss;
  const existingId = props.getProperty('CORE_SPREADSHEET_ID');

  if (existingId) {
    try {
      ss = SpreadsheetApp.openById(existingId);
      console.log('CORE ya existente, reutilizando: ' + existingId);
    } catch (err) {
      console.log('CORE_SPREADSHEET_ID configurado pero inaccesible, se creará uno nuevo.');
    }
  }

  if (!ss) {
    ss = SpreadsheetApp.create('SimulaUNA - CORE');
    props.setProperty('CORE_SPREADSHEET_ID', ss.getId());
  }

  setupSheetWithHeaders_(ss, 'universidades', [
    'codigo', 'nombre', 'nombre_corto', 'spreadsheet_id', 'estado', 'procesos',
    'cepre_nombre', 'color_primario', 'color_secundario', 'logo', 'orden'
  ]);
  setupSheetWithHeaders_(ss, 'usuarios', ['fecha', 'dni', 'nombre', 'email', 'celular', 'universidades_interes']);
  setupSheetWithHeaders_(ss, 'permisos', ['dni', 'universidad', 'modalidad', 'estado', 'fecha']);
  setupSheetWithHeaders_(ss, 'intentos', ['dni', 'universidad', 'proceso', 'fecha']);
  setupSheetWithHeaders_(ss, 'historial', ['dni', 'universidad', 'proceso', 'fecha', 'division', 'puntaje', 'puntaje_max', 'correctas', 'total', 'porcentaje']);
  setupSheetWithHeaders_(ss, 'cursos_canonicos', ['variante', 'canonico']);
  setupSheetWithHeaders_(ss, 'sesiones', ['exam_session_id', 'universidad', 'division', 'proceso', 'payload_json', 'creado']);

  // Registrar la fila 'una' si todavía no existe.
  const universidadesSheet = ss.getSheetByName('universidades');
  const data = universidadesSheet.getDataRange().getValues();
  let unaExists = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === 'una') { unaExists = true; break; }
  }

  if (!unaExists) {
    universidadesSheet.appendRow([
      'una',
      'Universidad Nacional del Altiplano',
      'UNA Puno',
      SPREADSHEET_ID,
      'activa',
      'ORDINARIO,CEPRE',
      'CEPREUNA',
      '#7A0019',
      '#FFC72C',
      '/logos/una.svg',
      0
    ]);
  }

  console.log('setupCore() completo. CORE_SPREADSHEET_ID = ' + ss.getId());
  console.log('URL: ' + ss.getUrl());
  return ss.getId();
}

/** Crea la hoja con encabezados en negrita si no existe todavía. */
function setupSheetWithHeaders_(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const alreadyHasHeaders = headers.every(function (h, i) { return firstRow[i] === h; });
  if (!alreadyHasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

// ============================================
// seedPilotoUNSA
// ============================================

// Las 16 columnas del formato excel de banco (iguales a las hojas Banco_
// legadas de UNA) + las 6 columnas nuevas del layout v2.
const V2_BANCO_HEADERS_ = [
  'Question Text', 'Question Type', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Option 5',
  'Correct Answer', 'Time in seconds', 'Image Link', 'NUMERO', 'CURSO', 'TEMA', 'SUBTEMA',
  'NOMBRE DEL ARCHIVO', 'JUSTIFICACION',
  'ID_HASH', 'PROCESO', 'ANIO_PERIODO', 'DIVISION', 'SEMANA', 'ESTADO'
];

/**
 * Crea un spreadsheet de ejemplo para UNSA (piloto): divisiones reales
 * BIO/ING/SOC, motor 'decimas' con una escala distinta a UNA (0-100), y
 * 2 bancos de ejemplo (Aritmética y Razonamiento Verbal) con 5 preguntas
 * dummy cada uno, ESTADO='activa'. Registra la universidad como estado
 * 'piloto' en CORE.universidades. Requiere haber corrido setupCore() antes.
 */
function seedPilotoUNSA() {
  const props = PropertiesService.getScriptProperties();
  const coreId = props.getProperty('CORE_SPREADSHEET_ID');
  if (!coreId) {
    throw new Error('Corre setupCore() primero: falta CORE_SPREADSHEET_ID en Script Properties.');
  }

  const unsaSs = SpreadsheetApp.create('SimulaUNA - UNSA (piloto)');

  // ---- config_examen: divisiones reales de UNSA (BIO, ING, SOC) ----
  const configExamenSheet = setupSheetWithHeaders_(unsaSs, 'config_examen', [
    'proceso', 'division', 'division_tipo', 'curso', 'n_preguntas',
    'puntos_correcta', 'puntos_incorrecta', 'peso', 'orden'
  ]);
  // puntos_correcta=10 x 5 preguntas x 2 cursos = 100 puntos máx. por
  // división, calibrado 1:1 con escala_total=100 de config_escala.
  const configExamenRows = [
    ['ORDINARIO', 'BIO', 'area', 'Aritmética', 5, 10, -2.5, 1, 1],
    ['ORDINARIO', 'BIO', 'area', 'Razonamiento Verbal', 5, 10, -2.5, 1, 2],
    ['ORDINARIO', 'ING', 'area', 'Aritmética', 5, 10, -2.5, 1, 1],
    ['ORDINARIO', 'ING', 'area', 'Razonamiento Verbal', 5, 10, -2.5, 1, 2],
    ['ORDINARIO', 'SOC', 'area', 'Aritmética', 5, 10, -2.5, 1, 1],
    ['ORDINARIO', 'SOC', 'area', 'Razonamiento Verbal', 5, 10, -2.5, 1, 2]
  ];
  configExamenSheet.getRange(2, 1, configExamenRows.length, configExamenRows[0].length).setValues(configExamenRows);

  // ---- config_escala: motor 'decimas', escala 0-100 (distinta a UNA) ----
  const configEscalaSheet = setupSheetWithHeaders_(unsaSs, 'config_escala', [
    'proceso', 'motor', 'escala_total', 'umbral_excelente', 'umbral_bueno', 'umbral_regular',
    'duracion_min', 'n_preguntas_total'
  ]);
  configEscalaSheet.getRange(2, 1, 1, 8).setValues([
    ['ORDINARIO', 'decimas', 100, 80, 60, 40, 90, 10]
  ]);

  // ---- Banco_Aritmética y Banco_Razonamiento Verbal (5 preguntas dummy c/u) ----
  seedDummyBancoSheet_(unsaSs, 'Aritmética', [
    ['¿Cuánto es 2 + 2?', '1', '2', '3', '4', '5'],
    ['¿Cuánto es 5 × 3?', '10', '12', '15', '18', '20'],
    ['¿Cuál es la raíz cuadrada de 81?', '7', '8', '9', '10', '11'],
    ['¿Cuánto es 100 ÷ 4?', '20', '25', '30', '35', '40'],
    ['¿Cuánto es 7 - 3?', '2', '3', '4', '5', '6']
  ], [3, 3, 3, 2, 3]);

  seedDummyBancoSheet_(unsaSs, 'Razonamiento Verbal', [
    ['Sinónimo de "feliz":', 'Triste', 'Alegre', 'Enojado', 'Cansado', 'Serio'],
    ['Antónimo de "grande":', 'Enorme', 'Amplio', 'Pequeño', 'Vasto', 'Extenso'],
    ['Completa: perro es a ladrar como gato es a...', 'Correr', 'Maullar', 'Volar', 'Nadar', 'Saltar'],
    ['Sinónimo de "rápido":', 'Lento', 'Veloz', 'Pausado', 'Tranquilo', 'Suave'],
    ['Antónimo de "claro":', 'Luminoso', 'Brillante', 'Oscuro', 'Transparente', 'Nítido']
  ], [2, 3, 2, 2, 3]);

  // ---- backlog_imagenes (vacío, solo headers, por contrato §1) ----
  setupSheetWithHeaders_(unsaSs, 'backlog_imagenes', ['id_hash', 'curso', 'source_file', 'detalle']);

  // ---- Registrar en CORE.universidades como piloto ----
  const coreSs = SpreadsheetApp.openById(coreId);
  const universidadesSheet = coreSs.getSheetByName('universidades') || setupSheetWithHeaders_(coreSs, 'universidades', [
    'codigo', 'nombre', 'nombre_corto', 'spreadsheet_id', 'estado', 'procesos',
    'cepre_nombre', 'color_primario', 'color_secundario', 'logo', 'orden'
  ]);

  const data = universidadesSheet.getDataRange().getValues();
  let existingRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === 'unsa') { existingRow = i + 1; break; }
  }

  const row = [
    'unsa',
    'Universidad Nacional de San Agustín',
    'UNSA',
    unsaSs.getId(),
    'piloto',
    'ORDINARIO',
    'CEPRUNSA',
    '#8B0000',
    '#FFFFFF',
    '/logos/unsa.svg',
    1
  ];

  if (existingRow > 0) {
    universidadesSheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
  } else {
    universidadesSheet.appendRow(row);
  }

  // Invalidar cache del registro para que getUniversidades la vea de inmediato.
  try { CacheService.getScriptCache().remove('core:universidades'); } catch (err) { /* no-op */ }

  console.log('seedPilotoUNSA() completo. Spreadsheet UNSA = ' + unsaSs.getId());
  console.log('URL: ' + unsaSs.getUrl());
  return unsaSs.getId();
}

/** Crea (o reescribe) una hoja Banco_<curso> con N preguntas dummy activas. */
function seedDummyBancoSheet_(ss, curso, preguntas, correctAnswers) {
  const sheetName = 'Banco_' + curso;
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  sheet.getRange(1, 1, 1, V2_BANCO_HEADERS_.length).setValues([V2_BANCO_HEADERS_]);
  sheet.getRange(1, 1, 1, V2_BANCO_HEADERS_.length).setFontWeight('bold');

  const rows = preguntas.map(function (p, index) {
    const questionText = p[0];
    const options = p.slice(1);
    const correct = correctAnswers[index];
    const idHash = Utilities.getUuid();

    return [
      questionText, 'Multiple Choice', options[0], options[1], options[2], options[3], options[4],
      correct, 60, '', index + 1, curso, 'Tema demo', 'Subtema demo',
      'seedPilotoUNSA', 'Justificación de ejemplo generada por seedPilotoUNSA().',
      idHash, 'ORDINARIO', '2026-I', '', '', 'activa'
    ];
  });

  sheet.getRange(2, 1, rows.length, V2_BANCO_HEADERS_.length).setValues(rows);
}

// ============================================
// healthCheck
// ============================================

/**
 * Suite ejecutable desde el editor: llama a los handlers legados (config,
 * questions area=Ingenierías, getCepreCourses, getCursosConTemas,
 * checkAccess dummy) a través de doGet() y verifica la FORMA de la
 * respuesta (no requiere datos reales en las hojas, solo que no truene y
 * que las claves esperadas existan). Imprime PASS/FAIL por caso y un
 * resumen final "0-FAIL".
 */
function healthCheck() {
  const results = [];

  function run(name, fn) {
    try {
      fn();
      results.push({ name: name, ok: true });
    } catch (err) {
      results.push({ name: name, ok: false, error: err.toString() });
    }
  }

  run('test (v2)', function () {
    const res = JSON.parse(doGet({ parameter: { action: 'test' } }).getContent());
    assertHC_(res.success === true, 'success debe ser true');
    assertHC_(res.data.status === 'ok', 'status debe ser ok');
    assertHC_(res.data.version === 'v2', 'version debe ser v2');
  });

  run('config (legado)', function () {
    const res = JSON.parse(doGet({ parameter: { action: 'config' } }).getContent());
    assertHC_(res.success === true, 'success debe ser true');
    assertHC_(typeof res.data === 'object', 'data debe ser un objeto');
    ['Ingenierías', 'Sociales', 'Biomédicas'].forEach(function (area) {
      assertHC_(!!res.data[area], 'debe incluir el área ' + area);
      assertHC_(Array.isArray(res.data[area].subjects), area + '.subjects debe ser array');
    });
  });

  run('questions area=Ingenierías (legado)', function () {
    const res = JSON.parse(doGet({ parameter: { action: 'questions', area: 'Ingenierías' } }).getContent());
    assertHC_(res.success === true, 'success debe ser true');
    assertHC_(Array.isArray(res.data), 'data debe ser un array de preguntas');
  });

  run('getCepreCourses (legado)', function () {
    const res = JSON.parse(doGet({ parameter: { action: 'getCepreCourses' } }).getContent());
    assertHC_(res.success === true, 'success debe ser true');
    assertHC_(Array.isArray(res.data.areas), 'debe incluir areas[]');
    assertHC_(!!res.data.coursesByArea, 'debe incluir coursesByArea');
  });

  run('getCursosConTemas (legado)', function () {
    const res = JSON.parse(doGet({ parameter: { action: 'getCursosConTemas' } }).getContent());
    assertHC_(res.success === true, 'success debe ser true');
    assertHC_(Array.isArray(res.data.cursos), 'data.cursos debe ser array');
    assertHC_(typeof res.data.totalCursos === 'number', 'totalCursos debe ser numérico');
  });

  run('checkAccess dummy (legado)', function () {
    const res = JSON.parse(doGet({ parameter: { action: 'checkAccess', dni: '00000000', email: 'healthcheck@example.com' } }).getContent());
    assertHC_(res.success === true, 'success debe ser true');
    assertHC_(typeof res.data.canAccess === 'boolean', 'canAccess debe ser boolean');
    assertHC_('reason' in res.data, 'debe incluir reason');
    assertHC_('attemptCount' in res.data, 'debe incluir attemptCount');
  });

  run('checkBanqueoAccess dummy (legado)', function () {
    const res = JSON.parse(doGet({ parameter: { action: 'checkBanqueoAccess', dni: '00000000', email: 'healthcheck@example.com' } }).getContent());
    assertHC_(res.success === true, 'success debe ser true');
    assertHC_(typeof res.data.canAccess === 'boolean', 'canAccess debe ser boolean');
  });

  run('getUniversidades (v2, incluye una)', function () {
    const res = JSON.parse(doGet({ parameter: { action: 'getUniversidades' } }).getContent());
    assertHC_(res.success === true, 'success debe ser true');
    assertHC_(res.data.some(function (u) { return u.codigo === 'una'; }), 'debe incluir una');
  });

  run('getConfig v2 default una', function () {
    const res = JSON.parse(doGet({ parameter: { action: 'getConfig' } }).getContent());
    assertHC_(res.success === true, 'success debe ser true');
    assertHC_(Array.isArray(res.data.divisiones), 'divisiones debe ser array');
    assertHC_(!!res.data.escala, 'debe incluir escala');
  });

  run('accion invalida devuelve error controlado', function () {
    const res = JSON.parse(doGet({ parameter: { action: 'estoNoExiste' } }).getContent());
    assertHC_(res.success === false, 'success debe ser false');
  });

  // ---- Reporte ----
  let failCount = 0;
  results.forEach(function (r) {
    if (r.ok) {
      console.log('PASS - ' + r.name);
    } else {
      failCount++;
      console.log('FAIL - ' + r.name + ' :: ' + r.error);
    }
  });

  console.log('\n=== healthCheck: ' + (results.length - failCount) + '/' + results.length + ' PASS, ' + failCount + '-FAIL ===');
  return { total: results.length, failed: failCount, results: results };
}

function assertHC_(condition, message) {
  if (!condition) throw new Error(message);
}
