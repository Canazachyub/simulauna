/**
 * IMPORTAR UN BANCO OFICIAL A UNA UNIVERSIDAD (layout v2)
 * ============================================
 * Origen: IMPORTAR_<U>_OFICIAL.xlsx (F:\PERU SINAPSIS\BANCO_APP\mapear_oficial.py) subido a Drive
 * y convertido a Google Sheets. Cada pestaña (B01, B02…) es un curso OFICIAL de config_examen; el
 * nombre del curso va en la columna CURSO.
 *
 * Destino: el spreadsheet de la universidad en CORE.universidades. Por cada pestaña de origen se
 * escribe la hoja `Banco_<CURSO>` (si ya existía se reemplaza en la misma posición). Las hojas
 * Banco_ viejas que el banco nuevo ya no usa: si están vacías (solo encabezado) se eliminan; si
 * tienen preguntas NO se borran, se renombran `RESPALDO_<fecha>_Banco_…` (el backend solo lee
 * hojas que empiezan con `Banco_`).
 *
 * Uso: ejecutar importarBancosOficiales() (todas) o importarBanco<U>() en el editor.
 */

// Origen de cada universidad: IMPORTAR_<U>_OFICIAL subido a Drive (dueño canazach12, lectura camaleonse).
const BANCOS_OFICIALES_ = {
  unsa: '1b5sFyN7B8bQBi_5bQxqSEIrbj0SgXaytxlsYI2yQyc0',
  sanmarcos: '1NAneYZQjBYkUZ63PTcUc-l2IQqw2qgaBZZmtUrC2t90',
  unt: '1zcYnTMCe3pO7QjjftKeFUhPPUVlyeYnlLMFGCBWkTXU',
  unc: '1rOzCSs85s2bWycACiSHjSIH2G6hzshXCVE54XVZ7bhE',
  uncp: '1UszKwSVwbWDvKP6sOZ3Sj16-kqxv8MoFmLiHdhNl-Cw'
};

/** Importa todos los bancos oficiales y limpia la caché una vez. Si se corta por tiempo, volver a ejecutar. */
function importarBancosOficiales() {
  const inicio = Date.now();
  Object.keys(BANCOS_OFICIALES_).forEach(function (codigo) {
    if (Date.now() - inicio > 4.5 * 60 * 1000) { Logger.log('⏸ Falta ' + codigo + ': vuelve a ejecutar.'); return; }
    importarBancoOficial_(codigo, BANCOS_OFICIALES_[codigo], true);
  });
  limpiarCacheBancos();
}

function importarBancoUNSA() { importarBancoOficial_('unsa', BANCOS_OFICIALES_.unsa); }
function importarBancoSanMarcos() { importarBancoOficial_('sanmarcos', BANCOS_OFICIALES_.sanmarcos); }
function importarBancoUNT() { importarBancoOficial_('unt', BANCOS_OFICIALES_.unt); }
function importarBancoUNC() { importarBancoOficial_('unc', BANCOS_OFICIALES_.unc); }
function importarBancoUNCP() { importarBancoOficial_('uncp', BANCOS_OFICIALES_.uncp); }

function importarBancoOficial_(codigo, origenId, sinLimpiarCache) {
  if (codigo === 'una') throw new Error('UNA usa su propio importador (hojas legadas).');
  const tenant = tenantDelRegistro_(codigo);

  const src = SpreadsheetApp.openById(origenId);
  const dst = SpreadsheetApp.openById(tenant.spreadsheetId);
  const fecha = Utilities.formatDate(new Date(), 'America/Lima', 'yyyyMMdd');
  const log = [];
  const nuevas = {};

  src.getSheets().forEach(function (s) {
    if (s.getLastRow() < 2) {
      log.push('· ' + s.getName() + ': sin preguntas, se salta');
      return;
    }
    const valores = s.getRange(1, 1, 2, s.getLastColumn()).getValues();
    const iCurso = valores[0].indexOf('CURSO');
    if (iCurso === -1) {
      log.push('· ' + s.getName() + ': sin columna CURSO, se salta');
      return;
    }
    const nombre = 'Banco_' + String(valores[1][iCurso]).trim();
    const vieja = dst.getSheetByName(nombre);
    const pos = vieja ? vieja.getIndex() : dst.getSheets().length + 1;
    const nueva = s.copyTo(dst);
    if (vieja) dst.deleteSheet(vieja);
    nueva.setName(nombre);
    dst.setActiveSheet(nueva);
    dst.moveActiveSheet(pos);
    nuevas[nombre] = true;
    log.push('✓ ' + nombre + ': ' + (nueva.getLastRow() - 1) + ' preguntas');
  });

  dst.getSheets().forEach(function (s) {
    const n = s.getName();
    if (n.indexOf('Banco_') !== 0 || nuevas[n]) return;
    if (s.getLastRow() <= 1) {
      dst.deleteSheet(s); // vacía (solo encabezado, p. ej. la creó cargarPilotoOrdinario): nada que guardar
      log.push('− ' + n + ' (vacía) eliminada');
    } else {
      s.setName(('RESPALDO_' + fecha + '_' + n).substring(0, 99));
      log.push('↺ ' + n + ' → renombrada como respaldo (ya no se usa)');
    }
  });

  Logger.log('Banco ' + codigo.toUpperCase() + ' importado en ' + dst.getName() + '\n' + log.join('\n'));
  if (!sinLimpiarCache) limpiarCacheBancos();
}

/** Tenant v2 desde CORE.universidades aunque esté 'oculta' (getTenant solo da activas/piloto). */
function tenantDelRegistro_(codigo) {
  const u = getUniversidadesRegistro_().filter(function (x) { return x.codigo === codigo; })[0];
  if (!u || !u.spreadsheetId) throw new Error('Universidad no registrada en CORE.universidades: ' + codigo);
  return { codigo: u.codigo, nombre: u.nombre, nombreCorto: u.nombreCorto, spreadsheetId: u.spreadsheetId, layout: 'v2', estado: u.estado };
}

/**
 * Arma un examen de prueba por cada área de cada universidad con banco oficial (también las
 * ocultas) y registra: preguntas por curso frente a las que pide la calificación, total, repetidas.
 * No guarda sesiones ni toca nada: solo lee.
 */
function revisarExamenesOficiales() {
  const log = [];
  Object.keys(BANCOS_OFICIALES_).forEach(function (codigo) {
    try {
      const tenant = tenantDelRegistro_(codigo);
      const filas = v2ReadConfigExamen_(tenant, 'ORDINARIO');
      const divisiones = filas.map(function (r) { return r.division; }).filter(function (d, i, a) { return a.indexOf(d) === i; });
      divisiones.forEach(function (div) {
        const pide = {};
        filas.filter(function (r) { return r.division === div; }).forEach(function (r) { pide[r.curso] = (pide[r.curso] || 0) + r.nPreguntas; });
        const pool = buildExamPoolForTenant(tenant, div, 'ORDINARIO');
        const hay = {};
        pool.questions.forEach(function (q) { hay[q.subject] = (hay[q.subject] || 0) + 1; });
        const ids = {};
        pool.questions.forEach(function (q) { ids[q.id] = true; });
        const faltan = Object.keys(pide).filter(function (c) { return (hay[c] || 0) < pide[c]; })
          .map(function (c) { return c + ' ' + (hay[c] || 0) + '/' + pide[c]; });
        const total = Object.keys(pide).reduce(function (a, c) { return a + pide[c]; }, 0);
        log.push((faltan.length ? '⚠ ' : '✓ ') + codigo + ' · ' + div + ': ' + pool.questions.length + '/' + total + ' preguntas, ' +
          Object.keys(ids).length + ' distintas' + (faltan.length ? ' · incompletos: ' + faltan.join(', ') : ''));
      });
    } catch (err) {
      log.push('✗ ' + codigo + ': ' + (err && err.message ? err.message : err));
    }
  });
  Logger.log(log.join('\n'));
}

/**
 * Publica como Beta (estado 'piloto') las universidades con banco oficial listo. Solo cambia la
 * columna `estado` de CORE.universidades; para ocultarlas otra vez, poner 'oculta' a mano.
 */
function publicarUniversidadesBeta() {
  const codigos = ['sanmarcos', 'unt', 'unc', 'uncp'];
  const registro = pilotoHojaRegistro_(SpreadsheetApp.openById(CORE_SPREADSHEET_ID));
  const log = [];
  codigos.forEach(function (codigo) {
    const fila = pilotoBuscarFila_(registro, codigo);
    if (!fila) { log.push('✗ ' + codigo + ': no está en el registro'); return; }
    const antes = String(fila.valores[registro.idx.estado] || '');
    registro.sheet.getRange(fila.numero, registro.idx.estado + 1).setValue('piloto');
    log.push('✓ ' + codigo + ': ' + antes + ' → piloto');
  });
  try { CacheService.getScriptCache().remove('core:universidades'); } catch (err) { /* nada */ }
  Logger.log(log.join('\n'));
}
