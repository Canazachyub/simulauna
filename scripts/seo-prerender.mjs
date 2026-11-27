// SEO estático tras `vite build` (GitHub Pages no tiene servidor):
//  1. Escribe dist/<ruta>/index.html por cada página de src/seo/paginas.json con su <title>,
//     descripción, canonical, Open Graph, datos estructurados (JSON-LD) y un contenido de respaldo
//     (h1 + texto + enlaces) dentro de #root. Así /una/ responde 200 con HTML propio en vez del
//     404.html de la SPA. React reemplaza ese contenido al montar (createRoot, no hydrate).
//  2. Genera dist/sitemap.xml y dist/robots.txt.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${seo.paginas.map((p) => `  <url><loc>${canonica(p.ruta)}</loc><lastmod>${hoy}</lastmod><priority>${p.prioridad}</priority></url>`).join('\n')}
</urlset>
`);

writeFileSync(join(dist, 'robots.txt'), `User-agent: *
Allow: /
${['registro', 'confirmar', 'examen', 'resultados'].map((s) => `Disallow: /*/${s}`).join('\n')}

Sitemap: ${url}/sitemap.xml
`);

console.log(`SEO: ${seo.paginas.length} páginas estáticas + sitemap.xml + robots.txt`);
