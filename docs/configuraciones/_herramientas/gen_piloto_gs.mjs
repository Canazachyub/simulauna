// Genera google-apps-script/piloto_datos.gs a partir de docs/configuraciones/<uni>/*.csv.
// Ese archivo lleva los datos del PILOTO ORDINARIO incrustados para que cargarPilotoOrdinario()
// (piloto_ordinario.gs) arme las 12 universidades en un solo paso, sin importar CSV a mano.
// Uso (desde la raíz del repo):  node docs/configuraciones/_herramientas/gen_piloto_gs.mjs
// Volver a correrlo cada vez que cambie un CSV (y volver a copiar piloto_datos.gs al editor).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.argv[2] || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DIR = path.join(ROOT, 'docs', 'configuraciones');

// carpeta → código del registro maestro (el frontend usa 'sanmarcos' para UNMSM: logo y tema).
// orden = posición en el selector (UNA es 0).
const UNIVERSIDADES = [
  { carpeta: 'una', codigo: 'una', nombre: 'Universidad Nacional del Altiplano', corto: 'UNA Puno', orden: 0 },
  { carpeta: 'unsa', codigo: 'unsa', nombre: 'Universidad Nacional de San Agustín de Arequipa', corto: 'UNSA', orden: 1 },
  { carpeta: 'unaj', codigo: 'unaj', nombre: 'Universidad Nacional de Juliaca', corto: 'UNAJ', orden: 2 },
  { carpeta: 'unmsm', codigo: 'sanmarcos', nombre: 'Universidad Nacional Mayor de San Marcos', corto: 'UNMSM', orden: 3 },
  { carpeta: 'uni', codigo: 'uni', nombre: 'Universidad Nacional de Ingeniería', corto: 'UNI', orden: 4 },
  { carpeta: 'unsaac', codigo: 'unsaac', nombre: 'Universidad Nacional de San Antonio Abad del Cusco', corto: 'UNSAAC', orden: 5 },
  { carpeta: 'uncp', codigo: 'uncp', nombre: 'Universidad Nacional del Centro del Perú', corto: 'UNCP', orden: 6 },
  { carpeta: 'unfv', codigo: 'unfv', nombre: 'Universidad Nacional Federico Villarreal', corto: 'UNFV', orden: 7 },
  { carpeta: 'unalm', codigo: 'unalm', nombre: 'Universidad Nacional Agraria La Molina', corto: 'UNALM', orden: 8 },
  { carpeta: 'unt', codigo: 'unt', nombre: 'Universidad Nacional de Trujillo', corto: 'UNT', orden: 9 },
  { carpeta: 'unp', codigo: 'unp', nombre: 'Universidad Nacional de Piura', corto: 'UNP', orden: 10 },
  { carpeta: 'unsch', codigo: 'unsch', nombre: 'Universidad Nacional de San Cristóbal de Huamanga', corto: 'UNSCH', orden: 11 },
  { carpeta: 'unc', codigo: 'unc', nombre: 'Universidad Nacional de Cajamarca', corto: 'UNC', orden: 12 }
];

function parseCsv(txt) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (q) { if (ch === '"' && txt[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}
// Números como número (Sheets los guarda así y el validador no depende de la coma decimal).
const celda = (v) => (/^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : v);
function leer(uni, hoja, { sinFuente } = {}) {
  const f = path.join(DIR, uni, hoja + '.csv');
  if (!fs.existsSync(f)) return null;
  let rows = parseCsv(fs.readFileSync(f, 'utf8'));
  if (sinFuente) {
    const i = rows[0].indexOf('fuente');
    if (i !== -1) rows = rows.map((r) => r.filter((_, j) => j !== i));
  }
  return rows.map((r, i) => (i === 0 ? r : r.map(celda)));
}

const datos = {};
for (const u of UNIVERSIDADES) {
  const examen = leer(u.carpeta, 'config_examen');
  const escala = leer(u.carpeta, 'config_escala');
  const carreras = leer(u.carpeta, 'config_carreras', { sinFuente: true }); // la fuente queda en el CSV
  if (u.codigo !== 'una' && !(examen && escala)) throw new Error(`${u.carpeta}: faltan config_examen/config_escala`);
  datos[u.codigo] = { nombre: u.nombre, nombreCorto: u.corto, orden: u.orden, examen, escala, carreras };
}

const salida = `/**
 * DATOS DEL PILOTO ORDINARIO — ARCHIVO GENERADO, NO EDITAR A MANO.
 * Origen: docs/configuraciones/<uni>/*.csv (fuentes oficiales en docs/configuraciones/_fuentes/).
 * Regenerar: node docs/configuraciones/_herramientas/gen_piloto_gs.mjs
 * Lo usa cargarPilotoOrdinario() (piloto_ordinario.gs).
 */
const PILOTO_ORDINARIO_DATOS_ = ${JSON.stringify(datos)};
`;
const destino = path.join(ROOT, 'google-apps-script', 'piloto_datos.gs');
fs.writeFileSync(destino, salida, 'utf8');
console.log(`piloto_datos.gs: ${Object.keys(datos).length} universidades, ${(salida.length / 1024).toFixed(0)} KB`);
