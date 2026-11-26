// Genera docs/configuraciones/<uni>/config_carreras.csv a partir de las respuestas de la
// investigación (resumen*.txt con un bloque ```csv) y valida cada una con el validador REAL
// (config_guard.gs + config_carreras.gs) contra las divisiones de su config_examen.csv.
// Uso: node gen_carreras.mjs <ROOT del repo> <resumen1.txt> [resumen2.txt ...]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const [ROOT, ...fuentes] = process.argv.slice(2);
const GAS = path.join(ROOT, 'google-apps-script');
const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(GAS, 'config_guard.gs'), 'utf8') + '\n' +
  fs.readFileSync(path.join(GAS, 'config_carreras.gs'), 'utf8'), ctx);
const validar = vm.runInContext('validateConfigCarreras_', ctx);

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
const esc = (v) => (/[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);

// 1) Juntar filas de todas las respuestas (bloques ```csv o líneas CSV sueltas).
const porUni = {};
for (const f of fuentes) {
  const txt = fs.readFileSync(f, 'utf8');
  const bloques = [...txt.matchAll(/```csv\s*\n([\s\S]*?)```/g)].map((m) => m[1]);
  const cuerpo = bloques.length ? bloques.join('\n') : txt;
  for (const r of parseCsv(cuerpo)) {
    if (r.length < 3) continue;
    const limpio = r.map((c) => c.trim());
    const uni = limpio[0];
    const division = (limpio[1] || '').replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim();
    const carrera = (limpio[2] || '').replace(/ de la especialidad de /i, ': ').replace(/\s+/g, ' ').trim();
    const sede = limpio[3] || '';
    const fuente = limpio[4] || '';
    if (!/^[a-z]+$/.test(uni) || uni === 'universidad') continue;
    (porUni[uni] = porUni[uni] || []).push({ division, carrera, sede, fuente });
  }
}

// 2) Escribir y validar.
const UNA_AREAS = ['Ingenierías', 'Sociales', 'Biomédicas'];
let fallas = 0;
const resumen = [];
for (const uni of Object.keys(porUni).sort()) {
  const dir = path.join(ROOT, 'docs', 'configuraciones', uni);
  fs.mkdirSync(dir, { recursive: true });
  const filas = porUni[uni];
  const lineas = ['division,carrera,sede,activo,orden,fuente'];
  filas.forEach((f) => lineas.push([f.division, f.carrera, f.sede, 'SI', '', f.fuente].map(esc).join(',')));
  fs.writeFileSync(path.join(dir, 'config_carreras.csv'), lineas.join('\n') + '\n', 'utf8');

  let divisiones;
  const exPath = path.join(dir, 'config_examen.csv');
  if (uni === 'una') divisiones = UNA_AREAS;
  else if (fs.existsSync(exPath)) {
    const ex = parseCsv(fs.readFileSync(exPath, 'utf8'));
    const iDiv = ex[0].indexOf('division');
    divisiones = [...new Set(ex.slice(1).map((r) => r[iDiv]))];
  } else divisiones = [...new Set(filas.map((f) => f.division))]; // sin config todavía

  const r = JSON.parse(JSON.stringify(validar(parseCsv(lineas.join('\n')), divisiones, { hoja: uni + '/config_carreras.csv' })));
  const conteo = Object.entries(r.porDivision).map(([d, l]) => `${d.slice(0, 22)}: ${l.length}`).join(' | ');
  const sinConfig = !fs.existsSync(exPath) && uni !== 'una' ? ' (sin config_examen aún)' : '';
  console.log(`${r.ok ? 'OK ' : 'ERR'} ${uni.padEnd(7)} ${r.total} carreras${sinConfig}  [${conteo}]`);
  r.errores.forEach((e) => console.log('   ✗', e.fila, e.mensaje));
  r.avisos.forEach((e) => console.log('   !', e.fila, e.mensaje));
  if (!r.ok || r.avisos.some((a) => /no existe en el examen/.test(a.mensaje))) fallas++;
  resumen.push({ uni, total: r.total, divisiones: Object.fromEntries(Object.entries(r.porDivision).map(([d, l]) => [d, l.length])) });
}
fs.writeFileSync(path.join(ROOT, 'docs', 'configuraciones', '_carreras_resumen.json'), JSON.stringify(resumen, null, 2) + '\n');
process.exit(fallas ? 1 : 0);
