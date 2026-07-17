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

  // ---- Aula Virtual (v2.1, ver docs/CONTRATO_AULA_V21.md §2) ----
  setupSheetWithHeaders_(ss, 'ciclos', AULA_SHEET_HEADERS_.ciclos);
  setupSheetWithHeaders_(ss, 'matriculas', AULA_SHEET_HEADERS_.matriculas);
  setupSheetWithHeaders_(ss, 'pagos', AULA_SHEET_HEADERS_.pagos);
  setupSheetWithHeaders_(ss, 'horario', AULA_SHEET_HEADERS_.horario);
  setupSheetWithHeaders_(ss, 'docentes', AULA_SHEET_HEADERS_.docentes);
  setupSheetWithHeaders_(ss, 'materiales', AULA_SHEET_HEADERS_.materiales);
  setupSheetWithHeaders_(ss, 'grupos_whatsapp', AULA_SHEET_HEADERS_.grupos_whatsapp);
  setupSheetWithHeaders_(ss, 'anuncios', AULA_SHEET_HEADERS_.anuncios);
  setupSheetWithHeaders_(ss, 'clases_en_vivo', AULA_SHEET_HEADERS_.clases_en_vivo);
  setupSheetWithHeaders_(ss, 'grabaciones', AULA_SHEET_HEADERS_.grabaciones);
  setupSheetWithHeaders_(ss, 'recursos', AULA_SHEET_HEADERS_.recursos);

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
      '#003D7A',
      '#E67E22',
      '/logos/una.png',
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
    '#D4AF37',
    '/logos/unsa.png',
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
// seedAulaDemo
// ============================================

const AULA_DEMO_CICLO_ID_ = 'una-demo-2026-1';
const AULA_DEMO_DNI_ = '87654321';
const AULA_DEMO_EMAIL_ = 'demo.aula@simulauna.com';

/**
 * Crea datos de ejemplo del Aula Virtual (v2.1) para UNA: 1 ciclo con
 * inscripciones abiertas, 2 docentes, horario de una semana, 2 clases en
 * vivo futuras, 2 grabaciones (YouTube de ejemplo), 3 materiales, 1
 * anuncio, 1 grupo de WhatsApp, 1 recurso — y matricula a un alumno demo
 * (`AULA_DEMO_DNI_`) para poder probar `getAula` de punta a punta (incluye
 * 2 pagos: matrícula verificada + mensualidad 1 pendiente). Requiere haber
 * corrido `setupCore()` antes. Idempotente por lote: si el ciclo demo ya
 * tiene filas en una hoja, no la vuelve a poblar (evita duplicados en
 * corridas repetidas).
 */
function seedAulaDemo() {
  const props = PropertiesService.getScriptProperties();
  const coreId = props.getProperty('CORE_SPREADSHEET_ID');
  if (!coreId) {
    throw new Error('Corre setupCore() primero: falta CORE_SPREADSHEET_ID en Script Properties.');
  }
  const ss = SpreadsheetApp.openById(coreId);

  const hoy = new Date();
  const fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 3, 0);

  // ---- usuarios: alta del alumno demo (para que verifyDniEmail... no rechace getAula) ----
  const usuariosSheet = setupSheetWithHeaders_(ss, 'usuarios', ['fecha', 'dni', 'nombre', 'email', 'celular', 'universidades_interes']);
  if (aulaSeedFindRow_(usuariosSheet, 'dni', AULA_DEMO_DNI_) === -1) {
    usuariosSheet.appendRow([hoy, AULA_DEMO_DNI_, 'Estudiante Demo Aula', AULA_DEMO_EMAIL_, '900000000', 'una']);
  }

  // ---- ciclos ----
  const ciclosSheet = setupSheetWithHeaders_(ss, 'ciclos', AULA_SHEET_HEADERS_.ciclos);
  if (aulaSeedFindRow_(ciclosSheet, 'id_ciclo', AULA_DEMO_CICLO_ID_) === -1) {
    ciclosSheet.appendRow([
      AULA_DEMO_CICLO_ID_, 'una', 'Ciclo Demo UNA 2026', 'ORDINARIO', fechaInicio, fechaFin,
      'mañana', 40, 80, 150, 4, 'inscripciones_abiertas', 'https://wa.me/51900000000'
    ]);
  }

  // ---- matriculas: alumno demo matriculado ----
  const matriculasSheet = setupSheetWithHeaders_(ss, 'matriculas', AULA_SHEET_HEADERS_.matriculas);
  if (!aulaSeedHasRowForCiclo_(matriculasSheet, AULA_DEMO_CICLO_ID_, 'dni', AULA_DEMO_DNI_)) {
    matriculasSheet.appendRow([
      'mat-demo-1', AULA_DEMO_DNI_, 'una', AULA_DEMO_CICLO_ID_, hoy, 'matriculado', 'mañana', 'Matrícula de ejemplo (seedAulaDemo)'
    ]);
  }

  // ---- pagos: matrícula verificada + mensualidad 1 pendiente ----
  const pagosSheet = setupSheetWithHeaders_(ss, 'pagos', AULA_SHEET_HEADERS_.pagos);
  if (!aulaSeedHasRowForCiclo_(pagosSheet, AULA_DEMO_CICLO_ID_, 'dni', AULA_DEMO_DNI_)) {
    pagosSheet.appendRow([
      'pago-demo-1', AULA_DEMO_DNI_, AULA_DEMO_CICLO_ID_, 'matricula', 80, hoy, hoy, 'yape', 'verificado', 'captura enviada al grupo', 'Coordinación Demo'
    ]);
    pagosSheet.appendRow([
      'pago-demo-2', AULA_DEMO_DNI_, AULA_DEMO_CICLO_ID_, 'mensualidad_1', 150, hoy, '', 'yape', 'pendiente', '', ''
    ]);
  }

  // ---- docentes ----
  const docentesSheet = setupSheetWithHeaders_(ss, 'docentes', AULA_SHEET_HEADERS_.docentes);
  if (!aulaSeedHasRowFor_(docentesSheet, 'universidad', 'una', 'nombre', 'Prof. Rosa Quispe (demo)')) {
    docentesSheet.appendRow(['doc-demo-1', 'una', 'Prof. Rosa Quispe (demo)', 'Aritmética', '', 'Licenciada en Matemática, 9 años preparando postulantes']);
    docentesSheet.appendRow(['doc-demo-2', 'una', 'Prof. Luis Mamani (demo)', 'Comunicación', '', 'Literato, especialista en comprensión lectora']);
  }

  // ---- horario (una semana) ----
  const horarioSheet = setupSheetWithHeaders_(ss, 'horario', AULA_SHEET_HEADERS_.horario);
  if (!aulaSeedHasRowForCiclo_(horarioSheet, AULA_DEMO_CICLO_ID_, 'id_ciclo', AULA_DEMO_CICLO_ID_)) {
    const horarioRows = [
      [AULA_DEMO_CICLO_ID_, 'lunes', '08:00', '09:30', 'Aritmética', 'Prof. Rosa Quispe (demo)', 'virtual', 'https://meet.google.com/ejemplo-aula-demo', ''],
      [AULA_DEMO_CICLO_ID_, 'lunes', '09:45', '11:15', 'Comunicación', 'Prof. Luis Mamani (demo)', 'virtual', 'https://meet.google.com/ejemplo-aula-demo', ''],
      [AULA_DEMO_CICLO_ID_, 'martes', '08:00', '09:30', 'Álgebra', 'Prof. Rosa Quispe (demo)', 'virtual', 'https://meet.google.com/ejemplo-aula-demo', ''],
      [AULA_DEMO_CICLO_ID_, 'miercoles', '08:00', '09:30', 'Física', 'Prof. Rosa Quispe (demo)', 'presencial', '', 'Aula 302 - Sede Demo'],
      [AULA_DEMO_CICLO_ID_, 'sabado', '09:00', '11:00', 'Simulacro semanal', 'Coordinación', 'presencial', '', 'Aula 302 - Sede Demo']
    ];
    horarioRows.forEach(function (row) { horarioSheet.appendRow(row); });
  }

  // ---- clases_en_vivo (2 futuras) ----
  const clasesSheet = setupSheetWithHeaders_(ss, 'clases_en_vivo', AULA_SHEET_HEADERS_.clases_en_vivo);
  if (!aulaSeedHasRowForCiclo_(clasesSheet, AULA_DEMO_CICLO_ID_, 'id_ciclo', AULA_DEMO_CICLO_ID_)) {
    const enUnDia = new Date(hoy.getTime() + 24 * 60 * 60 * 1000);
    const enDosDias = new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000);
    clasesSheet.appendRow(['clase-demo-1', AULA_DEMO_CICLO_ID_, enUnDia, '08:00', '09:30', 'Aritmética', 'Prof. Rosa Quispe (demo)', 'meet', 'https://meet.google.com/ejemplo-aula-demo', 'programada']);
    clasesSheet.appendRow(['clase-demo-2', AULA_DEMO_CICLO_ID_, enDosDias, '09:45', '11:15', 'Comunicación', 'Prof. Luis Mamani (demo)', 'zoom', 'https://zoom.us/j/ejemplo-aula-demo', 'programada']);
  }

  // ---- grabaciones (2, YouTube de ejemplo) ----
  const grabacionesSheet = setupSheetWithHeaders_(ss, 'grabaciones', AULA_SHEET_HEADERS_.grabaciones);
  if (!aulaSeedHasRowForCiclo_(grabacionesSheet, AULA_DEMO_CICLO_ID_, 'id_ciclo', AULA_DEMO_CICLO_ID_)) {
    grabacionesSheet.appendRow(['grab-demo-1', AULA_DEMO_CICLO_ID_, hoy, 'Aritmética', 'Prof. Rosa Quispe (demo)', 'Clase 8 — Razones y proporciones', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 78]);
    grabacionesSheet.appendRow(['grab-demo-2', AULA_DEMO_CICLO_ID_, hoy, 'Comunicación', 'Prof. Luis Mamani (demo)', 'Clase 7 — Comprensión lectora inferencial', 'https://youtu.be/oHg5SJYRHA0', 65]);
  }

  // ---- materiales (3, estado=publicado) ----
  const materialesSheet = setupSheetWithHeaders_(ss, 'materiales', AULA_SHEET_HEADERS_.materiales);
  if (!aulaSeedHasRowForCiclo_(materialesSheet, AULA_DEMO_CICLO_ID_, 'id_ciclo', AULA_DEMO_CICLO_ID_)) {
    materialesSheet.appendRow(['mat-demo-1', AULA_DEMO_CICLO_ID_, 1, 'Aritmética', 'Separata 1 — Razones y proporciones', 'pdf', 'https://drive.google.com/ejemplo-separata-1', hoy, 'si', 'publicado']);
    materialesSheet.appendRow(['mat-demo-2', AULA_DEMO_CICLO_ID_, 1, 'Álgebra', 'Práctica dirigida 1 — Factorización', 'pdf', 'https://drive.google.com/ejemplo-pd-1', hoy, 'no', 'publicado']);
    materialesSheet.appendRow(['mat-demo-3', AULA_DEMO_CICLO_ID_, 1, 'Comunicación', 'Videoclase — Comprensión lectora', 'video', 'https://drive.google.com/ejemplo-video-1', hoy, 'no', 'publicado']);
  }

  // ---- anuncios (1, estado=publicado, fijado) ----
  const anunciosSheet = setupSheetWithHeaders_(ss, 'anuncios', AULA_SHEET_HEADERS_.anuncios);
  if (!aulaSeedHasRowForCiclo_(anunciosSheet, AULA_DEMO_CICLO_ID_, 'id_ciclo', AULA_DEMO_CICLO_ID_)) {
    anunciosSheet.appendRow(['anuncio-demo-1', AULA_DEMO_CICLO_ID_, hoy, 'Bienvenida al ciclo demo', 'Recuerda unirte al grupo de WhatsApp de tu turno para no perderte los avisos del día a día.', 'si', 'publicado']);
  }

  // ---- grupos_whatsapp (1) ----
  const gruposSheet = setupSheetWithHeaders_(ss, 'grupos_whatsapp', AULA_SHEET_HEADERS_.grupos_whatsapp);
  if (!aulaSeedHasRowForCiclo_(gruposSheet, AULA_DEMO_CICLO_ID_, 'id_ciclo', AULA_DEMO_CICLO_ID_)) {
    gruposSheet.appendRow(['grupo-demo-1', AULA_DEMO_CICLO_ID_, 'UNA Demo 2026 · Turno Mañana', 'https://chat.whatsapp.com/ejemplo-grupo-demo', 'activo']);
  }

  // ---- recursos (1) ----
  const recursosSheet = setupSheetWithHeaders_(ss, 'recursos', AULA_SHEET_HEADERS_.recursos);
  if (!aulaSeedHasRowForCiclo_(recursosSheet, AULA_DEMO_CICLO_ID_, 'id_ciclo', AULA_DEMO_CICLO_ID_)) {
    recursosSheet.appendRow(['recurso-demo-1', AULA_DEMO_CICLO_ID_, 'Simulador de tabla periódica', 'Tabla periódica interactiva — útil para Química.', 'https://ptable.com/', 'Química']);
  }

  // Invalidar cache del Aula para que getCiclos/getAula vean los datos nuevos de inmediato.
  try {
    const cache = CacheService.getScriptCache();
    ['aula:una:ciclos', 'aula:una:ciclos:inscripciones_abiertas', 'aula:una:ciclos:en_curso', 'aula:una:ciclos:cerrado',
      'aula:una:' + AULA_DEMO_CICLO_ID_].forEach(function (k) { cache.remove(k); });
  } catch (err) { /* no-op */ }

  console.log('seedAulaDemo() completo. Ciclo demo = ' + AULA_DEMO_CICLO_ID_ + ' · DNI demo = ' + AULA_DEMO_DNI_);
  return { idCiclo: AULA_DEMO_CICLO_ID_, dniDemo: AULA_DEMO_DNI_, emailDemo: AULA_DEMO_EMAIL_ };
}

/** Busca una fila por valor exacto en una columna (headers de la fila 1). Devuelve el índice 1-based o -1. */
function aulaSeedFindRow_(sheet, colName, value) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return -1;
  const headers = data[0].map(function (h) { return String(h).trim(); });
  const idx = headers.indexOf(colName);
  if (idx === -1) return -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idx] || '').trim() === String(value).trim()) return i + 1;
  }
  return -1;
}

/** true si ya existe alguna fila con id_ciclo=cicloId (usado para saltar lotes de seed ya aplicados). */
function aulaSeedHasRowForCiclo_(sheet, cicloId, extraColName, extraValue) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;
  const headers = data[0].map(function (h) { return String(h).trim(); });
  const cicloIdx = headers.indexOf('id_ciclo');
  const extraIdx = extraColName ? headers.indexOf(extraColName) : -1;
  if (cicloIdx === -1) return false;
  for (let i = 1; i < data.length; i++) {
    const matchesCiclo = String(data[i][cicloIdx] || '').trim() === String(cicloId).trim();
    if (!matchesCiclo) continue;
    if (extraIdx === -1) return true;
    if (String(data[i][extraIdx] || '').trim() === String(extraValue).trim()) return true;
  }
  return false;
}

/** true si ya existe una fila que combine colA=valA y colB=valB (para hojas sin id_ciclo, ej. docentes). */
function aulaSeedHasRowFor_(sheet, colA, valA, colB, valB) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;
  const headers = data[0].map(function (h) { return String(h).trim(); });
  const idxA = headers.indexOf(colA);
  const idxB = headers.indexOf(colB);
  if (idxA === -1 || idxB === -1) return false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idxA] || '').trim() === String(valA).trim() &&
      String(data[i][idxB] || '').trim() === String(valB).trim()) return true;
  }
  return false;
}

// ============================================
// healthCheck
// ============================================

/**
 * Suite LIGERA ejecutable desde el editor (~1 min): verifica la FORMA de
 * las respuestas (no requiere datos reales, solo que no truene y que las
 * claves esperadas existan). Imprime PASS/FAIL con duración por caso.
 *
 * IMPORTANTE: las 2 pruebas pesadas viven aparte por el límite de 6 min
 * por ejecución de Apps Script (juntas con cache frío lo exceden):
 *   - healthCheckQuestions()      → action legada `questions` (18 hojas Banco_)
 *   - healthCheckCursosConTemas() → `getCursosConTemas` (36 hojas, cachea 30 min)
 * La cobertura completa "0-FAIL" = las 3 ejecuciones sin FAIL.
 */
function healthCheck() {
  const results = [];

  function run(name, fn) {
    const t0 = Date.now();
    try {
      fn();
      results.push({ name: name, ok: true, ms: Date.now() - t0 });
    } catch (err) {
      results.push({ name: name, ok: false, error: err.toString(), ms: Date.now() - t0 });
    }
  }

  // Simula una petición GET incluyendo el token (igual que haría el
  // frontend); sin él, doGet rechaza todo cuando SECRET_TOKEN está
  // configurado y la suite fallaría completa con "Acceso no autorizado".
  function hcGet_(params) {
    const withToken = Object.assign({ token: SECRET_TOKEN }, params);
    return JSON.parse(doGet({ parameter: withToken }).getContent());
  }

  run('test (v2)', function () {
    const res = hcGet_({ action: 'test' });
    assertHC_(res.success === true, 'success debe ser true');
    assertHC_(res.data.status === 'ok', 'status debe ser ok');
    assertHC_(res.data.version === 'v2', 'version debe ser v2');
  });

  run('config (legado)', function () {
    const res = hcGet_({ action: 'config' });
    assertHC_(res.success === true, 'success debe ser true');
    assertHC_(typeof res.data === 'object', 'data debe ser un objeto');
    ['Ingenierías', 'Sociales', 'Biomédicas'].forEach(function (area) {
      assertHC_(!!res.data[area], 'debe incluir el área ' + area);
      assertHC_(Array.isArray(res.data[area].subjects), area + '.subjects debe ser array');
    });
  });

  run('getCepreCourses (legado)', function () {
    const res = hcGet_({ action: 'getCepreCourses' });
    assertHC_(res.success === true, 'success debe ser true');
    assertHC_(Array.isArray(res.data.areas), 'debe incluir areas[]');
    assertHC_(!!res.data.coursesByArea, 'debe incluir coursesByArea');
  });

  run('checkAccess dummy (legado)', function () {
    const res = hcGet_({ action: 'checkAccess', dni: '00000000', email: 'healthcheck@example.com' });
    assertHC_(res.success === true, 'success debe ser true');
    assertHC_(typeof res.data.canAccess === 'boolean', 'canAccess debe ser boolean');
    assertHC_('reason' in res.data, 'debe incluir reason');
    assertHC_('attemptCount' in res.data, 'debe incluir attemptCount');
  });

  run('checkBanqueoAccess dummy (legado)', function () {
    const res = hcGet_({ action: 'checkBanqueoAccess', dni: '00000000', email: 'healthcheck@example.com' });
    assertHC_(res.success === true, 'success debe ser true');
    assertHC_(typeof res.data.canAccess === 'boolean', 'canAccess debe ser boolean');
  });

  run('getUniversidades (v2, incluye una)', function () {
    const res = hcGet_({ action: 'getUniversidades' });
    assertHC_(res.success === true, 'success debe ser true');
    assertHC_(res.data.some(function (u) { return u.codigo === 'una'; }), 'debe incluir una');
  });

  run('getConfig v2 default una', function () {
    const res = hcGet_({ action: 'getConfig' });
    assertHC_(res.success === true, 'success debe ser true');
    assertHC_(Array.isArray(res.data.divisiones), 'divisiones debe ser array');
    assertHC_(!!res.data.escala, 'debe incluir escala');
  });

  run('accion invalida devuelve error controlado', function () {
    const res = hcGet_({ action: 'estoNoExiste' });
    assertHC_(res.success === false, 'success debe ser false');
  });

  const report = hcReport_('healthCheck (ligero)', results);
  console.log('Recuerda correr también healthCheckQuestions(), healthCheckCursosConTemas() y healthCheckAula() (esta última después de seedAulaDemo()).');
  return report;
}

// ============================================
// healthCheck - pruebas pesadas (ejecuciones separadas)
// ============================================

/**
 * Prueba PESADA 1: action legada `questions` (lee las 18 hojas Banco_
 * completas — el mismo trabajo que hace producción al armar un examen).
 * Correr en su propia ejecución. Si la duración reportada supera ~45s,
 * también es un problema en producción (timeout del frontend): avisar.
 */
function healthCheckQuestions() {
  const results = [];
  const t0 = Date.now();
  try {
    const res = hcRequest_({ action: 'questions', area: 'Ingenierías' });
    assertHC_(res.success === true, 'success debe ser true');
    assertHC_(Array.isArray(res.data), 'data debe ser un array de preguntas');
    results.push({ name: 'questions area=Ingenierías (legado)', ok: true, ms: Date.now() - t0 });
  } catch (err) {
    results.push({ name: 'questions area=Ingenierías (legado)', ok: false, error: err.toString(), ms: Date.now() - t0 });
  }
  return hcReport_('healthCheckQuestions', results);
}

/**
 * Prueba PESADA 2: getCursosConTemas (recorre ~36 hojas; cachea 30 min,
 * por lo que solo la primera corrida es lenta). Correr en su propia
 * ejecución.
 */
function healthCheckCursosConTemas() {
  const results = [];
  const t0 = Date.now();
  try {
    const res = hcRequest_({ action: 'getCursosConTemas' });
    assertHC_(res.success === true, 'success debe ser true');
    assertHC_(Array.isArray(res.data.cursos), 'data.cursos debe ser array');
    assertHC_(typeof res.data.totalCursos === 'number', 'totalCursos debe ser numérico');
    results.push({ name: 'getCursosConTemas (legado)', ok: true, ms: Date.now() - t0 });
  } catch (err) {
    results.push({ name: 'getCursosConTemas (legado)', ok: false, error: err.toString(), ms: Date.now() - t0 });
  }
  return hcReport_('healthCheckCursosConTemas', results);
}

/**
 * Suite independiente del Aula Virtual (v2.1, ver docs/CONTRATO_AULA_V21.md):
 * getCiclos, getAula sin matrícula, inscribirCiclo (idempotencia),
 * getAula con el dni demo matriculado por seedAulaDemo(), getMisPagos.
 * Correr DESPUÉS de seedAulaDemo() (si no corriste el seed, los 2 últimos
 * casos van a FAIL con un mensaje claro pidiendo correrlo primero).
 */
function healthCheckAula() {
  const results = [];

  function run(name, fn) {
    const t0 = Date.now();
    try {
      fn();
      results.push({ name: name, ok: true, ms: Date.now() - t0 });
    } catch (err) {
      results.push({ name: name, ok: false, error: err.toString(), ms: Date.now() - t0 });
    }
  }

  const DUMMY_DNI = '11111111';
  const DUMMY_EMAIL = 'dummy.inscripcion@simulauna.com';

  run('getCiclos universidad=una', function () {
    const res = hcRequest_({ action: 'getCiclos', universidad: 'una' });
    assertHC_(res.success === true, 'success debe ser true');
    assertHC_(Array.isArray(res.data.ciclos), 'data.ciclos debe ser array');
  });

  run('getAula sin matricula -> matriculado:false', function () {
    const res = hcRequest_({ action: 'getAula', universidad: 'una', dni: '00000000', email: 'sinmatricula.healthcheck@example.com' });
    assertHC_(res.success === true, 'success debe ser true: ' + (res.error || ''));
    assertHC_(res.data.matriculado === false, 'matriculado debe ser false');
    assertHC_(Array.isArray(res.data.ciclosDisponibles), 'ciclosDisponibles debe ser array');
  });

  run('inscribirCiclo (idempotente)', function () {
    const first = hcPostRequest_({ action: 'inscribirCiclo' }, {
      universidad: 'una', dni: DUMMY_DNI, email: DUMMY_EMAIL, cicloId: AULA_DEMO_CICLO_ID_, turno: 'mañana'
    });
    assertHC_(first.success === true, 'success debe ser true (1er intento): ' + (first.error || '') + ' — ¿corriste seedAulaDemo()?');
    assertHC_(first.data.inscrito === true, 'inscrito debe ser true');

    const second = hcPostRequest_({ action: 'inscribirCiclo' }, {
      universidad: 'una', dni: DUMMY_DNI, email: DUMMY_EMAIL, cicloId: AULA_DEMO_CICLO_ID_, turno: 'mañana'
    });
    assertHC_(second.success === true, 'success debe ser true (2do intento): ' + (second.error || ''));
    assertHC_(second.data.yaExistia === true, 'la 2da llamada debe detectar duplicado (idempotencia)');
  });

  run('getAula con dni demo matriculado (seedAulaDemo)', function () {
    const res = hcRequest_({ action: 'getAula', universidad: 'una', dni: AULA_DEMO_DNI_, email: AULA_DEMO_EMAIL_ });
    assertHC_(res.success === true, 'success debe ser true: ' + (res.error || '') + ' — ¿corriste seedAulaDemo()?');
    assertHC_(res.data.matriculado === true, 'matriculado debe ser true (corre seedAulaDemo() primero)');
    assertHC_(!!res.data.ciclo, 'debe incluir ciclo');
    assertHC_(Array.isArray(res.data.horario), 'horario debe ser array');
    assertHC_(Array.isArray(res.data.clasesEnVivo), 'clasesEnVivo debe ser array');
    assertHC_(Array.isArray(res.data.grabaciones), 'grabaciones debe ser array');
    assertHC_(Array.isArray(res.data.materiales), 'materiales debe ser array');
    assertHC_(!!res.data.pagos, 'debe incluir pagos');
  });

  run('getMisPagos dni demo', function () {
    const res = hcRequest_({ action: 'getMisPagos', universidad: 'una', dni: AULA_DEMO_DNI_, cicloId: AULA_DEMO_CICLO_ID_ });
    assertHC_(res.success === true, 'success debe ser true: ' + (res.error || ''));
    assertHC_(typeof res.data.estadoGeneral === 'string', 'estadoGeneral debe ser string');
    assertHC_(Array.isArray(res.data.conceptos), 'conceptos debe ser array');
  });

  return hcReport_('healthCheckAula', results);
}

// ---- Helpers compartidos del healthCheck ----

/** Petición GET simulada con token (versión top-level para las pruebas pesadas). */
function hcRequest_(params) {
  const withToken = Object.assign({ token: SECRET_TOKEN }, params);
  return JSON.parse(doGet({ parameter: withToken }).getContent());
}

/** Petición POST simulada con token + body JSON (para inscribirCiclo/submitExam-like). */
function hcPostRequest_(params, bodyObj) {
  const withToken = Object.assign({ token: SECRET_TOKEN }, params);
  const e = { parameter: withToken, postData: { contents: JSON.stringify(bodyObj || {}) } };
  return JSON.parse(doPost(e).getContent());
}

/** Imprime PASS/FAIL con duración por prueba y el resumen N-FAIL. */
function hcReport_(title, results) {
  let failCount = 0;
  results.forEach(function (r) {
    const secs = ' (' + ((r.ms || 0) / 1000).toFixed(1) + 's)';
    if (r.ok) {
      console.log('PASS - ' + r.name + secs);
    } else {
      failCount++;
      console.log('FAIL - ' + r.name + secs + ' :: ' + r.error);
    }
  });

  console.log('\n=== ' + title + ': ' + (results.length - failCount) + '/' + results.length + ' PASS, ' + failCount + '-FAIL ===');
  return { total: results.length, failed: failCount, results: results };
}

function assertHC_(condition, message) {
  if (!condition) throw new Error(message);
}
