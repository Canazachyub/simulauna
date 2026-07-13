/**
 * SimulaUNA - USERS
 * ============================================
 * register, checkAccess, checkBanqueoAccess (layout v2, CORE.usuarios /
 * CORE.permisos / CORE.intentos) + anti-fraude DNI<->email GLOBAL.
 *
 * Las funciones `una*` (legadas) viven en adapter_una.gs y se usan
 * directamente desde main.gs cuando la petición NO trae `universidad`
 * (regla de oro: byte-idéntico a producción).
 *
 * REGLA: el DNI SIEMPRE se compara como String(x).trim(), nunca parseInt
 * (evita perder ceros a la izquierda).
 */

// ============================================
// REGISTER (v2)
// ============================================

/**
 * Registra (o actualiza) un usuario en CORE.usuarios. Acumula
 * `universidades_interes` (CSV). Si universidad='una', hace doble
 * escritura en la hoja legada `usuarios` (transición). Aplica anti-fraude
 * GLOBAL: mismo DNI con otro email (o viceversa) en CUALQUIER
 * universidad → rechazo con mensaje genérico.
 */
function registerUserV2(tenant, dni, fullName, email, phone, processType, divisionOrArea, career) {
  if (!dni) return { registered: false, message: 'DNI requerido' };

  const dniStr = String(dni).trim();
  const emailLower = (email || '').toLowerCase().trim();

  if (checkGlobalFraud_(dniStr, emailLower)) {
    return { registered: false, message: 'El usuario ya existe', existing: true, universidad: tenant.codigo };
  }

  if (!CORE_SPREADSHEET_ID) {
    // Sin CORE configurado: degradar a legado solo para 'una'.
    if (tenant.codigo === 'una') {
      const legacyResult = unaRegisterUser(dni, fullName, email, phone, processType, divisionOrArea, career);
      legacyResult.universidad = 'una';
      return legacyResult;
    }
    throw new Error('CORE_SPREADSHEET_ID no configurado: no se puede registrar en universidades nuevas todavía.');
  }

  const ss = SpreadsheetApp.openById(CORE_SPREADSHEET_ID);
  let sheet = ss.getSheetByName('usuarios');
  if (!sheet) {
    sheet = ss.insertSheet('usuarios');
    sheet.appendRow(['fecha', 'dni', 'nombre', 'email', 'celular', 'universidades_interes']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }

  const data = sheet.getDataRange().getValues();
  let existingRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === dniStr) { existingRow = i + 1; break; }
  }

  const timestamp = new Date();
  let resultado;

  if (existingRow > 0) {
    const row = data[existingRow - 1];
    const existingInteres = String(row[5] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (existingInteres.indexOf(tenant.codigo) === -1) existingInteres.push(tenant.codigo);

    sheet.getRange(existingRow, 1).setValue(timestamp);
    if (fullName) sheet.getRange(existingRow, 3).setValue(fullName);
    if (email) sheet.getRange(existingRow, 4).setValue(email);
    if (phone) sheet.getRange(existingRow, 5).setValue(phone);
    sheet.getRange(existingRow, 6).setValue(existingInteres.join(','));

    resultado = { registered: true, message: 'Datos de usuario actualizados', updated: true };
  } else {
    sheet.appendRow([timestamp, dniStr, fullName || '', email || '', phone || '', tenant.codigo]);
    resultado = { registered: true, message: 'Usuario registrado correctamente', new: true };
  }

  if (tenant.codigo === 'una') {
    try {
      unaRegisterUser(dni, fullName, email, phone, processType, divisionOrArea, career);
    } catch (err) {
      console.log('No se pudo hacer doble escritura en usuarios (legado): ' + err);
    }
  }

  resultado.universidad = tenant.codigo;
  return resultado;
}

/**
 * Anti-fraude GLOBAL: recorre CORE.usuarios buscando el mismo DNI con
 * distinto email, o el mismo email con distinto DNI (en cualquier
 * universidad). Si el CORE no está configurado, no se puede verificar
 * globalmente y se degrada a "sin fraude" (permitir), ya que 'una' solo
 * puede seguir operando en modo legado en ese caso.
 */
function checkGlobalFraud_(dniStr, emailLower) {
  if (!CORE_SPREADSHEET_ID || !emailLower) return false;
  try {
    const ss = SpreadsheetApp.openById(CORE_SPREADSHEET_ID);
    const sheet = ss.getSheetByName('usuarios');
    if (!sheet) return false;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const rowDni = String(data[i][1] || '').trim();
      const rowEmail = String(data[i][3] || '').toLowerCase().trim();
      if (!rowDni || !rowEmail) continue;
      if (rowDni === dniStr && rowEmail !== emailLower) return true;
      if (rowDni !== dniStr && rowEmail === emailLower) return true;
    }
  } catch (err) {
    return false;
  }
  return false;
}

// ============================================
// CHECK ACCESS (v2) - simulacro
// ============================================

/**
 * 1er intento gratis POR universidad (CORE.intentos); si ya tiene
 * intento registrado, requiere permiso modalidad=simulacro en
 * CORE.permisos. Para 'una' también acepta la hoja legada `confirmado`
 * (doble lectura). Misma forma de respuesta que la acción legada.
 */
function checkAccessV2(tenant, dni, email) {
  if (!dni) return { canAccess: false, reason: 'DNI requerido', attemptCount: 0 };

  const dniStr = String(dni).trim();
  const emailLower = (email || '').toLowerCase().trim();

  if (checkGlobalFraud_(dniStr, emailLower)) {
    return {
      canAccess: false,
      reason: 'DNI o email ya registrados con datos distintos',
      attemptCount: 0,
      isFirstAttempt: false,
      isConfirmed: false,
      isFraudAttempt: true,
      universidad: tenant.codigo
    };
  }

  const attemptCount = countIntentos_(tenant.codigo, dniStr);

  if (attemptCount === 0) {
    return {
      canAccess: true,
      reason: 'Primer simulacro gratuito',
      attemptCount: 0,
      isFirstAttempt: true,
      isFraudAttempt: false,
      universidad: tenant.codigo
    };
  }

  const hasPermiso = checkPermiso_(tenant.codigo, dniStr, 'simulacro');
  const legacyConfirmed = tenant.codigo === 'una' ? isConfirmadoLegacy_(dniStr, emailLower) : false;

  if (hasPermiso || legacyConfirmed) {
    return {
      canAccess: true,
      reason: 'Usuario confirmado',
      attemptCount: attemptCount,
      isFirstAttempt: false,
      isConfirmed: true,
      isFraudAttempt: false,
      universidad: tenant.codigo
    };
  }

  return {
    canAccess: false,
    reason: 'Ya realizaste tu simulacro gratuito. Contáctanos para obtener más intentos.',
    attemptCount: attemptCount,
    isFirstAttempt: false,
    isConfirmed: false,
    isFraudAttempt: false,
    universidad: tenant.codigo
  };
}

/** Cuenta los intentos registrados en CORE.intentos para dni+universidad. */
function countIntentos_(universidad, dniStr) {
  if (!CORE_SPREADSHEET_ID) return 0;
  try {
    const ss = SpreadsheetApp.openById(CORE_SPREADSHEET_ID);
    const sheet = ss.getSheetByName('intentos');
    if (!sheet) return 0;
    const data = sheet.getDataRange().getValues();
    let count = 0;
    for (let i = 1; i < data.length; i++) {
      const rowDni = String(data[i][0] || '').trim();
      const rowUniversidad = String(data[i][1] || '').trim().toLowerCase();
      if (rowDni === dniStr && rowUniversidad === universidad) count++;
    }
    return count;
  } catch (err) {
    return 0;
  }
}

/** Registra un intento consumido (se llama al finalizar un examen, ver scoring.gs). */
function recordIntento_(universidad, dniStr, proceso) {
  try {
    if (!CORE_SPREADSHEET_ID) return;
    const ss = SpreadsheetApp.openById(CORE_SPREADSHEET_ID);
    let sheet = ss.getSheetByName('intentos');
    if (!sheet) {
      sheet = ss.insertSheet('intentos');
      sheet.appendRow(['dni', 'universidad', 'proceso', 'fecha']);
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    }
    sheet.appendRow([dniStr, universidad, proceso || 'ORDINARIO', new Date()]);
  } catch (err) {
    console.log('No se pudo registrar intento en CORE.intentos: ' + err);
  }
}

/** Busca un permiso activo (dni+universidad+modalidad) en CORE.permisos. */
function checkPermiso_(universidad, dniStr, modalidad) {
  if (!CORE_SPREADSHEET_ID) return false;
  try {
    const ss = SpreadsheetApp.openById(CORE_SPREADSHEET_ID);
    const sheet = ss.getSheetByName('permisos');
    if (!sheet) return false;
    const data = sheet.getDataRange().getValues();
    const modalidadLower = (modalidad || '').toLowerCase();
    for (let i = 1; i < data.length; i++) {
      const rowDni = String(data[i][0] || '').trim();
      const rowUniversidad = String(data[i][1] || '').trim().toLowerCase();
      const rowModalidad = String(data[i][2] || '').trim().toLowerCase();
      const rowEstado = String(data[i][3] || '').trim().toLowerCase();
      if (rowDni === dniStr && rowUniversidad === universidad && rowModalidad === modalidadLower &&
        rowEstado !== 'inactivo' && rowEstado !== 'revocado') {
        return true;
      }
    }
  } catch (err) {
    return false;
  }
  return false;
}

/** Fallback legado: hoja `confirmado` del spreadsheet de UNA. */
function isConfirmadoLegacy_(dniStr, emailLower) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('confirmado');
    if (!sheet) return false;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const confDni = String(data[i][0]).trim();
      const confEmail = String(data[i][2] || '').toLowerCase().trim();
      const dniMatch = confDni === dniStr;
      const emailMatch = (confEmail === emailLower) || (confEmail === '' && emailLower === '');
      if (dniMatch && emailMatch) return true;
    }
  } catch (err) {
    return false;
  }
  return false;
}

/** Fallback legado: hoja `acceso_banqueo` del spreadsheet de UNA. */
function isAccesoBanqueoLegacy_(dniStr, emailLower) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('acceso_banqueo');
    if (!sheet) return false;
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return false;
    const headers = data[0].map(function (h) { return String(h).trim().toLowerCase(); });
    const dniIdx = headers.indexOf('dni');
    const emailIdx = headers.indexOf('email');
    if (dniIdx === -1) return false;

    for (let i = 1; i < data.length; i++) {
      const rowDni = String(data[i][dniIdx]).trim();
      const rowEmail = emailIdx !== -1 ? String(data[i][emailIdx] || '').toLowerCase().trim() : '';
      const dniMatch = rowDni === dniStr;
      const emailMatch = emailIdx === -1 || rowEmail === emailLower || (rowEmail === '' && emailLower === '');
      if (dniMatch && emailMatch) return true;
    }
  } catch (err) {
    return false;
  }
  return false;
}

// ============================================
// CHECK BANQUEO ACCESS (v2)
// ============================================

/**
 * Acceso al Banqueo Histórico / por tema / CEPRE (modalidad configurable,
 * default 'banqueo'): CORE.permisos + fallback legado (confirmado /
 * acceso_banqueo) para 'una'.
 */
function checkBanqueoAccessV2(tenant, dni, email, modalidad) {
  if (!dni) return { canAccess: false, reason: 'DNI requerido' };

  const dniStr = String(dni).trim();
  const emailLower = (email || '').toLowerCase().trim();
  const modalidadNorm = (modalidad || 'banqueo').toLowerCase();

  const hasPermiso = checkPermiso_(tenant.codigo, dniStr, modalidadNorm);
  if (hasPermiso) {
    return { canAccess: true, reason: 'Acceso autorizado al Banqueo Histórico', isConfirmed: true, universidad: tenant.codigo };
  }

  if (tenant.codigo === 'una') {
    if (isConfirmadoLegacy_(dniStr, emailLower) || isAccesoBanqueoLegacy_(dniStr, emailLower)) {
      return { canAccess: true, reason: 'Acceso autorizado al Banqueo Histórico', isConfirmed: true, universidad: tenant.codigo };
    }
  }

  return {
    canAccess: false,
    reason: 'El Banqueo Histórico es exclusivo para usuarios inscritos',
    isConfirmed: false,
    universidad: tenant.codigo
  };
}
