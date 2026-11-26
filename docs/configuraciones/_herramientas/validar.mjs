// Valida TODAS las configuraciones de docs/configuraciones/<uni>/ con el validador REAL del
// backend (google-apps-script/config_guard.gs + config_carreras.gs), sin Google Sheets.
// Uso (desde la raíz del repo):  node docs/configuraciones/_herramientas/validar.mjs
//   - config_examen.csv + config_escala.csv → validateConfigV2_ (puntajes)
//   - config_carreras.csv                   → validateConfigCarreras_ (desplegable del registro)
// Sale con código 1 si algo falla (sirve para CI).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = process.argv[2] || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const GAS = path.join(ROOT, 'google-apps-script');
const ctx = vm.createContext({ console, Logger: { log() {} } });
vm.runInContext(fs.readFileSync(path.join(GAS, 'config_guard.gs'), 'utf8') + '\n' +
  fs.readFileSync(path.join(GAS, 'config_carreras.gs'), 'utf8'), ctx);

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
  return rows;
}
const leer = (f) => (fs.existsSync(f) ? parseCsv(fs.readFileSync(f, 'utf8')) : null);
const UNA_AREAS = ['Ingenierías', 'Sociales', 'Biomédicas']; // UNA usa sus hojas Configuración_* (legado)

const dir = path.join(ROOT, 'docs', 'configuraciones');
let fallas = 0;
for (const uni of fs.readdirSync(dir).filter((d) => !d.startsWith('_') && fs.statSync(path.join(dir, d)).isDirectory()).sort()) {
  const ex = leer(path.join(dir, uni, 'config_examen.csv'));
  const es = leer(path.join(dir, uni, 'config_escala.csv'));
  const car = leer(path.join(dir, uni, 'config_carreras.csv'));
  let divisiones = uni === 'una' ? UNA_AREAS : null;
  let linea = uni.padEnd(7) + ' ';

  if (ex && es) {
    const r = ctx.validateConfigV2_(ex, es, 'ORDINARIO', {});
    const divs = {};
    if (r.ok) for (const f of r.config.rows) {
      const d = (divs[f.division] = divs[f.division] || { n: 0, max: 0 });
      d.n += f.nPreguntas; d.max += f.nPreguntas * f.puntosCorrecta * (f.factor || 1);
    }
    divisiones = Object.keys(divs);
    linea += `puntajes ${r.ok ? 'OK ' : 'ERR'} (${divisiones.length} div, ` +
      Object.values(divs).map((v) => `${v.n}p/${v.max.toFixed(2)}`).join(' ') + ')';
    if (!r.ok) fallas++;
    console.log(linea);
    r.errores.forEach((e) => console.log('   ✗ puntajes:', e.mensaje));
    r.avisos.forEach((e) => console.log('   ! puntajes:', e.mensaje));
    linea = ' '.repeat(8);
  } else if (uni !== 'una') {
    linea += 'puntajes —   (todavía no hay config_examen/config_escala) ';
  } else {
    linea += 'puntajes —   (UNA usa sus hojas Configuración_*) ';
  }

  if (car) {
    const divs = divisiones || [...new Set(car.slice(1).map((r) => r[0]).filter(Boolean))];
    const r = JSON.parse(JSON.stringify(ctx.validateConfigCarreras_(car, divs, { hoja: uni + '/config_carreras.csv' })));
    const malas = r.avisos.filter((a) => /no existe en el examen|no tiene carrera|duplicado/.test(a.mensaje));
    linea += `carreras ${r.ok && !malas.length ? 'OK ' : 'ERR'} (${r.total} en ${Object.keys(r.porDivision).length} div)`;
    if (!r.ok || malas.length) fallas++;
    console.log(linea);
    r.errores.forEach((e) => console.log('   ✗ carreras:', e.mensaje));
    r.avisos.forEach((e) => console.log('   ! carreras:', e.mensaje));
  } else {
    console.log(linea + 'carreras —   (sin config_carreras: el registro pide texto libre)');
  }
}
console.log(fallas ? `\n${fallas} problema(s).` : '\nTodo OK.');
process.exit(fallas ? 1 : 0);
