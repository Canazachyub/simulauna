/**
 * Tests de config_guard.gs (configuraciones de puntaje a prueba de errores).
 * Ejecutar:  node google-apps-script/tests/config_guard.test.js
 *
 * Parte 1: funciones PURAS (se carga solo config_guard.gs en un contexto vm).
 * Parte 2: integración con TODOS los .gs concatenados (como en Apps Script)
 *          y servicios de Google simulados en memoria (Sheets, Properties,
 *          Cache, Lock): última configuración buena, fábrica de UNA, error
 *          amable y coherencia getExam -> submitExam.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

// El repo es "type": "module": este archivo es un módulo ES.
const GAS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let pasados = 0;
let fallados = 0;
function test(nombre, fn) {
  try {
    fn();
    pasados++;
    console.log('  ✓ ' + nombre);
  } catch (err) {
    fallados++;
    console.log('  ✗ ' + nombre + '\n      ' + (err && err.stack ? err.stack.split('\n').slice(0, 3).join('\n      ') : err));
  }
}
const cerca = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 1e-6 : tol);
const mensajes = (lista) => lista.map((e) => e.mensaje).join('\n');
// Objetos creados dentro del contexto vm tienen otros prototipos: comparar por JSON.
const igualJSON = (a, b, msg) => assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), msg);

// ============================================
// Datos de prueba
// ============================================

const UNA_HEADERS = ['COD.', 'ASIGNATURA', 'PREGUNTA BIEN CONTESTADA', 'CANTIDAD DE PREGUNTAS', 'PONDERACIÓN', 'PUNTAJE'];
const UNA_ING = [
  ['Aritmética', 4, 5.201, 208.04], ['Álgebra', 4, 5.202, 208.08], ['Geometría', 4, 5.303, 212.12],
  ['Trigonometría', 4, 5.404, 216.16], ['Física', 4, 5.905, 236.2], ['Química', 4, 5.406, 216.24],
  ['Biología y Anatomía', 2, 3.177, 63.54], ['Psicología y Filosofía', 4, 3.802, 152.08], ['Geografía', 2, 2.576, 51.52],
  ['Historia', 2, 3.701, 74.02], ['Educación Cívica', 2, 3.101, 62.02], ['Economía', 2, 3.502, 70.04],
  ['Comunicación', 4, 3.352, 134.08], ['Literatura', 2, 2.501, 50.02], ['Razonamiento Matemático', 6, 7.603, 456.18],
  ['Razonamiento Verbal', 6, 7.103, 426.18], ['Inglés', 2, 4.087, 81.74], ['Quechua y aimara', 2, 4.087, 81.74]
];
const ASIGNATURAS_UNA = UNA_ING.map((r) => r[0]);

/** Hoja UNA como la devuelve getValues(): encabezado, asignaturas, TOTAL, NOTA MÁXIMA. */
function hojaUna(filas, opciones) {
  const op = opciones || {};
  const rows = [op.headers || UNA_HEADERS.slice()];
  filas.forEach((f, i) => rows.push([i + 1, f[0], 10, f[1], f[2], f[3]]));
  rows.push(['', op.total || 'TOTAL', '', 60, '', 3000]);
  rows.push(['', op.nota || 'NOTA MÁXIMA', '', '', '', 3000]);
  return rows;
}
const clonar = (x) => JSON.parse(JSON.stringify(x));

const EXAMEN_HEADERS = ['proceso', 'division', 'division_tipo', 'curso', 'n_preguntas', 'puntos_correcta', 'puntos_incorrecta', 'peso', 'orden'];
const ESCALA_HEADERS = ['proceso', 'motor', 'escala_total', 'umbral_excelente', 'umbral_bueno', 'umbral_regular', 'duracion_min', 'n_preguntas_total'];

// UNMSM área A (100 preguntas, +20 / -1,125, escala 2000, decimas). Actitudinal sin penalidad.
const UNMSM_A = [
  ['Sección Actitudinal', 10, 0], ['Habilidad Verbal', 10], ['Habilidad Lógico-Matemática', 10], ['Aritmética', 4],
  ['Geometría', 3], ['Álgebra', 3], ['Trigonometría', 2], ['Lenguaje', 7], ['Literatura', 4], ['Psicología', 6],
  ['Educación Cívica', 4], ['Historia del Perú', 3], ['Historia Universal', 2], ['Geografía', 4], ['Economía', 4],
  ['Filosofía', 4], ['Física', 5], ['Química', 7], ['Biología', 8]
];
function examenUnmsm() {
  return [EXAMEN_HEADERS].concat(UNMSM_A.map((c, i) =>
    ['ORDINARIO', 'A', 'area', c[0], c[1], 20, c.length > 2 ? c[2] : -1.125, 1, i + 1]));
}
const ESCALA_UNMSM = [ESCALA_HEADERS, ['ORDINARIO', 'decimas', 2000, '', '', '', 180, 100]];
const escalaUnmsm = () => [ESCALA_HEADERS.slice(), ['ORDINARIO', 'decimas', 2000, '', '', '', 180, 100]];

// UNFV área C (50 preguntas, +10 / -0,25219265, escala 500).
const UNFV_C = [
  ['Habilidad Verbal', 7], ['Habilidad Lógico-Matemática', 7], ['Aritmética', 3], ['Geometría', 3], ['Álgebra', 3],
  ['Trigonometría', 2], ['Física', 3], ['Química', 3], ['Biología', 3], ['Lenguaje', 2], ['Literatura', 2],
  ['Psicología', 2], ['Educación Cívica', 2], ['Historia del Perú y Universal', 2], ['Geografía', 2], ['Economía', 2],
  ['Filosofía', 2]
];
function examenUnfv() {
  return [EXAMEN_HEADERS].concat(UNFV_C.map((c, i) => ['ORDINARIO', 'C', 'area', c[0], c[1], 10, -0.25219265, 1, i + 1]));
}
const ESCALA_UNFV = [ESCALA_HEADERS, ['ORDINARIO', 'decimas', 500, 400, 300, 200, '', 50]];

// ============================================
// PARTE 1: funciones puras
// ============================================

const pure = vm.createContext({ console: console });
vm.runInContext(fs.readFileSync(path.join(GAS_DIR, 'config_guard.gs'), 'utf8'), pure, { filename: 'config_guard.gs' });
const G = (expr) => vm.runInContext(expr, pure);
const parseNumberCell_ = G('parseNumberCell_');
const normalizeHeader_ = G('normalizeHeader_');
const findColumns_ = G('findColumns_');
const validateUnaAreaSheet_ = G('validateUnaAreaSheet_');
const validateConfigExamen_ = G('validateConfigExamen_');
const validateConfigEscala_ = G('validateConfigEscala_');
const validateConfigV2_ = G('validateConfigV2_');
const OPC_UNA = { escalaTotal: 3000, nPreguntasTotal: 60, asignaturasConocidas: ASIGNATURAS_UNA };

console.log('\nPARTE 1 — parseNumberCell_ / normalizeHeader_ / findColumns_');

test('parseNumberCell_: formatos aceptados', () => {
  const casos = [[5.201, 5.201], ['5.201', 5.201], ['5,201', 5.201], [' 5,201 ', 5.201], ['1.234,56', 1234.56],
    ['1,234.56', 1234.56], ['208,04', 208.04], ['-1,125', -1.125], ['−1,125', -1.125], ['+20', 20], ['0', 0], [0, 0], ['10', 10]];
  casos.forEach(([entrada, esperado]) => {
    const r = parseNumberCell_(entrada);
    assert.ok(r.ok, JSON.stringify(entrada) + ' debería aceptarse: ' + r.motivo);
    assert.ok(cerca(r.value, esperado), JSON.stringify(entrada) + ' -> ' + r.value);
  });
});

test('parseNumberCell_: rechazos explícitos con motivo', () => {
  ['#REF!', '#N/A', '#DIV/0!', '', '   ', 'abc', '5.4.06', '1.234.567', '20%', '5 201', '1,2,3', '.5', true, null, undefined, NaN,
    new Date(2024, 1, 4)].forEach((entrada) => {
    const r = parseNumberCell_(entrada);
    assert.strictEqual(r.ok, false, JSON.stringify(entrada) + ' debería rechazarse');
    assert.ok(typeof r.motivo === 'string' && r.motivo.length > 5, 'motivo vacío para ' + JSON.stringify(entrada));
  });
  assert.ok(/#REF!/.test(parseNumberCell_('#REF!').motivo));
  assert.strictEqual(parseNumberCell_('').vacio, true);
  assert.ok(/%/.test(parseNumberCell_('20%').motivo));
  assert.ok(/ambiguo/.test(parseNumberCell_('1.234.567').motivo));
  assert.ok(/fecha/.test(parseNumberCell_(new Date()).motivo));
});

test('normalizeHeader_: tildes, mayúsculas, espacios, saltos, puntos, guion bajo', () => {
  assert.strictEqual(normalizeHeader_('PONDERACIÓN'), 'ponderacion');
  assert.strictEqual(normalizeHeader_('  Cantidad de\npreguntas  '), 'cantidad de preguntas');
  assert.strictEqual(normalizeHeader_('COD.'), 'cod');
  assert.strictEqual(normalizeHeader_('n_preguntas'), 'n preguntas');
  assert.strictEqual(normalizeHeader_('N° de preguntas'), 'n de preguntas');
  assert.strictEqual(normalizeHeader_('Nro. preguntas'), 'nro preguntas');
});

test('findColumns_: encuentra por alias y lista las faltantes', () => {
  const spec = G('CFG_SPEC_UNA_');
  const ok = findColumns_(['cod', 'Curso', 'Puntos por pregunta', 'N° preguntas', 'Peso', 'Puntaje máximo'], spec);
  assert.ok(ok.ok);
  igualJSON([ok.idx.asignatura, ok.idx.puntosCorrecta, ok.idx.cantidad, ok.idx.ponderacion, ok.idx.puntaje], [1, 2, 3, 4, 5]);
  const falta = findColumns_(['COD.', 'ASIGNATURA', 'CANTIDAD DE PREGUNTAS'], spec);
  assert.strictEqual(falta.ok, false);
  igualJSON(falta.faltantes.map((f) => f.clave).sort(), ['ponderacion', 'puntosCorrecta']);
});

console.log('\nPARTE 1 — UNA (Configuración_*)');

test('hoja UNA real (Ingenierías): pasa, total 3000 y 60 preguntas, sin avisos', () => {
  const r = validateUnaAreaSheet_(hojaUna(UNA_ING), 'Ingenierías', OPC_UNA);
  assert.ok(r.ok, mensajes(r.errores));
  assert.strictEqual(r.avisos.length, 0, mensajes(r.avisos));
  assert.strictEqual(r.config.subjects.length, 18);
  assert.strictEqual(r.config.totalQuestions, 60);
  assert.ok(cerca(r.config.totalMaxScore, 3000, 1e-6), String(r.config.totalMaxScore));
  const arit = r.config.subjects[0];
  assert.deepStrictEqual([arit.code, arit.name, arit.pointsPerQuestion, arit.questionCount, arit.weight, arit.maxScore],
    [1, 'Aritmética', 10, 4, 5.201, 208.04]);
});

test('ponderación "5,201" (texto con coma decimal) se lee como 5.201', () => {
  const h = hojaUna(UNA_ING);
  h[1][4] = '5,201';
  const r = validateUnaAreaSheet_(h, 'Ingenierías', OPC_UNA);
  assert.ok(r.ok, mensajes(r.errores));
  assert.strictEqual(r.config.subjects[0].weight, 5.201);
});

test('encabezados "PONDERACION" sin tilde y "  Cantidad de preguntas " con espacios', () => {
  const headers = ['COD.', 'ASIGNATURA', 'PREGUNTA BIEN CONTESTADA', '  Cantidad de preguntas ', 'PONDERACION', 'Puntaje\n'];
  const r = validateUnaAreaSheet_(hojaUna(UNA_ING, { headers: headers }), 'Ingenierías', OPC_UNA);
  assert.ok(r.ok, mensajes(r.errores));
  assert.ok(cerca(r.config.totalMaxScore, 3000));
});

test('encabezado en la fila 2 (fila de título arriba) también funciona', () => {
  const h = [['CONFIGURACIÓN INGENIERÍAS 2026']].concat(hojaUna(UNA_ING));
  const r = validateUnaAreaSheet_(h, 'Ingenierías', OPC_UNA);
  assert.ok(r.ok, mensajes(r.errores));
});

test('columna requerida faltante = error claro con el título esperado', () => {
  const headers = ['COD.', 'ASIGNATURA', 'PREGUNTA BIEN CONTESTADA', 'CANTIDAD DE PREGUNTAS', 'PONDERACIÓN X', 'PUNTAJE'];
  const r = validateUnaAreaSheet_(hojaUna(UNA_ING, { headers: headers }), 'Ingenierías', OPC_UNA);
  assert.strictEqual(r.ok, false);
  assert.ok(/no encuentro esta columna.*PONDERACIÓN/.test(mensajes(r.errores)), mensajes(r.errores));
});

test('PUNTAJE "#REF!" -> usa el valor calculado con aviso', () => {
  const h = hojaUna(UNA_ING);
  h[1][5] = '#REF!';
  const r = validateUnaAreaSheet_(h, 'Ingenierías', OPC_UNA);
  assert.ok(r.ok, mensajes(r.errores));
  assert.strictEqual(r.config.subjects[0].maxScore, 208.04);
  assert.strictEqual(r.avisos.length, 1);
  assert.ok(/#REF!.*calculado/.test(r.avisos[0].mensaje), r.avisos[0].mensaje);
});

test('PUNTAJE vacío o distinto de 10 × ponderación × cantidad -> calculado + aviso', () => {
  const h = hojaUna(UNA_ING);
  h[2][5] = '';
  h[3][5] = 999;
  const r = validateUnaAreaSheet_(h, 'Ingenierías', OPC_UNA);
  assert.ok(r.ok, mensajes(r.errores));
  assert.strictEqual(r.config.subjects[1].maxScore, 208.08);
  assert.strictEqual(r.config.subjects[2].maxScore, 212.12);
  assert.strictEqual(r.avisos.length, 2);
});

test('filas "total" y "Nota máxima" en minúsculas no se cuentan como asignaturas', () => {
  const r = validateUnaAreaSheet_(hojaUna(UNA_ING, { total: 'total', nota: 'Nota máxima' }), 'Ingenierías', OPC_UNA);
  assert.ok(r.ok, mensajes(r.errores));
  assert.strictEqual(r.config.subjects.length, 18);
  const r2 = validateUnaAreaSheet_(hojaUna(UNA_ING, { total: ' Sub-Total ', nota: 'NOTA MAXIMA:' }), 'Ingenierías', OPC_UNA);
  assert.ok(r2.ok, mensajes(r2.errores));
  assert.strictEqual(r2.config.subjects.length, 18);
});

test('asignatura duplicada = error', () => {
  const filas = clonar(UNA_ING);
  filas[17] = ['Aritmética', 2, 4.087, 81.74];
  const r = validateUnaAreaSheet_(hojaUna(filas), 'Ingenierías', OPC_UNA);
  assert.strictEqual(r.ok, false);
  assert.ok(/repetida/.test(mensajes(r.errores)));
});

test('"5.4.06" en PONDERACIÓN: mensaje con hoja, fila, asignatura y columna', () => {
  const filas = clonar(UNA_ING);
  filas[5] = ['Química', 4, '5.4.06', 216.24];
  const r = validateUnaAreaSheet_(hojaUna(filas), 'Sociales', Object.assign({ hoja: 'Configuración_Sociales' }, OPC_UNA));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.errores[0].mensaje,
    "Hoja Configuración_Sociales, fila 7 (Química), columna PONDERACIÓN (celda E7): '5.4.06' no es un número.");
  assert.strictEqual(r.errores[0].fila, 7);
  assert.strictEqual(r.errores[0].columna, 'PONDERACIÓN');
});

test('suma de puntajes distinta de 3000 = error', () => {
  const filas = clonar(UNA_ING);
  filas[0] = ['Aritmética', 4, 6.201, 208.04]; // ponderación cambiada: el calculado sube a 248.04
  const r = validateUnaAreaSheet_(hojaUna(filas), 'Ingenierías', OPC_UNA);
  assert.strictEqual(r.ok, false);
  assert.ok(/suma de los puntajes da 3040.*3000/.test(mensajes(r.errores)), mensajes(r.errores));
});

test('cantidades que no suman 60 = error; cantidad decimal o fecha = error', () => {
  const filas = clonar(UNA_ING);
  filas[0] = ['Aritmética', 4.5, 5.201, 234.045];
  let r = validateUnaAreaSheet_(hojaUna(filas), 'Ingenierías', OPC_UNA);
  assert.ok(/entero/.test(mensajes(r.errores)));
  const filas2 = clonar(UNA_ING);
  filas2[0] = ['Aritmética', new Date(2024, 3, 2), 5.201, 208.04];
  r = validateUnaAreaSheet_(hojaUna(filas2).map((f) => f), 'Ingenierías', OPC_UNA);
  assert.ok(/fecha/.test(mensajes(r.errores)));
});

test('nombre sin tilde se corrige al nombre del banco (aviso); nombre desconocido = error', () => {
  const filas = clonar(UNA_ING);
  filas[0][0] = 'aritmetica';
  let r = validateUnaAreaSheet_(hojaUna(filas), 'Ingenierías', OPC_UNA);
  assert.ok(r.ok, mensajes(r.errores));
  assert.strictEqual(r.config.subjects[0].name, 'Aritmética');
  filas[0][0] = 'Aritmétika';
  r = validateUnaAreaSheet_(hojaUna(filas), 'Ingenierías', OPC_UNA);
  assert.ok(/no existe un banco/.test(mensajes(r.errores)));
});

test('configuración de FÁBRICA de UNA es válida (3 áreas, 60 preguntas y 3000 c/u)', () => {
  const fab = G('UNA_CONFIG_FABRICA_');
  Object.keys(fab).forEach((area) => {
    const r = validateUnaAreaSheet_(hojaUna(fab[area]), area, OPC_UNA);
    assert.ok(r.ok, area + ': ' + mensajes(r.errores));
    assert.strictEqual(r.avisos.length, 0, area + ': ' + mensajes(r.avisos));
  });
});

console.log('\nPARTE 1 — multi-universidad (config_examen / config_escala)');

test('UNMSM área A (oficial): valida OK, 100 preguntas, escala 2000, decimas', () => {
  const r = validateConfigV2_(examenUnmsm(), ESCALA_UNMSM, 'ORDINARIO');
  assert.ok(r.ok, mensajes(r.errores));
  assert.strictEqual(r.config.rows.length, 19);
  assert.strictEqual(r.config.rows.reduce((s, x) => s + x.nPreguntas, 0), 100);
  assert.strictEqual(r.config.escala.motor, 'decimas');
  igualJSON(r.config.escala.umbrales, { excelente: 1600, bueno: 1200, regular: 800 }); // derivados con aviso
  assert.ok(/80% \/ 60% \/ 40%/.test(mensajes(r.avisos)));
  assert.strictEqual(r.config.rows[0].puntosIncorrecta, 0);
  assert.strictEqual(r.config.rows[1].puntosIncorrecta, -1.125);
});

test('UNFV área C (oficial): valida OK, 50 preguntas, escala 500', () => {
  const r = validateConfigV2_(examenUnfv(), ESCALA_UNFV, 'ORDINARIO');
  assert.ok(r.ok, mensajes(r.errores));
  assert.strictEqual(r.config.rows.length, 17);
  assert.strictEqual(r.config.rows.reduce((s, x) => s + x.nPreguntas * x.puntosCorrecta, 0), 500);
  assert.strictEqual(r.config.escala.duracionMin, 180); // vacío -> 180 con aviso
  assert.ok(/180 minutos/.test(mensajes(r.avisos)));
});

test('getConfig v2 (buildConfigV2Response_) mantiene el contrato', () => {
  const r = validateConfigV2_(examenUnfv(), ESCALA_UNFV, 'ORDINARIO');
  const resp = G('buildConfigV2Response_')('unfv', 'ORDINARIO', r.config);
  assert.deepStrictEqual(Object.keys(resp), ['universidad', 'proceso', 'divisiones', 'escala']);
  assert.deepStrictEqual(Object.keys(resp.divisiones[0]), ['codigo', 'nombre', 'tipo', 'subjects', 'totalQuestions', 'totalMaxScore', 'orden']);
  assert.deepStrictEqual(Object.keys(resp.divisiones[0].subjects[0]), ['name', 'questionCount', 'pointsPerQuestion', 'weight', 'maxScore', 'orden']);
  assert.deepStrictEqual(Object.keys(resp.escala), ['motor', 'escalaTotal', 'umbrales', 'duracionMin', 'nPreguntasTotal']);
  assert.strictEqual(resp.divisiones[0].totalMaxScore, 500);
});

test('penalidad positiva (1,125) = error que explica escribirla en negativo', () => {
  const ex = examenUnmsm();
  ex[2][6] = '1,125';
  const r = validateConfigExamen_(ex, 'ORDINARIO');
  assert.strictEqual(r.ok, false);
  assert.ok(/es positiva \('1,125'\).*NEGATIVO/.test(mensajes(r.errores)), mensajes(r.errores));
});

test('curso duplicado en la misma división = error; en otra división = OK', () => {
  const ex = examenUnmsm();
  ex.push(['ORDINARIO', 'A', 'area', 'biología ', 0 + 1, 20, -1.125, 1, 99]);
  let r = validateConfigExamen_(ex, 'ORDINARIO');
  assert.ok(/repetido en la división A/.test(mensajes(r.errores)));
  const ex2 = examenUnmsm();
  ex2.push(['ORDINARIO', 'B', 'area', 'Biología', 8, 20, -1.125, 1, 1]);
  r = validateConfigExamen_(ex2, 'ORDINARIO');
  assert.ok(r.ok, mensajes(r.errores));
});

test('motor "Décimas" / "SUMA_PONDERADA" / "Suma ponderada" se normalizan; motor inventado = error', () => {
  const esc = (m) => validateConfigEscala_([ESCALA_HEADERS, ['ORDINARIO', m, 2000, 1600, 1200, 800, 180, 100]], 'ORDINARIO');
  assert.strictEqual(esc('Décimas').config.motor, 'decimas');
  assert.strictEqual(esc('SUMA_PONDERADA').config.motor, 'suma_ponderada');
  assert.strictEqual(esc('Suma ponderada').config.motor, 'suma_ponderada');
  assert.strictEqual(esc('Vector canal').config.motor, 'vector_canal');
  assert.ok(/no es un motor válido/.test(mensajes(esc('promedio').errores)));
});

test('umbrales desordenados = error', () => {
  const r = validateConfigEscala_([ESCALA_HEADERS, ['ORDINARIO', 'decimas', 2000, 1200, 1600, 800, 180, 100]], 'ORDINARIO');
  assert.strictEqual(r.ok, false);
  assert.ok(/de menor a mayor/.test(mensajes(r.errores)));
  const r2 = validateConfigEscala_([ESCALA_HEADERS, ['ORDINARIO', 'decimas', 2000, 2500, 1600, 800, 180, 100]], 'ORDINARIO');
  assert.strictEqual(r2.ok, false);
});

test('proceso inexistente: config_escala NO cae a otro proceso; config_examen tampoco', () => {
  const esc = [ESCALA_HEADERS, ['ORDINARIO', 'decimas', 2000, 1600, 1200, 800, 180, 100], ['CEPRE', 'decimas', 100, 80, 60, 40, 90, 10]];
  const r = validateConfigEscala_(esc, 'EXTRAORDINARIO');
  assert.strictEqual(r.ok, false);
  assert.ok(/no hay una fila para el proceso EXTRAORDINARIO.*ORDINARIO, CEPRE/.test(mensajes(r.errores)), mensajes(r.errores));
  const r2 = validateConfigExamen_(examenUnmsm(), 'CEPRE');
  assert.strictEqual(r2.ok, false);
  assert.ok(/no hay cursos para el proceso CEPRE/.test(mensajes(r2.errores)));
  const r3 = validateConfigEscala_(esc, 'cepre');
  assert.ok(r3.ok);
  assert.strictEqual(r3.config.escalaTotal, 100);
});

test('única fila de escala sin proceso: vale para cualquier proceso (con aviso)', () => {
  const r = validateConfigEscala_([ESCALA_HEADERS, ['', 'decimas', 2000, 1600, 1200, 800, 180, 100]], 'CEPRE');
  assert.ok(r.ok, mensajes(r.errores));
  assert.ok(/única fila no tiene proceso/.test(mensajes(r.avisos)));
});

test('proceso repetido en config_escala = error', () => {
  const r = validateConfigEscala_([ESCALA_HEADERS, ['ORDINARIO', 'decimas', 2000, 1600, 1200, 800, 180, 100],
    ['ordinario', 'decimas', 1000, 800, 600, 400, 180, 100]], 'ORDINARIO');
  assert.ok(/repetido/.test(mensajes(r.errores)));
});

test('suma n_preguntas × puntos_correcta distinta de escala_total = error; n_preguntas_total distinto = error', () => {
  const ex = examenUnmsm();
  ex[1][5] = 25;
  let r = validateConfigV2_(ex, ESCALA_UNMSM, 'ORDINARIO');
  assert.ok(/puntaje máximo .* suma 2050 .* 2000/.test(mensajes(r.errores)), mensajes(r.errores));
  const ex2 = examenUnmsm();
  ex2[1][4] = 11;
  ex2[1][5] = 20;
  r = validateConfigV2_(ex2, [ESCALA_HEADERS, ['ORDINARIO', 'decimas', 2020, '', '', '', 180, 100]], 'ORDINARIO');
  assert.ok(/suman 101 .* n_preguntas_total = 100/.test(mensajes(r.errores)), mensajes(r.errores));
});

test('encabezados v2 con mayúsculas/espacios y comas decimales en texto', () => {
  const ex = examenUnfv();
  ex[0] = ['Proceso', 'División', 'Division Tipo', 'Curso', 'N° preguntas', 'Puntos correcta', 'Puntos incorrecta ', 'Peso', 'Orden'];
  ex[1][6] = '-0,25219265';
  const r = validateConfigV2_(ex, ESCALA_UNFV, 'ORDINARIO');
  assert.ok(r.ok, mensajes(r.errores));
  assert.strictEqual(r.config.rows[0].puntosIncorrecta, -0.25219265);
});

test('motor suma_ponderada con penalidades negativas = aviso', () => {
  const r = validateConfigV2_(examenUnfv(), [ESCALA_HEADERS, ['ORDINARIO', 'suma_ponderada', 500, 400, 300, 200, 120, 50]], 'ORDINARIO');
  assert.ok(r.ok);
  assert.ok(/NO resta por incorrectas/.test(mensajes(r.avisos)));
});

test('empaquetado de última buena: ida y vuelta exacta + trozos con huella', () => {
  const v2 = validateConfigV2_(examenUnmsm(), ESCALA_UNMSM, 'ORDINARIO').config;
  const una = G('cfgConfigFabricaUna_')();
  [v2, una].forEach((cfg) => {
    const texto = JSON.stringify(G('cfgEmpaquetar_')(cfg));
    const trozos = G('cfgTrocear_')(texto, 2500);
    assert.ok(trozos.every((t) => Buffer.byteLength(t, 'utf8') < 9000));
    const vuelta = G('cfgDesempaquetar_')(JSON.parse(trozos.join('')));
    assert.deepStrictEqual(JSON.parse(JSON.stringify(vuelta)), JSON.parse(JSON.stringify(cfg)));
    assert.strictEqual(G('cfgHuella_')(trozos.join('')), G('cfgHuella_')(texto));
  });
  const unaTxt = JSON.stringify(G('cfgEmpaquetar_')(una));
  assert.ok(unaTxt.length < 6000, 'UNA empaquetada ocupa ' + unaTxt.length + ' chars');
});

console.log('\nPARTE 1 — columnas opcionales: puntos_blanco, factor_escala, minimo_aprobatorio');

const EXAMEN_HEADERS_EXT = EXAMEN_HEADERS.concat(['puntos_blanco', 'factor_escala']);
const ESCALA_HEADERS_EXT = ESCALA_HEADERS.concat(['factor_escala', 'minimo_aprobatorio']);

// UNSAAC área A: motor "otro", escala 1000, factor 2,5, correcta 5, blanco 1, incorrecta 0 (80 preguntas, 400 brutos).
const UNSAAC_A = [['Aritmética', 14], ['Álgebra', 10], ['Geometría y Trigonometría', 14], ['Competencia Comunicativa', 14],
  ['Física', 14], ['Química', 14]];
function examenUnsaac() {
  return [EXAMEN_HEADERS_EXT].concat(UNSAAC_A.map((c, i) => ['ORDINARIO', 'A', 'area', c[0], c[1], 5, 0, 1, i + 1, 1, '']));
}
const ESCALA_UNSAAC = [ESCALA_HEADERS_EXT, ['ORDINARIO', 'otro', 1000, 800, 600, 400, 180, 80, 2.5, 'Según vacantes']];

// UNAJ Ingenierías: suma_ponderada, escala 3000, blanco 0,5, correcta = 10 × ponderación.
const UNAJ_ING = [['Aritmética', 3, 54.177], ['Álgebra', 5, 54.177], ['Geometría', 3, 50.790], ['Trigonometría', 3, 50.790],
  ['Comunicación', 2, 40.632], ['Literatura', 2, 40.632], ['Personal Social', 1, 37.245], ['Formación Ciudadana y Cívica', 1, 37.245],
  ['Historia del Perú', 2, 44.694], ['Geografía', 2, 33.860], ['Psicología y Filosofía', 1, 33.860], ['Economía', 4, 42.326],
  ['Física', 4, 47.404], ['Química', 4, 47.404], ['Biología', 3, 44.694], ['Razonamiento Matemático', 10, 57.562],
  ['Razonamiento Verbal', 10, 57.562]];
function examenUnaj() {
  return [EXAMEN_HEADERS_EXT].concat(UNAJ_ING.map((c, i) => ['ORDINARIO', 'Ingenierías', 'area', c[0], c[1], c[2], 0, c[2] / 10, i + 1, 0.5, '']));
}
const ESCALA_UNAJ = [ESCALA_HEADERS_EXT, ['ORDINARIO', 'suma_ponderada', 3000, 2400, 1800, 1200, 180, 60, '', '']];

test('UNSAAC área A: valida OK, motor otro -> decimas, 400 brutos × 2,5 = 1000', () => {
  const r = validateConfigV2_(examenUnsaac(), ESCALA_UNSAAC, 'ORDINARIO');
  assert.ok(r.ok, mensajes(r.errores));
  assert.strictEqual(r.config.escala.motor, 'decimas');
  assert.strictEqual(r.config.escala.factorEscala, 2.5);
  assert.strictEqual(r.config.escala.minimoAprobatorio, 'Según vacantes');
  assert.ok(r.config.rows.every((x) => x.factor === 2.5 && x.puntosBlanco === 1));
  const resp = G('buildConfigV2Response_')('unsaac', 'ORDINARIO', r.config);
  assert.strictEqual(resp.divisiones[0].totalQuestions, 80);
  assert.strictEqual(resp.divisiones[0].totalMaxScore, 1000);
  assert.strictEqual(resp.divisiones[0].subjects[0].pointsPerQuestion, 12.5);
  assert.strictEqual(resp.escala.minimoAprobatorio, 'Según vacantes');
});

test('UNAJ Ingenierías: valida OK, 60 preguntas, total 3000.000', () => {
  const r = validateConfigV2_(examenUnaj(), ESCALA_UNAJ, 'ORDINARIO');
  assert.ok(r.ok, mensajes(r.errores));
  const total = r.config.rows.reduce((s, x) => s + x.nPreguntas * x.puntosCorrecta * x.factor, 0);
  assert.strictEqual(r.config.rows.reduce((s, x) => s + x.nPreguntas, 0), 60);
  assert.ok(cerca(total, 3000, 1e-6), String(total));
  assert.ok(r.config.rows.every((x) => x.puntosBlanco === 0.5 && x.factor === 1));
});

test('puntos_blanco que resta tanto como una correcta o >= puntos_correcta = error; factor_escala 0 o texto = error', () => {
  const ex = examenUnsaac();
  ex[1][9] = -5;
  ex[2][9] = 5;
  ex[3][10] = 0;
  ex[4][10] = 'dos';
  const r = validateConfigExamen_(ex, 'ORDINARIO');
  const m = mensajes(r.errores);
  assert.ok(/fila 2 \(Aritmética\), columna puntos_blanco.*no puede restar tanto como vale una correcta/.test(m), m);
  assert.ok(/fila 3 \(Álgebra\), columna puntos_blanco.*no puede valer igual o más que una correcta/.test(m), m);
  assert.ok(/fila 4 .*factor_escala.*mayor que 0/.test(m), m);
  assert.ok(/fila 5 .*factor_escala.*'dos' no es un número/.test(m), m);
  const esc = clonar(ESCALA_UNSAAC);
  esc[1][8] = -2.5;
  assert.ok(/factor_escala.*mayor que 0/.test(mensajes(validateConfigEscala_(esc, 'ORDINARIO').errores)));
});

test('puntos_blanco negativo (UNP -0,10) es válido; si resta más que una incorrecta = aviso', () => {
  const ex = examenUnsaac();
  ex[1][9] = -0.1;   // incorrecta 0: blanco resta más que errar -> aviso
  ex[1][6] = -0.25;  // ahora incorrecta -0,25: -0,10 es razonable -> sin aviso
  ex[2][9] = '-0,5';
  const r = validateConfigExamen_(ex, 'ORDINARIO');
  assert.strictEqual(r.errores.length, 0, mensajes(r.errores));
  const av = mensajes(r.avisos);
  assert.ok(!/fila 2 .*resta más/.test(av), av);
  assert.ok(/fila 3 .*dejar en blanco resta más \('-0,5'\) que responder mal \(0\)/.test(av), av);
  const fila = r.config.filter((x) => x.curso === 'Aritmética')[0];
  assert.strictEqual(fila.puntosBlanco, -0.1);
});

test('factor_escala por fila (tipo UNSCH: 230 brutos × 900/230) y escala_total ≈ Σ(bruto × factor)', () => {
  const f = 900 / 230;
  const ex = [EXAMEN_HEADERS_EXT,
    ['ORDINARIO', 'CON', 'area', 'Matemática', 23, 5, 0, 1, 1, '', f],
    ['ORDINARIO', 'CON', 'area', 'Comunicación', 23, 5, 0, 1, 2, '', f]];
  const esc = [ESCALA_HEADERS_EXT, ['ORDINARIO', 'decimas', 900, 720, 540, 360, 120, 46, 1, '']];
  const r = validateConfigV2_(ex, esc, 'ORDINARIO');
  assert.ok(r.ok, mensajes(r.errores));
  assert.ok(cerca(r.config.rows[0].factor, f));
  const ex2 = clonar(ex);
  ex2[2][10] = 4; // factor de una fila mal: el máximo ya no da 900
  const r2 = validateConfigV2_(ex2, esc, 'ORDINARIO');
  assert.ok(/factor_escala\) suma .* escala_total en config_escala es 900/.test(mensajes(r2.errores)), mensajes(r2.errores));
});

test('sin columnas nuevas: comportamiento anterior (blanco 0, factor 1, sin minimoAprobatorio)', () => {
  const r = validateConfigV2_(examenUnfv(), ESCALA_UNFV, 'ORDINARIO');
  assert.ok(r.config.rows.every((x) => x.puntosBlanco === 0 && x.factor === 1));
  assert.strictEqual(r.config.escala.factorEscala, 1);
  assert.strictEqual(r.config.escala.minimoAprobatorio, '');
});

// ============================================
// PARTE 2: integración (todos los .gs + servicios simulados)
// ============================================

console.log('\nPARTE 2 — integración con servicios de Google simulados');

function crearMundo(propsIniciales) {
  const props = Object.assign({}, propsIniciales || {});
  const cache = {};
  const spreadsheets = {};

  function hojaFalsa(nombre, valores) {
    const h = {
      _v: valores,
      getName: () => nombre,
      getDataRange: () => ({ getValues: () => clonarValores(h._v) }),
      getLastRow: () => h._v.length,
      getLastColumn: () => Math.max(0, ...h._v.map((r) => r.length)),
      getMaxRows: () => h._v.length + 100,
      clearContents: () => { h._v = []; },
      setName: (n) => { nombre = n; return h; },
      copyTo: (ss) => { const c = hojaFalsa('Copia de ' + nombre, clonarValores(h._v)); ss._sheets.push(c); return c; },
      appendRow: (fila) => { h._v.push(fila.slice()); return h; },
      setFrozenRows: () => {}, setColumnWidth: () => {}, setConditionalFormatRules: () => {},
      getRange: (r, c, nr, nc) => {
        if (typeof r === 'string') return { setWrap: () => {} };
        const rango = {
          getValues: () => {
            const out = [];
            for (let i = 0; i < (nr || 1); i++) {
              const fila = h._v[r - 1 + i] || [];
              const o = [];
              for (let j = 0; j < (nc || 1); j++) o.push(fila[c - 1 + j] === undefined ? '' : fila[c - 1 + j]);
              out.push(o);
            }
            return out;
          },
          setValues: (vals) => {
            vals.forEach((fila, i) => {
              while (h._v.length < r + i) h._v.push([]);
              fila.forEach((v, j) => { h._v[r - 1 + i][c - 1 + j] = v; });
            });
            return rango;
          },
          setFontWeight: () => rango, setWrap: () => rango, setBackground: () => rango
        };
        return rango;
      }
    };
    return h;
  }
  function clonarValores(v) {
    return v.map((r) => r.map((x) => (x instanceof Date ? new Date(x.getTime()) : x)));
  }
  function crearSS(id, hojas) {
    const sheets = Object.keys(hojas).map((n) => hojaFalsa(n, hojas[n]));
    spreadsheets[id] = {
      _sheets: sheets,
      getId: () => id,
      getSheetByName: (n) => sheets.filter((s) => s.getName() === n)[0] || null,
      getSheets: () => sheets.slice(),
      insertSheet: (n) => { const s = hojaFalsa(n, []); sheets.push(s); return s; },
      deleteSheet: (s) => { sheets.splice(sheets.indexOf(s), 1); },
      getUrl: () => 'https://docs.google.com/spreadsheets/d/' + id
    };
    return spreadsheets[id];
  }

  const ctx = {
    console: { log: () => {}, warn: () => {}, error: (m) => { ctx._errores.push(String(m)); } },
    _errores: [],
    Logger: { log: () => {} },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k in props ? props[k] : null),
        setProperty: (k, v) => { props[k] = String(v); },
        setProperties: (o) => { Object.keys(o).forEach((k) => { props[k] = String(o[k]); }); },
        deleteProperty: (k) => { delete props[k]; },
        getProperties: () => Object.assign({}, props)
      })
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (k in cache ? cache[k] : null),
        put: (k, v) => {
          if (String(v).length > 100000) throw new Error('Argumento demasiado grande');
          cache[k] = String(v);
        },
        remove: (k) => { delete cache[k]; },
        removeAll: (ks) => ks.forEach((k) => { delete cache[k]; })
      })
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock: () => {}, releaseLock: () => {} }) },
    SpreadsheetApp: {
      openById: (id) => { if (!spreadsheets[id]) throw new Error('No existe el spreadsheet ' + id); return spreadsheets[id]; },
      create: (nombre) => crearSS('SS_NUEVO_' + (Object.keys(spreadsheets).length + 1), { 'Hoja 1': [] }),
      flush: () => {},
      newConditionalFormatRule: () => { const b = { whenFormulaSatisfied: () => b, setBackground: () => b, setRanges: () => b, build: () => ({}) }; return b; }
    },
    Utilities: {
      getUuid: (() => { let n = 0; return () => 'sesion-prueba-' + (++n) + '-abcdef'; })(),
      formatDate: (d) => d.toISOString(),
      sleep: () => {}
    },
    Session: { getScriptTimeZone: () => 'America/Lima' },
    ScriptApp: { getProjectTriggers: () => [] },
    ContentService: { createTextOutput: (t) => ({ setMimeType: () => ({ _t: t }) }), MimeType: { JSON: 'json' } }
  };
  props.SPREADSHEET_ID = 'SS_UNA';
  props.SECRET_TOKEN = 'token-de-prueba-1234';
  vm.createContext(ctx);

  const archivos = fs.readdirSync(GAS_DIR).filter((f) => /\.gs$/.test(f)).sort();
  const codigo = archivos.map((f) => '// ===== ' + f + '\n' + fs.readFileSync(path.join(GAS_DIR, f), 'utf8')).join('\n');
  vm.runInContext(codigo, ctx, { filename: 'todos_los_gs.js' });

  return {
    ctx: ctx, props: props, cache: cache, crearSS: crearSS, spreadsheets: spreadsheets,
    run: (expr) => vm.runInContext(expr, ctx),
    nuevaPeticion: () => { vm.runInContext('cfgMemo_ = {}; flagsMemo_ = null;', ctx); }
  };
}

function hojasUnaReales(fab) {
  const hojas = {};
  Object.keys(fab).forEach((area) => { hojas['Configuración_' + area] = hojaUna(fab[area]); });
  return hojas;
}

test('todos los .gs concatenados cargan juntos (sin identificadores globales duplicados)', () => {
  const m = crearMundo();
  assert.strictEqual(typeof m.run('cfgCargarConfig_'), 'function');
  assert.strictEqual(typeof m.run('validarConfiguraciones'), 'function');
});

test('UNA: hoja válida -> unaGetConfig con la forma legada y se guarda la última buena', () => {
  const m = crearMundo();
  const fab = m.run('UNA_CONFIG_FABRICA_');
  m.crearSS('SS_UNA', hojasUnaReales(fab));
  const cfg = m.run('unaGetConfig()');
  assert.deepStrictEqual(Object.keys(cfg), ['Ingenierías', 'Sociales', 'Biomédicas']);
  assert.deepStrictEqual(Object.keys(cfg['Ingenierías']), ['name', 'subjects', 'totalQuestions', 'totalMaxScore']);
  assert.deepStrictEqual(Object.keys(cfg['Ingenierías'].subjects[0]), ['code', 'name', 'pointsPerQuestion', 'questionCount', 'weight', 'maxScore']);
  assert.ok(m.props['CFG_LKG|una|ORDINARIO#meta'], 'debe guardar la última buena');
  const v2 = m.run("unaGetConfigV2('CEPRE')");
  assert.strictEqual(v2.proceso, 'CEPRE');
  assert.strictEqual(v2.escala.escalaTotal, 3000);
  assert.strictEqual(v2.divisiones.length, 3);
});

test('UNA: hoja rota después -> se sirve la última buena (no la rota) y se anota el problema', () => {
  const m = crearMundo();
  const fab = clonar(m.run('UNA_CONFIG_FABRICA_'));
  // Ponderaciones distintas a la fábrica (la suma sigue en 3000) para distinguir la "última buena".
  fab['Ingenierías'][0][2] = 6.303; // 10 × 6.303 × 4 = 252.12 (= 208.04 + 44.08)
  fab['Ingenierías'][0][3] = 252.12;
  fab['Ingenierías'][1][2] = 4.1; // 10 × 4.1 × 4 = 164 (= 208.08 - 44.08)
  fab['Ingenierías'][1][3] = 164;
  m.crearSS('SS_UNA', hojasUnaReales(fab));
  m.run('unaGetConfig()');
  m.nuevaPeticion();
  m.spreadsheets.SS_UNA.getSheetByName('Configuración_Ingenierías')._v[3][4] = '4.1.0'; // se rompe
  const cfg = m.run('unaGetConfig()');
  assert.strictEqual(cfg['Ingenierías'].subjects[1].weight, 4.1, 'debe venir de la última buena');
  assert.strictEqual(m.run("cfgCargarConfig_(unaTenantMin_(), 'ORDINARIO').fuente"), 'respaldo');
  assert.ok(m.ctx._errores.some((e) => /Configuración inválida CFG_LKG\|una/.test(e)));
  const reporte = m.spreadsheets.SS_UNA.getSheetByName('_validacion_config')._v;
  assert.ok(reporte.some((r) => r[5] === 'ERROR' && /'4\.1\.0' no es un número/.test(r[4])), JSON.stringify(reporte));
  assert.ok(reporte.some((r) => /última configuración buena/.test(r[4])));
});

test('UNA: hoja rota y SIN última buena -> configuración de fábrica (nunca se cae)', () => {
  const m = crearMundo();
  const hojas = hojasUnaReales(m.run('UNA_CONFIG_FABRICA_'));
  delete hojas['Configuración_Sociales'];
  m.crearSS('SS_UNA', hojas);
  const cfg = m.run('unaGetConfig()');
  assert.ok(cfg['Sociales'].subjects.length === 18);
  assert.strictEqual(m.run("cfgCargarConfig_(unaTenantMin_(), 'ORDINARIO').fuente"), 'fabrica');
});

test('v2: válida -> getConfig; rota -> última buena; nunca hubo buena -> mensaje amable', () => {
  const m = crearMundo();
  m.crearSS('SS_UNMSM', { config_examen: examenUnmsm(), config_escala: ESCALA_UNMSM });
  const tenant = "({codigo:'unmsm', layout:'v2', spreadsheetId:'SS_UNMSM'})";
  const resp = m.run('getConfigForTenant(' + tenant + ", 'ORDINARIO')");
  assert.strictEqual(resp.divisiones[0].totalQuestions, 100);
  assert.strictEqual(resp.divisiones[0].totalMaxScore, 2000);
  assert.strictEqual(resp.escala.motor, 'decimas');

  m.nuevaPeticion();
  m.spreadsheets.SS_UNMSM.getSheetByName('config_escala')._v[1][1] = 'promedio'; // motor inválido
  const resp2 = m.run('getConfigForTenant(' + tenant + ", 'ORDINARIO')");
  assert.strictEqual(resp2.escala.motor, 'decimas', 'sigue con la última buena');

  m.nuevaPeticion();
  assert.throws(() => m.run('getConfigForTenant(' + tenant + ", 'CEPRE')"), (err) => {
    return err.publico === true && err.message === 'La configuración de puntajes de esta universidad está en revisión. Intenta más tarde.';
  });
});

test('getExam guarda el plan validado y submitExam califica con ESE plan aunque la hoja cambie', () => {
  const m = crearMundo();
  const banco = [['Question Text', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Option 5', 'Correct Answer', 'ID_HASH', 'ESTADO']];
  for (let i = 1; i <= 6; i++) banco.push(['Pregunta ' + i, 'a', 'b', 'c', 'd', 'e', 1, 'q' + i, 'activa']);
  m.crearSS('SS_DEMO', {
    config_examen: [EXAMEN_HEADERS, ['ORDINARIO', 'A', 'area', 'Aritmética', 4, 5, '-1,25', 1, 1]],
    config_escala: [ESCALA_HEADERS, ['ORDINARIO', 'Décimas', 20, 16, 12, 8, 60, 4]],
    'Banco_Aritmética': banco
  });
  const tenant = "({codigo:'demo', layout:'v2', spreadsheetId:'SS_DEMO'})";
  const exam = m.run('getExamForTenant(' + tenant + ", 'A', 'ORDINARIO', '', '12345678')");
  assert.strictEqual(exam.escala.motor, 'decimas');
  assert.strictEqual(exam.questions.length, 4);
  assert.ok(exam.questions.every((q) => q.correctAnswer === undefined));

  // La hoja se rompe / cambia entre getExam y submitExam.
  m.nuevaPeticion();
  m.spreadsheets.SS_DEMO.getSheetByName('config_examen')._v[1][5] = 'abc';
  const answers = exam.questions.map((q, i) => ({ questionId: q.id, selectedOption: i < 3 ? 0 : 1 }));
  const res = m.run('submitExamForTenant(' + tenant + ', ' + JSON.stringify(exam.examSessionId) + ", '12345678', " + JSON.stringify(answers) + ')');
  assert.strictEqual(res.totalScore, 3 * 5 - 1.25);
  assert.strictEqual(res.maxScore, 20);
  assert.strictEqual(res.performanceLevel, 'bueno');
});

test('scoreBySubject_ UNSAAC: 60 correctas, 10 blancos, 10 incorrectas -> (300 + 10) × 2,5 = 775', () => {
  const m = crearMundo();
  const r = m.run('validateConfigV2_')(examenUnsaac(), ESCALA_UNSAAC, 'ORDINARIO');
  // Plan como lo arma buildExamPoolForTenant (puntos brutos + factor).
  const plan = r.config.rows.map((x) => ({ name: x.curso, questionCount: x.nPreguntas, pointsPerQuestion: x.puntosCorrecta,
    puntosIncorrecta: x.puntosIncorrecta, puntosBlanco: x.puntosBlanco, factor: x.factor, maxScore: x.puntosCorrecta * x.nPreguntas * x.factor }));
  // Reparto [correctas, blancos, incorrectas] por curso: 60 / 10 / 10 en 80 preguntas.
  const reparto = [[10, 2, 2], [8, 1, 1], [10, 2, 2], [10, 2, 2], [11, 2, 1], [11, 1, 2]];
  const stats = {};
  r.config.rows.forEach((x, i) => {
    const [c, b, inc] = reparto[i];
    assert.strictEqual(c + b + inc, x.nPreguntas);
    stats[x.curso] = { correct: c, unanswered: b, incorrect: inc, total: x.nPreguntas };
  });
  const res = m.run('scoreBySubject_')(r.config.escala, plan, stats);
  assert.strictEqual(res.totalScore, 775);
  assert.strictEqual(res.maxScore, 1000);
});

test('scoreBySubject_ UNAJ (suma_ponderada): suma blancos × 0,5 y NO resta incorrectas', () => {
  const m = crearMundo();
  const r = m.run('validateConfigV2_')(examenUnaj(), ESCALA_UNAJ, 'ORDINARIO');
  const plan = r.config.rows.map((x) => ({ name: x.curso, pointsPerQuestion: x.puntosCorrecta, puntosIncorrecta: -99,
    puntosBlanco: x.puntosBlanco, factor: x.factor, maxScore: x.puntosCorrecta * x.nPreguntas }));
  const stats = { 'Aritmética': { correct: 2, unanswered: 1, incorrect: 0, total: 3 }, 'Álgebra': { correct: 0, unanswered: 2, incorrect: 3, total: 5 } };
  const res = m.run('scoreBySubject_')(r.config.escala, plan, stats);
  assert.ok(cerca(res.totalScore, Math.round((2 * 54.177 + 0.5 + 2 * 0.5) * 100) / 100, 1e-9), String(res.totalScore));
});

test('scoreBySubject_: piso 0 en el total; sesiones antiguas (sin puntosBlanco/factor) dan lo mismo que antes', () => {
  const m = crearMundo();
  const score = m.run('scoreBySubject_');
  const neg = score({ motor: 'decimas' }, [{ name: 'X', pointsPerQuestion: 20, puntosIncorrecta: -1.125, maxScore: 200 }],
    { X: { correct: 0, incorrect: 10, unanswered: 0, total: 10 } });
  assert.strictEqual(neg.totalScore, 0);
  assert.strictEqual(neg.subjectResults[0].points, -11.25);
  const viejo = score({ motor: 'suma_ponderada' }, [{ name: 'Aritmética', pointsPerQuestion: 52.01, maxScore: 208.04 }],
    { 'Aritmética': { correct: 3, incorrect: 1, unanswered: 0, total: 4 } });
  assert.strictEqual(viejo.totalScore, 156.03);
  assert.strictEqual(viejo.maxScore, 208.04);
});

test('scoreBySubject_ UNP (decimas): 60 correctas, 25 incorrectas, 15 blancos -> 240 - 6,25 - 1,5 = 232,25', () => {
  const m = crearMundo();
  const score = m.run('scoreBySubject_');
  const r = score({ motor: 'decimas' }, [{ name: 'Todo', pointsPerQuestion: 4, puntosIncorrecta: -0.25, puntosBlanco: -0.1, maxScore: 400 }],
    { Todo: { correct: 60, incorrect: 25, unanswered: 15, total: 100 } });
  assert.ok(cerca(r.totalScore, 232.25, 0.001), String(r.totalScore));
});

test('getExam v2 con puntos_blanco y factor: el plan de la sesión los lleva y submitExam los aplica', () => {
  const m = crearMundo();
  const banco = [['Question Text', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Option 5', 'Correct Answer', 'ID_HASH', 'ESTADO']];
  for (let i = 1; i <= 4; i++) banco.push(['P' + i, 'a', 'b', 'c', 'd', 'e', 1, 'u' + i, 'activa']);
  m.crearSS('SS_U', {
    config_examen: [EXAMEN_HEADERS_EXT, ['ORDINARIO', 'A', 'area', 'Física', 4, 5, 0, 1, 1, 1, '']],
    config_escala: [ESCALA_HEADERS_EXT, ['ORDINARIO', 'otro', 50, 40, 30, 20, 60, 4, 2.5, '']],
    'Banco_Física': banco
  });
  const tenant = "({codigo:'u', layout:'v2', spreadsheetId:'SS_U'})";
  const exam = m.run('getExamForTenant(' + tenant + ", 'A', 'ORDINARIO', '', '12345678')");
  assert.strictEqual(exam.questions[0].points, 12.5);
  const answers = [{ questionId: exam.questions[0].id, selectedOption: 0 }, { questionId: exam.questions[1].id, selectedOption: 0 }];
  const res = m.run('submitExamForTenant(' + tenant + ', ' + JSON.stringify(exam.examSessionId) + ", '12345678', " + JSON.stringify(answers) + ')');
  assert.strictEqual(res.totalScore, (2 * 5 + 2 * 1) * 2.5);
  assert.strictEqual(res.maxScore, 50);
});

// ============================================
// PARTE 3: carreras (config_carreras.gs) — nunca bloquean el examen
// ============================================

console.log('\nPARTE 3 — carreras por división (config_carreras)');
const carCtx = vm.createContext({ console: console });
vm.runInContext(fs.readFileSync(path.join(GAS_DIR, 'config_guard.gs'), 'utf8') + '\n' +
  fs.readFileSync(path.join(GAS_DIR, 'config_carreras.gs'), 'utf8'), carCtx, { filename: 'carreras.js' });
const validarCarreras = (rows, divs) => JSON.parse(JSON.stringify(vm.runInContext('validateConfigCarreras_', carCtx)(rows, divs, {})));
const CAR_HEADERS = ['division', 'carrera', 'sede', 'activo', 'orden'];

test('carreras: sin hoja -> existe=false, sin errores', () => {
  const r = validarCarreras(null, ['A']);
  assert.strictEqual(r.existe, false);
  assert.strictEqual(r.ok, true);
  igualJSON(r.porDivision, {});
});

test('carreras: agrupa por división, tolera tildes/mayúsculas, sede, activo=NO, duplicados y orden', () => {
  const r = validarCarreras([
    ['Lista de carreras UNSA'],
    CAR_HEADERS,
    ['biomedicas', 'Medicina', '', '', 2],
    ['BIOMÉDICAS', 'Enfermería', '', 'SI', 1],
    ['Biomédicas', 'Medicina', '', '', ''],
    ['Ingenierías', 'Ingeniería Civil', 'Filial Mollendo', '', ''],
    ['Ingenierías', 'Ingeniería de Minas', '', 'NO', ''],
    ['Sociales', 'Derecho', 'Sede central', '', ''],
    ['', '', '', '', ''],
    ['Letras', 'Historia', '', '', ''],
    ['Sociales', '', '', '', ''],
    ['Sociales', '=HYPERLINK("x")', '', '', '']
  ], ['Biomédicas', 'Ingenierías', 'Sociales']);
  assert.strictEqual(r.ok, true);
  igualJSON(r.porDivision, {
    'Biomédicas': ['Enfermería', 'Medicina'],
    'Ingenierías': ['Ingeniería Civil (Filial Mollendo)'],
    'Sociales': ['Derecho']
  });
  assert.strictEqual(r.total, 4);
  const av = mensajes(r.avisos);
  assert.ok(/ya está en la fila 3/.test(av), av);
  assert.ok(/"Letras" no existe en el examen/.test(av), av);
  assert.ok(/no tiene carrera/.test(av), av);
  assert.ok(/símbolo de fórmula/.test(av), av);
});

test('carreras: títulos irreconocibles -> ok=false con mensaje claro (no lanza)', () => {
  const r = validarCarreras([['area', 'nombre'], ['A', 'X']], ['A']);
  assert.strictEqual(r.ok, false);
  assert.ok(/No encontré los títulos "carrera"/.test(mensajes(r.errores)), mensajes(r.errores));
});

test('carreras: división sin carreras -> aviso de texto libre', () => {
  const r = validarCarreras([CAR_HEADERS, ['A', 'Medicina']], ['A', 'B']);
  assert.ok(/"B" no tiene carreras/.test(mensajes(r.avisos)));
});

test('getConfig v2 agrega divisiones[].carreras; hoja rota NO rompe getConfig', () => {
  const tenant = "({codigo:'unmsm', layout:'v2', spreadsheetId:'SS_UNMSM'})";
  const m = crearMundo();
  m.crearSS('SS_UNMSM', {
    config_examen: examenUnmsm(), config_escala: escalaUnmsm(),
    config_carreras: [CAR_HEADERS, ['A', 'Medicina Humana', '', '', 1], ['A', 'Enfermería', '', '', 2]]
  });
  const resp = m.run('getConfigForTenant(' + tenant + ", 'ORDINARIO')");
  igualJSON(resp.divisiones[0].carreras, ['Medicina Humana', 'Enfermería']);

  const m2 = crearMundo();
  m2.crearSS('SS_UNMSM', { config_examen: examenUnmsm(), config_escala: escalaUnmsm(), config_carreras: [['???'], [1, 2]] });
  const resp2 = m2.run('getConfigForTenant(' + tenant + ", 'ORDINARIO')");
  assert.strictEqual(resp2.divisiones[0].totalMaxScore, 2000);
  assert.strictEqual(resp2.divisiones[0].carreras, undefined);

  const m3 = crearMundo();
  m3.crearSS('SS_UNMSM', { config_examen: examenUnmsm(), config_escala: escalaUnmsm() });
  assert.strictEqual(m3.run('getConfigForTenant(' + tenant + ", 'ORDINARIO')").divisiones[0].carreras, undefined);
});

test('getConfig UNA (legado) también toma config_carreras; la caché se invalida al editar', () => {
  const m = crearMundo();
  const hojas = hojasUnaReales(m.run('UNA_CONFIG_FABRICA_'));
  hojas.config_carreras = [CAR_HEADERS, ['Biomédicas', 'Medicina Humana', '', '', ''], ['Sociales', 'Derecho', '', '', '']];
  m.crearSS('SS_UNA', hojas);
  const tenant = "getTenant('una')";
  const porNombre = (r) => Object.fromEntries(r.divisiones.map((d) => [d.nombre, d.carreras]));
  let resp = m.run('getConfigForTenant(' + tenant + ", 'ORDINARIO')");
  igualJSON(porNombre(resp)['Biomédicas'], ['Medicina Humana']);
  assert.strictEqual(porNombre(resp)['Ingenierías'], undefined);

  m.spreadsheets.SS_UNA.getSheetByName('config_carreras')._v.push(['Ingenierías', 'Ingeniería Civil', '', '', '']);
  m.nuevaPeticion();
  resp = m.run('getConfigForTenant(' + tenant + ", 'ORDINARIO')");
  assert.strictEqual(porNombre(resp)['Ingenierías'], undefined, 'sigue en caché 10 min');
  m.run("cfgInvalidarCacheCarreras_({codigo:'una'})");
  resp = m.run('getConfigForTenant(' + tenant + ", 'ORDINARIO')");
  igualJSON(porNombre(resp)['Ingenierías'], ['Ingeniería Civil']);
});

// ============================================
// PARTE 4: piloto ordinario (piloto_ordinario.gs + piloto_datos.gs)
// ============================================

console.log('\nPARTE 4 — piloto ordinario (12 universidades en un paso)');

const BANCO_H = ['Question Text', 'Question Type', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Option 5',
  'Correct Answer', 'Time in seconds', 'Image Link', 'NUMERO', 'CURSO', 'TEMA', 'SUBTEMA',
  'NOMBRE DEL ARCHIVO', 'JUSTIFICACION', 'ID_HASH', 'PROCESO', 'ANIO_PERIODO', 'DIVISION', 'SEMANA', 'ESTADO'];
function filaBanco(texto, correcta, extra) {
  const f = BANCO_H.map(() => '');
  f[0] = texto; f[7] = correcta; f[21] = 'activa';
  Object.keys(extra || {}).forEach((k) => { f[BANCO_H.indexOf(k)] = extra[k]; });
  return f;
}
const REG_H = ['codigo', 'nombre', 'nombre_corto', 'spreadsheet_id', 'estado', 'procesos',
  'cepre_nombre', 'color_primario', 'color_secundario', 'logo', 'orden'];

test('pilotoContarBanco_ cuenta con las mismas reglas que getExam', () => {
  const m = crearMundo();
  const v = [BANCO_H,
    filaBanco('ok general', 2),
    filaBanco('ok solo A', 3, { DIVISION: 'Área A' }),
    filaBanco('otra división', 3, { DIVISION: 'Área B' }),
    filaBanco('es de CEPRE', 1, { PROCESO: 'CEPRE' }),
    filaBanco('ordinario explícito', 1, { PROCESO: 'ordinario' }),
    filaBanco('sin clave', ''),
    filaBanco('clave 7', 7),
    filaBanco('', 1),
    filaBanco('borrador', 1, { ESTADO: 'borrador' })];
  igualJSON(m.run('pilotoContarBanco_')(v, ['Área A', 'Área C']), { 'Área A': 3, 'Área C': 2 });
  igualJSON(m.run('pilotoContarBanco_')([BANCO_H], ['X']), { X: 0 });
});

test('pilotoPlanBancos_ + pilotoFaltantes_: por hoja y división, hoja inexistente cuenta 0', () => {
  const m = crearMundo();
  const plan = m.run('pilotoPlanBancos_')([
    { division: 'A', curso: 'Álgebra', nPreguntas: 4 }, { division: 'B', curso: 'Álgebra', nPreguntas: 6 },
    { division: 'A', curso: 'Física', nPreguntas: 3 }], (c) => c);
  igualJSON(plan['Banco_Álgebra'].porDivision, { A: 4, B: 6 });
  const faltan = m.run('pilotoFaltantes_')(plan, { 'Banco_Álgebra': { A: 10, B: 2 } });
  igualJSON(faltan.map((f) => [f.hoja, f.division, f.tiene, f.necesita, f.existe]),
    [['Banco_Álgebra', 'B', 2, 6, true], ['Banco_Física', 'A', 0, 3, false]]);
});

function mundoPiloto() {
  const m = crearMundo({ CORE_SPREADSHEET_ID: 'SS_CORE' });
  m.crearSS('SS_UNA', hojasUnaReales(m.run('UNA_CONFIG_FABRICA_')));
  // UNSA ya existía (seedPilotoUNSA): config de juguete, un banco con preguntas y estado piloto.
  m.crearSS('SS_UNSA', {
    config_examen: [['proceso', 'division', 'division_tipo', 'curso', 'n_preguntas', 'puntos_correcta', 'puntos_incorrecta', 'peso', 'orden'],
      ['ORDINARIO', 'BIO', 'area', 'Aritmética', 5, 10, -2.5, 1, 1]],
    config_escala: [['proceso', 'motor', 'escala_total', 'umbral_excelente', 'umbral_bueno', 'umbral_regular', 'duracion_min', 'n_preguntas_total'],
      ['ORDINARIO', 'decimas', 50, 40, 30, 20, 90, 5]],
    'Banco_Aritmética': [BANCO_H, filaBanco('2+2', 3)]
  });
  m.crearSS('SS_CORE', {
    universidades: [REG_H,
      ['una', 'Universidad Nacional del Altiplano', 'UNA Puno', 'SS_UNA', 'activa', 'ORDINARIO,CEPRE', 'CEPREUNA', '', '', '', 0],
      ['unsa', 'UNSA nombre del dueño', 'UNSA', 'SS_UNSA', 'piloto', 'ORDINARIO', 'CEPRUNSA', '#111111', '', '', 1]]
  });
  return m;
}
const registroPiloto = (m) => m.spreadsheets.SS_CORE.getSheetByName('universidades')._v;
const ssDe = (m, codigo) => m.spreadsheets[registroPiloto(m).filter((r) => r[0] === codigo)[0][3]];

test('cargarPilotoOrdinario: 12 universidades registradas, nuevas ocultas, UNSA respeta lo del dueño', () => {
  const m = mundoPiloto();
  const log = m.run('cargarPilotoOrdinario()');
  assert.ok(!/✗|⏸/.test(log), log);
  const reg = registroPiloto(m);
  const porCodigo = Object.fromEntries(reg.slice(1).map((r) => [r[0], r]));
  assert.deepStrictEqual(Object.keys(porCodigo).sort(),
    ['sanmarcos', 'una', 'unaj', 'unalm', 'unc', 'uncp', 'unfv', 'uni', 'unp', 'unsa', 'unsaac', 'unsch', 'unt']);
  assert.strictEqual(porCodigo.unp[4], 'oculta');
  assert.strictEqual(porCodigo.unp[5], 'ORDINARIO');
  assert.strictEqual(porCodigo.unsa[4], 'piloto');
  assert.strictEqual(porCodigo.unsa[1], 'UNSA nombre del dueño');
  assert.strictEqual(porCodigo.unsa[6], 'CEPRUNSA');
  assert.strictEqual(porCodigo.unsa[7], '#111111');
  assert.strictEqual(porCodigo.unsa[3], 'SS_UNSA', 'reutiliza el spreadsheet existente');
  igualJSON(reg[1], ['una', 'Universidad Nacional del Altiplano', 'UNA Puno', 'SS_UNA', 'activa', 'ORDINARIO,CEPRE', 'CEPREUNA', '', '', '', 0]);

  // UNSA: config reemplazada con respaldo; su banco intacto; bancos faltantes creados vacíos.
  const unsa = m.spreadsheets.SS_UNSA;
  const nombres = unsa.getSheets().map((s) => s.getName());
  assert.ok(nombres.some((n) => /^config_examen_respaldo_/.test(n)), nombres.join());
  assert.strictEqual(unsa.getSheetByName('Banco_Aritmética')._v.length, 2);
  assert.ok(nombres.filter((n) => /^Banco_/.test(n)).length > 3);

  // UNP (nueva): getConfig con escala 400 y carreras; sin la hoja vacía por defecto.
  const ssUnp = ssDe(m, 'unp');
  assert.ok(!ssUnp.getSheetByName('Hoja 1'));
  const resp = m.run("getConfigForTenant({codigo:'unp', layout:'v2', spreadsheetId:'" + ssUnp.getId() + "'}, 'ORDINARIO')");
  assert.strictEqual(resp.divisiones.length, 3);
  assert.ok(resp.divisiones.every((d) => cerca(d.totalMaxScore, 400)), JSON.stringify(resp.divisiones.map((d) => d.totalMaxScore)));
  assert.ok(resp.divisiones.every((d) => d.carreras && d.carreras.length > 0));

  // UNA: solo se agregó config_carreras; sus hojas de puntaje intactas.
  assert.ok(m.spreadsheets.SS_UNA.getSheetByName('config_carreras')._v.length > 50);
  assert.ok(m.spreadsheets.SS_UNA.getSheetByName('Configuración_Ingenierías'));
});

test('cargarPilotoOrdinario es idempotente: segunda corrida sin spreadsheets ni respaldos nuevos', () => {
  const m = mundoPiloto();
  m.run('cargarPilotoOrdinario()');
  const nSS = Object.keys(m.spreadsheets).length;
  const nHojasUnsa = m.spreadsheets.SS_UNSA.getSheets().length;
  const nFilas = registroPiloto(m).length;
  const log = m.run('cargarPilotoOrdinario()');
  assert.ok(!/spreadsheet NUEVO|Respaldo/.test(log), log.split('\n').filter((l) => /spreadsheet NUEVO|Respaldo/.test(l)).join('\n'));
  assert.strictEqual(Object.keys(m.spreadsheets).length, nSS);
  assert.strictEqual(m.spreadsheets.SS_UNSA.getSheets().length, nHojasUnsa);
  assert.strictEqual(registroPiloto(m).length, nFilas);
});

test('revisarPilotoOrdinario: dice qué falta y cuándo una universidad está lista', () => {
  const m = mundoPiloto();
  m.run('cargarPilotoOrdinario()');
  m.run('revisarPilotoOrdinario()');
  const fila = (c) => m.spreadsheets.SS_CORE.getSheetByName('_piloto_ordinario')._v.filter((r) => r[0] === c)[0];
  assert.strictEqual(m.spreadsheets.SS_CORE.getSheetByName('_piloto_ordinario')._v.length, 13, 'encabezado + 12 universidades');
  assert.strictEqual(fila('unalm')[2], 'FALTAN PREGUNTAS');
  assert.strictEqual(fila('unsa')[2], '⚠ PUBLICADA SIN PREGUNTAS SUFICIENTES');

  // Se llenan los bancos de UNALM (área única) con lo justo → LISTA.
  const ss = ssDe(m, 'unalm');
  const cfg = m.ctx.validateConfigV2_(ss.getSheetByName('config_examen')._v, ss.getSheetByName('config_escala')._v, 'ORDINARIO', {});
  const plan = m.ctx.pilotoPlanBancos_(cfg.config.rows, m.ctx.getCursoCanonical);
  Object.keys(plan).forEach((hoja) => {
    const n = Object.values(plan[hoja].porDivision)[0];
    for (let i = 0; i < n; i++) ss.getSheetByName(hoja)._v.push(filaBanco(hoja + ' ' + i, 1));
  });
  m.run('revisarPilotoOrdinario()');
  assert.strictEqual(fila('unalm')[2], 'LISTA: cambia estado a piloto', JSON.stringify(fila('unalm')));
});

console.log('\n' + (fallados === 0 ? 'OK' : 'FALLÓ') + ': ' + pasados + ' pasados, ' + fallados + ' fallados');
process.exit(fallados === 0 ? 0 : 1);
