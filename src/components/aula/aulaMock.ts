/**
 * Mock local del Aula Virtual — espejo EXACTO del modelo de datos propuesto en
 * docs/AULA_VIRTUAL_DISENO.md (§1-§7 y §12). Cada tipo aquí corresponde a una
 * fila de una hoja del spreadsheet CORE que aún no existe (`ciclos`,
 * `matriculas`, `pagos`, `horario`, `docentes`, `materiales`,
 * `grupos_whatsapp`, `anuncios`). El día que el backend v2.1 exponga la
 * action `getAula` (ver §10 del documento de diseño), el único cambio en
 * los componentes de `src/components/aula/` es reemplazar el import de
 * este archivo por una llamada a `services/api.ts` — la forma de los datos
 * no cambia.
 *
 * Todo lo que aparece aquí es DATO DE EJEMPLO para vender la experiencia en
 * la vista previa de AulaComingSoon (ver ese componente): ninguna acción
 * real ocurre al interactuar con estos datos.
 */

export type EstadoCiclo = 'inscripciones_abiertas' | 'en_curso' | 'cerrado';
export type EstadoMatricula = 'preinscrito' | 'matriculado' | 'retirado';
export type MedioPago = 'yape' | 'plin' | 'transferencia' | 'efectivo';
export type EstadoPago = 'pendiente' | 'verificado' | 'rechazado';
export type TipoMaterial = 'pdf' | 'video' | 'enlace';
export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
export type EstadoGrupo = 'activo' | 'lleno' | 'cerrado';

/** Videollamada del proveedor — ninguno de los dos permite embebido (ver ResourceViewer.tsx). */
export type PlataformaClase = 'meet' | 'zoom';
/** Estado que el coordinador puede sobrescribir a mano (ej. suspender una sesión). El estado
 * "en vivo ahora / próxima / pasada" que ve el alumno NO es este campo — se deriva en el
 * cliente comparando `fecha`+`horaInicio`/`horaFin` con el reloj del dispositivo (ver
 * `getEstadoClaseEnVivo`), porque pedirle al coordinador que actualice una celda de Sheets
 * al segundo exacto en que empieza cada clase no es realista. */
export type EstadoClaseAgenda = 'programada' | 'cancelada';
/** Estado derivado, solo para la UI (nunca se guarda en la hoja). */
export type EstadoClaseDerivado = 'en_vivo' | 'proxima' | 'pasada' | 'cancelada';

export interface CicloMock {
  idCiclo: string;
  universidad: string;
  nombre: string;
  proceso: 'ORDINARIO' | 'CEPRE' | 'EXTRAORDINARIO';
  fechaInicio: string;
  fechaFin: string;
  turno: string;
  aforo: number;
  precioMatricula: number;
  precioMensualidad: number;
  nMensualidades: number;
  estado: EstadoCiclo;
}

export interface MatriculaMock {
  dni: string;
  idCiclo: string;
  estado: EstadoMatricula;
  turnoElegido: string;
  fechaInscripcion: string;
}

export interface ConceptoPagoMock {
  concepto: string;
  etiqueta: string;
  monto: number;
  estado: EstadoPago;
  fechaVencimiento?: string;
  fechaVerificacion?: string;
}

export interface HorarioItemMock {
  dia: DiaSemana;
  horaInicio: string;
  horaFin: string;
  curso: string;
  docente: string;
  modalidad: 'presencial' | 'virtual';
  enlaceMeet?: string;
  aulaFisica?: string;
}

export interface DocenteMock {
  idDocente: string;
  nombre: string;
  curso: string;
  bioCorta?: string;
}

export interface MaterialMock {
  idMaterial: string;
  semana: number;
  curso: string;
  titulo: string;
  tipo: TipoMaterial;
  urlDrive: string;
  fechaPublicacion: string;
  destacado: boolean;
}

export interface AnuncioMock {
  idAnuncio: string;
  fecha: string;
  titulo: string;
  cuerpo: string;
  fijado: boolean;
}

export interface GrupoWhatsappMock {
  nombreGrupo: string;
  enlaceInvitacion: string;
  estado: EstadoGrupo;
}

export interface SimulacroCicloMock {
  fecha: string;
  proceso: string;
  puntaje: number;
  puntajeMax: number;
  porcentaje: number;
}

/** Fila de la hoja `clases_en_vivo` (CORE) — sesión Meet/Zoom del ciclo. Ver
 * docs/AULA_VIRTUAL_DISENO.md §"Arquitectura de navegación del aula (v2)". */
export interface ClaseEnVivoMock {
  idClase: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  curso: string;
  docente: string;
  plataforma: PlataformaClase;
  enlace: string;
  estado: EstadoClaseAgenda;
}

/** Fila de la hoja `grabaciones` (CORE) — video ya grabado (clase pasada, simulacro
 * resuelto, etc.). `urlVideo` puede ser YouTube o Google Drive; ResourceViewer detecta
 * cuál es y arma el iframe embebido correspondiente. */
export interface GrabacionMock {
  idGrabacion: string;
  fecha: string;
  curso: string;
  docente: string;
  titulo: string;
  urlVideo: string;
  duracionMin: number;
}

/** Fila de la hoja `recursos` (CORE) — enlace externo curado por el coordinador
 * (calculadoras, simuladores, videos sueltos, webs de referencia). */
export interface RecursoMock {
  idRecurso: string;
  titulo: string;
  descripcion: string;
  url: string;
  categoria: string;
}

export interface AulaAgregadoMock {
  tieneCicloActivo: boolean;
  ciclo: CicloMock;
  matricula: MatriculaMock;
  horario: HorarioItemMock[];
  docentes: DocenteMock[];
  materiales: MaterialMock[];
  anuncios: AnuncioMock[];
  grupoWhatsapp: GrupoWhatsappMock;
  pagos: {
    estadoGeneral: 'al_dia' | 'en_revision' | 'vencido';
    conceptos: ConceptoPagoMock[];
  };
  simulacrosCiclo: SimulacroCicloMock[];
  clasesEnVivo: ClaseEnVivoMock[];
  grabaciones: GrabacionMock[];
  recursos: RecursoMock[];
}

const DIAS_ORDEN: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

export function ordenDia(dia: DiaSemana): number {
  return DIAS_ORDEN.indexOf(dia);
}

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

/** Combina `fecha` (YYYY-MM-DD) + `hora` (HH:mm) de una fila del mock en un `Date` local. */
function combinarFechaHora(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${hora}:00`);
}

/**
 * Estado derivado de una clase en vivo respecto al reloj del dispositivo — NUNCA se guarda
 * en la hoja `clases_en_vivo` (ver `EstadoClaseAgenda`). `cancelada` (fila del coordinador)
 * manda siempre sobre el cálculo de fechas.
 */
export function getEstadoClaseEnVivo(clase: ClaseEnVivoMock, ahora: Date = new Date()): EstadoClaseDerivado {
  if (clase.estado === 'cancelada') return 'cancelada';
  const inicio = combinarFechaHora(clase.fecha, clase.horaInicio);
  const fin = combinarFechaHora(clase.fecha, clase.horaFin);
  if (ahora >= inicio && ahora <= fin) return 'en_vivo';
  if (ahora < inicio) return 'proxima';
  return 'pasada';
}

/** Próxima clase en vivo (no cancelada, aún no terminada), ordenada por fecha/hora — para el
 * countdown de "Inicio". Si hay una EN VIVO ahora mismo, esa es la "próxima" (ya empezó). */
export function getProximaClaseEnVivoMock(clases: ClaseEnVivoMock[], ahora: Date = new Date()): ClaseEnVivoMock | null {
  const candidatas = clases
    .filter((c) => c.estado !== 'cancelada' && combinarFechaHora(c.fecha, c.horaFin) >= ahora)
    .sort((a, b) => combinarFechaHora(a.fecha, a.horaInicio).getTime() - combinarFechaHora(b.fecha, b.horaInicio).getTime());
  return candidatas[0] || null;
}

/** Próximo bloque de horario respecto a un día/hora dados (mock: siempre relativo al primer bloque de la semana de ejemplo). */
export function getProximaClaseMock(horario: HorarioItemMock[]): HorarioItemMock | null {
  if (horario.length === 0) return null;
  return [...horario].sort((a, b) => ordenDia(a.dia) - ordenDia(b.dia) || a.horaInicio.localeCompare(b.horaInicio))[0];
}

export function getMaterialDestacadoMock(materiales: MaterialMock[]): MaterialMock | null {
  return materiales.find((m) => m.destacado) || materiales[0] || null;
}
