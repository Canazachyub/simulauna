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
 *
 * Toda la sección leer-decidir-escribir corre bajo ScriptLock (dos
 * registros simultáneos del mismo DNI no pueden duplicar filas ni pisar
 * universidades_interes). NUNCA sobrescribe el email de un DNI existente.
 */
function registerUserV2(tenant, dni, fullName, email, phone, processType, divisionOrArea, career) {
  if (!dni) return { registered: false, message: 'DNI requerido' };
  return withScriptLock_(10000, function () {
    return registerUserV2Locked_(tenant, dni, fullName, email, phone, processType, divisionOrArea, career);
  });
}

function registerUserV2Locked_(tenant, dni, fullName, email, phone, processType, divisionOrArea, career) {
  const dniStr = String(dni).trim();
  const emailLower = (email || '').toLowerCase().trim();

  if (emailLower) {
    const fraude = globalFraudStatus_(dniStr, emailLower);
    if (fraude.error) {
      return { registered: false, message: MSG_VERIFICACION_NO_DISPONIBLE_, universidad: tenant.codigo };
    }
    if (fraude.fraud) {
      return { registered: false, message: 'El usuario ya existe', existing: true, universidad: tenant.codigo };
    }
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
  const nombreSeguro = safeCell_(fullName || '', 120);
  const emailSeguro = safeCell_(email || '', EMAIL_MAX_LEN_);
  const celularSeguro = safeCell_(phone || '', 20);
  let resultado;

  if (existingRow > 0) {
    const row = data[existingRow - 1];
    const existingInteres = String(row[5] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (existingInteres.indexOf(tenant.codigo) === -1) existingInteres.push(tenant.codigo);

    sheet.getRange(existingRow, 1).setValue(timestamp);
    if (fullName) sheet.getRange(existingRow, 3).setValue(nombreSeguro);
    // El email de un DNI existente NUNCA se sobrescribe: solo se completa si estaba vacío
    // (si difería, globalFraudStatus_ ya lo rechazó arriba).
    if (email && !String(row[3] || '').trim()) sheet.getRange(existingRow, 4).setValue(emailSeguro);
    if (phone) sheet.getRange(existingRow, 5).setValue(celularSeguro);
    sheet.getRange(existingRow, 6).setValue(existingInteres.join(','));

    resultado = { registered: true, message: 'Datos de usuario actualizados', updated: true };
  } else {
    sheet.appendRow([timestamp, dniStr, nombreSeguro, emailSeguro, celularSeguro, tenant.codigo]);
    resultado = { registered: true, message: 'Usuario registrado correctamente', new: true };
  }

  if (tenant.codigo === 'una') {
    try {
      unaRegisterUser(dni, fullName, email, phone, processType, divisionOrArea, career);
    } catch (err) {
      console.error('No se pudo hacer doble escritura en usuarios (legado): ' + err);
    }
  }

  resultado.universidad = tenant.codigo;
  return resultado;
}

/**
 * Anti-fraude GLOBAL: recorre CORE.usuarios buscando el mismo DNI con
 * distinto email, o el mismo email con distinto DNI (en cualquier
 * universidad). Devuelve:
 *   { fraud, error, dniEmail }  — `dniEmail` = email registrado para el DNI ('' si no tiene).
 * Si el CORE no está configurado no hay nada que verificar (sin fraude,
 * sin error): 'una' sigue operando en modo legado en ese caso.
 * Si la LECTURA FALLA, `error:true`: los llamadores deben fallar CERRADO.
 */
function globalFraudStatus_(dniStr, emailLower) {
  const status = { fraud: false, error: false, dniEmail: '' };
  if (!CORE_SPREADSHEET_ID) return status;
  try {
    const ss = SpreadsheetApp.openById(CORE_SPREADSHEET_ID);
    const sheet = ss.getSheetByName('usuarios');
    if (!sheet) return status;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const rowDni = String(data[i][1] || '').trim();
      const rowEmail = String(data[i][3] || '').toLowerCase().trim();
      if (!rowDni || !rowEmail) continue;
      if (rowDni === dniStr && !status.dniEmail) status.dniEmail = rowEmail;
      if (!emailLower) continue;
      if (rowDni === dniStr && rowEmail !== emailLower) status.fraud = true;
      if (rowDni !== dniStr && rowEmail === emailLower) status.fraud = true;
    }
  } catch (err) {
    console.error('globalFraudStatus_: no se pudo leer CORE.usuarios (falla cerrado): ' + err);
    status.error = true;
  }
  return status;
}

/**
 * Compatibilidad: true si hay fraude O si no se pudo verificar (falla
 * cerrado; antes devolvía false ante un error de lectura).
 */
function checkGlobalFraud_(dniStr, emailLower) {
  if (!CORE_SPREADSHEET_ID || !emailLower) return false;
  const st = globalFraudStatus_(dniStr, emailLower);
  return st.fraud || st.error;
}

/**
 * ¿El email es del titular del DNI? Fuente: CORE.usuarios y, para 'una',
 * también la hoja legada `usuarios` (alumnos registrados antes del CORE).
 * Devuelve 'match' | 'mismatch' | 'sin_registro' (el DNI no tiene email
 * registrado en ninguna parte) | 'error' (no se pudo leer: fallar cerrado).
 */
function dniEmailOwnership_(tenantCodigo, dniStr, emailLower) {
  if (!dniStr || !emailLower) return 'mismatch';
  const st = globalFraudStatus_(dniStr, emailLower);
  if (st.error) return 'error';
  if (st.fraud) return 'mismatch';
  if (st.dniEmail) return st.dniEmail === emailLower ? 'match' : 'mismatch';
  if (tenantCodigo === 'una') return legacyDniEmailOwnership_(dniStr, emailLower);
  return 'sin_registro';
}

/** Misma verificación contra la hoja legada `usuarios` de UNA (DNI col B, Email col D). */
function legacyDniEmailOwnership_(dniStr, emailLower) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('usuarios');
    if (!sheet) return 'sin_registro';
    const data = sheet.getDataRange().getValues();
    let resultado = 'sin_registro';
    for (let i = 1; i < data.length; i++) {
      const rowDni = String(data[i][1] || '').trim();
      const rowEmail = String(data[i][3] || '').toLowerCase().trim();
      if (!rowDni || !rowEmail) continue;
      if (rowDni === dniStr) {
        if (rowEmail !== emailLower) return 'mismatch';
        resultado = 'match';
      } else if (rowEmail === emailLower) {
        return 'mismatch';
      }
    }
    return resultado;
  } catch (err) {
    console.error('legacyDniEmailOwnership_: no se pudo leer usuarios (legado): ' + err);
    return 'error';
  }
}

// ============================================
// CHECK ACCESS (v2) - simulacro
// ============================================

/** Respuesta de checkAccess cuando no se pudo verificar (falla cerrado, mensaje amable). */
function accessVerificationUnavailable_(tenant) {
  return {
    canAccess: false,
    reason: MSG_VERIFICACION_NO_DISPONIBLE_,
    attemptCount: 0,
    isFirstAttempt: false,
    isConfirmed: false,
    isFraudAttempt: false,
    universidad: tenant.codigo
  };
}

/**
 * 1er intento gratis POR universidad (CORE.intentos); si ya tiene
 * intento registrado, requiere permiso modalidad=simulacro en
 * CORE.permisos. Para 'una' también acepta la hoja legada `confirmado`
 * (doble lectura). Misma forma de respuesta que la acción legada.
 * Si CORE.usuarios o CORE.intentos no se pueden leer: canAccess=false.
 */
function checkAccessV2(tenant, dni, email) {
  if (!dni) return { canAccess: false, reason: 'DNI requerido', attemptCount: 0 };

  const dniStr = String(dni).trim();
  const emailLower = (email || '').toLowerCase().trim();

  if (emailLower) {
    const fraude = globalFraudStatus_(dniStr, emailLower);
    if (fraude.error) return accessVerificationUnavailable_(tenant);
    if (fraude.fraud) {
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
  }

  let attemptCount;
  try {
    attemptCount = countIntentos_(tenant.codigo, dniStr);
  } catch (err) {
    return accessVerificationUnavailable_(tenant);
  }

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

/**
 * Cuenta los intentos registrados en CORE.intentos para dni+universidad.
 * Si la hoja no se puede LEER, LANZA (antes devolvía 0 = "primer intento
 * gratis" para cualquiera: fallaba abierto). Sin CORE o sin hoja = 0.
 */
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
    console.error('countIntentos_: no se pudo leer CORE.intentos (falla cerrado): ' + err);
    throw err;
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
    sheet.appendRow([dniStr, universidad, safeCell_(proceso || 'ORDINARIO', 30), new Date()]);
  } catch (err) {
    console.error('No se pudo registrar intento en CORE.intentos: ' + err);
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
    // Columna opcional `vence` (panel admin, 2026-11-26): si la fecha ya pasó, el permiso no vale.
    const colVence = data.length ? data[0].map(function (h) { return String(h).trim().toLowerCase(); }).indexOf('vence') : -1;
    // Se compara SOLO la fecha (yyyy-MM-dd) en hora de Lima: el permiso vale todo el día de `vence`.
    const hoy = Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd');
    for (let i = 1; i < data.length; i++) {
      const rowDni = String(data[i][0] || '').trim();
      const rowUniversidad = String(data[i][1] || '').trim().toLowerCase();
      const rowModalidad = String(data[i][2] || '').trim().toLowerCase();
      const rowEstado = String(data[i][3] || '').trim().toLowerCase();
      if (rowDni === dniStr && (rowUniversidad === universidad || rowUniversidad === 'todas') &&
        rowModalidad === modalidadLower && rowEstado !== 'inactivo' && rowEstado !== 'revocado') {
        if (colVence >= 0 && data[i][colVence]) {
          const vence = data[i][colVence] instanceof Date ? data[i][colVence] : new Date(data[i][colVence]);
          if (!isNaN(vence.getTime()) && Utilities.formatDate(vence, 'America/Lima', 'yyyy-MM-dd') < hoy) continue; // vencido
        }
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
