/**
 * SimulaUNA - AULA VIRTUAL (v2.1)
 * ============================================
 * Implementa docs/CONTRATO_AULA_V21.md: getCiclos, inscribirCiclo, getAula,
 * getMisPagos. Todas las hojas nuevas viven en el spreadsheet CORE
 * (CORE_SPREADSHEET_ID) — ninguna hoja nueva por universidad.
 *
 * Patrones reutilizados del resto del backend (ver core.gs/users.gs):
 * - DNI SIEMPRE String(x).trim(), nunca parseInt.
 * - Hojas leídas por HEADERS (headers.indexOf('columna')), nunca índices
 *   mágicos, para tolerar que alguien reordene columnas a mano en Sheets.
 * - Cache namespaced vía CacheService (getCachedJson/setCachedJson de
 *   core.gs), TTL corto para lo que es específico de un ciclo (300s en
 *   getCiclos, 1800s en el agregado por ciclo de getAula) y SIN cache para
 *   lo que es específico de un alumno (pagos, matrícula).
 * - Errores claros lanzados como Error/string (capturados centralizadamente
 *   por handleRequest_ en main.gs) cuando falta una hoja del CORE.
 *
 * IMPORTANTE (orden de carga en Apps Script, ver nota igual en core.gs):
 * los `const` de nivel superior de este archivo no dependen de constantes
 * de otros archivos. Las referencias a funciones de core.gs/users.gs
 * (getTenant, cacheKey, getCachedJson, setCachedJson, checkPermiso_,
 * checkGlobalFraud_, normalizeUniversidadCode_, formatCellValue) ocurren
 * dentro de cuerpos de función, en tiempo de petición.
 */

// ============================================
// HOJAS DEL AULA (headers exactos — ver docs/CONTRATO_AULA_V21.md §2)
// ============================================

const AULA_SHEET_HEADERS_ = {
  ciclos: ['id_ciclo', 'universidad', 'nombre', 'proceso', 'fecha_inicio', 'fecha_fin', 'turno',
    'aforo', 'precio_matricula', 'precio_mensualidad', 'n_mensualidades', 'estado', 'whatsapp_coordinador'],
  matriculas: ['id_matricula', 'dni', 'universidad', 'id_ciclo', 'fecha_inscripcion', 'estado', 'turno_elegido', 'observaciones'],
  pagos: ['id_pago', 'dni', 'id_ciclo', 'concepto', 'monto', 'fecha_reporte', 'fecha_verificacion', 'medio', 'estado', 'voucher_ref', 'verificado_por'],
  horario: ['id_ciclo', 'dia', 'hora_inicio', 'hora_fin', 'curso', 'docente', 'modalidad', 'enlace_meet', 'aula_fisica'],
  docentes: ['id_docente', 'universidad', 'nombre', 'curso', 'foto_url', 'bio_corta'],
  materiales: ['id_material', 'id_ciclo', 'semana', 'curso', 'titulo', 'tipo', 'url_drive', 'fecha_publicacion', 'destacado', 'estado'],
  grupos_whatsapp: ['id_grupo', 'id_ciclo', 'nombre_grupo', 'enlace_invitacion', 'estado'],
  anuncios: ['id_anuncio', 'id_ciclo', 'fecha', 'titulo', 'cuerpo', 'fijado', 'estado'],
  clases_en_vivo: ['id_clase', 'id_ciclo', 'fecha', 'hora_inicio', 'hora_fin', 'curso', 'docente', 'plataforma', 'enlace', 'estado'],
  grabaciones: ['id_grabacion', 'id_ciclo', 'fecha', 'curso', 'docente', 'titulo', 'url_video', 'duracion_min'],
  recursos: ['id_recurso', 'id_ciclo', 'titulo', 'descripcion', 'url', 'categoria']
};

const DIAS_ORDEN_AULA_ = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

// ============================================
// LECTURA GENÉRICA DE HOJAS DEL CORE (por headers, no por índices mágicos)
// ============================================

/** Abre una hoja del CORE o lanza un error claro si falta el spreadsheet o la hoja. */
function coreOpenSheet_(sheetName) {
  if (!CORE_SPREADSHEET_ID) {
    throw new Error('CORE_SPREADSHEET_ID no configurado en Script Properties. Ejecuta setupCore() primero.');
  }
  const ss = SpreadsheetApp.openById(CORE_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Hoja "' + sheetName + '" no encontrada en el spreadsheet CORE. Ejecuta setupCore() para crearla.');
  }
  return sheet;
}

/**
 * Lee una hoja del CORE y devuelve cada fila como un objeto { <header>: valor },
 * usando los headers reales de la hoja (tolera reordenamiento manual de
 * columnas). Descarta filas completamente vacías. `__rowIndex` es la fila
 * 1-based real en la hoja (útil si algún día se necesita escribir sobre esa
 * fila puntual).
 */
function coreReadRowsAsObjects_(sheetName) {
  const sheet = coreOpenSheet_(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { sheet: sheet, headers: (data[0] || []), rows: [] };

  const headers = data[0].map(function (h) { return String(h).trim(); });
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const obj = {};
    let hasValue = false;
    headers.forEach(function (h, colIdx) {
      const v = row[colIdx];
      obj[h] = v;
      if (v !== '' && v !== null && v !== undefined) hasValue = true;
    });
    if (!hasValue) continue;
    obj.__rowIndex = i + 1;
    rows.push(obj);
  }
  return { sheet: sheet, headers: headers, rows: rows };
}

/** Cache namespaced propia del Aula: 'aula:<universidad>:<recurso>'. */
function aulaCacheKey_(universidad, recurso) {
  return 'aula:' + normalizeUniversidadCode_(universidad) + ':' + recurso;
}

// ============================================
// FORMATEO DE FECHAS/HORAS (Sheets a veces guarda "08:00" como Date)
// ============================================

function formatDateValue_(value) {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function formatHoraValue_(value) {
  if (value instanceof Date) {
    const h = String(value.getHours()).padStart(2, '0');
    const m = String(value.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

// ============================================
// MAPEADORES DE FILA (hoja -> forma del contrato, camelCase)
// ============================================

function mapCicloRow_(r) {
  return {
    idCiclo: String(r['id_ciclo'] || '').trim(),
    universidad: String(r['universidad'] || '').trim().toLowerCase(),
    nombre: r['nombre'] || '',
    proceso: r['proceso'] || '',
    fechaInicio: formatDateValue_(r['fecha_inicio']),
    fechaFin: formatDateValue_(r['fecha_fin']),
    turno: r['turno'] || '',
    aforo: Number(r['aforo']) || 0,
    precioMatricula: Number(r['precio_matricula']) || 0,
    precioMensualidad: Number(r['precio_mensualidad']) || 0,
    nMensualidades: Number(r['n_mensualidades']) || 0,
    estado: String(r['estado'] || '').trim().toLowerCase(),
    whatsappCoordinador: r['whatsapp_coordinador'] || ''
  };
}

function mapHorarioRow_(r) {
  return {
    dia: String(r['dia'] || '').trim().toLowerCase(),
    horaInicio: formatHoraValue_(r['hora_inicio']),
    horaFin: formatHoraValue_(r['hora_fin']),
    curso: r['curso'] || '',
    docente: r['docente'] || '',
    modalidad: String(r['modalidad'] || '').trim().toLowerCase(),
    enlaceMeet: r['enlace_meet'] || '',
    aulaFisica: r['aula_fisica'] || ''
  };
}

function sortHorarioRows_(a, b) {
  const da = DIAS_ORDEN_AULA_.indexOf(a.dia);
  const db = DIAS_ORDEN_AULA_.indexOf(b.dia);
  if (da !== db) return da - db;
  return String(a.horaInicio).localeCompare(String(b.horaInicio));
}

function mapDocenteRow_(r) {
  return {
    idDocente: String(r['id_docente'] || '').trim(),
    nombre: r['nombre'] || '',
    curso: r['curso'] || '',
    fotoUrl: r['foto_url'] || '',
    bioCorta: r['bio_corta'] || ''
  };
}

function mapMaterialRow_(r) {
  return {
    idMaterial: String(r['id_material'] || '').trim(),
    semana: Number(r['semana']) || 0,
    curso: r['curso'] || '',
    titulo: r['titulo'] || '',
    tipo: String(r['tipo'] || '').trim().toLowerCase(),
    urlDrive: r['url_drive'] || '',
    fechaPublicacion: formatDateValue_(r['fecha_publicacion']),
    destacado: String(r['destacado'] || '').trim().toLowerCase() === 'si'
  };
}

function mapAnuncioRow_(r) {
  return {
    idAnuncio: String(r['id_anuncio'] || '').trim(),
    fecha: formatDateValue_(r['fecha']),
    titulo: r['titulo'] || '',
    cuerpo: r['cuerpo'] || '',
    fijado: String(r['fijado'] || '').trim().toLowerCase() === 'si'
  };
}

function sortAnuncioRows_(a, b) {
  if (a.fijado !== b.fijado) return a.fijado ? -1 : 1;
  return new Date(b.fecha) - new Date(a.fecha);
}

function mapGrupoWhatsappRow_(r) {
  return {
    nombreGrupo: r['nombre_grupo'] || '',
    enlaceInvitacion: r['enlace_invitacion'] || '',
    estado: String(r['estado'] || '').trim().toLowerCase() || 'activo'
  };
}

function mapClaseEnVivoRow_(r) {
  return {
    idClase: String(r['id_clase'] || '').trim(),
    fecha: formatDateValue_(r['fecha']),
    horaInicio: formatHoraValue_(r['hora_inicio']),
    horaFin: formatHoraValue_(r['hora_fin']),
    curso: r['curso'] || '',
    docente: r['docente'] || '',
    plataforma: String(r['plataforma'] || '').trim().toLowerCase(),
    enlace: r['enlace'] || '',
    estado: String(r['estado'] || '').trim().toLowerCase() || 'programada'
  };
}

function sortClasesEnVivoRows_(a, b) {
  const fa = a.fecha + ' ' + a.horaInicio;
  const fb = b.fecha + ' ' + b.horaInicio;
  return fa.localeCompare(fb);
}

function mapGrabacionRow_(r) {
  return {
    idGrabacion: String(r['id_grabacion'] || '').trim(),
    fecha: formatDateValue_(r['fecha']),
    curso: r['curso'] || '',
    docente: r['docente'] || '',
    titulo: r['titulo'] || '',
    urlVideo: r['url_video'] || '',
    duracionMin: Number(r['duracion_min']) || 0
  };
}

function mapRecursoRow_(r) {
  return {
    idRecurso: String(r['id_recurso'] || '').trim(),
    titulo: r['titulo'] || '',
    descripcion: r['descripcion'] || '',
    url: r['url'] || '',
    categoria: r['categoria'] || ''
  };
}

function formatConceptoEtiqueta_(concepto) {
  const c = String(concepto || '').trim();
  if (!c) return '';
  if (c.toLowerCase() === 'matricula') return 'Matrícula';
  const m = c.match(/^mensualidad_(\d+)$/i);
  if (m) return 'Mensualidad ' + m[1];
  return c.replace(/_/g, ' ').replace(/\b\w/g, function (ch) { return ch.toUpperCase(); });
}

// ============================================
// getCiclos
// ============================================

/**
 * Ciclos del tenant, opcionalmente filtrados por estado. Cache 300s
 * (cambia más seguido que la config de examen del contrato v2).
 */
function getCiclosForTenant(tenant, estadoFilter) {
  const estadoNorm = estadoFilter ? String(estadoFilter).trim().toLowerCase() : '';
  const key = aulaCacheKey_(tenant.codigo, 'ciclos' + (estadoNorm ? ':' + estadoNorm : ''));
  const cached = getCachedJson(key);
  if (cached) return cached;

  const rows = coreReadRowsAsObjects_('ciclos').rows;
  const ciclos = rows
    .filter(function (r) { return String(r['universidad'] || '').trim().toLowerCase() === tenant.codigo; })
    .filter(function (r) { return !estadoNorm || String(r['estado'] || '').trim().toLowerCase() === estadoNorm; })
    .map(mapCicloRow_);

  const result = { ciclos: ciclos };
  setCachedJson(key, result, 300);
  return result;
}

// ============================================
// inscribirCiclo
// ============================================

/**
 * Crea (o reutiliza, idempotente por dni+cicloId) una fila en `matriculas`
 * con estado=preinscrito. No crea pago ni permiso — eso lo hace el
 * coordinador a mano al verificar el voucher (ver §2 CONTRATO_AULA_V21).
 */
function inscribirCicloForTenant(tenant, dni, email, cicloId, turno) {
  const dniStr = String(dni || '').trim();
  const emailLower = String(email || '').toLowerCase().trim();
  const cicloIdStr = String(cicloId || '').trim();

  if (!dniStr) throw 'DNI requerido';
  if (!cicloIdStr) throw 'cicloId requerido';

  if (emailLower && checkGlobalFraud_(dniStr, emailLower)) {
    throw 'DNI y email no coinciden con el usuario registrado';
  }

  const cicloRow = coreReadRowsAsObjects_('ciclos').rows.filter(function (r) {
    return String(r['id_ciclo'] || '').trim() === cicloIdStr &&
      String(r['universidad'] || '').trim().toLowerCase() === tenant.codigo;
  })[0];
  if (!cicloRow) throw 'Ciclo no válido para esta universidad';
  const ciclo = mapCicloRow_(cicloRow);

  const sheet = coreOpenOrCreateSheet_('matriculas');
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(function (h) { return String(h).trim(); });
  const idx = {
    idMatricula: headers.indexOf('id_matricula'),
    dni: headers.indexOf('dni'),
    universidad: headers.indexOf('universidad'),
    idCiclo: headers.indexOf('id_ciclo'),
    fechaInscripcion: headers.indexOf('fecha_inscripcion'),
    estado: headers.indexOf('estado'),
    turnoElegido: headers.indexOf('turno_elegido'),
    observaciones: headers.indexOf('observaciones')
  };

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[idx.dni] || '').trim() === dniStr && String(row[idx.idCiclo] || '').trim() === cicloIdStr) {
      return {
        inscrito: true,
        yaExistia: true,
        idMatricula: row[idx.idMatricula],
        estado: String(row[idx.estado] || '').trim().toLowerCase(),
        cicloId: cicloIdStr,
        universidad: tenant.codigo,
        instruccionesPago: buildInstruccionesPago_(ciclo)
      };
    }
  }

  if (ciclo.estado === 'cerrado') {
    throw 'Este ciclo ya cerró inscripciones';
  }

  const idMatricula = 'mat-' + Utilities.getUuid();
  const nuevaFila = new Array(headers.length).fill('');
  nuevaFila[idx.idMatricula] = idMatricula;
  nuevaFila[idx.dni] = dniStr;
  nuevaFila[idx.universidad] = tenant.codigo;
  nuevaFila[idx.idCiclo] = cicloIdStr;
  nuevaFila[idx.fechaInscripcion] = new Date();
  nuevaFila[idx.estado] = 'preinscrito';
  nuevaFila[idx.turnoElegido] = turno || '';
  nuevaFila[idx.observaciones] = '';
  sheet.appendRow(nuevaFila);

  return {
    inscrito: true,
    yaExistia: false,
    idMatricula: idMatricula,
    estado: 'preinscrito',
    cicloId: cicloIdStr,
    universidad: tenant.codigo,
    instruccionesPago: buildInstruccionesPago_(ciclo)
  };
}

/** Abre una hoja del CORE, creándola con sus headers si todavía no existe (usa setupSheetWithHeaders_ de setup.gs). */
function coreOpenOrCreateSheet_(sheetName) {
  if (!CORE_SPREADSHEET_ID) {
    throw new Error('CORE_SPREADSHEET_ID no configurado en Script Properties. Ejecuta setupCore() primero.');
  }
  const ss = SpreadsheetApp.openById(CORE_SPREADSHEET_ID);
  const headers = AULA_SHEET_HEADERS_[sheetName];
  if (!headers) throw new Error('Hoja de Aula desconocida: ' + sheetName);
  return setupSheetWithHeaders_(ss, sheetName, headers);
}

function buildInstruccionesPago_(ciclo) {
  const partes = [];
  partes.push('Realiza el pago de matrícula (S/ ' + ciclo.precioMatricula + ') por Yape/Plin/transferencia.');
  partes.push('Envía la captura de tu voucher por WhatsApp' +
    (ciclo.whatsappCoordinador ? (' al coordinador: ' + ciclo.whatsappCoordinador) : ' al canal de tu universidad') + '.');
  partes.push('Cuando el coordinador verifique tu pago, tu matrícula pasará de "preinscrito" a "matriculado" y tendrás acceso completo al Aula.');
  return {
    mensaje: partes.join(' '),
    precioMatricula: ciclo.precioMatricula,
    precioMensualidad: ciclo.precioMensualidad,
    whatsappCoordinador: ciclo.whatsappCoordinador || ''
  };
}

// ============================================
// getAula (agregado, un solo round-trip)
// ============================================

/**
 * Agregado por-ciclo cacheable 30 min: ciclo + horario + docentes +
 * materiales + anuncios + grupoWhatsapp + clasesEnVivo + grabaciones +
 * recursos. NO incluye nada específico de un DNI (eso se mezcla después,
 * sin cache, en getAulaForTenant).
 */
function getAulaCicloAgregado_(tenant, idCiclo) {
  const key = aulaCacheKey_(tenant.codigo, idCiclo);
  const cached = getCachedJson(key);
  if (cached) return cached;

  const cicloRow = coreReadRowsAsObjects_('ciclos').rows.filter(function (r) {
    return String(r['id_ciclo'] || '').trim() === idCiclo &&
      String(r['universidad'] || '').trim().toLowerCase() === tenant.codigo;
  })[0];
  const ciclo = cicloRow ? mapCicloRow_(cicloRow) : null;

  const horario = coreReadRowsAsObjects_('horario').rows
    .filter(function (r) { return String(r['id_ciclo'] || '').trim() === idCiclo; })
    .map(mapHorarioRow_)
    .sort(sortHorarioRows_);

  const clasesEnVivo = coreReadRowsAsObjects_('clases_en_vivo').rows
    .filter(function (r) { return String(r['id_ciclo'] || '').trim() === idCiclo; })
    .map(mapClaseEnVivoRow_)
    .filter(function (c) { return c.estado !== 'cancelada'; })
    .sort(sortClasesEnVivoRows_);

  const grabaciones = coreReadRowsAsObjects_('grabaciones').rows
    .filter(function (r) { return String(r['id_ciclo'] || '').trim() === idCiclo; })
    .map(mapGrabacionRow_)
    .sort(function (a, b) { return b.fecha.localeCompare(a.fecha); });

  const materiales = coreReadRowsAsObjects_('materiales').rows
    .filter(function (r) { return String(r['id_ciclo'] || '').trim() === idCiclo; })
    .filter(function (r) { return String(r['estado'] || '').trim().toLowerCase() === 'publicado'; })
    .map(mapMaterialRow_)
    .sort(function (a, b) { return b.fechaPublicacion.localeCompare(a.fechaPublicacion); });

  const anuncios = coreReadRowsAsObjects_('anuncios').rows
    .filter(function (r) { return String(r['id_ciclo'] || '').trim() === idCiclo; })
    .filter(function (r) { return String(r['estado'] || '').trim().toLowerCase() !== 'oculto'; })
    .map(mapAnuncioRow_)
    .sort(sortAnuncioRows_);

  const docentes = coreReadRowsAsObjects_('docentes').rows
    .filter(function (r) { return String(r['universidad'] || '').trim().toLowerCase() === tenant.codigo; })
    .map(mapDocenteRow_);

  const grupoRow = coreReadRowsAsObjects_('grupos_whatsapp').rows
    .filter(function (r) { return String(r['id_ciclo'] || '').trim() === idCiclo; })[0];
  const grupoWhatsapp = grupoRow ? mapGrupoWhatsappRow_(grupoRow) : null;

  const recursos = coreReadRowsAsObjects_('recursos').rows
    .filter(function (r) { return String(r['id_ciclo'] || '').trim() === idCiclo; })
    .map(mapRecursoRow_);

  const result = {
    ciclo: ciclo, horario: horario, clasesEnVivo: clasesEnVivo, grabaciones: grabaciones,
    materiales: materiales, anuncios: anuncios, docentes: docentes, grupoWhatsapp: grupoWhatsapp,
    recursos: recursos
  };
  setCachedJson(key, result, 1800);
  return result;
}

/** "Mis simulacros del ciclo": reusa CORE.historial (sin hoja nueva), filtrado por dni+universidad+rango de fechas del ciclo. Autocontenido: si falla, devuelve []. */
function getSimulacrosCiclo_(tenant, dniStr, ciclo) {
  if (!ciclo) return [];
  try {
    if (!CORE_SPREADSHEET_ID) return [];
    const ss = SpreadsheetApp.openById(CORE_SPREADSHEET_ID);
    const sheet = ss.getSheetByName('historial');
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    const headers = data[0].map(function (h) { return String(h).trim(); });
    const idx = {
      dni: headers.indexOf('dni'), universidad: headers.indexOf('universidad'),
      proceso: headers.indexOf('proceso'), fecha: headers.indexOf('fecha'),
      puntaje: headers.indexOf('puntaje'), puntajeMax: headers.indexOf('puntaje_max'),
      porcentaje: headers.indexOf('porcentaje')
    };
    const inicio = ciclo.fechaInicio ? new Date(ciclo.fechaInicio) : null;
    const fin = ciclo.fechaFin ? new Date(ciclo.fechaFin) : null;
    const out = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (String(row[idx.dni] || '').trim() !== dniStr) continue;
      if (String(row[idx.universidad] || '').trim().toLowerCase() !== tenant.codigo) continue;
      const fecha = row[idx.fecha] ? new Date(row[idx.fecha]) : null;
      if (inicio && fecha && fecha < inicio) continue;
      if (fin && fecha && fecha > fin) continue;
      out.push({
        fecha: formatDateValue_(row[idx.fecha]),
        proceso: row[idx.proceso] || '',
        puntaje: Number(row[idx.puntaje]) || 0,
        puntajeMax: Number(row[idx.puntajeMax]) || 0,
        porcentaje: Number(row[idx.porcentaje]) || 0
      });
    }
    out.sort(function (a, b) { return b.fecha.localeCompare(a.fecha); });
    return out;
  } catch (err) {
    console.log('getSimulacrosCiclo_: degradando a [] por error: ' + err);
    return [];
  }
}

/**
 * getAula: verifica matrícula (o permiso modalidad=aula como override
 * manual, ver precedencia en docs/CONTRATO_AULA_V21.md §3) y arma el
 * agregado completo del ciclo + lo específico del dni (pagos, matrícula).
 */
function getAulaForTenant(tenant, dni, email, cicloIdParam) {
  const dniStr = String(dni || '').trim();
  const emailLower = String(email || '').toLowerCase().trim();
  if (!dniStr) throw 'DNI requerido';

  if (emailLower && checkGlobalFraud_(dniStr, emailLower)) {
    throw 'DNI y email no coinciden con el usuario registrado';
  }

  const cicloIdNorm = cicloIdParam ? String(cicloIdParam).trim() : '';
  const permisoAulaOverride = checkPermiso_(tenant.codigo, dniStr, 'aula');

  const matriculasRows = coreReadRowsAsObjects_('matriculas').rows.filter(function (r) {
    return String(r['dni'] || '').trim() === dniStr &&
      String(r['universidad'] || '').trim().toLowerCase() === tenant.codigo;
  });

  const ciclosTenant = getCiclosForTenant(tenant).ciclos;
  const estadoPorCiclo = {};
  ciclosTenant.forEach(function (c) { estadoPorCiclo[c.idCiclo] = c.estado; });

  let matriculaRow = null;
  if (cicloIdNorm) {
    matriculaRow = matriculasRows.filter(function (r) {
      return String(r['id_ciclo'] || '').trim() === cicloIdNorm &&
        String(r['estado'] || '').trim().toLowerCase() === 'matriculado';
    })[0] || null;
  } else {
    matriculaRow = matriculasRows
      .filter(function (r) { return String(r['estado'] || '').trim().toLowerCase() === 'matriculado'; })
      .filter(function (r) { return estadoPorCiclo[String(r['id_ciclo'] || '').trim()] !== 'cerrado'; })
      .sort(function (a, b) { return new Date(b['fecha_inscripcion']) - new Date(a['fecha_inscripcion']); })[0] || null;
  }

  function sinAcceso() {
    return { matriculado: false, tieneCicloActivo: false, ciclosDisponibles: getCiclosForTenant(tenant, 'inscripciones_abiertas').ciclos };
  }

  if (!matriculaRow && !permisoAulaOverride) return sinAcceso();

  let idCiclo = cicloIdNorm || (matriculaRow ? String(matriculaRow['id_ciclo'] || '').trim() : '');
  if (!idCiclo && permisoAulaOverride) {
    const abierto = ciclosTenant.filter(function (c) { return c.estado !== 'cerrado'; })[0];
    idCiclo = abierto ? abierto.idCiclo : '';
  }
  if (!idCiclo) return sinAcceso();

  const agregado = getAulaCicloAgregado_(tenant, idCiclo);
  if (!agregado.ciclo) return sinAcceso();

  const pagos = getPagosDni_(tenant, dniStr, idCiclo);
  const simulacrosCiclo = getSimulacrosCiclo_(tenant, dniStr, agregado.ciclo);

  return {
    matriculado: true,
    tieneCicloActivo: true,
    ciclo: agregado.ciclo,
    matricula: {
      estado: matriculaRow ? String(matriculaRow['estado'] || '').trim().toLowerCase() : 'activo_por_permiso',
      turnoElegido: matriculaRow ? (matriculaRow['turno_elegido'] || '') : '',
      fechaInscripcion: matriculaRow ? formatDateValue_(matriculaRow['fecha_inscripcion']) : ''
    },
    horario: agregado.horario,
    docentes: agregado.docentes,
    materiales: agregado.materiales,
    anuncios: agregado.anuncios,
    grupoWhatsapp: agregado.grupoWhatsapp,
    pagos: pagos,
    simulacrosCiclo: simulacrosCiclo,
    clasesEnVivo: agregado.clasesEnVivo,
    grabaciones: agregado.grabaciones,
    recursos: agregado.recursos
  };
}

// ============================================
// getMisPagos
// ============================================

/** "Mi estado de cuenta" del dni para un ciclo. Sin cache (dato financiero, siempre fresco). */
function getPagosDni_(tenant, dniStr, idCiclo) {
  const rows = coreReadRowsAsObjects_('pagos').rows
    .filter(function (r) { return String(r['dni'] || '').trim() === dniStr && String(r['id_ciclo'] || '').trim() === idCiclo; });

  const conceptos = rows.map(function (r) {
    const estado = String(r['estado'] || '').trim().toLowerCase() || 'pendiente';
    return {
      concepto: r['concepto'] || '',
      etiqueta: formatConceptoEtiqueta_(r['concepto']),
      monto: Number(r['monto']) || 0,
      estado: estado,
      medio: r['medio'] || '',
      fechaReporte: formatDateValue_(r['fecha_reporte']),
      fechaVerificacion: r['fecha_verificacion'] ? formatDateValue_(r['fecha_verificacion']) : ''
    };
  }).sort(function (a, b) { return a.concepto.localeCompare(b.concepto); });

  let estadoGeneral = 'al_dia';
  if (conceptos.some(function (c) { return c.estado === 'rechazado'; })) estadoGeneral = 'vencido';
  else if (conceptos.some(function (c) { return c.estado === 'pendiente'; })) estadoGeneral = 'en_revision';

  return { estadoGeneral: estadoGeneral, conceptos: conceptos };
}

function getMisPagosForTenant(tenant, dni, cicloId) {
  const dniStr = String(dni || '').trim();
  const cicloIdStr = String(cicloId || '').trim();
  if (!dniStr) throw 'DNI requerido';
  if (!cicloIdStr) throw 'cicloId requerido';
  return getPagosDni_(tenant, dniStr, cicloIdStr);
}
