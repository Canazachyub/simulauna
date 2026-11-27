/**
 * IMPORTAR UN BANCO OFICIAL A UNA UNIVERSIDAD (layout v2)
 * ============================================
 * Origen: IMPORTAR_<U>_OFICIAL.xlsx (F:\PERU SINAPSIS\BANCO_APP\mapear_oficial.py) subido a Drive
 * y convertido a Google Sheets. Cada pestaña (B01, B02…) es un curso OFICIAL de config_examen; el
 * nombre del curso va en la columna CURSO.
 *
 * Destino: el spreadsheet de la universidad en CORE.universidades. Por cada pestaña de origen se
 * escribe la hoja `Banco_<CURSO>` (si ya existía se reemplaza en la misma posición). Las hojas
 * Banco_ viejas que el banco nuevo ya no usa NO se borran: se renombran `RESPALDO_<fecha>_Banco_…`
 * (el backend solo lee hojas que empiezan con `Banco_`).
 *
 * Uso: poner el id del spreadsheet de origen en la función de la universidad y ejecutarla en el
 * editor. Al final limpia la caché de bancos.
 */

function importarBancoUNSA() {
  importarBancoOficial_('unsa', '1S7jKSZ8p8RG6uqwHwCNYJ5bLLmk3Vu0CD5jl3O-GMts');
}

function importarBancoOficial_(codigo, origenId) {
  const tenant = getTenant(codigo);
  if (!tenant || !tenant.spreadsheetId) throw new Error('Universidad no registrada: ' + codigo);
  if (tenant.layout === 'legacy') throw new Error('UNA usa su propio importador (hojas legadas).');

  const src = SpreadsheetApp.openById(origenId);
  const dst = SpreadsheetApp.openById(tenant.spreadsheetId);
  const fecha = Utilities.formatDate(new Date(), 'America/Lima', 'yyyyMMdd');
  const log = [];
  const nuevas = {};

  src.getSheets().forEach(function (s) {
    const valores = s.getRange(1, 1, Math.min(2, s.getLastRow()), s.getLastColumn()).getValues();
    const iCurso = valores[0].indexOf('CURSO');
    if (iCurso === -1 || valores.length < 2) {
      log.push('· ' + s.getName() + ': sin columna CURSO o vacía, se salta');
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
    if (n.indexOf('Banco_') === 0 && !nuevas[n]) {
      s.setName(('RESPALDO_' + fecha + '_' + n).substring(0, 99));
      log.push('↺ ' + n + ' → renombrada como respaldo (ya no se usa)');
    }
  });

  Logger.log('Banco ' + codigo.toUpperCase() + ' importado en ' + dst.getName() + '\n' + log.join('\n'));
  limpiarCacheBancos();
}
