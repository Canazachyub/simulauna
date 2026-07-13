/**
 * SimulaUNA - CORE
 * ============================================
 * Resolucion de tenant (universidad), registro maestro, cache namespaced
 * y utilidades genericas compartidas por todo el backend.
 *
 * IMPORTANTE (orden de carga en Apps Script):
 * Todos los .gs de un proyecto comparten un unico scope global y NO hay
 * imports. Los `const` de nivel superior de este archivo NUNCA dependen
 * de constantes definidas en otros archivos (para evitar "usada antes de
 * su definicion" segun el orden de carga). Las referencias cruzadas
 * (p.ej. a CURSOS_CANONICOS / CURSOS_INVALIDOS, definidas en
 * adapter_una.gs) solo ocurren DENTRO de cuerpos de funcion, que se
 * ejecutan en tiempo de peticion, cuando todos los archivos ya cargaron.
 */

// ============================================
// SCRIPT PROPERTIES
// ============================================
const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || 'CONFIGURAR_EN_SCRIPT_PROPERTIES';
const CORE_SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('CORE_SPREADSHEET_ID') || '';

// ============================================
// RESOLUCION DE TENANT
// ============================================

/**
 * Normaliza el codigo de universidad recibido por querystring.
 * Ausente/vacio -> 'una' (compatibilidad total con el frontend legado).
 */
function normalizeUniversidadCode_(codigo) {
  const code = (codigo || '').toString().trim().toLowerCase();
  return code || 'una';
}

/**
 * Devuelve la informacion del tenant (universidad) para el codigo dado.
 * - 'una' SIEMPRE resuelve al spreadsheet legado (SPREADSHEET_ID) con
 *   layout 'legacy', incluso si el CORE no esta configurado o no tiene
 *   la fila 'una' registrada todavia. Esto garantiza que UNA Puno nunca
 *   se caiga por un problema en el CORE.
 * - Otras universidades resuelven contra la hoja `universidades` del CORE.
 *   Devuelve null si el codigo no existe o su estado no es activa|piloto.
 *
 * @param {string} codigo
 * @returns {{codigo:string, nombre:string, nombreCorto:string, spreadsheetId:string,
 *            layout:'legacy'|'v2', estado:string, procesos:string[], cepreNombre:string,
 *            colorPrimario:string, colorSecundario:string, logo:string, orden:number}|null}
 */
function getTenant(codigo) {
  const code = normalizeUniversidadCode_(codigo);

  let registryEntry = null;
  try {
    const registro = getUniversidadesRegistro_();
    registryEntry = registro.filter(function (u) { return u.codigo === code; })[0] || null;
  } catch (err) {
    // El CORE puede no estar configurado todavia (transicion); no debe
    // afectar a 'una', y para otras universidades se traduce en "no existe".
    registryEntry = null;
  }

  if (code === 'una') {
    return {
      codigo: 'una',
      nombre: (registryEntry && registryEntry.nombre) || 'Universidad Nacional del Altiplano',
      nombreCorto: (registryEntry && registryEntry.nombreCorto) || 'UNA Puno',
      spreadsheetId: SPREADSHEET_ID, // SIEMPRE el legado, nunca depende del CORE
      layout: 'legacy',
      estado: 'activa',
      procesos: (registryEntry && registryEntry.procesos && registryEntry.procesos.length) ? registryEntry.procesos : ['ORDINARIO', 'CEPRE'],
      cepreNombre: (registryEntry && registryEntry.cepreNombre) || 'CEPREUNA',
      colorPrimario: registryEntry ? registryEntry.colorPrimario : '',
      colorSecundario: registryEntry ? registryEntry.colorSecundario : '',
      logo: registryEntry ? registryEntry.logo : '',
      orden: registryEntry ? registryEntry.orden : 0
    };
  }

  if (!registryEntry) return null;
  if (registryEntry.estado !== 'activa' && registryEntry.estado !== 'piloto') return null;
  if (!registryEntry.spreadsheetId) return null;

  return {
    codigo: registryEntry.codigo,
    nombre: registryEntry.nombre,
    nombreCorto: registryEntry.nombreCorto,
    spreadsheetId: registryEntry.spreadsheetId,
    layout: 'v2',
    estado: registryEntry.estado,
    procesos: registryEntry.procesos,
    cepreNombre: registryEntry.cepreNombre,
    colorPrimario: registryEntry.colorPrimario,
    colorSecundario: registryEntry.colorSecundario,
    logo: registryEntry.logo,
    orden: registryEntry.orden
  };
}

/**
 * Lee (con cache 30 min) la hoja `universidades` del CORE_SPREADSHEET_ID.
 * Lanza excepcion si el CORE no esta configurado o la hoja no existe;
 * los llamadores deben capturarla y degradar con gracia.
 */
function getUniversidadesRegistro_() {
  const CACHE_KEY = 'core:universidades';
  const cached = getCachedJson(CACHE_KEY);
  if (cached) return cached;

  if (!CORE_SPREADSHEET_ID) {
    throw new Error('CORE_SPREADSHEET_ID no configurado en Script Properties. Ejecuta setupCore() primero.');
  }

  const ss = SpreadsheetApp.openById(CORE_SPREADSHEET_ID);
  const sheet = ss.getSheetByName('universidades');
  if (!sheet) {
    throw new Error('Hoja "universidades" no encontrada en el spreadsheet CORE');
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0].map(function (h) { return String(h).trim(); });
  const idx = {
    codigo: headers.indexOf('codigo'),
    nombre: headers.indexOf('nombre'),
    nombreCorto: headers.indexOf('nombre_corto'),
    spreadsheetId: headers.indexOf('spreadsheet_id'),
    estado: headers.indexOf('estado'),
    procesos: headers.indexOf('procesos'),
    cepreNombre: headers.indexOf('cepre_nombre'),
    colorPrimario: headers.indexOf('color_primario'),
    colorSecundario: headers.indexOf('color_secundario'),
    logo: headers.indexOf('logo'),
    orden: headers.indexOf('orden')
  };

  const registro = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const codigo = String(row[idx.codigo] || '').trim().toLowerCase();
    if (!codigo) continue;

    registro.push({
      codigo: codigo,
      nombre: row[idx.nombre] || '',
      nombreCorto: row[idx.nombreCorto] || '',
      spreadsheetId: row[idx.spreadsheetId] || '',
      estado: String(row[idx.estado] || '').trim().toLowerCase() || 'oculta',
      procesos: String(row[idx.procesos] || '').split(',').map(function (p) { return p.trim(); }).filter(Boolean),
      cepreNombre: row[idx.cepreNombre] || '',
      colorPrimario: row[idx.colorPrimario] || '',
      colorSecundario: row[idx.colorSecundario] || '',
      logo: row[idx.logo] || '',
      orden: Number(row[idx.orden]) || 0
    });
  }

  setCachedJson(CACHE_KEY, registro, 1800);
  return registro;
}

/**
 * Action `getUniversidades`: lista publica para el selector de universidad.
 * Excluye estado='oculta'. Si el CORE no esta disponible, degrada a una
 * lista con solo 'una' para que el selector nunca quede vacio.
 */
function getUniversidadesPublicList() {
  let registro;
  try {
    registro = getUniversidadesRegistro_();
  } catch (err) {
    registro = [];
  }

  if (!registro.some(function (u) { return u.codigo === 'una'; })) {
    registro = registro.concat([{
      codigo: 'una',
      nombre: 'Universidad Nacional del Altiplano',
      nombreCorto: 'UNA Puno',
      estado: 'activa',
      procesos: ['ORDINARIO', 'CEPRE'],
      cepreNombre: 'CEPREUNA',
      colorPrimario: '',
      colorSecundario: '',
      logo: '',
      orden: 0
    }]);
  }

  return registro
    .filter(function (u) { return u.estado !== 'oculta'; })
    .sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); })
    .map(function (u) {
      return {
        codigo: u.codigo,
        nombre: u.nombre,
        nombreCorto: u.nombreCorto,
        estado: u.estado,
        procesos: u.procesos,
        cepreNombre: u.cepreNombre,
        colores: { primario: u.colorPrimario || '', secundario: u.colorSecundario || '' },
        logo: u.logo || '',
        orden: u.orden || 0
      };
    });
}

// ============================================
// CACHE NAMESPACED (<universidad>:<recurso>, TTL 1800s)
// ============================================

/** Construye una clave de cache con namespace por universidad. */
function cacheKey(universidad, recurso) {
  return normalizeUniversidadCode_(universidad) + ':' + recurso;
}

function getCachedJson(key) {
  const cached = CacheService.getScriptCache().get(key);
  return cached ? JSON.parse(cached) : null;
}

function setCachedJson(key, value, ttlSeconds) {
  CacheService.getScriptCache().put(key, JSON.stringify(value), ttlSeconds || 1800);
}

// ============================================
// CURSOS CANONICOS (CORE.cursos_canonicos con fallback a la constante legada)
// ============================================

/**
 * Carga el mapeo variante->canonico desde la hoja `cursos_canonicos` del
 * CORE (cache 30 min, clave 'core:cursos_canonicos'). Si el CORE no esta
 * configurado o la hoja no existe, cae de vuelta a la constante legada
 * CURSOS_CANONICOS (definida en adapter_una.gs) para no romper nada
 * durante la transicion.
 */
function getCursosCanonicosMap_() {
  const CACHE_KEY = 'core:cursos_canonicos';
  const cached = getCachedJson(CACHE_KEY);
  if (cached) return cached;

  let map = null;
  try {
    if (CORE_SPREADSHEET_ID) {
      const ss = SpreadsheetApp.openById(CORE_SPREADSHEET_ID);
      const sheet = ss.getSheetByName('cursos_canonicos');
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        if (data.length > 1) {
          const headers = data[0].map(function (h) { return String(h).trim().toLowerCase(); });
          const vIdx = headers.indexOf('variante');
          const cIdx = headers.indexOf('canonico');
          if (vIdx !== -1 && cIdx !== -1) {
            map = {};
            for (let i = 1; i < data.length; i++) {
              const variante = String(data[i][vIdx] || '').trim().toLowerCase();
              const canonico = String(data[i][cIdx] || '').trim();
              if (variante && canonico) map[variante] = canonico;
            }
          }
        }
      }
    }
  } catch (err) {
    map = null;
  }

  // Fallback: constante legada definida en adapter_una.gs (referencia en
  // tiempo de ejecucion de funcion, no en tiempo de carga: es segura).
  if (!map || Object.keys(map).length === 0) {
    map = CURSOS_CANONICOS;
  }

  setCachedJson(CACHE_KEY, map, 1800);
  return map;
}

/**
 * Obtiene el nombre canonico de un curso a partir de cualquiera de sus
 * variantes conocidas. Reemplaza la funcion homonima que antes vivia en
 * api.gs, ahora respaldada por la hoja `cursos_canonicos` del CORE.
 * @param {string} cursoRaw
 * @returns {string|null}
 */
function getCursoCanonical(cursoRaw) {
  if (!cursoRaw) return null;

  const normalized = normalizeString(cursoRaw);

  // CURSOS_INVALIDOS esta definida en adapter_una.gs (uso en runtime, seguro).
  if (CURSOS_INVALIDOS.indexOf(normalized) !== -1) {
    return null;
  }

  const map = getCursosCanonicosMap_();
  if (map[normalized]) {
    return map[normalized];
  }

  // Si no esta en el mapeo, se conserva el valor original (tal como hacia api.gs).
  return cursoRaw.toString().trim();
}

// ============================================
// UTILIDADES GENERICAS (sin dependencia de hojas)
// ============================================

// Rango Unicode de marcas diacriticas combinantes (U+0300-U+036F), construido
// via String.fromCharCode para evitar incrustar el caracter literal en el
// codigo fuente (evita problemas de codificacion al copiar/pegar el archivo).
const DIACRITICS_REGEX_ = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

/** Normaliza un string para comparaciones (sin tildes, minusculas, sin espacios extra). */
function normalizeString(str) {
  if (!str) return '';
  return str.toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS_REGEX_, '')
    .replace(/_/g, ' ')
    .trim();
}

/** Mezcla un array usando el algoritmo Fisher-Yates. */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Selecciona N elementos aleatorios de un array (Fisher-Yates + slice). */
function selectRandomItems(array, count) {
  if (count >= array.length) {
    return shuffleArray(array);
  }
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, count);
}

/**
 * Formatea un valor de celda, corrigiendo fechas mal interpretadas por
 * Excel/Sheets (p.ej. "1-10" interpretado como fecha 1 de Octubre) y
 * algunas fracciones comunes.
 */
function formatCellValue(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (value instanceof Date) {
    const day = value.getDate();
    const month = value.getMonth() + 1;
    return `${day}-${month}`;
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return String(value);
    }
    const fractions = {
      0.5: '1/2', 0.25: '1/4', 0.75: '3/4',
      0.333: '1/3', 0.667: '2/3', 0.2: '1/5',
      0.4: '2/5', 0.6: '3/5', 0.8: '4/5'
    };
    for (const [decimal, fraction] of Object.entries(fractions)) {
      if (Math.abs(value - parseFloat(decimal)) < 0.01) {
        return fraction;
      }
    }
    return String(value);
  }

  return value;
}
