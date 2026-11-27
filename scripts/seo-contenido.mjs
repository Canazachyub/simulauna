// Páginas de CONTENIDO estáticas para buscadores y asistentes de IA (sin React, sin JS):
//   /<u>/preguntas/            → banco por curso (cifras reales)
//   /<u>/preguntas/<curso>/    → temas del curso + preguntas reales de muestra con clave y justificación
//   /<u>/examenes/             → exámenes de admisión por año
//   /<u>/examenes/<año>/       → exámenes de ese año + preguntas de muestra
// Datos: src/seo/muestras/<u>.json (scripts/exportar_muestras.py). Fórmulas con KaTeX en el build.
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import katex from 'katex';

const UNIS = {
  una: {
    corto: 'UNA Puno',
    largo: 'Universidad Nacional del Altiplano (UNA Puno)',
    ciudad: 'Puno',
    simulacro: '/una/',
    banqueoTema: '/una/banqueo-tema/',
    banqueo: '/una/banqueo/',
  },
  unsa: {
    corto: 'UNSA',
    largo: 'Universidad Nacional de San Agustín de Arequipa (UNSA)',
    ciudad: 'Arequipa',
    simulacro: '/unsa/',
    banqueoTema: null,
    banqueo: null,
  },
};

const LETRAS = ['A', 'B', 'C', 'D', 'E'];
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (n) => Number(n).toLocaleString('es-PE');
const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

/** Texto con fórmulas $…$ → HTML. Devuelve null si alguna fórmula no compila (la pregunta se omite). */
function conFormulas(texto) {
  const partes = String(texto).split(/(\$[^$]+\$)/g);
  let html = '';
  for (const p of partes) {
    if (p.length > 2 && p.startsWith('$') && p.endsWith('$')) {
      try {
        html += katex.renderToString(p.slice(1, -1), { throwOnError: true, strict: 'ignore' });
      } catch {
        return null;
      }
    } else {
      html += esc(p);
    }
  }
  return html;
}

/** Texto plano para JSON-LD / descripciones (fórmulas sin el $). */
const plano = (t) => String(t).replace(/\$([^$]+)\$/g, '$1').replace(/\\displaystyle\s*/g, '').trim();

function preguntaHtml(q, n, id) {
  const enunciado = conFormulas(q.texto);
  const opciones = q.opciones.map(conFormulas);
  const just = conFormulas(q.justificacion);
  if (enunciado === null || just === null || opciones.some((o) => o === null)) return null;
  const meta = [q.examen && `Examen ${esc(q.examen)}`, q.curso && esc(q.curso), q.tema && esc(q.tema)].filter(Boolean).join(' · ');
  return `<article class="q" id="${id}">
  <p class="meta">${meta}</p>
  <h3><span class="n">${n}.</span> ${enunciado}</h3>
  ${q.imagen ? `<img src="${esc(q.imagen)}" alt="Figura de la pregunta ${n}${q.curso ? ' de ' + esc(q.curso) : ''}" loading="lazy" decoding="async">` : ''}
  <ol class="ops">${opciones.map((o, i) => `<li><b>${LETRAS[i]})</b> ${o}</li>`).join('')}</ol>
  <details><summary>Ver respuesta y solución</summary>
    <p><b>Respuesta correcta: ${LETRAS[q.correcta]})</b> ${opciones[q.correcta]}</p>
    <p><b>Solución:</b> ${just}</p>
  </details>
</article>`;
}

function preguntasHtml(lista, prefijo) {
  const out = [];
  for (const q of lista) {
    const h = preguntaHtml(q, out.length + 1, `${prefijo}-${out.length + 1}`);
    if (h) out.push(h);
  }
  return out;
}

const CSS = `
:root{--azul:#003D7A;--azul2:#0050A3;--oro:#D4AF37;--tinta:#1e293b;--gris:#64748b;--borde:#e2e8f0;--fondo:#fdfbf5}
*{box-sizing:border-box}body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--tinta);background:var(--fondo)}
a{color:var(--azul2)}header.top{background:var(--azul);color:#fff}header.top .in,main,footer .in{max-width:860px;margin:0 auto;padding:0 16px}
header.top .in{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;min-height:56px}header.top a{color:#fff;text-decoration:none;font-weight:600;font-size:15px}
header.top .marca{font-weight:800;font-size:18px;margin-right:auto}nav.migas{font-size:14px;color:var(--gris);margin:18px 0 0}nav.migas a{color:var(--gris)}
h1{font-size:clamp(26px,5vw,36px);line-height:1.2;margin:10px 0 12px;color:#0f172a}h2{font-size:22px;margin:34px 0 10px;color:#0f172a}
.lead{font-size:17px;color:#334155}.datos{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:18px 0}
.datos div{background:#fff;border:1px solid var(--borde);border-radius:14px;padding:12px 14px}.datos b{display:block;font-size:24px;color:var(--azul)}.datos span{font-size:13px;color:var(--gris)}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--borde);border-radius:12px;overflow:hidden;font-size:15px}
th,td{padding:8px 12px;text-align:left;border-bottom:1px solid var(--borde)}th{background:#f1f5f9;font-size:13px;text-transform:uppercase;letter-spacing:.03em;color:#475569}td.r,th.r{text-align:right}
.q{background:#fff;border:1px solid var(--borde);border-radius:16px;padding:16px 18px;margin:14px 0}.q h3{font-size:17px;font-weight:600;margin:4px 0 10px;line-height:1.5}
.q .n{color:var(--azul)}.q .meta{margin:0;font-size:13px;color:var(--gris)}.q img{max-width:100%;height:auto;border-radius:8px;margin:4px 0 8px}
.ops{list-style:none;padding:0;margin:0 0 10px}.ops li{padding:4px 0}details{background:#f8fafc;border-radius:10px;padding:8px 12px}
summary{cursor:pointer;font-weight:700;color:var(--azul2)}.cta{background:var(--azul);color:#fff;border-radius:18px;padding:18px 20px;margin:28px 0}
.cta p{margin:0 0 12px}.cta a{display:inline-block;background:var(--oro);color:#1f1600;font-weight:800;text-decoration:none;padding:10px 16px;border-radius:999px;margin:4px 8px 4px 0}
.cta a.sec{background:#fff;color:var(--azul)}ul.enl{columns:2 220px;padding-left:18px}ul.enl li{margin:3px 0}
footer{margin-top:48px;border-top:1px solid var(--borde);background:#fff;font-size:14px;color:var(--gris)}footer .in{padding:20px 16px}
.katex{font-size:1.05em}.katex-display{overflow-x:auto;overflow-y:hidden}`;

export function generarContenido({ raiz, dist, sitio }) {
  const { url, nombre, imagen } = sitio;
  const rutas = [];
  const katexDir = join(raiz, 'node_modules', 'katex', 'dist');
  if (existsSync(katexDir)) {
    mkdirSync(join(dist, 'katex'), { recursive: true });
    cpSync(join(katexDir, 'katex.min.css'), join(dist, 'katex', 'katex.min.css'));
    cpSync(join(katexDir, 'fonts'), join(dist, 'katex', 'fonts'), { recursive: true });
  }
  const can = (ruta) => `${url}${ruta}`;
  const hoy = new Date().toISOString().slice(0, 10);

  function pagina({ ruta, title, description, migas, h1, cuerpo, ld = [], prioridad = '0.6' }) {
    const migasLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: migas.map(([n, r], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: can(r) })),
    };
    const html = `<!doctype html>
<html lang="es-PE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="${can(ruta)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="article"><meta property="og:site_name" content="${esc(nombre)}"><meta property="og:locale" content="es_PE">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${can(ruta)}"><meta property="og:image" content="${url}${imagen}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${url}${imagen}">
<meta property="article:modified_time" content="${hoy}">
<link rel="stylesheet" href="/katex/katex.min.css">
<style>${CSS}</style>
${[migasLd, {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: can(ruta),
    inLanguage: 'es-PE',
    dateModified: hoy,
    isPartOf: { '@id': `${url}/#sitio` },
    publisher: { '@id': `${url}/#organizacion` },
    author: { '@type': 'Organization', '@id': `${url}/#organizacion`, name: nombre },
  }, ...ld].map(jsonLd).join('\n')}
</head>
<body>
<header class="top"><div class="in"><a class="marca" href="/">Sinapsis Preu</a>
<a href="/una/">Simulacro UNA</a><a href="/una/preguntas/">Preguntas UNA</a><a href="/una/examenes/">Exámenes UNA</a><a href="/unsa/">UNSA</a></div></header>
<main>
<nav class="migas" aria-label="Migas de pan">${migas.map(([n, r], i) => (i < migas.length - 1 ? `<a href="${r}">${esc(n)}</a> › ` : esc(n))).join('')}</nav>
<h1>${esc(h1)}</h1>
${cuerpo}
</main>
<footer><div class="in"><b>${esc(nombre)}</b> · Simulacros de examen de admisión con preguntas reales de años anteriores, hechos en Puno, Perú.
Las preguntas provienen de exámenes de admisión públicos de cada universidad; ${esc(nombre)} no está afiliado a ninguna universidad.
· <a href="/preguntas-frecuentes/">Preguntas frecuentes</a> · <a href="/nosotros/">Nosotros</a> · <a href="/terminos/">Términos</a> · Actualizado: ${hoy}</div></footer>
</body>
</html>
`;
    const destino = join(dist, ruta.slice(1), 'index.html');
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, html);
    rutas.push({ ruta, prioridad });
  }

  for (const [codigo, u] of Object.entries(UNIS)) {
    const archivo = join(raiz, 'src', 'seo', 'muestras', `${codigo}.json`);
    if (!existsSync(archivo)) continue;
    const d = JSON.parse(readFileSync(archivo, 'utf8'));
    const base = `/${codigo}`;
    const inicio = ['Inicio', '/'];
    const uniMiga = [`Simulacro ${u.corto}`, `${base}/`];
    const preguntasMiga = [`Preguntas ${u.corto}`, `${base}/preguntas/`];
    const examenesMiga = [`Exámenes ${u.corto}`, `${base}/examenes/`];
    const rango = `${d.anioMin}–${d.anioMax}`;
    const ctaGeneral = (curso) => `<div class="cta"><p><b>¿Quieres practicar con todo el banco?</b> ${curso
      ? `Hay ${num(curso.total)} preguntas de ${esc(curso.curso)} de la ${esc(u.corto)}, ordenadas por tema y con solución.`
      : `Hay ${num(d.total)} preguntas de ${d.examenes} exámenes de admisión de la ${esc(u.corto)} (${rango}).`} Tu primer simulacro es gratis.</p>
<a href="${u.simulacro}">Rendir simulacro gratis</a>${u.banqueoTema ? `<a class="sec" href="${u.banqueoTema}">Banqueo por tema</a>` : ''}</div>`;

    // ---- Hub de preguntas por curso
    pagina({
      ruta: `${base}/preguntas/`,
      prioridad: '0.8',
      title: `Preguntas del examen de admisión ${u.corto} por curso, con respuestas | ${nombre}`,
      description: `${num(d.total)} preguntas reales de ${d.examenes} exámenes de admisión de la ${u.corto} (${rango}) ordenadas por curso y tema, con clave y solución. Ejemplos gratis de cada curso.`,
      migas: [inicio, uniMiga, preguntasMiga],
      h1: `Preguntas del examen de admisión ${u.corto} por curso`,
      cuerpo: `<p class="lead">Banco de preguntas de exámenes de admisión de la ${esc(u.largo)}, de ${rango}. Cada curso muestra cuántas preguntas hay, de qué temas y algunos ejemplos resueltos.</p>
<div class="datos"><div><b>${num(d.total)}</b><span>preguntas reales</span></div><div><b>${d.examenes}</b><span>exámenes de admisión</span></div><div><b>${d.cursos.length}</b><span>cursos</span></div><div><b>${rango}</b><span>años</span></div></div>
<h2>Cursos del examen de admisión ${esc(u.corto)}</h2>
<table><thead><tr><th>Curso</th><th class="r">Preguntas</th><th class="r">Temas</th></tr></thead><tbody>
${d.cursos.map((c) => `<tr><td><a href="${base}/preguntas/${c.slug}/">${esc(c.curso)}</a></td><td class="r">${num(c.total)}</td><td class="r">${c.temas.length}</td></tr>`).join('\n')}
</tbody></table>
${ctaGeneral(null)}
<h2>Exámenes por año</h2><ul class="enl">${d.anios.map((a) => `<li><a href="${base}/examenes/${a.anio}/">Examen de admisión ${esc(u.corto)} ${a.anio}</a></li>`).join('')}</ul>`,
      ld: [{
        '@context': 'https://schema.org', '@type': 'ItemList', name: `Preguntas del examen de admisión ${u.corto} por curso`,
        itemListElement: d.cursos.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: `Preguntas de ${c.curso} ${u.corto}`, url: can(`${base}/preguntas/${c.slug}/`) })),
      }],
    });

    // ---- Página por curso
    for (const c of d.cursos) {
      const qs = preguntasHtml(c.muestras, c.slug);
      const top = c.temas.slice(0, 5).map((t) => t.tema).join(', ');
      pagina({
        ruta: `${base}/preguntas/${c.slug}/`,
        prioridad: '0.7',
        title: `Preguntas de ${c.curso} del examen de admisión ${u.corto} (con respuestas) | ${nombre}`,
        description: `${num(c.total)} preguntas de ${c.curso} de exámenes de admisión de la ${u.corto}. Temas más preguntados: ${top}. Ejemplos resueltos con clave y solución.`,
        migas: [inicio, uniMiga, preguntasMiga, [c.curso, `${base}/preguntas/${c.slug}/`]],
        h1: `Preguntas de ${c.curso} – examen de admisión ${u.corto}`,
        cuerpo: `<p class="lead">En los exámenes de admisión de la ${esc(u.largo)} hemos reunido <b>${num(c.total)} preguntas de ${esc(c.curso)}</b>, tomadas de ${c.examenes} exámenes (${rango}). Los temas que más se repiten son ${esc(top)}.</p>
<h2>Temas de ${esc(c.curso)} que más vienen en el examen</h2>
<table><thead><tr><th>Tema</th><th class="r">Preguntas</th><th class="r">% del curso</th></tr></thead><tbody>
${c.temas.slice(0, 20).map((t) => `<tr><td>${esc(t.tema)}</td><td class="r">${num(t.total)}</td><td class="r">${((t.total / c.total) * 100).toFixed(1)} %</td></tr>`).join('\n')}
</tbody></table>
<h2>${qs.length} preguntas de ${esc(c.curso)} resueltas</h2>
<p>Preguntas reales de exámenes de admisión de la ${esc(u.corto)}. Intenta resolverlas antes de abrir la solución.</p>
${qs.join('\n')}
${ctaGeneral(c)}
<h2>Otros cursos</h2><ul class="enl">${d.cursos.filter((x) => x !== c).map((x) => `<li><a href="${base}/preguntas/${x.slug}/">Preguntas de ${esc(x.curso)}</a></li>`).join('')}</ul>`,
      });
    }

    // ---- Hub de exámenes por año
    pagina({
      ruta: `${base}/examenes/`,
      prioridad: '0.8',
      title: `Exámenes de admisión ${u.corto} de años anteriores (${rango}) | ${nombre}`,
      description: `Exámenes de admisión de la ${u.corto} de ${rango}: ${d.examenes} exámenes y ${num(d.total)} preguntas reales con clave. Revisa cada año y practica con un simulacro gratis.`,
      migas: [inicio, uniMiga, examenesMiga],
      h1: `Exámenes de admisión ${u.corto} de años anteriores`,
      cuerpo: `<p class="lead">Exámenes de admisión de la ${esc(u.largo)} de ${rango}, con el número de preguntas de cada año. En cada año verás qué exámenes hubo y preguntas de ejemplo resueltas.</p>
<table><thead><tr><th>Año</th><th class="r">Exámenes</th><th class="r">Preguntas</th></tr></thead><tbody>
${d.anios.map((a) => `<tr><td><a href="${base}/examenes/${a.anio}/">Examen de admisión ${esc(u.corto)} ${a.anio}</a></td><td class="r">${a.examenes.length}</td><td class="r">${num(a.total)}</td></tr>`).join('\n')}
</tbody></table>
${ctaGeneral(null)}`,
    });

    // ---- Página por año
    for (const a of d.anios) {
      const qs = preguntasHtml(a.muestras, `a${a.anio}`);
      pagina({
        ruta: `${base}/examenes/${a.anio}/`,
        prioridad: Number(a.anio) >= 2019 ? '0.7' : '0.5',
        title: `Examen de admisión ${u.corto} ${a.anio}: preguntas y respuestas | ${nombre}`,
        description: `Examen de admisión ${u.corto} ${a.anio}: ${a.examenes.length} exámenes y ${num(a.total)} preguntas con clave. Preguntas de ejemplo resueltas y simulacro gratis.`,
        migas: [inicio, uniMiga, examenesMiga, [a.anio, `${base}/examenes/${a.anio}/`]],
        h1: `Examen de admisión ${u.corto} ${a.anio}`,
        cuerpo: `<p class="lead">Del año ${a.anio} tenemos <b>${num(a.total)} preguntas</b> de ${a.examenes.length} exámenes de admisión de la ${esc(u.largo)}.</p>
<h2>Exámenes de ${a.anio}</h2>
<table><thead><tr><th>Examen</th><th class="r">Preguntas</th></tr></thead><tbody>
${a.examenes.map((e) => `<tr><td>${esc(e.examen)}</td><td class="r">${num(e.total)}</td></tr>`).join('\n')}
</tbody></table>
<h2>Preguntas por curso en ${a.anio}</h2>
<table><thead><tr><th>Curso</th><th class="r">Preguntas</th></tr></thead><tbody>
${a.cursos.map((c) => { const cc = d.cursos.find((x) => x.curso === c.curso); return `<tr><td>${cc ? `<a href="${base}/preguntas/${cc.slug}/">${esc(c.curso)}</a>` : esc(c.curso)}</td><td class="r">${num(c.total)}</td></tr>`; }).join('\n')}
</tbody></table>
${qs.length ? `<h2>Preguntas resueltas del examen ${a.anio}</h2>\n${qs.join('\n')}` : ''}
${ctaGeneral(null)}
<h2>Otros años</h2><ul class="enl">${d.anios.filter((x) => x !== a).map((x) => `<li><a href="${base}/examenes/${x.anio}/">Examen ${esc(u.corto)} ${x.anio}</a></li>`).join('')}</ul>`,
      });
    }
  }
  return rutas;
}
