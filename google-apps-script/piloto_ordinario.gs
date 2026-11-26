/**
 * PILOTO ORDINARIO — carga en un solo paso el examen ordinario de las 12 universidades.
 *
 * Funciones para ejecutar desde el editor de Apps Script (en este orden):
 *   1. cargarPilotoOrdinario()  → crea (o reutiliza) el spreadsheet de cada universidad, escribe
 *      config_examen / config_escala / config_carreras, crea las hojas Banco_<curso> vacías que
 *      faltan y registra cada universidad en CORE.universidades. Las NUEVAS quedan en estado
 *      'oculta' (nadie las ve) hasta que tengan preguntas. Se puede ejecutar las veces que haga
 *      falta: no duplica nada, no toca los bancos y respalda la hoja anterior antes de reemplazarla.
 *   2. revisarPilotoOrdinario() → escribe la hoja `_piloto_ordinario` en el CORE: por universidad,
 *      qué cursos no tienen preguntas suficientes y si ya se puede publicar.
 *   3. Publicar = en CORE.universidades cambiar `estado` de 'oculta' a 'piloto' (Beta) o 'activa'.
 *
 * Los datos vienen de piloto_datos.gs (generado desde docs/configuraciones/, NO editar a mano).
 * UNA no se toca salvo su hoja config_carreras (su puntaje sigue en las hojas Configuración_*).
 */

const PILOTO_PROCESO_ = 'ORDINARIO';
const PILOTO_LIMITE_MS_ = 4.5 * 60 * 1000; // Apps Script corta a los 6 min: margen para terminar ordenado.
const PILOTO_REPORTE_HOJA_ = '_piloto_ordinario';
const PILOTO_REGISTRO_HEADERS_ = [
  'codigo', 'nombre', 'nombre_corto', 'spreadsheet_id', 'estado', 'procesos',
  'cepre_nombre', 'color_primario', 'color_secundario', 'logo', 'orden'
];

// ============================================
// FUNCIONES PURAS (probadas en tests/config_guard.test.js)
// ============================================

/**
 * Preguntas que necesita cada banco: {'Banco_X': {curso, porDivision: {division: n}}}.
 * `canonico` traduce el nombre del curso al de la hoja (getCursoCanonical en Apps Script).
 */
function pilotoPlanBancos_(configRows, canonico) {
  const plan = {};
  (configRows || []).forEach(function (r) {
    const hoja = 'Banco_' + ((canonico && canonico(r.curso)) || r.curso);
    const p = plan[hoja] = plan[hoja] || { curso: r.curso, porDivision: {} };
    p.porDivision[r.division] = (p.porDivision[r.division] || 0) + (Number(r.nPreguntas) || 0);
  });
  return plan;
}

/**
 * Cuenta preguntas utilizables de una hoja Banco_ (valores 2D con encabezado) por división, con
 * las MISMAS reglas que getExam (v2ReadActiveQuestions_): texto no vacío, ESTADO 'activa' (o sin
 * columna), Correct Answer 1-5, PROCESO vacío u ORDINARIO, DIVISION vacía (sirve para todas) o igual.
 */
function pilotoContarBanco_(values, divisiones) {
  const res = {};
  (divisiones || []).forEach(function (d) { res[d] = 0; });
  if (!values || values.length <= 1) return res;
  const h = values[0].map(function (x) { return String(x).trim(); });
  const iTexto = h.indexOf('Question Text');
  const iCorrecta = h.indexOf('Correct Answer');
  const iEstado = h.indexOf('ESTADO');
  const iProceso = h.indexOf('PROCESO');
  const iDivision = h.indexOf('DIVISION');
  if (iTexto === -1 || iCorrecta === -1) return res;
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row[iTexto] && row[iTexto] !== 0) continue;
    if (iEstado !== -1 && String(row[iEstado] || '').trim().toLowerCase() !== 'activa') continue;
    const c = parseInt(row[iCorrecta], 10);
    if (!(c >= 1 && c <= 5)) continue;
    const proc = iProceso !== -1 ? String(row[iProceso] || '').trim().toUpperCase() : '';
    if (proc && proc !== PILOTO_PROCESO_) continue;
    const div = iDivision !== -1 ? String(row[iDivision] || '').trim().toUpperCase() : '';
    Object.keys(res).forEach(function (d) {
      if (!div || div === String(d).trim().toUpperCase()) res[d]++;
    });
  }
  return res;
}

/** Faltantes de una universidad: [{hoja, division, tiene, necesita}] (vacío = lista). */
function pilotoFaltantes_(plan, conteos) {
  const faltan = [];
  Object.keys(plan).forEach(function (hoja) {
    const c = conteos[hoja]; // undefined = la hoja no existe
    Object.keys(plan[hoja].porDivision).forEach(function (div) {
      const necesita = plan[hoja].porDivision[div];
      const tiene = c ? (c[div] || 0) : 0;
      if (tiene < necesita) faltan.push({ hoja: hoja, division: div, tiene: tiene, necesita: necesita, existe: !!c });
    });
  });
  return faltan;
}

// ============================================
// 1. CARGA
// ============================================

function cargarPilotoOrdinario() {
  const inicio = Date.now();
  if (!CORE_SPREADSHEET_ID) throw new Error('Falta CORE_SPREADSHEET_ID en Script Properties: ejecuta setupCore() primero.');
  if (typeof PILOTO_ORDINARIO_DATOS_ === 'undefined') throw new Error('Falta el archivo piloto_datos.gs en el proyecto.');

  const core = SpreadsheetApp.openById(CORE_SPREADSHEET_ID);
  const registro = pilotoHojaRegistro_(core);
  const log = [];
  const codigos = Object.keys(PILOTO_ORDINARIO_DATOS_).sort(function (a, b) {
    return PILOTO_ORDINARIO_DATOS_[a].orden - PILOTO_ORDINARIO_DATOS_[b].orden;
  });

  for (let k = 0; k < codigos.length; k++) {
    const codigo = codigos[k];
    if (Date.now() - inicio > PILOTO_LIMITE_MS_) {
      log.push('⏸ Se pausó antes de ' + codigo + ' para no pasar el límite de 6 minutos. VUELVE A EJECUTAR cargarPilotoOrdinario(): sigue donde quedó.');
      break;
    }
    try {
      log.push(codigo === 'una' ? pilotoCargarUna_(PILOTO_ORDINARIO_DATOS_.una) : pilotoCargarUniversidad_(codigo, PILOTO_ORDINARIO_DATOS_[codigo], registro));
    } catch (err) {
      log.push('✗ ' + codigo + ': ' + (err && err.message ? err.message : err) + ' (las demás siguen).');
    }
  }

  try { CacheService.getScriptCache().remove('core:universidades'); } catch (err) { /* nada */ }
  log.push('Siguiente paso: ejecuta instalarValidacionDeDatos(), luego validarConfiguraciones() y revisarPilotoOrdinario().');
  console.log(log.join('\n'));
  return log.join('\n');
}

/** Una universidad v2: valida, abre/crea su spreadsheet, registra, escribe hojas y bancos vacíos. */
function pilotoCargarUniversidad_(codigo, d, registro) {
  // 1) Validar ANTES de escribir nada: si los datos no pasan, no se toca la hoja actual.
  const val = validateConfigV2_(d.examen, d.escala, PILOTO_PROCESO_, {});
  if (!val.ok) {
    return '✗ ' + codigo + ': configuración inválida, no se cargó. ' + val.errores.map(function (e) { return e.mensaje; }).join(' | ');
  }

  // 2) Spreadsheet: el del registro si abre; si no, uno nuevo (registrado de inmediato: sin duplicados).
  const fila = pilotoBuscarFila_(registro, codigo);
  let ss = null;
  let nuevo = false;
  const idPrevio = fila ? String(fila.valores[registro.idx.spreadsheet_id] || '').trim() : '';
  if (idPrevio) {
    try { ss = SpreadsheetApp.openById(idPrevio); } catch (err) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create('SimulaUNA - ' + d.nombreCorto);
    nuevo = true;
  }
  pilotoRegistrar_(registro, fila, codigo, d, ss.getId());

  // 3) Hojas de configuración (respaldo de la anterior si tenía otro contenido).
  const resp = [];
  [['config_examen', d.examen], ['config_escala', d.escala], ['config_carreras', d.carreras]].forEach(function (par) {
    if (!par[1]) return;
    const r = pilotoEscribirHoja_(ss, par[0], par[1]);
    if (r) resp.push(r);
  });

  // 4) Bancos vacíos con el encabezado correcto (los existentes NO se tocan).
  const plan = pilotoPlanBancos_(val.config.rows, getCursoCanonical);
  let creados = 0;
  Object.keys(plan).forEach(function (hoja) {
    if (ss.getSheetByName(hoja)) return;
    const sh = ss.insertSheet(hoja);
    sh.getRange(1, 1, 1, V2_BANCO_HEADERS_.length).setValues([V2_BANCO_HEADERS_]).setFontWeight('bold');
    sh.setFrozenRows(1);
    creados++;
  });
  if (nuevo) pilotoQuitarHojaVacia_(ss);

  try { cfgInvalidarCacheCarreras_({ codigo: codigo, layout: 'v2', spreadsheetId: ss.getId() }); } catch (err) { /* nada */ }
  const estado = pilotoBuscarFila_(registro, codigo).valores[registro.idx.estado];
  return '✓ ' + codigo + (nuevo ? ' (spreadsheet NUEVO)' : '') + ': ' + val.config.rows.length + ' filas de examen, ' +
    (d.carreras ? d.carreras.length - 1 : 0) + ' carreras, ' + creados + ' bancos vacíos creados, estado=' + estado +
    (resp.length ? '. Respaldos: ' + resp.join(', ') : '') + '. ' + ss.getUrl();
}

/** UNA: solo la hoja config_carreras de su spreadsheet legado. */
function pilotoCargarUna_(d) {
  if (!d || !d.carreras) return '· una: sin carreras que cargar.';
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const r = pilotoEscribirHoja_(ss, 'config_carreras', d.carreras);
  try { cfgInvalidarCacheCarreras_({ codigo: 'una', layout: 'legacy', spreadsheetId: SPREADSHEET_ID }); } catch (err) { /* nada */ }
  return '✓ una: ' + (d.carreras.length - 1) + ' carreras en config_carreras (su puntaje no se toca)' + (r ? '. Respaldo: ' + r : '') + '.';
}

/**
 * Reemplaza el contenido de una hoja. Si ya tenía OTRO contenido, primero la copia como
 * "<hoja>_respaldo_<fecha>" (nada se pierde). Devuelve el nombre del respaldo o ''.
 */
function pilotoEscribirHoja_(ss, nombre, filas) {
  const ancho = filas.reduce(function (m, f) { return Math.max(m, f.length); }, 0);
  const datos = filas.map(function (f) {
    const c = f.slice();
    while (c.length < ancho) c.push('');
    return c;
  });
  let sh = ss.getSheetByName(nombre);
  let respaldo = '';
  if (sh) {
    const actual = sh.getDataRange().getValues();
    const tieneDatos = actual.length > 1 || (actual[0] && actual[0].some(function (x) { return x !== ''; }));
    if (tieneDatos && JSON.stringify(pilotoNormalizar_(actual)) !== JSON.stringify(pilotoNormalizar_(datos))) {
      respaldo = nombre + '_respaldo_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Lima', 'yyyyMMdd_HHmm');
      if (!ss.getSheetByName(respaldo)) sh.copyTo(ss).setName(respaldo);
    } else if (tieneDatos) {
      return ''; // ya está igual: no se reescribe (no dispara validaciones ni respaldos)
    }
    sh.clearContents();
  } else {
    sh = ss.insertSheet(nombre);
  }
  sh.getRange(1, 1, datos.length, ancho).setValues(datos);
  sh.getRange(1, 1, 1, ancho).setFontWeight('bold');
  sh.setFrozenRows(1);
  return respaldo;
}

/** Para comparar contenido: sin filas/columnas vacías al final y todo como texto. */
function pilotoNormalizar_(values) {
  const filas = values.map(function (f) {
    const c = f.map(function (x) { return String(x === null || x === undefined ? '' : x).trim(); });
    while (c.length && c[c.length - 1] === '') c.pop();
    return c;
  });
  while (filas.length && !filas[filas.length - 1].length) filas.pop();
  return filas;
}

function pilotoQuitarHojaVacia_(ss) {
  ss.getSheets().forEach(function (sh) {
    if (ss.getSheets().length > 1 && /^(Sheet1|Hoja 1|Hoja1)$/.test(sh.getName()) && sh.getLastRow() === 0) ss.deleteSheet(sh);
  });
}

// ---- Registro maestro (CORE.universidades) ----

function pilotoHojaRegistro_(core) {
  const sh = core.getSheetByName('universidades') || setupSheetWithHeaders_(core, 'universidades', PILOTO_REGISTRO_HEADERS_);
  const valores = sh.getDataRange().getValues();
  const headers = valores[0].map(function (h) { return String(h).trim(); });
  const idx = {};
  PILOTO_REGISTRO_HEADERS_.forEach(function (h) {
    idx[h] = headers.indexOf(h);
    if (idx[h] === -1) throw new Error('A la hoja universidades del CORE le falta la columna "' + h + '".');
  });
  return { sheet: sh, idx: idx, valores: valores };
}

function pilotoBuscarFila_(registro, codigo) {
  for (let i = 1; i < registro.valores.length; i++) {
    if (String(registro.valores[i][registro.idx.codigo]).trim().toLowerCase() === codigo) {
      return { numero: i + 1, valores: registro.valores[i] };
    }
  }
  return null;
}

/**
 * Crea o actualiza la fila. Respeta lo que el dueño ya decidió: estado, colores, logo, CEPRE y
 * procesos existentes (solo agrega ORDINARIO si faltaba). Fila nueva → estado 'oculta'.
 */
function pilotoRegistrar_(registro, fila, codigo, d, spreadsheetId) {
  const ix = registro.idx;
  const ancho = registro.valores[0].length;
  const v = fila ? fila.valores.slice() : new Array(ancho).fill('');
  v[ix.codigo] = codigo;
  if (!v[ix.nombre]) v[ix.nombre] = d.nombre;
  if (!v[ix.nombre_corto]) v[ix.nombre_corto] = d.nombreCorto;
  v[ix.spreadsheet_id] = spreadsheetId;
  if (!String(v[ix.estado] || '').trim()) v[ix.estado] = 'oculta';
  const procesos = String(v[ix.procesos] || '').split(',').map(function (p) { return p.trim().toUpperCase(); }).filter(Boolean);
  if (procesos.indexOf(PILOTO_PROCESO_) === -1) procesos.unshift(PILOTO_PROCESO_);
  v[ix.procesos] = procesos.join(',');
  if (v[ix.orden] === '' || v[ix.orden] === null) v[ix.orden] = d.orden;

  if (fila) {
    registro.sheet.getRange(fila.numero, 1, 1, ancho).setValues([v]);
    registro.valores[fila.numero - 1] = v;
  } else {
    registro.sheet.appendRow(v);
    registro.valores.push(v);
  }
}

// ============================================
// 2. REVISIÓN: ¿qué falta para publicar cada universidad?
// ============================================

function revisarPilotoOrdinario() {
  const inicio = Date.now();
  if (!CORE_SPREADSHEET_ID) throw new Error('Falta CORE_SPREADSHEET_ID en Script Properties.');
  const core = SpreadsheetApp.openById(CORE_SPREADSHEET_ID);
  const registro = pilotoHojaRegistro_(core);
  const filas = [['universidad', 'estado', 'veredicto', 'detalle', 'spreadsheet']];

  Object.keys(PILOTO_ORDINARIO_DATOS_).filter(function (c) { return c !== 'una'; }).sort(function (a, b) {
    return PILOTO_ORDINARIO_DATOS_[a].orden - PILOTO_ORDINARIO_DATOS_[b].orden;
  }).forEach(function (codigo) {
    const fila = pilotoBuscarFila_(registro, codigo);
    if (!fila || !fila.valores[registro.idx.spreadsheet_id]) {
      filas.push([codigo, '—', 'SIN CARGAR', 'Ejecuta cargarPilotoOrdinario().', '']);
      return;
    }
    const estado = String(fila.valores[registro.idx.estado] || '').trim().toLowerCase();
    const ssId = String(fila.valores[registro.idx.spreadsheet_id]).trim();
    if (Date.now() - inicio > PILOTO_LIMITE_MS_) {
      filas.push([codigo, estado, 'SIN REVISAR', 'Se acabó el tiempo: vuelve a ejecutar revisarPilotoOrdinario().', '']);
      return;
    }
    try {
      const ss = SpreadsheetApp.openById(ssId);
      const ex = ss.getSheetByName('config_examen');
      const es = ss.getSheetByName('config_escala');
      const val = validateConfigV2_(ex ? ex.getDataRange().getValues() : [], es ? es.getDataRange().getValues() : [], PILOTO_PROCESO_, {});
      if (!val.ok) {
        filas.push([codigo, estado, 'CONFIG CON ERRORES', val.errores.map(function (e) { return e.mensaje; }).join(' | ').substring(0, 45000), ss.getUrl()]);
        return;
      }
      const plan = pilotoPlanBancos_(val.config.rows, getCursoCanonical);
      const conteos = {};
      Object.keys(plan).forEach(function (hoja) {
        const sh = ss.getSheetByName(hoja);
        if (sh) conteos[hoja] = pilotoContarBanco_(sh.getDataRange().getValues(), Object.keys(plan[hoja].porDivision));
      });
      const faltan = pilotoFaltantes_(plan, conteos);
      const publicada = estado === 'activa' || estado === 'piloto';
      let veredicto;
      if (faltan.length) veredicto = publicada ? '⚠ PUBLICADA SIN PREGUNTAS SUFICIENTES' : 'FALTAN PREGUNTAS';
      else veredicto = publicada ? 'PUBLICADA ✓' : 'LISTA: cambia estado a piloto';
      const detalle = faltan.length
        ? faltan.map(function (f) {
            return f.hoja + (f.existe ? '' : ' (no existe)') + ' · ' + f.division + ': ' + f.tiene + '/' + f.necesita;
          }).join('\n').substring(0, 45000)
        : 'Todos los cursos tienen al menos las preguntas de un simulacro.';
      filas.push([codigo, estado, veredicto, detalle, ss.getUrl()]);
    } catch (err) {
      filas.push([codigo, estado, 'NO SE PUDO ABRIR', String(err && err.message ? err.message : err), ssId]);
    }
  });

  let sh = core.getSheetByName(PILOTO_REPORTE_HOJA_);
  if (!sh) sh = core.insertSheet(PILOTO_REPORTE_HOJA_);
  sh.clearContents();
  sh.getRange(1, 1, filas.length, filas[0].length).setValues(filas);
  sh.getRange(1, 1, 1, filas[0].length).setFontWeight('bold');
  sh.setFrozenRows(1);
  for (let i = 2; i <= filas.length; i++) {
    const v = String(filas[i - 1][2]);
    const color = /^LISTA|^PUBLICADA ✓/.test(v) ? '#d9ead3' : /^⚠|ERRORES|NO SE PUDO/.test(v) ? '#f4cccc' : '#fff2cc';
    sh.getRange(i, 1, 1, filas[0].length).setBackground(color);
  }
  const resumen = filas.slice(1).map(function (f) { return f[0] + ': ' + f[2]; }).join('\n');
  console.log(resumen + '\nDetalle en la hoja ' + PILOTO_REPORTE_HOJA_ + ' del CORE.');
  return resumen;
}
