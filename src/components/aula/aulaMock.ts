/**
 * Mock local del Aula Virtual — espejo EXACTO del modelo de datos propuesto en
 * docs/AULA_VIRTUAL_DISENO.md (§1-§7 y §12) y del contrato de backend
 * docs/CONTRATO_AULA_V21.md. Los tipos viven en `./aulaTypes` (reexportados
 * íntegros abajo para no romper los imports existentes de
 * `src/components/aula/*.tsx`); este archivo solo aporta el GENERADOR de
 * datos de ejemplo (`getAulaMock`) que usa la vista previa de
 * `AulaComingSoon` cuando todavía no hay sesión, hay un error de red, o el
 * backend v2.1 aún no está desplegado (`services/api.ts` hace ese fallback).
 *
 * Todo lo que genera `getAulaMock` es DATO DE EJEMPLO: ninguna acción real
 * ocurre al interactuar con estos datos.
 */

import type {
  AulaAgregadoMock,
  AnuncioMock,
  CicloMock,
  ClaseEnVivoMock,
  DocenteMock,
  GrabacionMock,
  GrupoWhatsappMock,
  HorarioItemMock,
  MaterialMock,
  MatriculaMock,
  ConceptoPagoMock,
  RecursoMock,
  SimulacroCicloMock,
} from './aulaTypes';

export * from './aulaTypes';

/** `YYYY-MM-DD` de hoy +/- `dias`. A diferencia del resto del mock (ciclo ficticio 2027), las
 * secciones "Clases en vivo"/"Grabaciones" se generan relativas al reloj real del dispositivo,
 * para que la demo de "en vivo ahora / próxima / pasada" y el countdown de Inicio se vean
 * siempre coherentes el día que alguien abra la vista previa, sea cual sea esa fecha. */
function isoDateOffset(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function horaOffset(horas: number): string {
  const d = new Date();
  d.setHours(d.getHours() + horas, 0, 0, 0);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

/**
 * Payload de ejemplo — misma forma que devolvería `getAula(universidad, dni)`
 * (propuesta v2.1). Se genera con el nombre de la universidad activa para
 * que la vista previa se sienta propia de cada universidad, no genérica.
 */
export function getAulaMock(universidad: string, nombreUniversidad: string): AulaAgregadoMock {
  const idCiclo = `${universidad}-verano-2027-1`;

  const ciclo: CicloMock = {
    idCiclo,
    universidad,
    nombre: `Ciclo Verano ${nombreUniversidad} 2027-I`,
    proceso: 'ORDINARIO',
    fechaInicio: '2027-01-12',
    fechaFin: '2027-04-30',
    turno: 'Mañana',
    aforo: 40,
    precioMatricula: 80,
    precioMensualidad: 180,
    nMensualidades: 4,
    estado: 'en_curso',
  };

  const matricula: MatriculaMock = {
    dni: '00000000',
    idCiclo,
    estado: 'matriculado',
    turnoElegido: 'Mañana',
    fechaInscripcion: '2027-01-05',
  };

  const horario: HorarioItemMock[] = [
    { dia: 'lunes', horaInicio: '08:00', horaFin: '09:30', curso: 'Aritmética', docente: 'Prof. Rosa Quispe', modalidad: 'virtual', enlaceMeet: 'https://meet.google.com/ejemplo-aula' },
    { dia: 'lunes', horaInicio: '09:45', horaFin: '11:15', curso: 'Comunicación', docente: 'Prof. Luis Mamani', modalidad: 'virtual', enlaceMeet: 'https://meet.google.com/ejemplo-aula' },
    { dia: 'martes', horaInicio: '08:00', horaFin: '09:30', curso: 'Álgebra', docente: 'Prof. Rosa Quispe', modalidad: 'virtual', enlaceMeet: 'https://meet.google.com/ejemplo-aula' },
    { dia: 'miercoles', horaInicio: '08:00', horaFin: '09:30', curso: 'Física', docente: 'Prof. Edwin Ccama', modalidad: 'presencial', aulaFisica: 'Aula 302 · Sede Salcedo' },
    { dia: 'jueves', horaInicio: '08:00', horaFin: '09:30', curso: 'Química', docente: 'Prof. Katia Apaza', modalidad: 'virtual', enlaceMeet: 'https://meet.google.com/ejemplo-aula' },
    { dia: 'viernes', horaInicio: '08:00', horaFin: '09:30', curso: 'Razonamiento Matemático', docente: 'Prof. Rosa Quispe', modalidad: 'virtual', enlaceMeet: 'https://meet.google.com/ejemplo-aula' },
    { dia: 'sabado', horaInicio: '09:00', horaFin: '11:00', curso: 'Simulacro semanal', docente: 'Coordinación', modalidad: 'presencial', aulaFisica: 'Aula 302 · Sede Salcedo' },
  ];

  const docentes: DocenteMock[] = [
    { idDocente: 'd1', nombre: 'Prof. Rosa Quispe', curso: 'Aritmética / Álgebra / Razonamiento Matemático', bioCorta: 'Licenciada en Matemática, 9 años preparando postulantes' },
    { idDocente: 'd2', nombre: 'Prof. Luis Mamani', curso: 'Comunicación', bioCorta: 'Literato, especialista en comprensión lectora' },
    { idDocente: 'd3', nombre: 'Prof. Edwin Ccama', curso: 'Física', bioCorta: 'Ingeniero, docente de física preuniversitaria' },
    { idDocente: 'd4', nombre: 'Prof. Katia Apaza', curso: 'Química', bioCorta: 'Química farmacéutica, 6 años en academias' },
  ];

  const materiales: MaterialMock[] = [
    { idMaterial: 'm1', semana: 3, curso: 'Aritmética', titulo: 'Separata 3 — Razones y proporciones', tipo: 'pdf', urlDrive: 'https://drive.google.com/ejemplo-separata-3', fechaPublicacion: '2027-02-01', destacado: true },
    { idMaterial: 'm2', semana: 3, curso: 'Álgebra', titulo: 'Práctica dirigida 3 — Factorización', tipo: 'pdf', urlDrive: 'https://drive.google.com/ejemplo-pd-3', fechaPublicacion: '2027-02-01', destacado: false },
    { idMaterial: 'm3', semana: 2, curso: 'Comunicación', titulo: 'Videoclase — Comprensión lectora inferencial', tipo: 'video', urlDrive: 'https://drive.google.com/ejemplo-video-2', fechaPublicacion: '2027-01-25', destacado: false },
    { idMaterial: 'm4', semana: 2, curso: 'Física', titulo: 'Formulario de cinemática', tipo: 'pdf', urlDrive: 'https://drive.google.com/ejemplo-formulario', fechaPublicacion: '2027-01-24', destacado: false },
    { idMaterial: 'm5', semana: 1, curso: 'Química', titulo: 'Enlace — Tabla periódica interactiva', tipo: 'enlace', urlDrive: 'https://drive.google.com/ejemplo-tabla', fechaPublicacion: '2027-01-18', destacado: false },
  ];

  const anuncios: AnuncioMock[] = [
    { idAnuncio: 'a1', fecha: '2027-02-03', titulo: 'Simulacro semanal se adelanta a las 9:00 a.m.', cuerpo: 'Por mantenimiento del auditorio, el simulacro del sábado empieza 30 min antes. Llega con anticipación.', fijado: true },
    { idAnuncio: 'a2', fecha: '2027-01-28', titulo: 'Nueva separata de Aritmética disponible', cuerpo: 'Ya está publicada la separata de la semana 3 en la sección de materiales.', fijado: false },
    { idAnuncio: 'a3', fecha: '2027-01-20', titulo: 'Bienvenida al ciclo', cuerpo: 'Recuerda unirte al grupo de WhatsApp de tu turno para no perderte los avisos del día a día.', fijado: false },
  ];

  const grupoWhatsapp: GrupoWhatsappMock = {
    nombreGrupo: `${nombreUniversidad} Verano 2027-I · Turno Mañana`,
    enlaceInvitacion: 'https://chat.whatsapp.com/ejemplo-grupo-aula',
    estado: 'activo',
  };

  const conceptos: ConceptoPagoMock[] = [
    { concepto: 'matricula', etiqueta: 'Matrícula', monto: ciclo.precioMatricula, estado: 'verificado', fechaVerificacion: '2027-01-06' },
    { concepto: 'mensualidad_1', etiqueta: 'Mensualidad 1', monto: ciclo.precioMensualidad, estado: 'verificado', fechaVerificacion: '2027-02-02' },
    { concepto: 'mensualidad_2', etiqueta: 'Mensualidad 2', monto: ciclo.precioMensualidad, estado: 'pendiente', fechaVencimiento: '2027-03-01' },
    { concepto: 'mensualidad_3', etiqueta: 'Mensualidad 3', monto: ciclo.precioMensualidad, estado: 'pendiente', fechaVencimiento: '2027-04-01' },
  ];

  const simulacrosCiclo: SimulacroCicloMock[] = [
    { fecha: '2027-01-24', proceso: 'ORDINARIO', puntaje: 1580, puntajeMax: 3000, porcentaje: 52.7 },
    { fecha: '2027-01-31', proceso: 'ORDINARIO', puntaje: 1720, puntajeMax: 3000, porcentaje: 57.3 },
    { fecha: '2027-02-07', proceso: 'ORDINARIO', puntaje: 1890, puntajeMax: 3000, porcentaje: 63.0 },
  ];

  // Relativas a "ahora" (ver isoDateOffset/horaOffset) para que "Clases en vivo" siempre
  // muestre una sesión EN VIVO, una PRÓXIMA y una PASADA sin importar cuándo se abra la demo.
  const clasesEnVivo: ClaseEnVivoMock[] = [
    { idClase: 'cv1', fecha: isoDateOffset(0), horaInicio: horaOffset(-1), horaFin: horaOffset(1), curso: 'Aritmética', docente: 'Prof. Rosa Quispe', plataforma: 'meet', enlace: 'https://meet.google.com/ejemplo-aula', estado: 'programada' },
    { idClase: 'cv2', fecha: isoDateOffset(0), horaInicio: horaOffset(3), horaFin: horaOffset(4), curso: 'Comunicación', docente: 'Prof. Luis Mamani', plataforma: 'zoom', enlace: 'https://zoom.us/j/ejemplo-aula', estado: 'programada' },
    { idClase: 'cv3', fecha: isoDateOffset(1), horaInicio: '08:00', horaFin: '09:30', curso: 'Álgebra', docente: 'Prof. Rosa Quispe', plataforma: 'meet', enlace: 'https://meet.google.com/ejemplo-aula', estado: 'programada' },
    { idClase: 'cv4', fecha: isoDateOffset(-1), horaInicio: '08:00', horaFin: '09:30', curso: 'Física', docente: 'Prof. Edwin Ccama', plataforma: 'zoom', enlace: 'https://zoom.us/j/ejemplo-aula', estado: 'programada' },
    { idClase: 'cv5', fecha: isoDateOffset(2), horaInicio: '08:00', horaFin: '09:30', curso: 'Química', docente: 'Prof. Katia Apaza', plataforma: 'meet', enlace: 'https://meet.google.com/ejemplo-aula', estado: 'cancelada' },
  ];

  const grabaciones: GrabacionMock[] = [
    { idGrabacion: 'g1', fecha: '2027-02-01', curso: 'Aritmética', docente: 'Prof. Rosa Quispe', titulo: 'Clase 8 — Razones y proporciones', urlVideo: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duracionMin: 78 },
    { idGrabacion: 'g2', fecha: '2027-01-28', curso: 'Comunicación', docente: 'Prof. Luis Mamani', titulo: 'Clase 7 — Comprensión lectora inferencial', urlVideo: 'https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view', duracionMin: 65 },
    { idGrabacion: 'g3', fecha: '2027-01-25', curso: 'Física', docente: 'Prof. Edwin Ccama', titulo: 'Clase 6 — Cinemática: MRU y MRUV', urlVideo: 'https://youtu.be/oHg5SJYRHA0', duracionMin: 82 },
    { idGrabacion: 'g4', fecha: '2027-01-21', curso: 'Química', docente: 'Prof. Katia Apaza', titulo: 'Clase 5 — Estructura atómica', urlVideo: 'https://drive.google.com/file/d/2b3c4d5e6f7g8h9i0j1k/view', duracionMin: 70 },
  ];

  const recursos: RecursoMock[] = [
    { idRecurso: 'r1', titulo: 'Simulador de tabla periódica', descripcion: 'Tabla periódica interactiva con propiedades de cada elemento — útil para Química.', url: 'https://ptable.com/', categoria: 'Química' },
    { idRecurso: 'r2', titulo: 'Calculadora científica online', descripcion: 'Calculadora con funciones trigonométricas y logarítmicas para practicar Aritmética/Álgebra.', url: 'https://www.desmos.com/scientific', categoria: 'Matemática' },
    { idRecurso: 'r3', titulo: 'Videoclase — Análisis literario', descripcion: 'Complemento externo para reforzar comprensión lectora.', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', categoria: 'Comunicación' },
    { idRecurso: 'r4', titulo: 'Guía oficial del proceso de admisión', descripcion: 'Página institucional con el cronograma y requisitos del proceso.', url: 'https://www.gob.pe/', categoria: 'General' },
  ];

  return {
    tieneCicloActivo: true,
    ciclo,
    matricula,
    horario,
    docentes,
    materiales,
    anuncios,
    grupoWhatsapp,
    pagos: { estadoGeneral: 'en_revision', conceptos },
    simulacrosCiclo,
    clasesEnVivo,
    grabaciones,
    recursos,
  };
}
