/* -------------------------------------------------------------------------- */
/*  Landing nacional de Sinapsis Preu — composición de secciones.                 */
/*  Cada sección vive en src/components/landing/ (mobile-first):              */
/*   A. Hero (titular + selector de universidad + CTA sin scroll en 360×640)   */
/*   B. DemoPregunta (prueba una pregunta sin registrarte — el gancho)         */
/*   C. Universidades (activas del registro + franja "Llegan pronto")          */
/*   D. ComoFunciona (3 pasos + línea que se dibuja con el scroll)             */
/*   E. ProductoPreview (celular con la vista de resultados)                   */
/*   F. Ventajas + BanqueoMix + CalificacionOficial (lo que nos diferencia)   */
/*   G. HechoEnPuno (sección honesta; aquí irán testimonios REALES)            */
/*   H. Faq + CtaFinal                                                         */
/*  Regla de contenido: nada de cifras de usuarios, testimonios ni logros     */
/*  inventados. Gratis = el PRIMER simulacro por universidad.                 */
/* -------------------------------------------------------------------------- */
import { LandingNavbar } from './landing/LandingNavbar';
import { Hero } from './landing/Hero';
import { DemoPregunta } from './landing/DemoPregunta';
import { Universidades } from './landing/Universidades';
import { GuiaUniversidades } from './landing/GuiaUniversidades';
import { ComoFunciona } from './landing/ComoFunciona';
import { ProductoPreview } from './landing/ProductoPreview';
import { Cifras, Ventajas } from './landing/Ventajas';
import { BanqueoMix } from './landing/BanqueoMix';
import { CalificacionOficial } from './landing/CalificacionOficial';
import { Faq } from './landing/Faq';
import { CtaFinal, HechoEnPuno } from './landing/CtaFinal';
import { LandingFooter } from './landing/LandingFooter';
import './landing/landing.css';

export function Landing() {
  return (
    <div className="min-h-screen bg-[#fdfbf5] text-slate-800 font-sans overflow-x-clip">
      <LandingNavbar />
      <main>
        <Hero />
        <Cifras />
        <DemoPregunta />
        <Ventajas />
        <Universidades />
        <BanqueoMix />
        <CalificacionOficial />
        <ComoFunciona />
        <ProductoPreview />
        <GuiaUniversidades />
        <HechoEnPuno />
        <Faq />
        <CtaFinal />
      </main>
      <LandingFooter />
    </div>
  );
}

export default Landing;
