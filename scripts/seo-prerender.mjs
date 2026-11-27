// SEO estático tras `vite build` (GitHub Pages no tiene servidor):
//  1. Escribe dist/<ruta>/index.html por cada página de src/seo/paginas.json con su <title>,
//     descripción, canonical, Open Graph, datos estructurados (JSON-LD) y un contenido de respaldo
//     (h1 + texto + enlaces) dentro de #root. Así /una/ responde 200 con HTML propio en vez del
//     404.html de la SPA. React reemplaza ese contenido al montar (createRoot, no hydrate).
//  2. Genera dist/sitemap.xml y dist/robots.txt.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generarContenido } from './seo-contenido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(raiz, 'dist');
const seo = JSON.parse(readFileSync(join(raiz, 'src/seo/paginas.json'), 'utf8'));
const plantilla = readFileSync(join(dist, 'index.html'), 'utf8');
const { url, nombre, imagen, whatsapp } = seo.sitio;
const hoy = new Date().toISOString().slice(0, 10);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const canonica = (ruta) => url + (ruta === '/' ? '/' : `${ruta}/`);
const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

const organizacion = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  '@id': `${url}/#organizacion`,
  name: nombre,
  url: `${url}/`,
  logo: `${url}/favicon.svg`,
  image: `${url}${imagen}`,
  description: 'Preparación preuniversitaria y simulacros de examen de admisión con preguntas reales de universidades del Perú.',
  address: { '@type': 'PostalAddress', addressLocality: 'Puno', addressCountry: 'PE' },
  areaServed: { '@type': 'Country', name: 'Perú' },
  contactPoint: { '@type': 'ContactPoint', telephone: whatsapp, contactType: 'customer service', availableLanguage: 'es' },
};
const sitioWeb = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${url}/#sitio`,
  name: nombre,
  alternateName: ['Sinapsis Preu Simulacros', 'SimulaUNA'],
  url: `${url}/`,
  inLanguage: 'es-PE',
  publisher: { '@id': `${url}/#organizacion` },
};
const faq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: seo.faqInicio.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
};
const migas = (p) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${url}/` },
    ...p.ruta.split('/').filter(Boolean).map((_, i, partes) => {
      const ruta = '/' + partes.slice(0, i + 1).join('/');
      const pag = seo.paginas.find((x) => x.ruta === ruta);
      return { '@type': 'ListItem', position: i + 2, name: pag ? pag.h1 : ruta, item: canonica(ruta) };
    }),
  ],
});

// Enlaces internos rastreables en el contenido de respaldo.
const enlaces = seo.paginas
  .filter((p) => p.ruta !== '/')
  .map((p) => `<li><a href="${canonica(p.ruta)}">${esc(p.h1)}</a></li>`)
  .concat([
    `<li><a href="${url}/una/preguntas/">Preguntas del examen de admisión UNA Puno por curso</a></li>`,
    `<li><a href="${url}/una/examenes/">Exámenes de admisión UNA Puno por año</a></li>`,
    `<li><a href="${url}/unsa/preguntas/">Preguntas del examen de admisión UNSA por curso</a></li>`,
  ])
  .join('');

function reemplazarMeta(html, p) {
  const titulo = esc(p.title), desc = esc(p.description), can = canonica(p.ruta), img = `${url}${imagen}`;
  const quitar = [
    /<title>[\s\S]*?<\/title>/,
    /<meta name="description"[^>]*>/,
    /<meta name="robots"[^>]*>/,
    /<link rel="canonical"[^>]*>/,
    /<meta property="og:[^"]+"[^>]*>/g,
    /<meta name="twitter:[^"]+"[^>]*>/g,
  ];
  for (const r of quitar) html = html.replace(r, '');
  const ld = [organizacion, sitioWeb, ...(p.ruta === '/' ? [faq] : [migas(p)])].map(jsonLd).join('\n    ');
  const cabecera = `<title>${titulo}</title>
    <meta name="description" content="${desc}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${can}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${esc(nombre)}" />
    <meta property="og:locale" content="es_PE" />
    <meta property="og:title" content="${titulo}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:url" content="${can}" />
    <meta property="og:image" content="${img}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${titulo}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${img}" />
    ${ld}
  </head>`;
  html = html.replace('</head>', cabecera);
  const respaldo = `<div id="root"><main style="max-width:760px;margin:0 auto;padding:32px 16px;font-family:system-ui,sans-serif;color:#1e293b">
      <h1>${esc(p.h1)}</h1><p>${esc(p.intro)}</p>
      <nav aria-label="Secciones"><ul>${p.ruta === '/' ? enlaces : `<li><a href="${url}/">Simulacros de admisión de Sinapsis Preu</a></li>${enlaces}`}</ul></nav>
    </main></div>`;
  return html.replace('<div id="root"></div>', respaldo);
}

for (const p of seo.paginas) {
  const destino = p.ruta === '/' ? join(dist, 'index.html') : join(dist, p.ruta.slice(1), 'index.html');
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, reemplazarMeta(plantilla, p));
}

// Páginas de contenido (preguntas por curso y exámenes por año), ver seo-contenido.mjs.
const contenido = generarContenido({ raiz, dist, sitio: seo.sitio });

// Redirecciones de URL que ya conocía Google (UNSA pasó a sus cursos oficiales, 2026-11-27).
const REDIRECCIONES = {
  '/unsa/preguntas/biologia-y-anatomia/': '/unsa/preguntas/biologia/',
  '/unsa/preguntas/comunicacion/': '/unsa/preguntas/lenguaje/',
  '/unsa/preguntas/economia/': '/unsa/preguntas/',
  '/unsa/preguntas/psicologia-y-filosofia/': '/unsa/preguntas/psicologia/',
};
for (const [de, a] of Object.entries(REDIRECCIONES)) {
  const destino = join(dist, de.slice(1), 'index.html');
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, `<!doctype html><html lang="es-PE"><head><meta charset="utf-8"><title>Redirigiendo…</title>
<link rel="canonical" href="${url}${a}"><meta name="robots" content="noindex, follow">
<meta http-equiv="refresh" content="0; url=${a}"></head><body><a href="${a}">Ir a la página</a></body></html>`);
}

const todas = [
  ...seo.paginas.map((p) => ({ loc: canonica(p.ruta), prioridad: p.prioridad })),
  ...contenido.map((p) => ({ loc: url + p.ruta, prioridad: p.prioridad })),
];
writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${todas.map((p) => `  <url><loc>${p.loc}</loc><lastmod>${hoy}</lastmod><priority>${p.prioridad}</priority></url>`).join('\n')}
</urlset>
`);

// llms.txt: resumen del sitio para asistentes de IA (opcional; casi nadie lo lee aún, cuesta poco).
const resumenUni = (codigo) => {
  try {
    return JSON.parse(readFileSync(join(raiz, 'src/seo/muestras', `${codigo}.json`), 'utf8'));
  } catch {
    return null;
  }
};
const LLMS_UNIS = [
  ['una', 'UNA Puno (Universidad Nacional del Altiplano)', 'Activa. Puntaje con la ponderación oficial por área (Ingenierías, Biomédicas, Sociales); también CEPREUNA por semanas.'],
  ['unsa', 'UNSA (Universidad Nacional de San Agustín de Arequipa)', 'Beta. 80 preguntas, suma ponderada sobre 100.'],
  ['sanmarcos', 'San Marcos (Universidad Nacional Mayor de San Marcos, UNMSM)', 'Beta. Áreas A-E, +20 por correcta y −1,125 por incorrecta, escala 2000.'],
  ['uni', 'UNI (Universidad Nacional de Ingeniería)', 'Beta. Tres pruebas: Aptitud Académica y Humanidades, Matemática, Física y Química.'],
  ['unt', 'UNT (Universidad Nacional de Trujillo)', 'Beta. 100 preguntas por área, +4,079 / −1,021.'],
  ['unc', 'UNC (Universidad Nacional de Cajamarca)', 'Beta. 90 preguntas por módulo, escala 600.'],
  ['uncp', 'UNCP (Universidad Nacional del Centro del Perú)', 'Beta. 80 preguntas por área, ponderado sobre 1500.'],
];
const una = resumenUni('una');
const lineasUnis = LLMS_UNIS.map(([c, n, nota]) => {
  const r = resumenUni(c);
  return r ? `- ${n}: ${r.total} preguntas de ${r.examenes} exámenes de admisión (${r.anioMin}–${r.anioMax}), ${r.cursos.length} cursos, con clave y solución. ${nota}` : '';
}).filter(Boolean).join('\n');
const enlacesUnis = LLMS_UNIS.map(([c, n]) => `- [Simulacro de admisión ${n.split(' (')[0]}](${url}/${c}/) · [preguntas por curso](${url}/${c}/preguntas/) · [exámenes por año](${url}/${c}/examenes/)`).join('\n');
writeFileSync(join(dist, 'llms.txt'), `# ${nombre}

> Plataforma peruana de simulacros de examen de admisión universitaria con preguntas reales de exámenes pasados. Hecha en Perú para todos los estudiantes que desean ingresar a una universidad nacional. Cada simulacro se califica con la tabla oficial de su universidad. El primer simulacro de cada universidad es gratis; el acceso completo se activa por WhatsApp (${whatsapp}).

${lineasUnis}
- Modalidades: simulacro cronometrado con la calificación oficial, banqueo por curso y por tema de tu universidad, y banqueo mix con preguntas del mismo tema de otras universidades por nivel de dificultad (básico, intermedio San Marcos, avanzado UNI, progresivo).
- Revisión pregunta por pregunta con clave y solución, historial de puntajes y resultado en PDF.
- No está afiliado a ninguna universidad.

## Páginas principales

${enlacesUnis}
- [Preguntas frecuentes](${url}/preguntas-frecuentes/)
`);

// Coincidencia EXACTA ($ y /): robots.txt compara por prefijo, y la regla vieja "Disallow: /<u>/examen"
// (con comodín) bloqueaba también las páginas públicas /una/examenes/.
const reglasPrivadas = ['registro', 'confirmar', 'examen', 'resultados']
  .flatMap((s) => [`Disallow: /*/${s}$`, `Disallow: /*/${s}/`, `Disallow: /*/${s}?`])
  .join('\n');

writeFileSync(join(dist, 'robots.txt'), `User-agent: *
Allow: /
${reglasPrivadas}

Sitemap: ${url}/sitemap.xml
`);

console.log(`SEO: ${seo.paginas.length} páginas de la app + ${contenido.length} de contenido + sitemap.xml + robots.txt`);
