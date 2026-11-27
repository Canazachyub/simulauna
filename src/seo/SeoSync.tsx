/* -------------------------------------------------------------------------- */
/*  SEO en el navegador: al cambiar de ruta actualiza <title>, la descripción, */
/*  el canonical, Open Graph y robots según src/seo/paginas.json (la misma     */
/*  fuente que usa scripts/seo-prerender.mjs para el HTML estático).           */
/*  Rutas privadas (registro, examen, resultados…) quedan en noindex.          */
/* -------------------------------------------------------------------------- */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import seo from './paginas.json';

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

/** URL canónica: con barra final salvo la raíz (así la sirve GitHub Pages). */
export function urlCanonica(ruta: string) {
  return seo.sitio.url + (ruta === '/' ? '/' : `${ruta}/`);
}

export function SeoSync() {
  const { pathname } = useLocation();

  useEffect(() => {
    const ruta = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/';
    const pagina = seo.paginas.find(p => p.ruta === ruta);
    const privada = seo.noIndexar.some(s => ruta.endsWith(s));
    const base = seo.paginas[0];
    const p = pagina ?? base;

    document.title = pagina ? p.title : privada ? 'Simulacro · Sinapsis Preu' : base.title;
    setMeta('meta[name="description"]', 'name', 'description', p.description);
    setMeta('meta[name="robots"]', 'name', 'robots', pagina ? 'index, follow' : 'noindex, follow');
    setMeta('meta[property="og:title"]', 'property', 'og:title', p.title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', p.description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', urlCanonica(p.ruta));
    setCanonical(urlCanonica(p.ruta));
  }, [pathname]);

  return null;
}

export default SeoSync;
