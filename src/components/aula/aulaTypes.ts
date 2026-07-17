/**
 * Tipos + utilidades derivadas del Aula Virtual — espejo 1:1 de
 * `docs/CONTRATO_AULA_V21.md` (backend v2.1, escrito pero aún no desplegado en
 * producción). Vive separado de `aulaMock.ts` para que `services/api.ts` pueda
 * importar SOLO las formas de datos + funciones puras de derivación de estado
 * (`getEstadoClaseEnVivo`, `getProximaClaseEnVivoMock`, etc. — útiles tanto con
 * datos reales como con datos de ejemplo) sin arrastrar el generador de datos
 * de ejemplo (`getAulaMock`, exclusivo de la vista previa de `AulaComingSoon`).
 *
 * `aulaMock.ts` reexporta todo este módulo (`export * from './aulaTypes'`)
 * para no romper los imports existentes de `src/components/aula/*.tsx`.
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
  /** Solo lo trae la API real (docs/CONTRATO_AULA_V21.md §4) — el mock de vista previa no lo
   * necesita porque `AulaComingSoon` usa su propio WhatsApp de lista de espera. */
  whatsappCoordinador?: string;
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

export interface PagosResumenMock {
  estadoGeneral: 'al_dia' | 'en_revision' | 'vencido';
  conceptos: ConceptoPagoMock[];
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
  pagos: PagosResumenMock;
  simulacrosCiclo: SimulacroCicloMock[];
  clasesEnVivo: ClaseEnVivoMock[];
  grabaciones: GrabacionMock[];
  recursos: RecursoMock[];
}

/** Forma exacta de `getAula` cuando el alumno NO tiene acceso (docs/CONTRATO_AULA_V21.md §4):
 * mismos ciclos que devolvería `getCiclos(estado=inscripciones_abiertas)`. */
export interface AulaSinAccesoData {
  matriculado: false;
  tieneCicloActivo: false;
  ciclosDisponibles: CicloMock[];
}

/** Forma exacta de `getAula` cuando el alumno SÍ tiene acceso: mismo agregado que
 * `AulaAgregadoMock` + el campo `matriculado` que exige el contrato explícitamente
 * (`tieneCicloActivo` es el alias que ya trae `AulaAgregadoMock`, ambos con el mismo valor). */
export interface AulaConAccesoData extends AulaAgregadoMock {
  matriculado: true;
}

/** Unión discriminada por `matriculado` — la forma completa de `data` en la respuesta de
 * `getAula` (ver docs/CONTRATO_AULA_V21.md §4). */
export type AulaApiData = AulaSinAccesoData | AulaConAccesoData;

const DIAS_ORDEN: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

export function ordenDia(dia: DiaSemana): number {
  return DIAS_ORDEN.indexOf(dia);
}

/** Combina `fecha` (YYYY-MM-DD) + `hora` (HH:mm) de una fila (mock o real) en un `Date` local. */
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
