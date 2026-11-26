// Genera docs/configuraciones/<uni>/config_examen.csv + config_escala.csv a partir de un informe
// de investigación con bloques ```csv en el formato pedido a la IA:
//   examen: universidad,proceso,division,division_tipo,curso,n_preguntas,puntos_correcta,
//           puntos_incorrecta,puntos_blanco,factor_escala,peso,orden
//   escala: universidad,proceso,motor,escala_total,duracion_min,n_preguntas_total,
//           factor_escala,minimo_aprobatorio,fuente,notas
// Uso: node gen_puntajes.mjs <ROOT del repo> <informe.md> [informe2.md ...]
//
// Corrección automática (documentada): si con factor_escala ≠ 1 la suma Σ n × puntos_correcta
// ya da escala_total, el informe expresó los puntos YA convertidos y además dio el factor
// (se contaría dos veces). En ese caso puntos_correcta/incorrecta/blanco se dividen por el
// factor, para que la hoja guarde puntos brutos y el factor se aplique una sola vez.
import fs from 'node:fs';
import path from 'node:path';

const [ROOT, ...fuentes] = process.argv.slice(2);

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
const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const num = (v) => (v === '' || v === undefined ? null : Number(String(v).replace(',', '.')));
const redondear = (x) => Math.round(x * 1e6) / 1e6;

const examen = {}; const escala = {};
for (const f of fuentes) {
  const txt = fs.readFileSync(f, 'utf8');
  for (const m of txt.matchAll(/```csv\s*\n([\s\S]*?)```/g)) {
    const rows = parseCsv(m[1]);
    const h = rows[0].map((x) => x.trim());
    const obj = rows.slice(1).map((r) => Object.fromEntries(h.map((k, i) => [k, (r[i] ?? '').trim()])));
    if (h.includes('curso')) obj.forEach((o) => (examen[o.universidad] = examen[o.universidad] || []).push(o));
    else if (h.includes('motor')) obj.forEach((o) => { escala[o.universidad] = o; });
  }
}

const H_EX = ['proceso', 'division', 'division_tipo', 'curso', 'n_preguntas', 'puntos_correcta', 'puntos_incorrecta',
  'puntos_blanco', 'factor_escala', 'peso', 'orden'];
const H_ES = ['proceso', 'motor', 'escala_total', 'umbral_excelente', 'umbral_bueno', 'umbral_regular', 'duracion_min',
  'n_preguntas_total', 'factor_escala', 'minimo_aprobatorio', 'fuente', 'notas'];

for (const uni of Object.keys(examen).sort()) {
  const es = escala[uni];
  if (!es) { console.log(`${uni}: falta el bloque de escala, se omite`); continue; }
  const filas = examen[uni];
  const total = num(es.escala_total);
  const factor = num(es.factor_escala) || 1;
  let notas = es.notas || '';

  if (factor !== 1) {
    const porDiv = {};
    filas.forEach((r) => { porDiv[r.division] = (porDiv[r.division] || 0) + num(r.n_preguntas) * num(r.puntos_correcta); });
    const doble = Object.values(porDiv).every((s) => Math.abs(s - total) < 0.5);
    if (doble) {
      filas.forEach((r) => {
        r.puntos_correcta = String(redondear(num(r.puntos_correcta) / factor));
        if (num(r.puntos_incorrecta)) r.puntos_incorrecta = String(redondear(num(r.puntos_incorrecta) / factor));
        if (num(r.puntos_blanco)) r.puntos_blanco = String(redondear(num(r.puntos_blanco) / factor));
      });
      notas += ` [AJUSTE] puntos_correcta venía ya multiplicado por factor_escala ${factor}; se guardó en bruto (÷ ${factor}) para no aplicar el factor dos veces.`;
      console.log(`${uni}: factor ${factor} contado dos veces → puntos pasados a bruto`);
    }
  }

  const dir = path.join(ROOT, 'docs', 'configuraciones', uni);
  fs.mkdirSync(dir, { recursive: true });
  const lex = [H_EX.join(',')].concat(filas.map((r) => H_EX.map((k) => esc(r[k] ?? '')).join(',')));
  fs.writeFileSync(path.join(dir, 'config_examen.csv'), lex.join('\n') + '\n', 'utf8');
  const umb = (p) => (total ? String(redondear(total * p)) : '');
  const fila = {
    proceso: es.proceso || 'ORDINARIO', motor: es.motor, escala_total: es.escala_total,
    umbral_excelente: umb(0.8), umbral_bueno: umb(0.6), umbral_regular: umb(0.4),
    duracion_min: es.duracion_min, n_preguntas_total: es.n_preguntas_total, factor_escala: es.factor_escala,
    minimo_aprobatorio: es.minimo_aprobatorio, fuente: es.fuente, notas: notas.trim()
  };
  fs.writeFileSync(path.join(dir, 'config_escala.csv'),
    [H_ES.join(','), H_ES.map((k) => esc(fila[k] ?? '')).join(',')].join('\n') + '\n', 'utf8');
  console.log(`${uni}: ${filas.length} filas de examen escritas`);
}
