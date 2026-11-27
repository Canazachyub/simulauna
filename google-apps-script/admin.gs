/**
 * SimulaUNA / Sinapsis Preu - PANEL DE ADMINISTRACIÓN (2026-11-26)
 * ============================================
 * Página para dar y quitar acceso a los alumnos por universidad y servicio, con planes y vencimiento.
 *
 * SEGURIDAD (doble candado):
 *  1. Se publica en una IMPLEMENTACIÓN APARTE del mismo proyecto con «Ejecutar como: usuario que accede»
 *     y «Acceso: cualquier usuario con cuenta de Google». Así Google identifica a quien entra y el panel
 *     opera con SUS permisos: si su cuenta no tiene acceso al Sheets, no puede leer ni escribir nada.
 *  2. Lista blanca ADMIN_EMAILS (Script Property, separada por comas). Cualquier otra cuenta ve «Sin acceso».
 *     En la implementación de la API (que corre como la dueña) quien entra es anónimo → «Sin acceso».
 *
 * DATOS: CORE.permisos  dni | universidad | modalidad | estado | fecha | vence | plan | otorgado_por | nota
 *        (las 4 últimas columnas se crean solas). users.gs/checkPermiso_ respeta `vence` y universidad 'todas'.
 *        En UNA, las hojas viejas `confirmado` / `acceso_banqueo` se MIGRAN a `permisos` la primera vez que
 *        se toca a ese alumno desde el panel (para que quitar un servicio realmente lo quite).
 */

const ADMIN_SERVICIOS_ = [
  { id: 'simulacro', nombre: 'Simulacro ilimitado' },
  { id: 'banqueo', nombre: 'Banqueo histórico' },
  { id: 'banqueo_tema', nombre: 'Banqueo por tema' },
  { id: 'cepre', nombre: 'CEPRE por semanas' },
  { id: 'aula', nombre: 'Aula virtual' },
];
const ADMIN_PLANES_ = [
  { id: 'simulacros', nombre: 'Simulacros', servicios: ['simulacro'] },
  { id: 'practica', nombre: 'Práctica', servicios: ['banqueo', 'banqueo_tema'] },
  { id: 'cepre', nombre: 'CEPRE', servicios: ['cepre'] },
  { id: 'completo', nombre: 'Completo', servicios: ['simulacro', 'banqueo', 'banqueo_tema', 'cepre', 'aula'] },
];
const ADMIN_PERMISOS_HEADERS_ = ['dni', 'universidad', 'modalidad', 'estado', 'fecha', 'vence', 'plan', 'otorgado_por', 'nota'];

// ---------------------------------------------------------------- acceso
function adminEmails_() {
  const raw = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS') ||
    'camaleonse@gmail.com,canazach12@gmail.com';
  return raw.split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
}

/** Correo del admin o lanza. Exige que la ejecución sea «como el usuario que accede». */
function adminAssert_() {
  const activo = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  const efectivo = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (!activo || activo !== efectivo || adminEmails_().indexOf(activo) === -1) {
    throw new Error('Sin acceso al panel de administración.');
  }
  return activo;
}

/** Entrada web: doGet(e) con ?vista=admin (ver main.gs). */
function adminServe_() {
  let email = '';
  try { email = adminAssert_(); } catch (err) {
    const quien = String(Session.getActiveUser().getEmail() || '');
    return HtmlService.createHtmlOutput(
      '<div style="font:16px system-ui;padding:40px;text-align:center"><h2>Sin acceso</h2>' +
      '<p>Esta página es solo para administradores de Sinapsis Preu.</p>' +
      '<p style="color:#64748b;font-size:13px">Cuenta detectada: ' + (quien ? quien.replace(/[<>&"]/g, '') : '(ninguna)') + '</p></div>')
      .setTitle('Sin acceso');
  }
  const t = HtmlService.createTemplateFromFile('admin');
  t.adminEmail = email;
  return t.evaluate().setTitle('Sinapsis Preu · Administración')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---------------------------------------------------------------- utilidades
function adminCore_() { return SpreadsheetApp.openById(CORE_SPREADSHEET_ID); }

function adminHoja_(ss, nombre) {
  const sh = ss.getSheetByName(nombre);
  if (!sh) return { sh: null, data: [], h: {} };
  const data = sh.getDataRange().getValues();
  const h = {};
  (data[0] || []).forEach(function (c, i) { h[String(c).trim().toLowerCase()] = i; });
  return { sh: sh, data: data, h: h };
}

function adminPermisosSheet_() {
  const ss = adminCore_();
  let sh = ss.getSheetByName('permisos');
  if (!sh) {
    sh = ss.insertSheet('permisos');
    sh.appendRow(ADMIN_PERMISOS_HEADERS_);
    sh.getRange(1, 1, 1, ADMIN_PERMISOS_HEADERS_.length).setFontWeight('bold');
    return sh;
  }
  const cab = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0]
    .map(function (c) { return String(c).trim().toLowerCase(); });
  ADMIN_PERMISOS_HEADERS_.forEach(function (col) {
    if (cab.indexOf(col) === -1) {
      sh.getRange(1, sh.getLastColumn() + 1).setValue(col).setFontWeight('bold');
      cab.push(col);
    }
  });
  return sh;
}

function adminFecha_(v) {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? String(v) : Utilities.formatDate(d, 'America/Lima', 'yyyy-MM-dd');
}

function adminHoy_() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }

function adminVigente_(estado, vence) {
  const e = String(estado || '').toLowerCase();
  if (e === 'revocado' || e === 'inactivo') return false;
  if (!vence) return true;
  const d = vence instanceof Date ? vence : new Date(vence);
  return isNaN(d.getTime()) || adminFecha_(d) >= adminFecha_(new Date()); // por fecha, hora de Lima
}

function adminLimpiarDni_(dni) {
  const s = String(dni || '').replace(/\D/g, '');
  if (!/^\d{8}$/.test(s)) throw new Error('El DNI debe tener 8 dígitos.');
  return s;
}

// ---------------------------------------------------------------- lectura
function adminInfo() {
  const email = adminAssert_();
  const u = adminHoja_(adminCore_(), 'universidades');
  const universidades = u.data.slice(1).filter(function (r) { return r[u.h.codigo]; }).map(function (r) {
    return { codigo: String(r[u.h.codigo]).trim().toLowerCase(), nombre: String(r[u.h.nombre_corto] || r[u.h.nombre] || r[u.h.codigo]),
      estado: String(r[u.h.estado] || '') };
  });
  return { email: email, universidades: universidades, servicios: ADMIN_SERVICIOS_, planes: ADMIN_PLANES_ };
}

/** Todos los alumnos (CORE.usuarios + usuarios legado de UNA), fusionados por DNI. */
function adminUsuarios_() {
  const porDni = {};
  const core = adminHoja_(adminCore_(), 'usuarios');
  core.data.slice(1).forEach(function (r) {
    const dni = String(r[core.h.dni] || '').trim(); if (!dni) return;
    porDni[dni] = { dni: dni, nombre: String(r[core.h.nombre] || ''), email: String(r[core.h.email] || ''),
      celular: String(r[core.h.celular] || ''), fecha: adminFecha_(r[core.h.fecha]), origen: 'core' };
  });
  const una = adminHoja_(SpreadsheetApp.openById(SPREADSHEET_ID), 'usuarios');
  una.data.slice(1).forEach(function (r) {
    const dni = String(r[una.h.dni] || '').trim(); if (!dni) return;
    const prev = porDni[dni] || {};
    porDni[dni] = { dni: dni, nombre: prev.nombre || String(r[una.h.nombre] || ''), email: prev.email || String(r[una.h.email] || ''),
      celular: prev.celular || String(r[una.h.celular] || ''), fecha: prev.fecha || adminFecha_(r[una.h.fecha]),
      area: String(r[una.h['área']] || r[una.h.area] || ''), carrera: String(r[una.h.carrera] || ''), origen: prev.origen || 'una' };
  });
  return porDni;
}

function adminPermisosPorDni_() {
  const p = adminHoja_(adminCore_(), 'permisos');
  const out = {};
  p.data.slice(1).forEach(function (r, i) {
    const dni = String(r[p.h.dni] || '').trim(); if (!dni) return;
    const vence = p.h.vence !== undefined ? r[p.h.vence] : '';
    (out[dni] = out[dni] || []).push({
      fila: i + 2, universidad: String(r[p.h.universidad] || '').toLowerCase(), modalidad: String(r[p.h.modalidad] || '').toLowerCase(),
      estado: String(r[p.h.estado] || ''), fecha: adminFecha_(r[p.h.fecha]), vence: adminFecha_(vence),
      plan: p.h.plan !== undefined ? String(r[p.h.plan] || '') : '', otorgadoPor: p.h.otorgado_por !== undefined ? String(r[p.h.otorgado_por] || '') : '',
      nota: p.h.nota !== undefined ? String(r[p.h.nota] || '') : '', vigente: adminVigente_(r[p.h.estado], vence),
    });
  });
  return out;
}

function adminLegado_(dni) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const enHoja = function (nombre) {
    const t = adminHoja_(ss, nombre);
    const c = t.h.dni !== undefined ? t.h.dni : 0;
    return t.data.slice(1).some(function (r) { return String(r[c] || '').trim() === dni; });
  };
  return { confirmado: enHoja('confirmado'), accesoBanqueo: enHoja('acceso_banqueo') };
}

function adminBuscar(q) {
  adminAssert_();
  const texto = String(q || '').trim().toLowerCase();
  const usuarios = adminUsuarios_();
  const permisos = adminPermisosPorDni_();
  let lista = Object.keys(usuarios).map(function (d) { return usuarios[d]; });
  Object.keys(permisos).forEach(function (d) { if (!usuarios[d]) lista.push({ dni: d, nombre: '(sin registro)', email: '', origen: 'permiso' }); });
  if (texto) {
    lista = lista.filter(function (u) {
      return u.dni.indexOf(texto) !== -1 || String(u.nombre).toLowerCase().indexOf(texto) !== -1 ||
        String(u.email).toLowerCase().indexOf(texto) !== -1;
    });
  }
  lista.sort(function (a, b) { return String(b.fecha || '').localeCompare(String(a.fecha || '')); });
  return lista.slice(0, 60).map(function (u) {
    const ps = (permisos[u.dni] || []).filter(function (p) { return p.vigente; });
    return Object.assign({}, u, { serviciosActivos: ps.length, resumen: ps.map(function (p) { return p.universidad + ':' + p.modalidad; }).join(', ') });
  });
}

function adminDetalle(dni) {
  adminAssert_();
  dni = adminLimpiarDni_(dni);
  const usuario = adminUsuarios_()[dni] || { dni: dni, nombre: '(sin registro)', email: '' };
  const permisos = (adminPermisosPorDni_()[dni] || []).sort(function (a, b) { return b.fila - a.fila; });
  const h = adminHoja_(adminCore_(), 'historial');
  const intentos = h.data.slice(1).filter(function (r) { return String(r[h.h.dni] || '').trim() === dni; }).map(function (r) {
    return { universidad: String(r[h.h.universidad] || ''), fecha: adminFecha_(r[h.h.fecha]), puntaje: r[h.h.puntaje], division: String(r[h.h.division] || '') };
  }).slice(-10).reverse();
  return { usuario: usuario, permisos: permisos, legado: adminLegado_(dni), intentos: intentos };
}

function adminListas() {
  adminAssert_();
  const usuarios = adminUsuarios_();
  const permisos = adminPermisosPorDni_();
  const hoy = adminHoy_().getTime(), en7 = hoy + 7 * 864e5;
  const activos = [], porVencer = [];
  Object.keys(permisos).forEach(function (dni) {
    permisos[dni].forEach(function (p) {
      if (!p.vigente) return;
      const fila = { dni: dni, nombre: (usuarios[dni] || {}).nombre || '', universidad: p.universidad, modalidad: p.modalidad, vence: p.vence, plan: p.plan };
      activos.push(fila);
      if (p.vence) { const t = new Date(p.vence + 'T00:00:00').getTime(); if (t <= en7) porVencer.push(fila); }
    });
  });
  const recientes = Object.keys(usuarios).map(function (d) { return usuarios[d]; })
    .sort(function (a, b) { return String(b.fecha || '').localeCompare(String(a.fecha || '')); }).slice(0, 30);
  return { totalUsuarios: Object.keys(usuarios).length, alumnosConAcceso: Object.keys(permisos).filter(function (d) {
    return permisos[d].some(function (p) { return p.vigente; }); }).length, activos: activos.slice(0, 300), porVencer: porVencer, recientes: recientes };
}

// ---------------------------------------------------------------- escritura
/** Pasa `confirmado` / `acceso_banqueo` (UNA) a filas de `permisos` y borra las filas viejas de ese DNI. */
function adminMigrarLegado_(dni, admin) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const servicios = {};
  [['confirmado', ['simulacro', 'banqueo', 'banqueo_tema', 'cepre']], ['acceso_banqueo', ['banqueo', 'banqueo_tema', 'cepre']]]
    .forEach(function (par) {
      const t = adminHoja_(ss, par[0]); if (!t.sh) return;
      const c = t.h.dni !== undefined ? t.h.dni : 0;
      for (let i = t.data.length - 1; i >= 1; i--) {
        if (String(t.data[i][c] || '').trim() === dni) {
          par[1].forEach(function (s) { servicios[s] = true; });
          t.sh.deleteRow(i + 1);
        }
      }
    });
  const lista = Object.keys(servicios);
  if (lista.length) adminEscribirPermisos_(dni, 'una', lista, '', 'legado', admin, 'Migrado de ' + 'confirmado/acceso_banqueo');
  return lista;
}

function adminEscribirPermisos_(dni, universidad, servicios, vence, plan, admin, nota) {
  const sh = adminPermisosSheet_();
  const data = sh.getDataRange().getValues();
  const h = {}; data[0].forEach(function (c, i) { h[String(c).trim().toLowerCase()] = i; });
  const ahora = new Date();
  const venceVal = vence ? Utilities.parseDate(vence + ' 12:00', 'America/Lima', 'yyyy-MM-dd HH:mm') : '';
  servicios.forEach(function (s) {
    let fila = -1;
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][h.dni]).trim() === dni && String(data[i][h.universidad]).toLowerCase() === universidad &&
        String(data[i][h.modalidad]).toLowerCase() === s) { fila = i + 1; break; }
    }
    const valores = {};
    valores.dni = dni; valores.universidad = universidad; valores.modalidad = s; valores.estado = 'activo';
    valores.fecha = ahora; valores.vence = venceVal; valores.plan = plan || ''; valores.otorgado_por = admin; valores.nota = nota || '';
    const filaVals = new Array(data[0].length).fill('');
    Object.keys(valores).forEach(function (k) { if (h[k] !== undefined) filaVals[h[k]] = valores[k]; });
    if (fila > 0) sh.getRange(fila, 1, 1, filaVals.length).setValues([filaVals]);
    else { sh.appendRow(filaVals); data.push(filaVals); }
  });
}

/**
 * Otorga acceso. datos = { dni, universidad ('una'|'unsa'|…|'todas'), servicios: [...] | plan: 'completo'…,
 *   vence: 'yyyy-MM-dd' | '', nota }
 */
function adminOtorgar(datos) {
  const admin = adminAssert_();
  const dni = adminLimpiarDni_(datos.dni);
  const universidad = String(datos.universidad || '').trim().toLowerCase();
  if (!universidad) throw new Error('Elige una universidad.');
  let servicios = (datos.servicios || []).map(String);
  const plan = ADMIN_PLANES_.filter(function (p) { return p.id === datos.plan; })[0];
  if (plan) servicios = servicios.concat(plan.servicios);
  servicios = servicios.filter(function (s, i, a) { return a.indexOf(s) === i && ADMIN_SERVICIOS_.some(function (x) { return x.id === s; }); });
  if (!servicios.length) throw new Error('Elige al menos un servicio o un plan.');
  if (datos.vence && !/^\d{4}-\d{2}-\d{2}$/.test(datos.vence)) throw new Error('Fecha de vencimiento inválida.');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (universidad === 'una' || universidad === 'todas') adminMigrarLegado_(dni, admin);
    adminEscribirPermisos_(dni, universidad, servicios, datos.vence || '', plan ? plan.id : (datos.planTexto || ''), admin, datos.nota || '');
  } finally { lock.releaseLock(); }
  return adminDetalle(dni);
}

/** Quita acceso. datos = { dni, universidad, modalidad ('todas' para todo en esa universidad) } */
function adminRevocar(datos) {
  const admin = adminAssert_();
  const dni = adminLimpiarDni_(datos.dni);
  const universidad = String(datos.universidad || '').trim().toLowerCase();
  const modalidad = String(datos.modalidad || 'todas').trim().toLowerCase();
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (universidad === 'una' || universidad === 'todas') adminMigrarLegado_(dni, admin);
    const sh = adminPermisosSheet_();
    const data = sh.getDataRange().getValues();
    const h = {}; data[0].forEach(function (c, i) { h[String(c).trim().toLowerCase()] = i; });
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][h.dni]).trim() !== dni) continue;
      if (universidad !== 'todas' && String(data[i][h.universidad]).toLowerCase() !== universidad) continue;
      if (modalidad !== 'todas' && String(data[i][h.modalidad]).toLowerCase() !== modalidad) continue;
      sh.getRange(i + 1, h.estado + 1).setValue('revocado');
      if (h.otorgado_por !== undefined) sh.getRange(i + 1, h.otorgado_por + 1).setValue(admin + ' (revocó ' + adminFecha_(new Date()) + ')');
    }
  } finally { lock.releaseLock(); }
  return adminDetalle(dni);
}
