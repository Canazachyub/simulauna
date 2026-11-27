/**
 * BANQUEO GENERAL — practicar con preguntas de TODAS las universidades
 * ============================================
 * Banco: «SimulaUNA - BANCO GENERAL» (F:\PERU SINAPSIS\BANCO_APP\exportar_banco_general.py): una hoja
 * Banco_<curso> por cada curso de base del banqueo (Aritmética … Razonamiento Verbal) con la columna
 * UNIVERSIDAD (una, unsa, sanmarcos, uni, unt, unc, uncp).
 *
 * Acciones (main.gs → ROUTES):
 *   getResumenGeneral  ?origen=<codigo|todas>  → universidades con su total + cursos con temas y totales
 *   getBanqueoGeneral  ?course&count&origen[&tema] (+dni,email) → preguntas para el banqueo
 *
 * Acceso (decisión del dueño, 2026-11-27): quien tenga banqueo o banqueo por tema activo en CUALQUIER
 * universidad puede practicar con todas y con el mix.
 */

const BANCO_GENERAL_ID_ = '1efOwCspxSzz9_jSNPcxQYDWpYkoRuepNFjsMyK5imos';
const CURSOS_GENERAL_ = ['Aritmética', 'Álgebra', 'Geometría', 'Trigonometría', 'Física', 'Química',
  'Biología y Anatomía', 'Psicología y Filosofía', 'Geografía', 'Historia', 'Educación Cívica', 'Economía',
  'Comunicación', 'Literatura', 'Razonamiento Matemático', 'Razonamiento Verbal', 'Inglés', 'Quechua y aimara'];
const SIGLAS_GENERAL_ = { una: 'UNA Puno', unsa: 'UNSA', sanmarcos: 'San Marcos', uni: 'UNI', unt: 'UNT', unc: 'UNC', uncp: 'UNCP' };

// Banqueo mix: nivel por exigencia de la universidad (decisión del dueño, 2026-11-27).
const NIVELES_GENERAL_ = {
  basico: ['una', 'unsa', 'unt', 'unc', 'uncp'],
  intermedio: ['sanmarcos'],
  avanzado: ['uni']
};
const ORDEN_NIVELES_ = ['basico', 'intermedio', 'avanzado'];

function nivelDe_(u) {
  return ORDEN_NIVELES_.filter(function (n) { return NIVELES_GENERAL_[n].indexOf(u) !== -1; })[0] || 'basico';
}

/** Tema normalizado para emparejar el mismo tema entre universidades (sin tildes, numeración ni plurales). */
function temaClave_(t) {
  return normalizeString(String(t || '').replace(/^[IVXLC]+\.\s*/, ''))
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\b(de|del|la|las|el|los|y|e|en|a|al|por|para)\b/g, ' ')
    .replace(/\b(\w+?)([lrndzjy])es\b/g, '$1$2').replace(/(\w)s\b/g, '$1').replace(/\s+/g, ' ').trim();
}

/** ¿Mismo tema? Igual o uno contiene al otro (p. ej. «Ecuaciones» ~ «Ecuaciones cuadráticas»). */
function temasConcuerdan_(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const corto = a.length < b.length ? a : b;
  const largo = a.length < b.length ? b : a;
  return corto.length >= 5 && (' ' + largo + ' ').indexOf(' ' + corto + ' ') !== -1;
}

let bancoGeneralSs_ = null;
function bancoGeneralSs_get_() {
  if (!bancoGeneralSs_) bancoGeneralSs_ = SpreadsheetApp.openById(BANCO_GENERAL_ID_);
  return bancoGeneralSs_;
}

function origenGeneral_(valor) {
  const o = String(valor || 'todas').trim().toLowerCase();
  return SIGLAS_GENERAL_[o] ? o : 'todas';
}

/** Filas servibles de un curso: {ci, iUni, filas: [fila]} (ESTADO activa, clave 1-5 con texto). */
function filasGeneral_(curso) {
  const data = leerHojaBancoCacheada_(bancoGeneralSs_get_(), 'Banco_' + curso) || [];
  if (data.length <= 1) return { ci: null, iUni: -1, filas: [] };
  const headers = data[0];
  const ci = v2ColIndices_(headers);
  const iUni = headers.indexOf('UNIVERSIDAD');
  const filas = [];
  for (let i = 1; i < data.length; i++) {
    const f = data[i];
    if (!f[ci.questionText]) continue;
    if (ci.estado !== -1 && String(f[ci.estado] || '').trim().toLowerCase() !== 'activa') continue;
    const ok = buildOptionsWithAnswer_([
      formatCellValue(f[ci.option1]), formatCellValue(f[ci.option2]), formatCellValue(f[ci.option3]),
      formatCellValue(f[ci.option4]), formatCellValue(f[ci.option5])
    ], f[ci.correctAnswer]).valid;
    if (ok) filas.push(f);
  }
  return { ci: ci, iUni: iUni, filas: filas };
}

/** Conteos por curso, tema y universidad (caché 6 h, se renueva con limpiarCacheBancos). */
function resumenGeneral_() {
  const ver = PropertiesService.getScriptProperties().getProperty('BANCO_CACHE_VER') || '0';
  // 6 h (máximo de CacheService): el banco solo cambia al importar, y limpiarCacheBancos cambia `ver`.
  return getOrBuildCachedJson_('gen:resumen:' + ver, 21600, function () {
    const cursos = {};
    CURSOS_GENERAL_.forEach(function (curso) {
      const g = filasGeneral_(curso);
      const porUni = {};
      const temas = {};
      g.filas.forEach(function (f) {
        const u = String(f[g.iUni] || '').trim().toLowerCase();
        porUni[u] = (porUni[u] || 0) + 1;
        const tema = String(f[g.ci.tema] || '').replace(/^[IVXLC]+\.\s*/, '').trim();
        if (!tema) return;
        temas[tema] = temas[tema] || {};
        temas[tema][u] = (temas[tema][u] || 0) + 1;
      });
      cursos[curso] = { porUni: porUni, temas: temas };
    });
    return cursos;
  });
}

/**
 * Modalidad del banqueo general:
 *   modo=mio  → solo preguntas de `origen` (la universidad que el alumno tiene seleccionada).
 *   modo=mix  → preguntas al azar de las OTRAS universidades, del tema equivalente, por nivel:
 *               nivel = basico | intermedio | avanzado | progresivo (de fácil a difícil).
 */
function modoGeneral_(params) {
  const origen = origenGeneral_(params.origen);
  const mix = String(params.modo || '').toLowerCase() === 'mix' || origen === 'todas';
  const nivel = ['basico', 'intermedio', 'avanzado'].indexOf(String(params.nivel || '').toLowerCase()) !== -1
    ? String(params.nivel).toLowerCase() : 'progresivo';
  const permitidas = function (u) {
    if (!mix) return u === origen;
    if (u === origen) return false;
    return nivel === 'progresivo' || NIVELES_GENERAL_[nivel].indexOf(u) !== -1;
  };
  return { origen: origen, mix: mix, nivel: nivel, permitidas: permitidas };
}

function handleGetResumenGeneral_(ctx) {
  const m = modoGeneral_(ctx.params);
  const res = resumenGeneral_();
  const suma = function (mapa) {
    return Object.keys(mapa).reduce(function (a, u) { return a + (m.permitidas(u) ? mapa[u] : 0); }, 0);
  };
  const universidades = {};
  const cursos = CURSOS_GENERAL_.map(function (curso) {
    const c = res[curso] || { porUni: {}, temas: {} };
    Object.keys(c.porUni).forEach(function (u) { universidades[u] = (universidades[u] || 0) + c.porUni[u]; });
    let temas;
    if (!m.mix) {
      temas = Object.keys(c.temas).map(function (t) { return { tema: t, totalPreguntas: suma(c.temas[t]) }; });
    } else {
      // Temas con los nombres de MI universidad; el total cuenta los temas equivalentes de las otras.
      const propios = Object.keys(c.temas).filter(function (t) { return (c.temas[t][m.origen] || 0) > 0; });
      const lista = propios.length ? propios : Object.keys(c.temas);
      const claves = Object.keys(c.temas).map(function (t) { return { k: temaClave_(t), mapa: c.temas[t] }; });
      temas = lista.map(function (t) {
        const k = temaClave_(t);
        const total = claves.reduce(function (a, x) { return a + (temasConcuerdan_(k, x.k) ? suma(x.mapa) : 0); }, 0);
        return { tema: t, totalPreguntas: total };
      });
    }
    temas = temas.filter(function (t) { return t.totalPreguntas > 0; })
      .sort(function (a, b) { return b.totalPreguntas - a.totalPreguntas || a.tema.localeCompare(b.tema); });
    return { curso: curso, totalPreguntas: suma(c.porUni), temas: temas };
  }).filter(function (c) { return c.totalPreguntas > 0; });
  return {
    origen: m.origen,
    modo: m.mix ? 'mix' : 'mio',
    nivel: m.mix ? m.nivel : undefined,
    universidades: Object.keys(SIGLAS_GENERAL_).filter(function (u) { return universidades[u]; })
      .map(function (u) { return { codigo: u, nombre: SIGLAS_GENERAL_[u], totalPreguntas: universidades[u], nivel: nivelDe_(u) }; }),
    cursos: cursos
  };
}

function handleGetBanqueoGeneral_(ctx) {
  const curso = String(ctx.params.course || '').trim();
  if (CURSOS_GENERAL_.indexOf(curso) === -1) throw publicError_('Curso no válido');
  const tema = String(ctx.params.tema || '').trim();
  enforcePracticaGeneral_(ctx, tema ? 'banqueo_tema' : 'banqueo');

  const m = modoGeneral_(ctx.params);
  const g = filasGeneral_(curso);
  const kTema = tema ? temaClave_(tema) : '';
  const pool = g.filas.filter(function (f) {
    if (!m.permitidas(String(f[g.iUni] || '').trim().toLowerCase())) return false;
    if (!tema) return true;
    const t = String(f[g.ci.tema] || '').replace(/^[IVXLC]+\.\s*/, '').trim();
    return m.mix ? temasConcuerdan_(kTema, temaClave_(t)) : t === tema;
  });
  // Tope 20 por pedido (la web ofrece 10/15/20): evita bajar el banco en bloque.
  const n = Math.min(clampCount_(ctx.params.count, 10, 20), pool.length);

  let elegidas;
  if (m.mix && m.nivel === 'progresivo') {
    // Progresivo: un tercio por nivel (lo que falte se completa con los otros) y de fácil a difícil.
    const porNivel = { basico: [], intermedio: [], avanzado: [] };
    pool.forEach(function (f) { porNivel[nivelDe_(String(f[g.iUni] || '').trim().toLowerCase())].push(f); });
    const cupo = Math.ceil(n / 3);
    elegidas = [];
    ORDEN_NIVELES_.forEach(function (nv) { elegidas = elegidas.concat(selectRandomItems(porNivel[nv], Math.min(cupo, porNivel[nv].length))); });
    if (elegidas.length > n) elegidas = elegidas.slice(0, n);
    if (elegidas.length < n) {
      const usadas = elegidas.slice();
      const resto = pool.filter(function (f) { return usadas.indexOf(f) === -1; });
      elegidas = elegidas.concat(selectRandomItems(resto, n - elegidas.length));
    }
    elegidas.sort(function (a, b) {
      return ORDEN_NIVELES_.indexOf(nivelDe_(String(a[g.iUni] || '').trim().toLowerCase())) -
        ORDEN_NIVELES_.indexOf(nivelDe_(String(b[g.iUni] || '').trim().toLowerCase()));
    });
  } else {
    elegidas = selectRandomItems(pool, n);
  }

  const etiquetasNivel = { basico: 'Básico', intermedio: 'Intermedio', avanzado: 'Avanzado' };
  const questions = renumberQuestions_(elegidas.map(function (f, i) {
    const q = v2FormatQuestion_(f, g.ci, curso, i + 1, 0);
    if (!q) return null;
    const u = String(f[g.iUni] || '').trim().toLowerCase();
    const sigla = SIGLAS_GENERAL_[u] || u.toUpperCase();
    q.universidad = u;
    q.metadata = q.metadata || {};
    q.metadata.universidad = sigla;
    q.metadata.nivel = etiquetasNivel[nivelDe_(u)];
    // Que el examen de origen diga de qué universidad es (los de UNA no lo traen en el nombre) y,
    // en el mix, su nivel.
    const examen = String(q.sourceFile || '');
    let fuente = examen.toUpperCase().indexOf(sigla.toUpperCase().split(' ')[0]) === -1 ? sigla + ' · ' + examen : examen;
    if (m.mix) fuente = q.metadata.nivel + ' · ' + fuente;
    q.sourceFile = fuente;
    return q;
  }).filter(Boolean), 1);

  return { course: curso, tema: tema || undefined, origen: m.origen, modo: m.mix ? 'mix' : 'mio',
    nivel: m.mix ? m.nivel : undefined, totalQuestions: questions.length, totalAvailable: pool.length, questions: questions };
}

/** ¿Tiene banqueo (o por tema) activo en alguna universidad? Incluye las listas legadas de UNA. */
function accesoPracticaGeneral_(dni, email) {
  const dniStr = String(dni || '').trim();
  const emailLower = String(email || '').toLowerCase().trim();
  if (!dniStr) return { canAccess: false, reason: 'DNI requerido' };
  if (emailLower) {
    const dueno = dniEmailOwnership_('una', dniStr, emailLower);
    if (dueno === 'error') return { canAccess: false, reason: MSG_VERIFICACION_NO_DISPONIBLE_ };
    if (dueno === 'mismatch') return { canAccess: false, reason: 'DNI y email no coinciden con el usuario registrado' };
  }
  const ok = checkPermiso_('*', dniStr, 'banqueo') || checkPermiso_('*', dniStr, 'banqueo_tema') ||
    isConfirmadoLegacy_(dniStr, emailLower) || isAccesoBanqueoLegacy_(dniStr, emailLower);
  return ok
    ? { canAccess: true, reason: 'Acceso autorizado', isConfirmed: true }
    : { canAccess: false, reason: 'El banqueo es exclusivo para usuarios inscritos. Escríbenos por WhatsApp para activarlo.', isConfirmed: false };
}

function enforcePracticaGeneral_(ctx, modalidad) {
  if (!getFlag_('ENFORCE_ACCESS_SERVER', false)) return;
  const dni = String(ctx.params.dni || '').trim();
  const email = String(ctx.params.email || '').toLowerCase().trim();
  if (!dni || !email) throw publicError_('Ingresa con tu DNI y correo para practicar.');
  const clave = ('accg|' + dni + '|' + email).substring(0, 250);
  let cache = null;
  try { cache = CacheService.getScriptCache(); } catch (err) { cache = null; }
  if (cache && cache.get(clave) === '1') return;
  const acceso = accesoPracticaGeneral_(dni, email);
  if (!acceso.canAccess) throw publicError_(acceso.reason);
  if (cache) { try { cache.put(clave, '1', 600); } catch (err) { /* nada */ } }
}
