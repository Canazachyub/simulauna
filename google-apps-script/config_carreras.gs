/**
 * SimulaUNA - CARRERAS POR DIVISIÓN (hoja opcional `config_carreras`)
 * ============================================
 * Alimenta el desplegable "Carrera profesional" del registro. Cada
 * spreadsheet de universidad (también el de UNA) puede tener una hoja
 * `config_carreras` con estas columnas:
 *
 *   division | carrera | sede (opcional) | activo (opcional: SI/NO) | orden (opcional)
 *
 * - `division` debe ser el MISMO nombre de área/canal que en config_examen
 *   (o el de las hojas Configuración_* en UNA). Se compara sin tildes ni
 *   mayúsculas, así que "biomedicas" encuentra "Biomédicas".
 * - `sede` vacío = sede central. Si se llena, el desplegable muestra
 *   "Ingeniería Civil (Filial Huaraz)".
 * - `activo` = NO esconde la carrera sin borrarla.
 *
 * AISLADA DEL PUNTAJE A PROPÓSITO: esta hoja NUNCA bloquea el examen ni la
 * calificación. Si falta, está mal escrita o una división no existe, la
 * fila se salta (aviso en `_validacion_config`) y, en el peor caso, el
 * formulario vuelve al campo de texto libre. getConfig la agrega como
 * `divisiones[].carreras` (campo aditivo: clientes viejos lo ignoran).
 *
 * Depende de helpers puros de config_guard.gs (normalizeHeader_,
 * cfgUbicarEncabezados_, cfgTexto_, cfgFilaVacia_, parseNumberCell_).
 */

const CFG_HOJA_CARRERAS_ = 'config_carreras';
const CFG_CARRERAS_CACHE_SEG_ = 600;        // 10 min; alEditarConfiguracion la invalida al editar
const CFG_CARRERA_MAX_CHARS_ = 120;
const CFG_CARRERAS_MAX_POR_DIVISION_ = 150;

const CFG_SPEC_CARRERAS_ = {
  division: { etiqueta: 'division', alias: ['division', 'divisiones', 'area', 'areas', 'canal', 'grupo'], requerida: true },
  carrera: { etiqueta: 'carrera', alias: ['carrera', 'carreras', 'carrera profesional', 'programa', 'programa de estudios',
    'escuela profesional', 'especialidad'], requerida: true },
  sede: { etiqueta: 'sede', alias: ['sede', 'filial', 'sede filial', 'local'], requerida: false },
  activo: { etiqueta: 'activo', alias: ['activo', 'activa', 'habilitado', 'habilitada', 'visible'], requerida: false },
  orden: { etiqueta: 'orden', alias: ['orden', 'posicion'], requerida: false }
};

const CFG_ACTIVO_NO_ = ['no', 'n', 'false', 'falso', '0', 'inactivo', 'inactiva', 'oculto', 'oculta'];

// ============================================
// FUNCIÓN PURA (testeable en node)
// ============================================

/**
 * Valida la hoja config_carreras contra las divisiones reales del examen.
 * @param {Array<Array<*>>|null} rows2d valores de la hoja (null = no existe)
 * @param {string[]} divisiones nombres de división válidos (de config_examen / áreas UNA)
 * @param {{hoja?:string}} opciones
 * @return {{ok:boolean, existe:boolean, porDivision:Object<string,string[]>, errores:Array, avisos:Array, total:number}}
 *   `ok` es false solo si la hoja existe pero no se reconocen sus títulos.
 *   Las filas con problemas se SALTAN (aviso), nunca invalidan las demás.
 */
function validateConfigCarreras_(rows2d, divisiones, opciones) {
  const hoja = (opciones && opciones.hoja) || CFG_HOJA_CARRERAS_;
  const out = { ok: true, existe: false, porDivision: {}, errores: [], avisos: [], total: 0 };
  if (!rows2d || !rows2d.length) return out;
  out.existe = true;

  const aviso = function (fila, columna, mensaje) {
    out.avisos.push({ hoja: hoja, fila: fila, columna: columna, mensaje: mensaje });
  };

  const enc = cfgUbicarEncabezados_(rows2d, CFG_SPEC_CARRERAS_);
  if (!enc.ok) {
    out.ok = false;
    out.errores.push({
      hoja: hoja, fila: enc.fila + 1, columna: '',
      mensaje: 'No encontré los títulos ' + enc.faltantes.map(function (f) { return '"' + f.etiqueta + '"'; }).join(' y ') +
        '. La fila de títulos debe decir: division | carrera | sede | activo | orden. Mientras tanto el registro pide la carrera como texto libre.'
    });
    return out;
  }
  const c = enc.idx;

  // Índice normalizado → nombre oficial de la división.
  const canon = {};
  (divisiones || []).forEach(function (d) {
    const k = normalizeHeader_(d);
    if (k && !canon[k]) canon[k] = String(d);
  });
  const nombresDivisiones = (divisiones || []).map(function (d) { return '"' + d + '"'; }).join(', ');

  const tmp = {};      // division → [{etiqueta, orden, fila}]
  const vistos = {};   // division|etiqueta normalizada → fila
  const divDesconocidas = {};

  for (let r = enc.fila + 1; r < rows2d.length; r++) {
    const row = rows2d[r] || [];
    if (cfgFilaVacia_(row)) continue;
    const fila = r + 1;
    const divTexto = cfgTexto_(row[c.division]);
    const carrera = cfgTexto_(row[c.carrera]).replace(/\s+/g, ' ');
    const sede = c.sede >= 0 ? cfgTexto_(row[c.sede]).replace(/\s+/g, ' ') : '';

    if (c.activo >= 0) {
      const act = normalizeHeader_(row[c.activo]);
      if (act && CFG_ACTIVO_NO_.indexOf(act) !== -1) continue;
    }
    if (!carrera) {
      aviso(fila, 'carrera', 'la fila no tiene carrera: se ignora.');
      continue;
    }
    if (!divTexto) {
      aviso(fila, 'division', 'la carrera "' + carrera + '" no tiene división: se ignora. Escribe una de: ' + nombresDivisiones + '.');
      continue;
    }
    const division = canon[normalizeHeader_(divTexto)];
    if (!division) {
      divDesconocidas[divTexto] = true;
      aviso(fila, 'division', 'la división "' + divTexto + '" no existe en el examen, así que "' + carrera +
        '" no aparecerá. Usa exactamente uno de: ' + nombresDivisiones + '.');
      continue;
    }
    if (/^[=+\-@]/.test(carrera)) {
      aviso(fila, 'carrera', 'la carrera "' + carrera + '" empieza con un símbolo de fórmula: se ignora.');
      continue;
    }
    let etiqueta = sede && normalizeHeader_(sede) !== 'sede central' ? carrera + ' (' + sede + ')' : carrera;
    if (etiqueta.length > CFG_CARRERA_MAX_CHARS_) {
      aviso(fila, 'carrera', 'el nombre tiene más de ' + CFG_CARRERA_MAX_CHARS_ + ' caracteres: se recorta.');
      etiqueta = etiqueta.substring(0, CFG_CARRERA_MAX_CHARS_).trim();
    }
    const claveDup = normalizeHeader_(division) + '|' + normalizeHeader_(etiqueta);
    if (vistos[claveDup]) {
      aviso(fila, 'carrera', '"' + etiqueta + '" ya está en la fila ' + vistos[claveDup] + ' para ' + division + ': se ignora el duplicado.');
      continue;
    }
    vistos[claveDup] = fila;

    let orden = Infinity;
    if (c.orden >= 0 && cfgTexto_(row[c.orden]) !== '') {
      const p = parseNumberCell_(row[c.orden]);
      if (p.ok) orden = p.value;
      else aviso(fila, 'orden', 'el orden "' + cfgTexto_(row[c.orden]) + '" no es un número: la carrera va al final.');
    }
    (tmp[division] = tmp[division] || []).push({ etiqueta: etiqueta, orden: orden, fila: fila });
  }

  Object.keys(tmp).forEach(function (division) {
    let lista = tmp[division].sort(function (a, b) {
      if (a.orden !== b.orden) return a.orden < b.orden ? -1 : 1;
      return a.etiqueta.localeCompare(b.etiqueta, 'es');
    });
    if (lista.length > CFG_CARRERAS_MAX_POR_DIVISION_) {
      aviso('', '', division + ' tiene ' + lista.length + ' carreras; solo se muestran las primeras ' + CFG_CARRERAS_MAX_POR_DIVISION_ + '.');
      lista = lista.slice(0, CFG_CARRERAS_MAX_POR_DIVISION_);
    }
    out.porDivision[division] = lista.map(function (x) { return x.etiqueta; });
    out.total += lista.length;
  });

  (divisiones || []).forEach(function (d) {
    if (!out.porDivision[d]) {
      aviso('', '', 'la división "' + d + '" no tiene carreras: en el registro se pedirá la carrera como texto libre.');
    }
  });
  return out;
}

/** Agrega `carreras` a cada división de una respuesta getConfig (muta y devuelve `resp`). Pura. */
function cfgAplicarCarreras_(resp, porDivision) {
  if (!resp || !Array.isArray(resp.divisiones) || !porDivision) return resp;
  resp.divisiones.forEach(function (d) {
    const lista = porDivision[d.nombre] || porDivision[d.codigo];
    if (lista && lista.length) d.carreras = lista.slice();
  });
  return resp;
}

// ============================================
// LECTURA DESDE SHEETS (con caché) — nunca lanza
// ============================================

function cfgClaveCacheCarreras_(tenant) {
  return 'cfgcarr:' + tenant.codigo;
}

/** Nombres de división del tenant (de la respuesta getConfig ya construida). */
function cfgNombresDivisiones_(resp) {
  return (resp && resp.divisiones ? resp.divisiones : []).map(function (d) { return d.nombre; });
}

/** Lee y valida config_carreras del spreadsheet del tenant. Puede lanzar (lo atrapa el llamador). */
function cfgLeerCarreras_(tenant, divisiones) {
  const ss = SpreadsheetApp.openById(tenant.spreadsheetId);
  const enc = cfgBuscarHoja_(ss, CFG_HOJA_CARRERAS_);
  const res = validateConfigCarreras_(cfgValoresHoja_(enc.sheet), divisiones, {
    hoja: enc.sheet ? enc.sheet.getName() : CFG_HOJA_CARRERAS_
  });
  if (enc.aviso) res.avisos.unshift({ hoja: enc.sheet.getName(), fila: '', columna: '', mensaje: enc.aviso });
  return res;
}

/**
 * Agrega las carreras a la respuesta getConfig. NUNCA lanza ni bloquea:
 * ante cualquier problema devuelve la respuesta sin carreras.
 */
function cfgAdjuntarCarreras_(tenant, resp) {
  try {
    if (!tenant || !tenant.spreadsheetId || !resp) return resp;
    const divisiones = cfgNombresDivisiones_(resp);
    const cacheKey = cfgClaveCacheCarreras_(tenant);
    let porDivision = null;
    let cache = null;
    try {
      cache = CacheService.getScriptCache();
      const enCache = cache.get(cacheKey);
      if (enCache) porDivision = JSON.parse(enCache);
    } catch (err) { porDivision = null; }

    if (!porDivision) {
      const res = cfgLeerCarreras_(tenant, divisiones);
      porDivision = res.ok ? res.porDivision : {};
      try {
        const texto = JSON.stringify(porDivision);
        if (cache && texto.length < 90000) cache.put(cacheKey, texto, CFG_CARRERAS_CACHE_SEG_);
      } catch (err) { /* sin caché: se lee la próxima vez */ }
    }
    return cfgAplicarCarreras_(resp, porDivision);
  } catch (err) {
    console.error('[CARRERAS] No se pudieron leer las carreras de ' + (tenant && tenant.codigo) + ': ' + err);
    return resp;
  }
}

/** Borra la caché de carreras (lo llama alEditarConfiguracion). */
function cfgInvalidarCacheCarreras_(tenant) {
  try { CacheService.getScriptCache().remove(cfgClaveCacheCarreras_(tenant)); } catch (err) { /* nada */ }
}

/** Instala desplegables en config_carreras: division (lista real), activo (SI/NO), orden (número). */
function cfgInstalarValidacionCarreras_(sheet, divisiones) {
  const values = sheet.getDataRange().getValues();
  const enc = cfgUbicarEncabezados_(values, CFG_SPEC_CARRERAS_);
  if (!enc.ok) return sheet.getName() + ': no encontré los títulos (' + enc.faltantes.map(function (f) { return f.etiqueta; }).join(', ') + ').';
  const c = enc.idx;
  const ini = enc.fila + 2;
  const n = Math.max(sheet.getMaxRows() - ini + 1, 1);

  cfgQuitarProtecciones_(sheet);
  if (divisiones && divisiones.length) {
    cfgReglaColumna_(sheet, c.division, ini, n, function (b) { return b.requireValueInList(divisiones, true); },
      'División/área del examen: elige de la lista (son las mismas de config_examen).');
  }
  cfgReglaColumna_(sheet, c.activo, ini, n, function (b) { return b.requireValueInList(['SI', 'NO'], true); },
    'SI = aparece en el registro; NO = se esconde sin borrarla. Vacío = SI.');
  cfgReglaColumna_(sheet, c.orden, ini, n, function (b) { return b.requireNumberGreaterThanOrEqualTo(0); },
    'Orden en el desplegable (opcional). Vacío = orden alfabético.');
  cfgProtegerAviso_(sheet.getRange(enc.fila + 1, 1, 1, Math.max(sheet.getLastColumn(), 1)),
    'títulos de columna: si los cambias, el sistema puede dejar de reconocerlos');
  return sheet.getName() + ': validación aplicada desde la fila ' + ini + '.';
}
