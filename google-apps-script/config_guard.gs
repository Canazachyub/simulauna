/**
 * SimulaUNA - CONFIG GUARD (configuraciones de puntaje a prueba de errores)
 * ============================================
 * Las hojas de configuración de puntaje las editan personas no técnicas en
 * Google Sheets. Este archivo garantiza que un error de tipeo NUNCA tumbe
 * el simulacro ni califique mal en silencio:
 *
 * 1. FUNCIONES PURAS (sin SpreadsheetApp; testeables en node, ver
 *    tests/config_guard.test.js): parseNumberCell_, normalizeHeader_,
 *    findColumns_, validateUnaAreaSheet_, validateConfigExamen_,
 *    validateConfigEscala_, validateConfigV2_, validateUnaConfig_.
 *    Devuelven {ok, config, errores:[{hoja,fila,columna,mensaje}], avisos:[...]}
 *    con mensajes en español simple que señalan la celda exacta.
 * 2. CARGA SEGURA (cfgCargarConfig_): lee la hoja, la valida y:
 *    - si es válida, la usa y la guarda como "última buena conocida"
 *      (PropertiesService, troceada en partes < 9KB);
 *    - si es inválida, sirve la última buena (el examen sigue), lo registra
 *      con console.error y lo anota en la hoja `_validacion_config`;
 *    - si nunca hubo una buena: UNA usa su configuración de fábrica (copia
 *      en el código); las demás responden MSG_CONFIG_EN_REVISION_.
 *    Nunca se califica con una configuración inválida.
 * 3. HERRAMIENTAS DEL EDITOR (ejecutar desde el editor de Apps Script):
 *    validarConfiguraciones(), instalarValidacionDeDatos(),
 *    instalarTriggerValidacion() y el activador alEditarConfiguracion(e).
 *
 * DECISIONES DOCUMENTADAS (parseNumberCell_):
 * - Celdas numéricas de Sheets (typeof number) se usan tal cual.
 * - Texto con UN solo separador ("5.201", "5,201", "208,04", "-1,125"):
 *   ese separador es SIEMPRE el decimal (en config no hay miles).
 * - Texto con punto Y coma ("1.234,56", "1,234.56"): el último es el
 *   decimal y el otro debe separar miles en grupos de 3.
 * - Varios separadores iguales ("1.234.567", "5.4.06"): error explícito
 *   (no se adivina si son miles o un error de tipeo).
 * - Porcentajes ("20%"): error explícito (no se sabe si es 20 o 0,2).
 * - "#REF!", "#N/A", "#DIV/0!", vacío, texto, fechas, VERDADERO/FALSO:
 *   error explícito {ok:false, motivo}.
 *
 * COLUMNAS OPCIONALES (si no existen, todo funciona como antes):
 * - config_examen.puntos_blanco (|valor| < puntos_correcta; vacío = 0):
 *   puntos por pregunta en blanco (UNSAAC +1, UNAJ +0,5; negativo si el
 *   reglamento resta por blanco, UNP -0,10).
 * - config_examen.factor_escala (> 0; vacío = el de config_escala): factor
 *   por fila/división (UNSCH: 900/230).
 * - config_escala.factor_escala (> 0; vacío = 1): lleva el bruto a la
 *   escala oficial (UNSAAC: 400 × 2,5 = 1000).
 * - config_escala.minimo_aprobatorio (texto o número): solo informativo;
 *   sale en getConfig como escala.minimoAprobatorio si está lleno.
 * Regla de cruce: escala_total ≈ Σ (n_preguntas × puntos_correcta × factor).
 * Motor 'otro' = decimas. Fórmula y piso 0 del total: ver scoreBySubject_ (scoring.gs).
 *
 * PROCESO: en config_examen y config_escala una celda `proceso` vacía
 * significa ORDINARIO (comportamiento histórico). config_escala NUNCA cae a
 * la fila de otro proceso; única excepción: si la hoja tiene UNA sola fila
 * de datos y su proceso está vacío, esa fila vale para cualquier proceso
 * (con aviso).
 */

// ============================================
// 1. CONSTANTES
// ============================================

// Texto que el frontend puede mostrar tal cual (ver friendlyError.ts).
const MSG_CONFIG_EN_REVISION_ = 'La configuración de puntajes de esta universidad está en revisión. Intenta más tarde.';

const CFG_TOL_PUNTAJE_FILA_ = 0.05;   // PUNTAJE vs 10 × ponderación × cantidad (UNA)
const CFG_TOL_SUMA_ = 0.5;            // Σ puntajes vs NOTA MÁXIMA / escala_total
const CFG_UMBRALES_PCT_ = { excelente: 0.8, bueno: 0.6, regular: 0.4 };
const CFG_DURACION_DEFAULT_ = 180;
const CFG_HEADER_SCAN_ROWS_ = 10;     // el encabezado puede no estar en la fila 1
// 'otro' se acepta y se califica como decimas (con blancos y factor); se guarda como 'decimas'.
const CFG_MOTORES_ = ['suma_ponderada', 'decimas', 'vector_canal', 'otro'];
const CFG_DIVISION_TIPOS_ = ['area', 'canal'];
const CFG_PROCESOS_SUGERIDOS_ = ['ORDINARIO', 'CEPRE', 'EXTRAORDINARIO'];
const CFG_DIACRITICS_RE_ = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

const CFG_ALIAS_CANTIDAD_ = ['cantidad de preguntas', 'cantidad', 'n preguntas', 'nro preguntas', 'nro de preguntas',
  'numero de preguntas', 'n de preguntas', 'num preguntas', 'preguntas'];

// Layout legado UNA: Configuración_<Área>
const CFG_SPEC_UNA_ = {
  cod: { etiqueta: 'COD.', alias: ['cod', 'codigo', 'cod curso'], requerida: false },
  asignatura: { etiqueta: 'ASIGNATURA', alias: ['asignatura', 'asignaturas', 'curso', 'cursos', 'materia'], requerida: true },
  puntosCorrecta: { etiqueta: 'PREGUNTA BIEN CONTESTADA', alias: ['pregunta bien contestada', 'preguntas bien contestadas',
    'bien contestada', 'puntos correcta', 'puntos por pregunta', 'puntaje por pregunta'], requerida: true },
  cantidad: { etiqueta: 'CANTIDAD DE PREGUNTAS', alias: CFG_ALIAS_CANTIDAD_, requerida: true },
  ponderacion: { etiqueta: 'PONDERACIÓN', alias: ['ponderacion', 'ponderaciones', 'peso', 'ponderado'], requerida: true },
  puntaje: { etiqueta: 'PUNTAJE', alias: ['puntaje', 'puntaje maximo', 'puntaje max', 'puntaje total'], requerida: false }
};

// Layout v2: config_examen
const CFG_SPEC_EXAMEN_ = {
  proceso: { etiqueta: 'proceso', alias: ['proceso', 'procesos'], requerida: false },
  division: { etiqueta: 'division', alias: ['division', 'divisiones', 'area', 'areas'], requerida: true },
  divisionTipo: { etiqueta: 'division_tipo', alias: ['division tipo', 'tipo division', 'tipo de division', 'tipo'], requerida: false },
  curso: { etiqueta: 'curso', alias: ['curso', 'cursos', 'asignatura', 'asignaturas', 'materia'], requerida: true },
  nPreguntas: { etiqueta: 'n_preguntas', alias: CFG_ALIAS_CANTIDAD_, requerida: true },
  puntosCorrecta: { etiqueta: 'puntos_correcta', alias: ['puntos correcta', 'puntos correctas', 'puntos por correcta',
    'pregunta bien contestada', 'puntaje por pregunta', 'puntos por pregunta'], requerida: true },
  puntosIncorrecta: { etiqueta: 'puntos_incorrecta', alias: ['puntos incorrecta', 'puntos incorrectas', 'puntos por incorrecta',
    'penalidad', 'penalizacion', 'descuento'], requerida: false },
  peso: { etiqueta: 'peso', alias: ['peso', 'ponderacion', 'ponderado'], requerida: false },
  orden: { etiqueta: 'orden', alias: ['orden', 'posicion'], requerida: false },
  // Opcionales (prospectos 2026): puntos por pregunta en blanco (UNSAAC +1, UNAJ +0,5)
  // y factor de escala por fila/división (UNSCH: 900/230). Sin columna = comportamiento anterior.
  puntosBlanco: { etiqueta: 'puntos_blanco', alias: ['puntos blanco', 'puntos en blanco', 'puntos por blanco', 'blanco', 'en blanco'], requerida: false },
  factorEscala: { etiqueta: 'factor_escala', alias: ['factor escala', 'factor de escala', 'factor'], requerida: false }
};

// Layout v2: config_escala
const CFG_SPEC_ESCALA_ = {
  proceso: { etiqueta: 'proceso', alias: ['proceso', 'procesos'], requerida: false },
  motor: { etiqueta: 'motor', alias: ['motor', 'motor de calificacion', 'tipo de calificacion', 'calificacion'], requerida: true },
  escalaTotal: { etiqueta: 'escala_total', alias: ['escala total', 'escala', 'puntaje maximo', 'nota maxima'], requerida: true },
  umbralExcelente: { etiqueta: 'umbral_excelente', alias: ['umbral excelente', 'excelente'], requerida: false },
  umbralBueno: { etiqueta: 'umbral_bueno', alias: ['umbral bueno', 'bueno'], requerida: false },
  umbralRegular: { etiqueta: 'umbral_regular', alias: ['umbral regular', 'regular'], requerida: false },
  duracionMin: { etiqueta: 'duracion_min', alias: ['duracion min', 'duracion', 'duracion minutos', 'minutos', 'tiempo min'], requerida: false },
  nPreguntasTotal: { etiqueta: 'n_preguntas_total', alias: ['n preguntas total', 'total preguntas', 'total de preguntas',
    'nro preguntas total', 'numero de preguntas total'], requerida: false },
  // Opcionales: factor que lleva el puntaje bruto a la escala oficial (UNSAAC: 400 × 2,5 = 1000)
  // y mínimo aprobatorio (solo informativo, no bloquea calificar).
  factorEscala: { etiqueta: 'factor_escala', alias: ['factor escala', 'factor de escala', 'factor'], requerida: false },
  minimoAprobatorio: { etiqueta: 'minimo_aprobatorio', alias: ['minimo aprobatorio', 'puntaje minimo aprobatorio',
    'nota minima aprobatoria', 'minimo'], requerida: false }
};

// Configuración de FÁBRICA de UNA (último recurso: solo si la hoja es
// inválida Y nunca se guardó una "última buena"). Fuente: hojas reales
// Configuración_* (mismos valores que el mock del frontend).
// Formato: [asignatura, cantidad, ponderación, puntaje]; pregunta bien contestada = 10.
const UNA_CONFIG_FABRICA_ = {
  'Ingenierías': [
    ['Aritmética', 4, 5.201, 208.04], ['Álgebra', 4, 5.202, 208.08], ['Geometría', 4, 5.303, 212.12],
    ['Trigonometría', 4, 5.404, 216.16], ['Física', 4, 5.905, 236.2], ['Química', 4, 5.406, 216.24],
    ['Biología y Anatomía', 2, 3.177, 63.54], ['Psicología y Filosofía', 4, 3.802, 152.08], ['Geografía', 2, 2.576, 51.52],
    ['Historia', 2, 3.701, 74.02], ['Educación Cívica', 2, 3.101, 62.02], ['Economía', 2, 3.502, 70.04],
    ['Comunicación', 4, 3.352, 134.08], ['Literatura', 2, 2.501, 50.02], ['Razonamiento Matemático', 6, 7.603, 456.18],
    ['Razonamiento Verbal', 6, 7.103, 426.18], ['Inglés', 2, 4.087, 81.74], ['Quechua y aimara', 2, 4.087, 81.74]
  ],
  'Sociales': [
    ['Aritmética', 3, 3.331, 99.93], ['Álgebra', 3, 3.185, 95.55], ['Geometría', 2, 3.12, 62.4],
    ['Trigonometría', 2, 3.12, 62.4], ['Física', 2, 2.302, 46.04], ['Química', 2, 2.404, 48.08],
    ['Biología y Anatomía', 2, 2.504, 50.08], ['Psicología y Filosofía', 4, 4.807, 192.28], ['Geografía', 4, 4.907, 196.28],
    ['Historia', 4, 5.805, 232.2], ['Educación Cívica', 4, 6.576, 263.04], ['Economía', 4, 4.607, 184.28],
    ['Comunicación', 4, 6.09, 243.6], ['Literatura', 4, 4.3, 172], ['Razonamiento Matemático', 6, 7.203, 432.18],
    ['Razonamiento Verbal', 6, 7.603, 456.18], ['Inglés', 2, 4.087, 81.74], ['Quechua y aimara', 2, 4.087, 81.74]
  ],
  'Biomédicas': [
    ['Aritmética', 3, 3.331, 99.93], ['Álgebra', 3, 3.202, 96.06], ['Geometría', 3, 3.301, 99.03],
    ['Trigonometría', 3, 3.404, 102.12], ['Física', 3, 5.505, 165.15], ['Química', 5, 6.623, 331.15],
    ['Biología y Anatomía', 6, 7.816, 468.96], ['Psicología y Filosofía', 4, 4.006, 160.24], ['Geografía', 2, 2.8, 56],
    ['Historia', 2, 3.302, 66.04], ['Educación Cívica', 2, 3.571, 71.42], ['Economía', 2, 3.406, 68.12],
    ['Comunicación', 4, 3.302, 132.08], ['Literatura', 2, 2.805, 56.1], ['Razonamiento Matemático', 6, 7.201, 432.06],
    ['Razonamiento Verbal', 6, 7.201, 432.06], ['Inglés', 2, 4.087, 81.74], ['Quechua y aimara', 2, 4.087, 81.74]
  ]
};

// ============================================
// 2. FUNCIONES PURAS: NÚMEROS Y ENCABEZADOS
// ============================================

/** Muestra el valor de una celda tal como lo escribió el editor (para mensajes). */
function cfgMostrar_(v) {
  if (v === null || v === undefined) return "''";
  if (typeof v === 'number') return String(v);
  if (Object.prototype.toString.call(v) === '[object Date]') return 'una fecha';
  return "'" + String(v) + "'";
}

/**
 * Convierte el contenido de una celda en número SIN adivinar en silencio.
 * Devuelve {ok:true, value} o {ok:false, vacio:boolean, motivo:string}.
 * Ver reglas en la cabecera del archivo.
 */
function parseNumberCell_(v) {
  if (typeof v === 'number') {
    if (!isFinite(v)) return { ok: false, vacio: false, motivo: 'no contiene un número válido' };
    return { ok: true, value: v === 0 ? 0 : v };
  }
  if (v === null || v === undefined) return { ok: false, vacio: true, motivo: 'la celda está vacía' };
  if (typeof v === 'boolean') {
    return { ok: false, vacio: false, motivo: 'tiene VERDADERO/FALSO en lugar de un número' };
  }
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return { ok: false, vacio: false, motivo: 'Google Sheets convirtió lo que escribiste en una fecha; borra la celda y escribe solo el número' };
  }

  const original = String(v);
  let s = original.replace(/[   ]/g, ' ').trim();
  if (s === '') return { ok: false, vacio: true, motivo: 'la celda está vacía' };
  const mostrado = "'" + original.trim() + "'";

  if (s.charAt(0) === '#') {
    return { ok: false, vacio: false, motivo: 'la celda muestra el error ' + s + ' (la fórmula está rota): corrige la fórmula o escribe el número a mano' };
  }
  if (/%$/.test(s)) {
    return { ok: false, vacio: false, motivo: mostrado + ' tiene el signo %: escribe el número sin % (por ejemplo 0,2 o 20, según corresponda)' };
  }

  s = s.replace(/^[−–—]/, '-');
  let signo = 1;
  if (s.charAt(0) === '-' || s.charAt(0) === '+') {
    if (s.charAt(0) === '-') signo = -1;
    s = s.slice(1).trim();
  }
  const noEsNumero = { ok: false, vacio: false, motivo: mostrado + ' no es un número' };
  if (/\s/.test(s)) return { ok: false, vacio: false, motivo: mostrado + ' tiene espacios en medio del número' };
  if (!/^[0-9.,]+$/.test(s) || !/[0-9]/.test(s)) return noEsNumero;

  const nPuntos = (s.match(/\./g) || []).length;
  const nComas = (s.match(/,/g) || []).length;
  let normal;

  if (nPuntos === 0 && nComas === 0) {
    normal = s;
  } else if (nPuntos > 0 && nComas > 0) {
    // "1.234,56" o "1,234.56": el último separador es el decimal.
    const dec = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
    const mil = dec === '.' ? ',' : '.';
    const partes = s.split(dec);
    if (partes.length !== 2) return noEsNumero;
    const grupos = new RegExp('^\\d{1,3}(\\' + mil + '\\d{3})+$');
    if (!grupos.test(partes[0]) || !/^\d+$/.test(partes[1])) return noEsNumero;
    normal = partes[0].split(mil).join('') + '.' + partes[1];
  } else if (nPuntos + nComas === 1) {
    // Un solo separador: SIEMPRE decimal ("5,201" = 5.201).
    const sep = nPuntos ? '.' : ',';
    const partes = s.split(sep);
    if (!/^\d+$/.test(partes[0]) || !/^\d+$/.test(partes[1])) return noEsNumero;
    normal = partes[0] + '.' + partes[1];
  } else {
    // Varios separadores iguales: ambiguo o error de tipeo ("5.4.06").
    const grupos = /^\d{1,3}([.,]\d{3})+$/;
    if (grupos.test(s)) {
      return { ok: false, vacio: false, motivo: mostrado + ' es ambiguo (no queda claro si los separadores son de miles o decimales): escríbelo sin separador de miles' };
    }
    return noEsNumero;
  }

  const n = Number(normal) * signo;
  if (!isFinite(n)) return noEsNumero;
  return { ok: true, value: n === 0 ? 0 : n };
}

/**
 * Normaliza un encabezado (o un nombre) para compararlo: minúsculas, sin
 * tildes, sin puntos/guiones bajos/símbolos, sin saltos de línea ni
 * espacios dobles. 'COD.' -> 'cod', ' Cantidad de\nPreguntas ' ->
 * 'cantidad de preguntas', 'n_preguntas' -> 'n preguntas', 'N° preguntas' -> 'n preguntas'.
 */
function normalizeHeader_(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .normalize('NFD')
    .replace(CFG_DIACRITICS_RE_, '')
    .toLowerCase()
    .replace(/[°º]/g, ' ')
    .replace(/[_\-\/\\.:;()\[\]*#'"]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Letra de columna de Sheets para un índice 0-based (0 -> A, 27 -> AB). */
function cfgLetraColumna_(i) {
  let n = i + 1;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Busca las columnas de `spec` en una fila de encabezados (por alias
 * normalizados, coincidencia exacta). Devuelve
 * {ok, idx:{clave:índice|-1}, faltantes:[{clave,etiqueta,alias}], duplicadas:[{clave,etiqueta,columnas}], textos:[...]}.
 */
function findColumns_(headerRow, spec) {
  const fila = Array.isArray(headerRow) ? headerRow : [];
  const normales = fila.map(normalizeHeader_);
  const idx = {};
  const faltantes = [];
  const duplicadas = [];

  Object.keys(spec).forEach(function (clave) {
    const alias = spec[clave].alias.map(normalizeHeader_);
    const encontrados = [];
    normales.forEach(function (h, i) {
      if (h && alias.indexOf(h) !== -1) encontrados.push(i);
    });
    idx[clave] = encontrados.length ? encontrados[0] : -1;
    if (encontrados.length > 1) duplicadas.push({ clave: clave, etiqueta: spec[clave].etiqueta, columnas: encontrados });
    if (!encontrados.length && spec[clave].requerida) {
      faltantes.push({ clave: clave, etiqueta: spec[clave].etiqueta, alias: spec[clave].alias });
    }
  });

  return {
    ok: faltantes.length === 0,
    idx: idx,
    faltantes: faltantes,
    duplicadas: duplicadas,
    textos: fila.map(function (h) { return String(h === null || h === undefined ? '' : h).replace(/\s+/g, ' ').trim(); })
  };
}

/** Ubica la fila de encabezados en las primeras CFG_HEADER_SCAN_ROWS_ filas. */
function cfgUbicarEncabezados_(rows2d, spec) {
  let mejor = null;
  const limite = Math.min(rows2d.length, CFG_HEADER_SCAN_ROWS_);
  for (let r = 0; r < limite; r++) {
    const res = findColumns_(rows2d[r], spec);
    res.fila = r;
    if (res.ok) return res;
    if (!mejor || res.faltantes.length < mejor.faltantes.length) mejor = res;
  }
  return mejor || Object.assign(findColumns_([], spec), { fila: 0 });
}

/** 'total' | 'nota' | '' según la etiqueta de una fila resumen (TOTAL, NOTA MÁXIMA, SUBTOTAL…). */
function cfgTipoResumen_(texto) {
  const n = normalizeHeader_(texto);
  if (!n) return '';
  if (/^nota max/.test(n) || /^puntaje maximo/.test(n) || n === 'maximo' || n === 'max') return 'nota';
  if (/^(sub ?totale?s?|totale?s?|suma)( |$)/.test(n)) return 'total';
  return '';
}

/** Tipo resumen buscando en cualquier celda de texto de la fila. */
function cfgTipoResumenFila_(row) {
  for (let i = 0; i < (row || []).length; i++) {
    if (typeof row[i] === 'string') {
      const t = cfgTipoResumen_(row[i]);
      if (t) return t;
    }
  }
  return '';
}

function cfgTexto_(v) {
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return '';
  return String(v).replace(/\s+/g, ' ').trim();
}

function cfgFilaVacia_(row) {
  return !(row || []).some(function (v) { return v !== null && v !== undefined && String(v).trim() !== ''; });
}

function cfgFilaTieneNumeros_(row) {
  return (row || []).some(function (v) { return typeof v === 'number' || (typeof v === 'string' && /\d/.test(v)); });
}

function cfgRedondear_(x, decimales) {
  const f = Math.pow(10, decimales);
  return Math.round(x * f) / f;
}

function cfgNormProceso_(p) {
  const s = String(p === null || p === undefined ? '' : p).normalize('NFD').replace(CFG_DIACRITICS_RE_, '').trim().toUpperCase();
  return s;
}

/** Normaliza el motor: 'Suma ponderada', 'SUMA_PONDERADA' -> 'suma_ponderada'; desconocido -> ''. */
function cfgNormMotor_(v) {
  const k = normalizeHeader_(v).replace(/ /g, '');
  if (k === 'sumaponderada' || k === 'ponderada') return 'suma_ponderada';
  if (k === 'decimas' || k === 'decima') return 'decimas';
  if (k === 'vectorcanal' || k === 'vectorporcanal' || k === 'canal') return 'vector_canal';
  if (k === 'otro' || k === 'otros') return 'decimas'; // misma fórmula: correctas + incorrectas + blancos, × factor
  return '';
}

// ============================================
// 3. FUNCIONES PURAS: RESULTADOS Y MENSAJES
// ============================================

function cfgResultado_() {
  return { ok: false, config: null, errores: [], avisos: [] };
}

/** "Hoja X, fila 7 (Química), columna PONDERACIÓN (celda E7): " */
function cfgUbicacion_(hoja, fila, curso, columna, col) {
  let s = 'Hoja ' + hoja;
  if (fila) s += ', fila ' + fila + (curso ? ' (' + curso + ')' : '');
  if (columna) s += ', columna ' + columna + ((col >= 0 && fila) ? ' (celda ' + cfgLetraColumna_(col) + fila + ')' : '');
  return s + ': ';
}

function cfgAgregar_(lista, hoja, fila, curso, columna, col, detalle) {
  lista.push({
    hoja: hoja,
    fila: fila || '',
    columna: columna || '',
    mensaje: cfgUbicacion_(hoja, fila, curso, columna, col) + detalle
  });
}

/** Errores de encabezado (columnas faltantes) y avisos (columnas repetidas). */
function cfgReportarEncabezados_(out, hoja, enc) {
  const filaEnc = (enc.fila || 0) + 1;
  enc.faltantes.forEach(function (f) {
    cfgAgregar_(out.errores, hoja, filaEnc, '', f.etiqueta, -1,
      'no encuentro esta columna en la fila de títulos. Escribe el título así: ' + f.etiqueta +
      (f.alias.length > 1 ? ' (también vale: ' + f.alias.slice(1, 4).join(', ') + ')' : '') + '.');
  });
  enc.duplicadas.forEach(function (d) {
    cfgAgregar_(out.avisos, hoja, filaEnc, '', d.etiqueta, -1,
      'hay ' + d.columnas.length + ' columnas con ese título (' + d.columnas.map(cfgLetraColumna_).join(', ') +
      '); uso la primera (' + cfgLetraColumna_(d.columnas[0]) + '). Borra o renombra la otra.');
  });
}

/**
 * Lee un número de la fila con reglas. Empuja el error/aviso y devuelve
 * el número o null. reglas: {entero, min, mayorQue, max, msgMax, siVacio, avisoVacio}.
 */
function cfgLeerNumero_(ctx, row, col, etiqueta, reglas) {
  const raw = col >= 0 ? row[col] : '';
  const p = parseNumberCell_(raw);
  const err = function (detalle) { cfgAgregar_(ctx.out.errores, ctx.hoja, ctx.fila, ctx.curso, etiqueta, col, detalle); return null; };

  if (!p.ok) {
    if (p.vacio && reglas.siVacio !== undefined) {
      if (reglas.avisoVacio) cfgAgregar_(ctx.out.avisos, ctx.hoja, ctx.fila, ctx.curso, etiqueta, col, reglas.avisoVacio);
      return reglas.siVacio;
    }
    return err(p.motivo + '.');
  }

  let v = p.value;
  if (reglas.entero) {
    if (Math.abs(v - Math.round(v)) > 1e-9) return err('debe ser un número entero (sin decimales) y dice ' + cfgMostrar_(raw) + '.');
    v = Math.round(v);
  }
  if (reglas.min !== undefined && v < reglas.min) return err('no puede ser menor que ' + reglas.min + ' y dice ' + cfgMostrar_(raw) + '.');
  if (reglas.mayorQue !== undefined && !(v > reglas.mayorQue)) return err('debe ser mayor que ' + reglas.mayorQue + ' y dice ' + cfgMostrar_(raw) + '.');
  if (reglas.max !== undefined && v > reglas.max) {
    return err(reglas.msgMax ? reglas.msgMax.replace('{v}', cfgMostrar_(raw)) : ('no puede ser mayor que ' + reglas.max + ' y dice ' + cfgMostrar_(raw) + '.'));
  }
  return v;
}

// ============================================
// 4. FUNCIONES PURAS: VALIDADORES
// ============================================

/**
 * Valida una hoja Configuración_<Área> de UNA (layout legado).
 * opciones: {hoja, escalaTotal (3000), nPreguntasTotal (60), asignaturasConocidas:[...]}.
 * config = {name, subjects:[{code,name,pointsPerQuestion,questionCount,weight,maxScore}],
 *           totalQuestions, totalMaxScore}  (misma forma que el unaGetConfig legado).
 */
function validateUnaAreaSheet_(rows2d, areaName, opciones) {
  const op = opciones || {};
  const hoja = op.hoja || ('Configuración_' + areaName);
  const escalaTotal = op.escalaTotal > 0 ? op.escalaTotal : 3000;
  const nTotal = op.nPreguntasTotal > 0 ? op.nPreguntasTotal : 0;
  const conocidas = Array.isArray(op.asignaturasConocidas) ? op.asignaturasConocidas : null;
  const out = cfgResultado_();

  if (!Array.isArray(rows2d) || rows2d.length === 0 || rows2d.every(cfgFilaVacia_)) {
    cfgAgregar_(out.errores, hoja, '', '', '', -1, 'la hoja no existe o está vacía.');
    return out;
  }

  const enc = cfgUbicarEncabezados_(rows2d, CFG_SPEC_UNA_);
  cfgReportarEncabezados_(out, hoja, enc);
  if (!enc.ok) return out;
  const c = enc.idx;
  const titulo = function (clave) { return enc.textos[c[clave]] || CFG_SPEC_UNA_[clave].etiqueta; };
  if (c.puntaje < 0) {
    cfgAgregar_(out.avisos, hoja, enc.fila + 1, '', 'PUNTAJE', -1,
      'no hay columna PUNTAJE: se calcula como PREGUNTA BIEN CONTESTADA × PONDERACIÓN × CANTIDAD.');
  }

  const area = { name: areaName, subjects: [], totalQuestions: 0, totalMaxScore: 0 };
  const vistos = {};
  let filaTotal = null;
  let notaMaxima = null;

  for (let r = enc.fila + 1; r < rows2d.length; r++) {
    const row = rows2d[r] || [];
    const fila = r + 1;
    if (cfgFilaVacia_(row)) continue;

    const nombreRaw = cfgTexto_(row[c.asignatura]);
    const codRaw = c.cod >= 0 ? row[c.cod] : undefined;
    const resumen = cfgTipoResumen_(nombreRaw) || cfgTipoResumen_(cfgTexto_(codRaw)) || (!nombreRaw ? cfgTipoResumenFila_(row) : '');

    if (resumen === 'total') {
      filaTotal = {
        fila: fila,
        cantidad: parseNumberCell_(row[c.cantidad]),
        puntaje: c.puntaje >= 0 ? parseNumberCell_(row[c.puntaje]) : { ok: false }
      };
      continue;
    }
    if (resumen === 'nota') {
      let p = c.puntaje >= 0 ? parseNumberCell_(row[c.puntaje]) : { ok: false };
      if (!p.ok) {
        for (let i = row.length - 1; i >= 0; i--) {
          const q = parseNumberCell_(row[i]);
          if (q.ok) { p = q; break; }
        }
      }
      notaMaxima = { fila: fila, valor: p.ok ? p.value : null };
      continue;
    }
    if (!nombreRaw) {
      if (cfgFilaTieneNumeros_(row)) {
        cfgAgregar_(out.avisos, hoja, fila, '', titulo('asignatura'), c.asignatura,
          'la fila tiene números pero no tiene nombre de asignatura: se ignora.');
      }
      continue;
    }

    const ctx = { out: out, hoja: hoja, fila: fila, curso: nombreRaw };
    const cant = cfgLeerNumero_(ctx, row, c.cantidad, titulo('cantidad'), { entero: true, min: 0 });
    const pbc = cfgLeerNumero_(ctx, row, c.puntosCorrecta, titulo('puntosCorrecta'), { mayorQue: 0 });
    const pond = cfgLeerNumero_(ctx, row, c.ponderacion, titulo('ponderacion'), { mayorQue: 0 });
    if (cant === null || pbc === null || pond === null) continue;
    if (cant === 0) {
      cfgAgregar_(out.avisos, hoja, fila, nombreRaw, titulo('cantidad'), c.cantidad, 'tiene 0 preguntas: no entra al examen.');
      continue;
    }

    // Nombre: debe existir un banco de preguntas con ese nombre.
    let nombre = nombreRaw;
    if (conocidas && conocidas.indexOf(nombreRaw) === -1) {
      const n = normalizeHeader_(nombreRaw);
      const match = conocidas.filter(function (k) { return normalizeHeader_(k) === n; })[0];
      if (match) {
        nombre = match;
        cfgAgregar_(out.avisos, hoja, fila, nombreRaw, titulo('asignatura'), c.asignatura,
          'se escribe "' + match + '" (así se llama su banco de preguntas); lo uso con ese nombre.');
      } else {
        cfgAgregar_(out.errores, hoja, fila, nombreRaw, titulo('asignatura'), c.asignatura,
          'no existe un banco de preguntas llamado "' + nombreRaw + '", así que saldría sin preguntas. Nombres válidos: ' +
          conocidas.join(', ') + '.');
        continue;
      }
    }
    const claveDup = normalizeHeader_(nombre);
    if (vistos[claveDup]) {
      cfgAgregar_(out.errores, hoja, fila, nombreRaw, titulo('asignatura'), c.asignatura,
        'la asignatura está repetida (ya aparece en la fila ' + vistos[claveDup] + '). Deja una sola fila por asignatura.');
      continue;
    }
    vistos[claveDup] = fila;

    const esperado = cfgRedondear_(pbc * pond * cant, 4);
    const formula = pbc + ' × ' + pond + ' × ' + cant + ' = ' + esperado;
    let maxScore = esperado;
    if (c.puntaje >= 0) {
      const p = parseNumberCell_(row[c.puntaje]);
      if (!p.ok) {
        cfgAgregar_(out.avisos, hoja, fila, nombreRaw, titulo('puntaje'), c.puntaje,
          p.motivo + '. Uso el valor calculado ' + formula + '.');
      } else if (Math.abs(p.value - esperado) > CFG_TOL_PUNTAJE_FILA_) {
        cfgAgregar_(out.avisos, hoja, fila, nombreRaw, titulo('puntaje'), c.puntaje,
          'dice ' + p.value + ' pero PREGUNTA BIEN CONTESTADA × PONDERACIÓN × CANTIDAD da ' + formula + '. Uso ' + esperado + '.');
      } else {
        maxScore = p.value; // coincide: se respeta el valor de la hoja (idéntico al legado)
      }
    }

    area.subjects.push({ code: codRaw, name: nombre, pointsPerQuestion: pbc, questionCount: cant, weight: pond, maxScore: maxScore });
    area.totalQuestions += cant;
    area.totalMaxScore += maxScore;
  }

  if (!area.subjects.length && !out.errores.length) {
    cfgAgregar_(out.errores, hoja, '', '', '', -1, 'no tiene ninguna asignatura con preguntas.');
  }

  if (area.subjects.length && !out.errores.length) {
    const suma = cfgRedondear_(area.totalMaxScore, 4);
    if (Math.abs(area.totalMaxScore - escalaTotal) > CFG_TOL_SUMA_) {
      cfgAgregar_(out.errores, hoja, '', '', 'PUNTAJE', -1,
        'la suma de los puntajes da ' + suma + ' pero la nota máxima del examen es ' + escalaTotal +
        '. Revisa las ponderaciones y cantidades.');
    }
    if (nTotal && area.totalQuestions !== nTotal) {
      cfgAgregar_(out.errores, hoja, '', '', 'CANTIDAD DE PREGUNTAS', -1,
        'las cantidades suman ' + area.totalQuestions + ' preguntas pero el examen tiene ' + nTotal + '.');
    }
    if (notaMaxima && notaMaxima.valor !== null && Math.abs(notaMaxima.valor - escalaTotal) > CFG_TOL_SUMA_) {
      cfgAgregar_(out.avisos, hoja, notaMaxima.fila, 'NOTA MÁXIMA', '', -1,
        'dice ' + notaMaxima.valor + ' pero la escala del examen es ' + escalaTotal + ' (este valor no se usa para calificar).');
    }
    if (filaTotal) {
      if (filaTotal.cantidad.ok && filaTotal.cantidad.value !== area.totalQuestions) {
        cfgAgregar_(out.avisos, hoja, filaTotal.fila, 'TOTAL', titulo('cantidad'), c.cantidad,
          'dice ' + filaTotal.cantidad.value + ' pero las asignaturas suman ' + area.totalQuestions + ' (revisa la fórmula de TOTAL).');
      }
      if (filaTotal.puntaje.ok && Math.abs(filaTotal.puntaje.value - area.totalMaxScore) > CFG_TOL_SUMA_) {
        cfgAgregar_(out.avisos, hoja, filaTotal.fila, 'TOTAL', titulo('puntaje'), c.puntaje,
          'dice ' + filaTotal.puntaje.value + ' pero las asignaturas suman ' + suma + ' (revisa la fórmula de TOTAL).');
      }
    }
  }

  out.ok = out.errores.length === 0;
  out.config = out.ok ? area : null;
  return out;
}

/**
 * Valida las 3 hojas de UNA. hojas = {'Ingenierías': {hoja, rows}, ...}.
 * config = {tipo:'una', areas:{<área>: <config de área>}}.
 */
function validateUnaConfig_(hojas, opciones) {
  const out = cfgResultado_();
  const areas = {};
  Object.keys(hojas).forEach(function (areaName) {
    const h = hojas[areaName] || {};
    const r = validateUnaAreaSheet_(h.rows, areaName, Object.assign({}, opciones || {}, { hoja: h.hoja }));
    out.errores = out.errores.concat(r.errores);
    out.avisos = out.avisos.concat(r.avisos);
    if (r.ok) areas[areaName] = r.config;
  });
  out.ok = out.errores.length === 0 && Object.keys(areas).length === Object.keys(hojas).length;
  out.config = out.ok ? { tipo: 'una', areas: areas } : null;
  return out;
}

/**
 * Valida config_examen para un proceso. config = filas normalizadas
 * [{proceso, division, divisionTipo, curso, nPreguntas, puntosCorrecta,
 *   puntosIncorrecta, peso, orden, puntosBlanco, factorEscala|null}]
 * (forma del antiguo v2ReadConfigExamen_ + columnas opcionales nuevas).
 */
function validateConfigExamen_(rows2d, proceso, opciones) {
  const op = opciones || {};
  const hoja = op.hoja || 'config_examen';
  const procesoPedido = cfgNormProceso_(proceso) || 'ORDINARIO';
  const out = cfgResultado_();

  if (!Array.isArray(rows2d) || rows2d.length === 0 || rows2d.every(cfgFilaVacia_)) {
    cfgAgregar_(out.errores, hoja, '', '', '', -1, 'la hoja no existe o está vacía.');
    return out;
  }
  const enc = cfgUbicarEncabezados_(rows2d, CFG_SPEC_EXAMEN_);
  cfgReportarEncabezados_(out, hoja, enc);
  if (!enc.ok) return out;
  const c = enc.idx;
  const titulo = function (clave) { return enc.textos[c[clave]] || CFG_SPEC_EXAMEN_[clave].etiqueta; };
  if (c.puntosIncorrecta < 0) {
    cfgAgregar_(out.avisos, hoja, enc.fila + 1, '', 'puntos_incorrecta', -1, 'no hay columna puntos_incorrecta: se asume 0 (sin penalidad).');
  }

  const filas = [];
  const procesosVistos = {};
  const vistos = {};

  for (let r = enc.fila + 1; r < rows2d.length; r++) {
    const row = rows2d[r] || [];
    const fila = r + 1;
    if (cfgFilaVacia_(row)) continue;
    const curso = cfgTexto_(row[c.curso]);
    if (cfgTipoResumen_(curso) || (!curso && cfgTipoResumenFila_(row))) continue;
    if (!curso) {
      if (cfgFilaTieneNumeros_(row)) {
        cfgAgregar_(out.avisos, hoja, fila, '', titulo('curso'), c.curso, 'la fila tiene datos pero no tiene curso: se ignora.');
      }
      continue;
    }
    const rowProceso = (c.proceso >= 0 ? cfgNormProceso_(row[c.proceso]) : '') || 'ORDINARIO';
    procesosVistos[rowProceso] = true;
    if (rowProceso !== procesoPedido) continue;

    const ctx = { out: out, hoja: hoja, fila: fila, curso: curso };
    const nErr = out.errores.length;
    const division = cfgTexto_(row[c.division]);
    if (!division) {
      cfgAgregar_(out.errores, hoja, fila, curso, titulo('division'), c.division, 'falta la división (por ejemplo A, B, ING).');
    }
    let tipo = 'area';
    if (c.divisionTipo >= 0 && cfgTexto_(row[c.divisionTipo])) {
      tipo = normalizeHeader_(row[c.divisionTipo]);
      if (CFG_DIVISION_TIPOS_.indexOf(tipo) === -1) {
        cfgAgregar_(out.errores, hoja, fila, curso, titulo('divisionTipo'), c.divisionTipo,
          cfgMostrar_(row[c.divisionTipo]) + ' no es válido. Usa: ' + CFG_DIVISION_TIPOS_.join(' o ') + '.');
      }
    }
    const n = cfgLeerNumero_(ctx, row, c.nPreguntas, titulo('nPreguntas'), { entero: true, min: 0 });
    const pc = cfgLeerNumero_(ctx, row, c.puntosCorrecta, titulo('puntosCorrecta'), { mayorQue: 0 });
    const pi = c.puntosIncorrecta >= 0
      ? cfgLeerNumero_(ctx, row, c.puntosIncorrecta, titulo('puntosIncorrecta'), {
        siVacio: 0, max: 0,
        msgMax: 'es positiva ({v}). Las penalidades se escriben en NEGATIVO, por ejemplo -1,125. Si no hay penalidad, escribe 0.'
      })
      : 0;
    let peso = 0;
    if (c.peso >= 0) {
      const p = parseNumberCell_(row[c.peso]);
      if (p.ok) peso = p.value;
      else if (!p.vacio) cfgAgregar_(out.avisos, hoja, fila, curso, titulo('peso'), c.peso, p.motivo + '. Se usa 0 (el peso no cambia la nota).');
    }
    let orden = 0;
    if (c.orden >= 0) {
      const p = parseNumberCell_(row[c.orden]);
      if (p.ok) orden = p.value;
      else if (!p.vacio) cfgAgregar_(out.avisos, hoja, fila, curso, titulo('orden'), c.orden, p.motivo + '. Se usa 0.');
    }
    // Blanco: positivo (UNSAAC +1, UNAJ +0,5), 0, o NEGATIVO si el reglamento lo resta (UNP -0,10).
    const pb = c.puntosBlanco >= 0
      ? cfgLeerNumero_(ctx, row, c.puntosBlanco, titulo('puntosBlanco'), { siVacio: 0 })
      : 0;
    if (pb !== null && pc !== null && pb > 0 && !(pb < pc)) {
      cfgAgregar_(out.errores, hoja, fila, curso, titulo('puntosBlanco'), c.puntosBlanco,
        'dice ' + cfgMostrar_(row[c.puntosBlanco]) + ' pero una pregunta en blanco no puede valer igual o más que una correcta (' + pc + ').');
    }
    if (pb !== null && pc !== null && pb < 0 && !(-pb < pc)) {
      cfgAgregar_(out.errores, hoja, fila, curso, titulo('puntosBlanco'), c.puntosBlanco,
        'dice ' + cfgMostrar_(row[c.puntosBlanco]) + ' pero una pregunta en blanco no puede restar tanto como vale una correcta (' + pc + '). ¿Falta la coma decimal?');
    } else if (pb !== null && pi !== null && pb < 0 && pb < pi) {
      cfgAgregar_(out.avisos, hoja, fila, curso, titulo('puntosBlanco'), c.puntosBlanco,
        'dejar en blanco resta más (' + cfgMostrar_(row[c.puntosBlanco]) + ') que responder mal (' + pi + '). Revisa que sea correcto.');
    }
    // factor_escala por fila: vacío = se usa el de config_escala (null).
    let factorFila = null;
    if (c.factorEscala >= 0) {
      const p = parseNumberCell_(row[c.factorEscala]);
      if (p.ok) {
        if (p.value > 0) factorFila = p.value;
        else cfgAgregar_(out.errores, hoja, fila, curso, titulo('factorEscala'), c.factorEscala, 'debe ser mayor que 0 y dice ' + cfgMostrar_(row[c.factorEscala]) + '.');
      } else if (!p.vacio) {
        cfgAgregar_(out.errores, hoja, fila, curso, titulo('factorEscala'), c.factorEscala, p.motivo + '.');
      }
    }
    if (out.errores.length > nErr || n === null || pc === null || pi === null || pb === null) continue;
    if (n === 0) {
      cfgAgregar_(out.avisos, hoja, fila, curso, titulo('nPreguntas'), c.nPreguntas, 'tiene 0 preguntas: no entra al examen.');
      continue;
    }

    const claveDup = normalizeHeader_(division) + '|' + normalizeHeader_(curso);
    if (vistos[claveDup]) {
      cfgAgregar_(out.errores, hoja, fila, curso, titulo('curso'), c.curso,
        'el curso está repetido en la división ' + division + ' (ya aparece en la fila ' + vistos[claveDup] + ').');
      continue;
    }
    vistos[claveDup] = fila;

    filas.push({
      proceso: rowProceso,
      division: division,
      divisionTipo: tipo,
      curso: curso,
      nPreguntas: n,
      puntosCorrecta: pc,
      puntosIncorrecta: pi,
      peso: peso,
      orden: orden,
      puntosBlanco: pb,
      factorEscala: factorFila
    });
  }

  if (!filas.length && !out.errores.length) {
    cfgAgregar_(out.errores, hoja, '', '', '', -1,
      'no hay cursos para el proceso ' + procesoPedido + '. Procesos encontrados: ' +
      (Object.keys(procesosVistos).join(', ') || 'ninguno') + '.');
  }
  out.ok = out.errores.length === 0;
  out.config = out.ok ? filas : null;
  return out;
}

/**
 * Valida config_escala para un proceso. config = {motor, escalaTotal,
 * umbrales:{excelente,bueno,regular}, duracionMin, nPreguntasTotal}.
 */
function validateConfigEscala_(rows2d, proceso, opciones) {
  const op = opciones || {};
  const hoja = op.hoja || 'config_escala';
  const procesoPedido = cfgNormProceso_(proceso) || 'ORDINARIO';
  const out = cfgResultado_();

  if (!Array.isArray(rows2d) || rows2d.length === 0 || rows2d.every(cfgFilaVacia_)) {
    cfgAgregar_(out.errores, hoja, '', '', '', -1, 'la hoja no existe o está vacía.');
    return out;
  }
  const enc = cfgUbicarEncabezados_(rows2d, CFG_SPEC_ESCALA_);
  cfgReportarEncabezados_(out, hoja, enc);
  if (!enc.ok) return out;
  const c = enc.idx;
  const titulo = function (clave) { return c[clave] >= 0 ? (enc.textos[c[clave]] || CFG_SPEC_ESCALA_[clave].etiqueta) : CFG_SPEC_ESCALA_[clave].etiqueta; };

  const datos = [];
  for (let r = enc.fila + 1; r < rows2d.length; r++) {
    if (cfgFilaVacia_(rows2d[r])) continue;
    datos.push({ fila: r + 1, row: rows2d[r], procesoCelda: c.proceso >= 0 ? cfgNormProceso_(rows2d[r][c.proceso]) : '' });
  }
  if (!datos.length) {
    cfgAgregar_(out.errores, hoja, '', '', '', -1, 'no tiene filas de datos debajo de los títulos.');
    return out;
  }

  let elegidas = datos.filter(function (d) { return (d.procesoCelda || 'ORDINARIO') === procesoPedido; });
  if (!elegidas.length && datos.length === 1 && !datos[0].procesoCelda) {
    elegidas = datos;
    cfgAgregar_(out.avisos, hoja, datos[0].fila, '', titulo('proceso'), c.proceso,
      'la única fila no tiene proceso: la uso también para ' + procesoPedido + '.');
  }
  if (!elegidas.length) {
    cfgAgregar_(out.errores, hoja, '', '', 'proceso', -1,
      'no hay una fila para el proceso ' + procesoPedido + '. Procesos encontrados: ' +
      datos.map(function (d) { return d.procesoCelda || 'ORDINARIO (vacío)'; }).join(', ') + '.');
    return out;
  }
  if (elegidas.length > 1) {
    cfgAgregar_(out.errores, hoja, elegidas[1].fila, '', 'proceso', c.proceso,
      'el proceso ' + procesoPedido + ' está repetido (filas ' + elegidas.map(function (d) { return d.fila; }).join(', ') +
      '). Deja una sola fila por proceso.');
    return out;
  }

  const d = elegidas[0];
  const row = d.row;
  const ctx = { out: out, hoja: hoja, fila: d.fila, curso: procesoPedido };

  let motor = 'suma_ponderada';
  const motorTxt = cfgTexto_(row[c.motor]);
  if (!motorTxt) {
    cfgAgregar_(out.avisos, hoja, d.fila, procesoPedido, titulo('motor'), c.motor, 'está vacío: se usa suma_ponderada.');
  } else {
    motor = cfgNormMotor_(motorTxt);
    if (!motor) {
      cfgAgregar_(out.errores, hoja, d.fila, procesoPedido, titulo('motor'), c.motor,
        cfgMostrar_(motorTxt) + ' no es un motor válido. Usa: ' + CFG_MOTORES_.join(', ') + '.');
    }
  }

  const escalaTotal = cfgLeerNumero_(ctx, row, c.escalaTotal, titulo('escalaTotal'), { mayorQue: 0 });
  const umbrales = {};
  const derivados = [];
  [['excelente', 'umbralExcelente'], ['bueno', 'umbralBueno'], ['regular', 'umbralRegular']].forEach(function (par) {
    const col = c[par[1]];
    const p = col >= 0 ? parseNumberCell_(row[col]) : { ok: false, vacio: true };
    if (p.ok) {
      umbrales[par[0]] = p.value;
    } else if (p.vacio) {
      umbrales[par[0]] = null;
      derivados.push(par[0]);
    } else {
      cfgAgregar_(out.errores, hoja, d.fila, procesoPedido, titulo(par[1]), col, p.motivo + '.');
    }
  });

  let duracion = CFG_DURACION_DEFAULT_;
  if (c.duracionMin >= 0) {
    const dur = cfgLeerNumero_(ctx, row, c.duracionMin, titulo('duracionMin'), {
      mayorQue: 0, siVacio: CFG_DURACION_DEFAULT_, avisoVacio: 'está vacía: se usan ' + CFG_DURACION_DEFAULT_ + ' minutos.'
    });
    if (dur !== null) duracion = Math.round(dur);
  } else {
    cfgAgregar_(out.avisos, hoja, d.fila, procesoPedido, 'duracion_min', -1, 'no hay columna duracion_min: se usan ' + CFG_DURACION_DEFAULT_ + ' minutos.');
  }

  let nPT = 0;
  if (c.nPreguntasTotal >= 0) {
    const v = cfgLeerNumero_(ctx, row, c.nPreguntasTotal, titulo('nPreguntasTotal'), { entero: true, min: 0, siVacio: 0 });
    if (v !== null) nPT = v;
  }

  let factor = 1;
  if (c.factorEscala >= 0) {
    const f = cfgLeerNumero_(ctx, row, c.factorEscala, titulo('factorEscala'), { mayorQue: 0, siVacio: 1 });
    if (f !== null) factor = f;
  }
  // Solo informativo (texto libre o número): nunca bloquea calificar.
  const minimo = c.minimoAprobatorio >= 0 ? cfgTexto_(row[c.minimoAprobatorio]) : '';

  if (out.errores.length || escalaTotal === null) {
    out.ok = false;
    return out;
  }

  if (derivados.length) {
    derivados.forEach(function (k) { umbrales[k] = cfgRedondear_(escalaTotal * CFG_UMBRALES_PCT_[k], 2); });
    cfgAgregar_(out.avisos, hoja, d.fila, procesoPedido, 'umbrales', -1,
      'faltan umbrales (' + derivados.join(', ') + '): se calculan como 80% / 60% / 40% de escala_total (' +
      umbrales.excelente + ' / ' + umbrales.bueno + ' / ' + umbrales.regular + ').');
  }
  if (!(umbrales.regular >= 0 && umbrales.regular < umbrales.bueno && umbrales.bueno < umbrales.excelente &&
    umbrales.excelente <= escalaTotal)) {
    cfgAgregar_(out.errores, hoja, d.fila, procesoPedido, 'umbrales', -1,
      'los umbrales deben ir de menor a mayor: 0 ≤ regular < bueno < excelente ≤ escala_total. Ahora: regular ' +
      umbrales.regular + ', bueno ' + umbrales.bueno + ', excelente ' + umbrales.excelente + ', escala_total ' + escalaTotal + '.');
  }

  out.ok = out.errores.length === 0;
  out.config = out.ok ? {
    motor: motor,
    escalaTotal: escalaTotal,
    umbrales: { excelente: umbrales.excelente, bueno: umbrales.bueno, regular: umbrales.regular },
    duracionMin: duracion,
    nPreguntasTotal: nPT,
    factorEscala: factor,
    minimoAprobatorio: minimo
  } : null;
  return out;
}

/**
 * Valida config_examen + config_escala de un proceso y los cruza:
 * Σ n_preguntas por división = n_preguntas_total (si está definido) y
 * Σ (n_preguntas × puntos_correcta × factor_escala) por división ≈ escala_total (±0,5).
 * Cada fila queda con `factor` resuelto (el de la fila o el de config_escala).
 * Para vector_canal la segunda regla es solo aviso (los pesos por canal
 * pueden reescalar). config = {tipo:'v2', proceso, rows, escala}.
 */
function validateConfigV2_(examenRows2d, escalaRows2d, proceso, opciones) {
  const op = opciones || {};
  const procesoPedido = cfgNormProceso_(proceso) || 'ORDINARIO';
  const hojaEx = op.hojaExamen || 'config_examen';
  const hojaEs = op.hojaEscala || 'config_escala';
  const ex = validateConfigExamen_(examenRows2d, procesoPedido, { hoja: hojaEx });
  const es = validateConfigEscala_(escalaRows2d, procesoPedido, { hoja: hojaEs });
  const out = cfgResultado_();
  out.errores = ex.errores.concat(es.errores);
  out.avisos = ex.avisos.concat(es.avisos);

  if (ex.ok && es.ok) {
    const escala = Object.assign({}, es.config, { umbrales: Object.assign({}, es.config.umbrales) });
    // Factor efectivo por fila: el de la fila (config_examen) o, si está vacío, el de config_escala.
    const rows = ex.config.map(function (r) {
      const f = Object.assign({}, r);
      f.factor = (r.factorEscala !== null && r.factorEscala !== undefined) ? r.factorEscala : escala.factorEscala;
      delete f.factorEscala;
      return f;
    });
    const orden = [];
    const porDiv = {};
    rows.forEach(function (r) {
      if (!porDiv[r.division]) { porDiv[r.division] = { n: 0, max: 0 }; orden.push(r.division); }
      porDiv[r.division].n += r.nPreguntas;
      porDiv[r.division].max += r.puntosCorrecta * r.nPreguntas * r.factor;
    });
    orden.forEach(function (div) {
      const t = porDiv[div];
      if (escala.nPreguntasTotal > 0 && t.n !== escala.nPreguntasTotal) {
        cfgAgregar_(out.errores, hojaEx, '', '', '', -1, 'en la división ' + div + ' las preguntas suman ' + t.n +
          ' pero config_escala dice n_preguntas_total = ' + escala.nPreguntasTotal + '.');
      }
      if (Math.abs(t.max - escala.escalaTotal) > CFG_TOL_SUMA_) {
        cfgAgregar_(escala.motor === 'vector_canal' ? out.avisos : out.errores, hojaEx, '', '', '', -1,
          'en la división ' + div + ' el puntaje máximo (n_preguntas × puntos_correcta × factor_escala) suma ' + cfgRedondear_(t.max, 4) +
          ' pero escala_total en config_escala es ' + escala.escalaTotal + '.');
      }
    });
    if (!escala.nPreguntasTotal) {
      const totales = orden.map(function (div) { return porDiv[div].n; })
        .filter(function (v, i, a) { return a.indexOf(v) === i; });
      if (totales.length === 1) {
        escala.nPreguntasTotal = totales[0];
        cfgAgregar_(out.avisos, hojaEs, '', '', 'n_preguntas_total', -1,
          'está vacío: se usa ' + totales[0] + ' (lo que suman los cursos de cada división).');
      }
    }
    if (escala.motor === 'suma_ponderada' && rows.some(function (r) { return r.puntosIncorrecta < 0; })) {
      cfgAgregar_(out.avisos, hojaEx, '', '', 'puntos_incorrecta', -1,
        'hay penalidades negativas pero el motor es suma_ponderada, que NO resta por incorrectas. Si deben restar, usa el motor decimas.');
    }
    out.ok = out.errores.length === 0;
    out.config = out.ok ? { tipo: 'v2', proceso: procesoPedido, rows: rows, escala: escala } : null;
  }
  return out;
}

// ============================================
// 5. FUNCIONES PURAS: RESPUESTAS, EMPAQUETADO Y FÁBRICA
// ============================================

/** Respuesta `getConfig` (contrato v2) a partir de la config v2 validada. */
function buildConfigV2Response_(universidad, proceso, cfg) {
  const divisionesMap = {};
  const divisionOrder = [];

  cfg.rows.forEach(function (r) {
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
    // Con factor_escala (default 1) los puntos se expresan ya en la escala oficial.
    const factor = r.factor || 1;
    const maxScore = r.puntosCorrecta * r.nPreguntas * factor;
    d.subjects.push({
      name: r.curso,
      questionCount: r.nPreguntas,
      pointsPerQuestion: r.puntosCorrecta * factor,
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

  const e = cfg.escala;
  const escala = {
    motor: e.motor,
    escalaTotal: e.escalaTotal,
    umbrales: { excelente: e.umbrales.excelente, bueno: e.umbrales.bueno, regular: e.umbrales.regular },
    duracionMin: e.duracionMin,
    nPreguntasTotal: e.nPreguntasTotal
  };
  // Campo ADITIVO e informativo: solo aparece si la hoja lo define.
  if (e.minimoAprobatorio) escala.minimoAprobatorio = e.minimoAprobatorio;
  return {
    universidad: universidad,
    proceso: proceso,
    divisiones: divisiones,
    escala: escala
  };
}

/** Respuesta `getConfig` de UNA a partir de la config legada (áreas). */
function unaConfigToV2Response_(legacyConfig, proceso, areasOrden, escalaUna) {
  const divisiones = areasOrden.map(function (areaName, index) {
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
      motor: escalaUna.motor,
      escalaTotal: escalaUna.escalaTotal,
      umbrales: escalaUna.umbrales,
      duracionMin: escalaUna.duracionMin,
      nPreguntasTotal: escalaUna.nPreguntasTotal
    }
  };
}

/** Forma compacta (arreglos) de una config validada, para guardarla en Properties. */
function cfgEmpaquetar_(cfg) {
  if (cfg.tipo === 'una') {
    return {
      t: 'una',
      a: Object.keys(cfg.areas).map(function (k) {
        const a = cfg.areas[k];
        return [k, a.totalQuestions, a.totalMaxScore, a.subjects.map(function (s) {
          return [s.code === undefined ? null : s.code, s.name, s.pointsPerQuestion, s.questionCount, s.weight, s.maxScore];
        })];
      })
    };
  }
  return {
    t: 'v2',
    p: cfg.proceso,
    r: cfg.rows.map(function (r) {
      return [r.division, r.divisionTipo, r.curso, r.nPreguntas, r.puntosCorrecta, r.puntosIncorrecta, r.peso, r.orden,
        r.puntosBlanco || 0, r.factor || 1];
    }),
    e: cfg.escala
  };
}

function cfgDesempaquetar_(o) {
  if (!o || typeof o !== 'object') return null;
  if (o.t === 'una') {
    const areas = {};
    (o.a || []).forEach(function (a) {
      areas[a[0]] = {
        name: a[0],
        subjects: a[3].map(function (s) {
          return { code: s[0] === null ? undefined : s[0], name: s[1], pointsPerQuestion: s[2], questionCount: s[3], weight: s[4], maxScore: s[5] };
        }),
        totalQuestions: a[1],
        totalMaxScore: a[2]
      };
    });
    return { tipo: 'una', areas: areas };
  }
  if (o.t === 'v2') {
    return {
      tipo: 'v2',
      proceso: o.p,
      rows: (o.r || []).map(function (r) {
        return {
          proceso: o.p, division: r[0], divisionTipo: r[1], curso: r[2], nPreguntas: r[3],
          puntosCorrecta: r[4], puntosIncorrecta: r[5], peso: r[6], orden: r[7],
          puntosBlanco: r[8] || 0, factor: r[9] || 1
        };
      }),
      escala: o.e
    };
  }
  return null;
}

/** Huella simple (djb2, 32 bits) + largo: detecta trozos mezclados o corruptos. */
function cfgHuella_(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16) + '-' + s.length;
}

/** Trocea un texto en partes de `n` caracteres (Properties: máx. 9KB por valor). */
function cfgTrocear_(s, n) {
  const partes = [];
  for (let i = 0; i < s.length; i += n) partes.push(s.substring(i, i + n));
  return partes.length ? partes : [''];
}

/** Config de fábrica de UNA en la forma validada {tipo:'una', areas}. */
function cfgConfigFabricaUna_() {
  const areas = {};
  Object.keys(UNA_CONFIG_FABRICA_).forEach(function (areaName) {
    const area = { name: areaName, subjects: [], totalQuestions: 0, totalMaxScore: 0 };
    UNA_CONFIG_FABRICA_[areaName].forEach(function (f) {
      area.subjects.push({ code: undefined, name: f[0], pointsPerQuestion: 10, questionCount: f[1], weight: f[2], maxScore: f[3] });
      area.totalQuestions += f[1];
      area.totalMaxScore += f[3];
    });
    areas[areaName] = area;
  });
  return { tipo: 'una', areas: areas };
}

// ============================================
// 6. CARGA SEGURA EN TIEMPO DE PETICIÓN (usa servicios de Apps Script)
// ============================================

const CFG_LKG_PREFIJO_ = 'CFG_LKG|';
const CFG_LKG_TROZO_CHARS_ = 2500;          // 2500 chars × hasta 3 bytes < 9KB por propiedad
const CFG_NOTIF_TTL_SEG_ = 600;             // anotar en _validacion_config cada 10 min como máximo
const CFG_HUELLA_TTL_SEG_ = 21600;          // memo de "esta config ya está guardada"
const CFG_REPORTE_HOJA_ = '_validacion_config';
const CFG_REPORTE_HEADERS_ = ['universidad', 'hoja', 'fila', 'columna', 'problema', 'gravedad', 'fecha'];

// Memo por ejecución: getExam lee la config UNA vez (pool y escala del mismo snapshot).
let cfgMemo_ = {};

/** UNA usa la misma config para todos sus procesos; v2 tiene una por proceso. */
function cfgProcesoClave_(tenant, proceso) {
  if (tenant.layout === 'legacy') return 'ORDINARIO';
  return cfgNormProceso_(proceso) || 'ORDINARIO';
}

function cfgClaveRespaldo_(codigo, procesoClave) {
  return CFG_LKG_PREFIJO_ + codigo + '|' + procesoClave;
}

/** Etiqueta de la columna `universidad` del reporte. */
function cfgEtiquetaReporte_(tenant, procesoClave) {
  return tenant.layout === 'legacy' ? tenant.codigo : (tenant.codigo + ' · ' + procesoClave);
}

/** Busca una hoja por nombre exacto o, si no, por nombre normalizado (sin tildes/mayúsculas). */
function cfgBuscarHoja_(ss, nombre) {
  const exacta = ss.getSheetByName(nombre);
  if (exacta) return { sheet: exacta, aviso: '' };
  const objetivo = normalizeHeader_(nombre);
  const parecida = ss.getSheets().filter(function (s) { return normalizeHeader_(s.getName()) === objetivo; })[0];
  if (parecida) {
    return {
      sheet: parecida,
      aviso: 'Hoja ' + parecida.getName() + ': debería llamarse "' + nombre + '". La uso igual, pero corrige el nombre.'
    };
  }
  return { sheet: null, aviso: '' };
}

function cfgValoresHoja_(sheet) {
  return sheet ? sheet.getDataRange().getValues() : null;
}

/**
 * Lee y valida la config de un tenant/proceso (sin respaldo). Con
 * opciones.revisarBancos agrega avisos si falta la hoja de banco de un curso.
 */
function cfgValidarTenant_(tenant, procesoClave, opciones) {
  const op = opciones || {};
  const ss = SpreadsheetApp.openById(tenant.spreadsheetId);
  const avisosHoja = [];
  let res;

  if (tenant.layout === 'legacy') {
    const hojas = {};
    UNA_AREAS_.forEach(function (area) {
      const enc = cfgBuscarHoja_(ss, CONFIG_SHEETS[area]);
      if (enc.aviso) avisosHoja.push({ hoja: enc.sheet.getName(), fila: '', columna: '', mensaje: enc.aviso });
      hojas[area] = { hoja: enc.sheet ? enc.sheet.getName() : CONFIG_SHEETS[area], rows: cfgValoresHoja_(enc.sheet) };
    });
    res = validateUnaConfig_(hojas, {
      escalaTotal: UNA_ESCALA_ORDINARIO_.escalaTotal,
      nPreguntasTotal: UNA_ESCALA_ORDINARIO_.nPreguntasTotal,
      asignaturasConocidas: Object.keys(SUBJECT_SHEETS)
    });
    if (op.revisarBancos && res.ok) {
      Object.keys(res.config.areas).forEach(function (area) {
        res.config.areas[area].subjects.forEach(function (s) {
          const banco = SUBJECT_SHEETS[s.name];
          if (banco && !ss.getSheetByName(banco)) {
            res.avisos.push({ hoja: banco, fila: '', columna: '', mensaje: 'No existe la hoja ' + banco + ': ' + s.name + ' saldrá sin preguntas en el simulacro de ' + area + '.' });
          }
        });
      });
    }
  } else {
    const ex = cfgBuscarHoja_(ss, 'config_examen');
    const es = cfgBuscarHoja_(ss, 'config_escala');
    [ex, es].forEach(function (enc) {
      if (enc.aviso) avisosHoja.push({ hoja: enc.sheet.getName(), fila: '', columna: '', mensaje: enc.aviso });
    });
    res = validateConfigV2_(cfgValoresHoja_(ex.sheet), cfgValoresHoja_(es.sheet), procesoClave, {
      hojaExamen: ex.sheet ? ex.sheet.getName() : 'config_examen',
      hojaEscala: es.sheet ? es.sheet.getName() : 'config_escala'
    });
    if (op.revisarBancos && res.ok) {
      const nombres = ss.getSheets().map(function (s) { return s.getName(); });
      const vistos = {};
      res.config.rows.forEach(function (r) {
        const banco = v2BancoSheetName_(v2CursoHoja_(ss, r.curso));
        if (vistos[banco]) return;
        vistos[banco] = true;
        if (nombres.indexOf(banco) === -1) {
          res.avisos.push({ hoja: banco, fila: '', columna: '', mensaje: 'No existe la hoja ' + banco + ': el curso ' + r.curso + ' saldrá sin preguntas.' });
        }
      });
    }
  }

  res.avisos = avisosHoja.concat(res.avisos);
  if (op.revisarBancos && res.ok) cfgRevisarCarreras_(tenant, res);
  return res;
}

/**
 * Agrega al reporte los problemas de config_carreras (config_carreras.gs).
 * Van SIEMPRE como avisos: las carreras nunca invalidan el puntaje.
 */
function cfgRevisarCarreras_(tenant, res) {
  try {
    const divisiones = tenant.layout === 'legacy'
      ? Object.keys(res.config.areas)
      : res.config.rows.map(function (r) { return r.division; })
        .filter(function (d, i, a) { return a.indexOf(d) === i; });
    const car = cfgLeerCarreras_(tenant, divisiones);
    if (!car.existe) {
      res.avisos.push({ hoja: CFG_HOJA_CARRERAS_, fila: '', columna: '', mensaje: 'No hay hoja config_carreras: en el registro la carrera se pide como texto libre (opcional).' });
      return;
    }
    car.errores.concat(car.avisos).forEach(function (a) {
      res.avisos.push({ hoja: a.hoja, fila: a.fila, columna: a.columna, mensaje: 'Carreras: ' + a.mensaje });
    });
    if (car.ok) {
      res.avisos.push({ hoja: CFG_HOJA_CARRERAS_, fila: '', columna: '', mensaje: 'Carreras: ' + car.total + ' carrera(s) en ' + Object.keys(car.porDivision).length + ' división(es).' });
    }
  } catch (err) {
    res.avisos.push({ hoja: CFG_HOJA_CARRERAS_, fila: '', columna: '', mensaje: 'Carreras: no se pudo revisar (' + (err && err.message ? err.message : err) + ').' });
  }
}

/**
 * Config lista para usar (NUNCA inválida). Devuelve
 * {config, fuente:'hoja'|'respaldo'|'fabrica', errores, avisos, guardadaEl}.
 * Lanza publicError_(MSG_CONFIG_EN_REVISION_) solo si la hoja es inválida y
 * no hay ninguna config buena guardada (ni de fábrica).
 */
function cfgCargarConfig_(tenant, proceso) {
  const procesoClave = cfgProcesoClave_(tenant, proceso);
  const clave = cfgClaveRespaldo_(tenant.codigo, procesoClave);
  if (cfgMemo_[clave]) return cfgMemo_[clave];

  let val;
  try {
    val = cfgValidarTenant_(tenant, procesoClave, null);
  } catch (err) {
    val = {
      ok: false, config: null, avisos: [],
      errores: [{ hoja: '', fila: '', columna: '', mensaje: 'No se pudo leer el spreadsheet de configuración: ' + (err && err.message ? err.message : err) }]
    };
  }

  let carga;
  if (val.ok) {
    cfgGuardarUltimaBuena_(clave, val.config);
    carga = { config: val.config, fuente: 'hoja', errores: [], avisos: val.avisos, guardadaEl: '' };
  } else {
    const respaldo = cfgLeerUltimaBuena_(clave);
    let config = respaldo ? respaldo.config : null;
    let fuente = 'respaldo';
    if (!config && tenant.layout === 'legacy') {
      config = cfgConfigFabricaUna_();
      fuente = 'fabrica';
    }
    if (!config) fuente = 'ninguna';
    cfgRegistrarConfigInvalida_(tenant, procesoClave, val, fuente, respaldo ? respaldo.at : '');
    if (!config) throw publicError_(MSG_CONFIG_EN_REVISION_);
    carga = { config: config, fuente: fuente, errores: val.errores, avisos: val.avisos, guardadaEl: respaldo ? respaldo.at : '' };
  }
  cfgMemo_[clave] = carga;
  return carga;
}

/** Guarda la config válida como "última buena" (solo si cambió). Nunca lanza. */
function cfgGuardarUltimaBuena_(clave, config) {
  try {
    const texto = JSON.stringify(cfgEmpaquetar_(config));
    const huella = cfgHuella_(texto);
    const cache = CacheService.getScriptCache();
    const memoKey = 'cfglkg:' + clave;
    if (cache.get(memoKey) === huella) return false;

    const props = PropertiesService.getScriptProperties();
    let metaPrevia = null;
    try { metaPrevia = JSON.parse(props.getProperty(clave + '#meta') || 'null'); } catch (e) { metaPrevia = null; }
    if (metaPrevia && metaPrevia.h === huella) {
      cache.put(memoKey, huella, CFG_HUELLA_TTL_SEG_);
      return false;
    }

    const escribir = function () {
      const trozos = cfgTrocear_(texto, CFG_LKG_TROZO_CHARS_);
      const obj = {};
      trozos.forEach(function (t, i) { obj[clave + '#' + i] = t; });
      obj[clave + '#meta'] = JSON.stringify({ h: huella, n: trozos.length, at: new Date().toISOString() });
      props.setProperties(obj, false);
      const nPrevio = metaPrevia && metaPrevia.n ? metaPrevia.n : 0;
      for (let i = trozos.length; i < nPrevio; i++) props.deleteProperty(clave + '#' + i);
    };

    if (scriptLockHeld_) {
      escribir();
    } else {
      const lock = LockService.getScriptLock();
      if (!lock.tryLock(3000)) return false; // se reintenta en la próxima petición
      try { escribir(); } finally { lock.releaseLock(); }
    }
    cache.put(memoKey, huella, CFG_HUELLA_TTL_SEG_);
    console.log('[CONFIG] Última configuración buena actualizada: ' + clave);
    return true;
  } catch (err) {
    console.error('[CONFIG] No se pudo guardar la última configuración buena (' + clave + '): ' + err);
    return false;
  }
}

/** Lee la última config buena guardada: {config, at} o null (si falta o está corrupta). */
function cfgLeerUltimaBuena_(clave) {
  try {
    const props = PropertiesService.getScriptProperties();
    const meta = JSON.parse(props.getProperty(clave + '#meta') || 'null');
    if (!meta || !meta.n) return null;
    let texto = '';
    for (let i = 0; i < meta.n; i++) {
      const t = props.getProperty(clave + '#' + i);
      if (t === null || t === undefined) return null;
      texto += t;
    }
    if (cfgHuella_(texto) !== meta.h) {
      console.error('[CONFIG] Respaldo ' + clave + ' corrupto (huella distinta): se ignora.');
      return null;
    }
    const config = cfgDesempaquetar_(JSON.parse(texto));
    return config ? { config: config, at: meta.at || '' } : null;
  } catch (err) {
    console.error('[CONFIG] No se pudo leer el respaldo ' + clave + ': ' + err);
    return null;
  }
}

/** Registra (console.error) y anota en _validacion_config una config inválida (con freno de 10 min). */
function cfgRegistrarConfigInvalida_(tenant, procesoClave, val, fuente, guardadaEl) {
  const clave = cfgClaveRespaldo_(tenant.codigo, procesoClave);
  const primeros = (val.errores || []).slice(0, 5).map(function (e) { return e.mensaje; }).join(' | ');
  let anotar = true;
  try {
    const cache = CacheService.getScriptCache();
    anotar = !cache.get('cfgnotif:' + clave);
    if (anotar) cache.put('cfgnotif:' + clave, '1', CFG_NOTIF_TTL_SEG_);
  } catch (err) { /* sin cache: se anota igual */ }

  console.error('[CONFIG] Configuración inválida ' + clave + ' (se usa: ' + fuente + '). ' + (val.errores || []).length +
    ' error(es): ' + primeros);
  if (!anotar) return;
  try {
    const filas = cfgFilasReporte_(tenant, procesoClave, val, fuente, guardadaEl);
    cfgEscribirReporte_(filas, [cfgEtiquetaReporte_(tenant, procesoClave)]);
  } catch (err) {
    console.error('[CONFIG] No se pudo anotar el problema en ' + CFG_REPORTE_HOJA_ + ': ' + err);
  }
}

/** Texto de "qué se está usando" para el editor. */
function cfgTextoFuente_(fuente, guardadaEl) {
  if (fuente === 'respaldo') {
    return 'Mientras no lo corrijas, el simulacro sigue con la última configuración buena' +
      (guardadaEl ? ' (guardada el ' + cfgFormatearFecha_(guardadaEl) + ')' : '') + '.';
  }
  if (fuente === 'fabrica') {
    return 'No había una configuración buena guardada: mientras no lo corrijas, el simulacro usa la configuración de fábrica (copia incluida en el código).';
  }
  return 'NO hay una configuración buena guardada: el simulacro de esta universidad/proceso NO está disponible hasta que lo corrijas.';
}

function cfgFormatearFecha_(iso) {
  try {
    return Utilities.formatDate(new Date(iso), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  } catch (err) {
    return String(iso);
  }
}

/** Filas del reporte para un tenant/proceso. */
function cfgFilasReporte_(tenant, procesoClave, val, fuente, guardadaEl) {
  const etiqueta = cfgEtiquetaReporte_(tenant, procesoClave);
  const ahora = new Date();
  const filas = [];
  if (val.ok) {
    filas.push([etiqueta, '(todas)', '', '', 'Configuración correcta: guardada como última configuración buena.', 'OK', ahora]);
  } else {
    filas.push([etiqueta, '(resumen)', '', '', 'Hay ' + val.errores.length + ' error(es). ' + cfgTextoFuente_(fuente, guardadaEl), 'ERROR', ahora]);
  }
  (val.errores || []).forEach(function (e) {
    filas.push([etiqueta, e.hoja || '', e.fila || '', e.columna || '', safeCell_(e.mensaje, 2000), 'ERROR', ahora]);
  });
  (val.avisos || []).forEach(function (a) {
    filas.push([etiqueta, a.hoja || '', a.fila || '', a.columna || '', safeCell_(a.mensaje, 2000), 'AVISO', ahora]);
  });
  return filas;
}

/**
 * Escribe el reporte en la hoja _validacion_config del CORE (o del
 * spreadsheet de UNA si no hay CORE). Con `etiquetasReemplazar` solo
 * reemplaza las filas de esas universidades; sin él reescribe todo.
 */
function cfgEscribirReporte_(filas, etiquetasReemplazar) {
  const ss = SpreadsheetApp.openById(CORE_SPREADSHEET_ID || SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CFG_REPORTE_HOJA_);
  if (!sheet) sheet = ss.insertSheet(CFG_REPORTE_HOJA_);
  const H = CFG_REPORTE_HEADERS_.length;

  let conservar = [];
  if (etiquetasReemplazar) {
    const last = sheet.getLastRow();
    if (last > 1) {
      conservar = sheet.getRange(2, 1, last - 1, H).getValues().filter(function (r) {
        return String(r[0]) !== '' && etiquetasReemplazar.indexOf(String(r[0])) === -1;
      });
    }
  }
  const pesoGravedad = { ERROR: 0, AVISO: 1, OK: 2 };
  const todas = conservar.concat(filas).sort(function (a, b) {
    const g = (pesoGravedad[a[5]] === undefined ? 3 : pesoGravedad[a[5]]) - (pesoGravedad[b[5]] === undefined ? 3 : pesoGravedad[b[5]]);
    return g !== 0 ? g : String(a[0]).localeCompare(String(b[0]));
  });

  sheet.clearContents();
  sheet.getRange(1, 1, 1, H).setValues([CFG_REPORTE_HEADERS_]).setFontWeight('bold');
  if (todas.length) sheet.getRange(2, 1, todas.length, H).setValues(todas);
  sheet.setFrozenRows(1);
  try {
    sheet.setColumnWidth(1, 140);
    sheet.setColumnWidth(2, 180);
    sheet.setColumnWidth(5, 620);
    sheet.getRange(1, 5, Math.max(todas.length + 1, 2), 1).setWrap(true);
    const rango = sheet.getRange('A2:G');
    const regla = function (texto, color) {
      return SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$F2="' + texto + '"')
        .setBackground(color).setRanges([rango]).build();
    };
    sheet.setConditionalFormatRules([regla('ERROR', '#f4c7c3'), regla('AVISO', '#fce8b2'), regla('OK', '#b7e1cd')]);
  } catch (err) {
    console.error('[CONFIG] No se pudo dar formato a ' + CFG_REPORTE_HOJA_ + ': ' + err);
  }
}

// ============================================
// 7. HERRAMIENTAS PARA EL EDITOR (ejecutar desde el editor de Apps Script)
// ============================================

/** Universidades a validar: UNA (legado) + todas las del registro CORE con spreadsheet. */
function cfgObjetivosValidacion_() {
  const lista = [{ codigo: 'una', layout: 'legacy', spreadsheetId: SPREADSHEET_ID, procesos: ['ORDINARIO'] }];
  let registro = [];
  try {
    registro = getUniversidadesRegistro_();
  } catch (err) {
    console.warn('[CONFIG] Sin registro CORE (' + err + '): solo se valida UNA.');
  }
  registro.forEach(function (u) {
    if (u.codigo === 'una') return;
    const procesos = (u.procesos && u.procesos.length ? u.procesos : ['ORDINARIO'])
      .map(function (p) { return cfgNormProceso_(p); }).filter(Boolean);
    lista.push({
      codigo: u.codigo,
      layout: 'v2',
      spreadsheetId: String(u.spreadsheetId || '').trim(),
      procesos: procesos.length ? procesos : ['ORDINARIO'],
      estado: u.estado
    });
  });
  return lista;
}

/** Valida una lista de objetivos; refresca la última buena de los válidos. Devuelve {filas, etiquetas, resumen}. */
function cfgValidarObjetivos_(objetivos) {
  const filas = [];
  const etiquetas = [];
  const resumen = [];
  objetivos.forEach(function (t) {
    t.procesos.forEach(function (proceso) {
      const procesoClave = cfgProcesoClave_(t, proceso);
      const etiqueta = cfgEtiquetaReporte_(t, procesoClave);
      if (etiquetas.indexOf(etiqueta) !== -1) return;
      etiquetas.push(etiqueta);
      const clave = cfgClaveRespaldo_(t.codigo, procesoClave);

      let val;
      if (!t.spreadsheetId) {
        val = { ok: false, avisos: [], errores: [{ hoja: 'universidades (CORE)', fila: '', columna: 'spreadsheet_id', mensaje: 'La universidad no tiene spreadsheet_id en CORE.universidades.' }] };
      } else {
        try {
          val = cfgValidarTenant_(t, procesoClave, { revisarBancos: true });
        } catch (err) {
          val = { ok: false, avisos: [], errores: [{ hoja: '', fila: '', columna: '', mensaje: 'No pude abrir el spreadsheet (revisa spreadsheet_id en CORE.universidades y los permisos): ' + (err && err.message ? err.message : err) }] };
        }
      }

      let fuente = 'hoja';
      let guardadaEl = '';
      if (val.ok) {
        cfgGuardarUltimaBuena_(clave, val.config);
      } else {
        const respaldo = cfgLeerUltimaBuena_(clave);
        fuente = respaldo ? 'respaldo' : (t.layout === 'legacy' ? 'fabrica' : 'ninguna');
        guardadaEl = respaldo ? respaldo.at : '';
      }
      try {
        const cache = CacheService.getScriptCache();
        cache.remove('cfgnotif:' + clave);
      } catch (err) { /* nada */ }

      cfgFilasReporte_(t, procesoClave, val, fuente, guardadaEl).forEach(function (f) { filas.push(f); });
      resumen.push(etiqueta + ': ' + (val.ok ? 'OK' : 'ERRORES ' + val.errores.length + ' (se usa: ' + fuente + ')') +
        (val.avisos.length ? ', avisos ' + val.avisos.length : ''));
    });
  });
  return { filas: filas, etiquetas: etiquetas, resumen: resumen };
}

/**
 * Valida TODAS las configuraciones de puntaje (UNA + registro CORE),
 * refresca la "última buena" de las válidas y escribe el reporte en la
 * hoja `_validacion_config` del CORE. Ejecutable a mano o por el
 * activador horario (instalarTriggerValidacion).
 */
function validarConfiguraciones() {
  const r = cfgValidarObjetivos_(cfgObjetivosValidacion_());
  try {
    cfgEscribirReporte_(r.filas, null);
  } catch (err) {
    console.error('[CONFIG] No se pudo escribir ' + CFG_REPORTE_HOJA_ + ': ' + err);
  }
  Logger.log('Validación de configuraciones (' + new Date().toISOString() + '):\n' + r.resumen.join('\n') +
    '\nDetalle en la hoja ' + CFG_REPORTE_HOJA_ + ' del CORE.');
  return r.resumen;
}

function cfgEsHojaDeConfiguracion_(nombre) {
  const n = normalizeHeader_(nombre);
  const nombres = Object.keys(CONFIG_SHEETS).map(function (k) { return normalizeHeader_(CONFIG_SHEETS[k]); })
    .concat(['config examen', 'config escala', 'config carreras']);
  return nombres.indexOf(n) !== -1;
}

/**
 * Activador instalable "al editar" (lo crea instalarTriggerValidacion para
 * cada spreadsheet de configuración). Si se editó una hoja de config:
 * revalida esa universidad, refresca su última buena, actualiza su parte
 * del reporte y le muestra un aviso (toast) al editor.
 */
function alEditarConfiguracion(e) {
  try {
    if (!e || !e.range) return;
    const sheet = e.range.getSheet();
    if (!cfgEsHojaDeConfiguracion_(sheet.getName())) return;
    const ssId = e.source ? e.source.getId() : sheet.getParent().getId();
    const objetivos = cfgObjetivosValidacion_().filter(function (t) { return t.spreadsheetId === ssId; });
    if (!objetivos.length) return;

    try {
      const cache = CacheService.getScriptCache();
      objetivos.forEach(function (t) {
        cfgInvalidarCacheCarreras_(t);
        t.procesos.forEach(function (p) {
          const clave = cfgClaveRespaldo_(t.codigo, cfgProcesoClave_(t, p));
          cache.removeAll(['cfglkg:' + clave, 'cfgnotif:' + clave]);
        });
      });
    } catch (err) { /* nada */ }

    const r = cfgValidarObjetivos_(objetivos);
    cfgEscribirReporte_(r.filas, r.etiquetas);

    const errores = r.filas.filter(function (f) { return f[5] === 'ERROR' && f[1] !== '(resumen)'; });
    const msg = errores.length
      ? 'Hay ' + errores.length + ' problema(s). Primero: ' + String(errores[0][4]).substring(0, 250) +
        ' El simulacro sigue con la última configuración buena hasta que lo corrijas (detalle en ' + CFG_REPORTE_HOJA_ + ').'
      : 'Configuración correcta y guardada.';
    try {
      (e.source || sheet.getParent()).toast(msg, 'SimulaUNA', errores.length ? 20 : 5);
    } catch (err) { /* sin interfaz: nada */ }
  } catch (err) {
    console.error('[CONFIG] alEditarConfiguracion falló: ' + (err && err.stack ? err.stack : err));
  }
}

/**
 * Instala (sin duplicar) los activadores de validación:
 * - cada hora: validarConfiguraciones();
 * - "al editar" en cada spreadsheet de configuración: alEditarConfiguracion(e).
 * El proyecto es INDEPENDIENTE (script.google.com, abre las hojas por ID),
 * así que no hay onEdit simple: se usan activadores instalables por
 * spreadsheet (ScriptApp.newTrigger().forSpreadsheet(id).onEdit()).
 * Límite de Google: 20 activadores por usuario y proyecto.
 */
function instalarTriggerValidacion() {
  const handlers = ['validarConfiguraciones', 'alEditarConfiguracion'];
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (handlers.indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('validarConfiguraciones').timeBased().everyHours(1).create();

  let ligado = false;
  try { ligado = !!SpreadsheetApp.getActiveSpreadsheet(); } catch (err) { ligado = false; }

  const ids = [];
  cfgObjetivosValidacion_().forEach(function (t) {
    if (t.spreadsheetId && ids.indexOf(t.spreadsheetId) === -1) ids.push(t.spreadsheetId);
  });
  const libres = 20 - ScriptApp.getProjectTriggers().length;
  const instalados = [];
  const omitidos = [];
  ids.forEach(function (id, i) {
    if (i >= libres) { omitidos.push(id); return; }
    try {
      ScriptApp.newTrigger('alEditarConfiguracion').forSpreadsheet(id).onEdit().create();
      instalados.push(id);
    } catch (err) {
      omitidos.push(id + ' (' + err + ')');
    }
  });

  Logger.log('Proyecto ' + (ligado ? 'LIGADO a una hoja' : 'INDEPENDIENTE (no ligado)') + '.\n' +
    'Activador horario de validarConfiguraciones: instalado.\n' +
    'Activadores "al editar": ' + instalados.length + ' spreadsheet(s).' +
    (omitidos.length ? '\nNO instalados (límite de 20 activadores o error): ' + omitidos.join(', ') +
      '. Esas hojas igual se validan cada hora.' : ''));
  return { instalados: instalados.length, omitidos: omitidos };
}

/** Quita las protecciones que puso SimulaUNA antes (para no duplicarlas). */
function cfgQuitarProtecciones_(sheet) {
  sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) {
    if (String(p.getDescription() || '').indexOf('SimulaUNA') === 0) p.remove();
  });
}

function cfgProtegerAviso_(range, descripcion) {
  range.protect().setDescription('SimulaUNA: ' + descripcion).setWarningOnly(true);
}

/** Aplica una regla de validación a una columna (si existe). */
function cfgReglaColumna_(sheet, col, filaIni, nFilas, regla, ayuda, permitirInvalido) {
  if (col < 0 || nFilas < 1) return;
  const rule = regla(SpreadsheetApp.newDataValidation()).setAllowInvalid(!!permitirInvalido).setHelpText(ayuda).build();
  sheet.getRange(filaIni, col + 1, nFilas, 1).setDataValidation(rule);
  try { sheet.getRange(filaIni - 1, col + 1).setNote(ayuda); } catch (err) { /* nada */ }
}

function cfgInstalarValidacionUna_(sheet) {
  const values = sheet.getDataRange().getValues();
  const enc = cfgUbicarEncabezados_(values, CFG_SPEC_UNA_);
  if (!enc.ok) return sheet.getName() + ': no encontré los títulos (' + enc.faltantes.map(function (f) { return f.etiqueta; }).join(', ') + '); corrígelos y vuelve a ejecutar.';
  const c = enc.idx;
  const filasResumen = [];
  for (let r = enc.fila + 1; r < values.length; r++) {
    const nombre = cfgTexto_(values[r][c.asignatura]);
    const tipo = cfgTipoResumen_(nombre) || (c.cod >= 0 ? cfgTipoResumen_(cfgTexto_(values[r][c.cod])) : '') || (!nombre ? cfgTipoResumenFila_(values[r]) : '');
    if (tipo) filasResumen.push(r + 1);
  }
  const ini = enc.fila + 2;
  const fin = filasResumen.length ? Math.min.apply(null, filasResumen) - 1 : Math.max(values.length, ini);
  const n = fin - ini + 1;

  cfgQuitarProtecciones_(sheet);
  cfgReglaColumna_(sheet, c.cantidad, ini, n, function (b) { return b.requireNumberBetween(0, 200); },
    'Cantidad de preguntas de la asignatura: número entero (0 = no entra al examen). Las cantidades del área deben sumar 60.');
  cfgReglaColumna_(sheet, c.puntosCorrecta, ini, n, function (b) { return b.requireNumberGreaterThan(0); },
    'Puntos por pregunta bien contestada (en UNA: 10). Solo números mayores que 0.');
  cfgReglaColumna_(sheet, c.ponderacion, ini, n, function (b) { return b.requireNumberGreaterThan(0); },
    'Ponderación de la asignatura: número mayor que 0 (por ejemplo 5,201). Sin %, sin texto.');
  if (c.puntaje >= 0 && n > 0) {
    cfgProtegerAviso_(sheet.getRange(ini, c.puntaje + 1, n, 1),
      'PUNTAJE se calcula = PREGUNTA BIEN CONTESTADA × PONDERACIÓN × CANTIDAD (la suma del área debe dar 3000).');
    try { sheet.getRange(ini - 1, c.puntaje + 1).setNote('Se calcula: PREGUNTA BIEN CONTESTADA × PONDERACIÓN × CANTIDAD. Si no coincide, el sistema usa el valor calculado.'); } catch (err) { /* nada */ }
  }
  filasResumen.forEach(function (f) {
    cfgProtegerAviso_(sheet.getRange(f, 1, 1, Math.max(sheet.getLastColumn(), 1)), 'fila de totales (fórmulas)');
  });
  cfgProtegerAviso_(sheet.getRange(enc.fila + 1, 1, 1, Math.max(sheet.getLastColumn(), 1)),
    'títulos de columna: si los cambias, el sistema puede dejar de reconocerlos');
  return sheet.getName() + ': validación aplicada a filas ' + ini + '-' + fin + ', ' + filasResumen.length + ' fila(s) de totales protegidas.';
}

function cfgInstalarValidacionExamen_(sheet) {
  const values = sheet.getDataRange().getValues();
  const enc = cfgUbicarEncabezados_(values, CFG_SPEC_EXAMEN_);
  if (!enc.ok) return sheet.getName() + ': no encontré los títulos (' + enc.faltantes.map(function (f) { return f.etiqueta; }).join(', ') + ').';
  const c = enc.idx;
  const ini = enc.fila + 2;
  const n = Math.max(sheet.getMaxRows() - ini + 1, 1);

  cfgQuitarProtecciones_(sheet);
  cfgReglaColumna_(sheet, c.proceso, ini, n, function (b) { return b.requireValueInList(CFG_PROCESOS_SUGERIDOS_, true); },
    'Proceso: ORDINARIO, CEPRE o EXTRAORDINARIO (vacío = ORDINARIO).', true);
  cfgReglaColumna_(sheet, c.divisionTipo, ini, n, function (b) { return b.requireValueInList(CFG_DIVISION_TIPOS_, true); },
    'Tipo de división: area o canal (vacío = area).');
  cfgReglaColumna_(sheet, c.nPreguntas, ini, n, function (b) { return b.requireNumberBetween(0, 300); },
    'Número entero de preguntas del curso (0 = no entra al examen).');
  cfgReglaColumna_(sheet, c.puntosCorrecta, ini, n, function (b) { return b.requireNumberGreaterThan(0); },
    'Puntos por respuesta correcta: número mayor que 0 (por ejemplo 20).');
  cfgReglaColumna_(sheet, c.puntosIncorrecta, ini, n, function (b) { return b.requireNumberLessThanOrEqualTo(0); },
    'Penalidad por respuesta incorrecta: 0 o un número NEGATIVO (por ejemplo -1,125). Nunca positivo.');
  cfgReglaColumna_(sheet, c.peso, ini, n, function (b) { return b.requireNumberGreaterThanOrEqualTo(0); },
    'Peso informativo del curso: número ≥ 0.');
  cfgReglaColumna_(sheet, c.orden, ini, n, function (b) { return b.requireNumberGreaterThanOrEqualTo(0); },
    'Orden en que aparece el curso: número ≥ 0.');
  cfgReglaColumna_(sheet, c.puntosBlanco, ini, n, function (b) { return b.requireNumberBetween(-100, 100); },
    'Puntos por pregunta en blanco: 0, positivo si suma (1 en UNSAAC, 0,5 en UNAJ) o NEGATIVO si resta (-0,10 en UNP). Siempre menor que puntos_correcta. Vacío = 0.');
  cfgReglaColumna_(sheet, c.factorEscala, ini, n, function (b) { return b.requireNumberGreaterThan(0); },
    'Factor que multiplica los puntos de este curso para llevarlos a la escala oficial. Vacío = el de config_escala.');
  cfgProtegerAviso_(sheet.getRange(enc.fila + 1, 1, 1, Math.max(sheet.getLastColumn(), 1)),
    'títulos de columna: si los cambias, el sistema puede dejar de reconocerlos');
  return sheet.getName() + ': validación aplicada desde la fila ' + ini + '.';
}

function cfgInstalarValidacionEscala_(sheet) {
  const values = sheet.getDataRange().getValues();
  const enc = cfgUbicarEncabezados_(values, CFG_SPEC_ESCALA_);
  if (!enc.ok) return sheet.getName() + ': no encontré los títulos (' + enc.faltantes.map(function (f) { return f.etiqueta; }).join(', ') + ').';
  const c = enc.idx;
  const ini = enc.fila + 2;
  const n = Math.max(sheet.getMaxRows() - ini + 1, 1);

  cfgQuitarProtecciones_(sheet);
  cfgReglaColumna_(sheet, c.proceso, ini, n, function (b) { return b.requireValueInList(CFG_PROCESOS_SUGERIDOS_, true); },
    'Proceso: ORDINARIO, CEPRE o EXTRAORDINARIO. Una sola fila por proceso.', true);
  cfgReglaColumna_(sheet, c.motor, ini, n, function (b) { return b.requireValueInList(CFG_MOTORES_, true); },
    'Motor de calificación: suma_ponderada (sin penalidad), decimas (con penalidad), vector_canal u otro (= decimas).');
  cfgReglaColumna_(sheet, c.escalaTotal, ini, n, function (b) { return b.requireNumberGreaterThan(0); },
    'Puntaje máximo del examen (por ejemplo 2000). Debe coincidir con la suma n_preguntas × puntos_correcta de cada división.');
  [['umbralExcelente', 'excelente'], ['umbralBueno', 'bueno'], ['umbralRegular', 'regular']].forEach(function (par) {
    cfgReglaColumna_(sheet, c[par[0]], ini, n, function (b) { return b.requireNumberGreaterThanOrEqualTo(0); },
      'Umbral "' + par[1] + '": número ≥ 0. Debe cumplirse regular < bueno < excelente ≤ escala_total. Vacío = 80/60/40 % de escala_total.');
  });
  cfgReglaColumna_(sheet, c.duracionMin, ini, n, function (b) { return b.requireNumberGreaterThan(0); },
    'Duración del examen en minutos (vacío = 180).');
  cfgReglaColumna_(sheet, c.nPreguntasTotal, ini, n, function (b) { return b.requireNumberBetween(0, 1000); },
    'Total de preguntas del examen: debe ser igual a la suma de n_preguntas de cada división.');
  cfgReglaColumna_(sheet, c.factorEscala, ini, n, function (b) { return b.requireNumberGreaterThan(0); },
    'Factor que lleva el puntaje bruto a la escala oficial (ej. 2,5 en UNSAAC: 400 × 2,5 = 1000). Vacío = 1.');
  cfgProtegerAviso_(sheet.getRange(enc.fila + 1, 1, 1, Math.max(sheet.getLastColumn(), 1)),
    'títulos de columna: si los cambias, el sistema puede dejar de reconocerlos');
  return sheet.getName() + ': validación aplicada desde la fila ' + ini + '.';
}

/**
 * Aplica Validación de datos de Google Sheets a todas las hojas de
 * configuración (números en rango, listas desplegables, texto de ayuda) y
 * protege CON ADVERTENCIA (no bloquea) los títulos, PUNTAJE y las filas
 * de totales. No borra ni cambia datos. Se puede ejecutar varias veces.
 */
function instalarValidacionDeDatos() {
  const resumen = [];
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    UNA_AREAS_.forEach(function (area) {
      const enc = cfgBuscarHoja_(ss, CONFIG_SHEETS[area]);
      resumen.push('una · ' + (enc.sheet ? cfgInstalarValidacionUna_(enc.sheet) : 'no encontré la hoja ' + CONFIG_SHEETS[area]));
    });
    const carUna = cfgBuscarHoja_(ss, CFG_HOJA_CARRERAS_);
    if (carUna.sheet) resumen.push('una · ' + cfgInstalarValidacionCarreras_(carUna.sheet, UNA_AREAS_));
  } catch (err) {
    resumen.push('una: error ' + err);
  }

  cfgObjetivosValidacion_().filter(function (t) { return t.layout === 'v2' && t.spreadsheetId; }).forEach(function (t) {
    try {
      const ss = SpreadsheetApp.openById(t.spreadsheetId);
      const ex = cfgBuscarHoja_(ss, 'config_examen');
      const es = cfgBuscarHoja_(ss, 'config_escala');
      resumen.push(t.codigo + ' · ' + (ex.sheet ? cfgInstalarValidacionExamen_(ex.sheet) : 'no hay hoja config_examen'));
      resumen.push(t.codigo + ' · ' + (es.sheet ? cfgInstalarValidacionEscala_(es.sheet) : 'no hay hoja config_escala'));
      const car = cfgBuscarHoja_(ss, CFG_HOJA_CARRERAS_);
      if (car.sheet) {
        let divisiones = [];
        try {
          const val = cfgValidarTenant_(t, cfgProcesoClave_(t, t.procesos[0]), null);
          if (val.ok) divisiones = val.config.rows.map(function (r) { return r.division; })
            .filter(function (d, i, a) { return a.indexOf(d) === i; });
        } catch (err) { divisiones = []; }
        resumen.push(t.codigo + ' · ' + cfgInstalarValidacionCarreras_(car.sheet, divisiones));
      }
    } catch (err) {
      resumen.push(t.codigo + ': error ' + err);
    }
  });

  Logger.log('Validación de datos instalada:\n' + resumen.join('\n'));
  return resumen;
}
