/* -------------------------------------------------------------------------- */
/*  Datos y utilidades compartidas por las secciones del Landing.             */
/*  (Separado de los componentes para no romper el fast refresh.)             */
/* -------------------------------------------------------------------------- */
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUniversityStore } from '../../hooks/useUniversity';
import { resolveLogoUrl } from '../../utils/logos';
import { prefersReducedMotion } from '../motion/hooks';
import type { Universidad } from '../../types';

const BASE = import.meta.env.BASE_URL; // '/'

// Catálogo de universidades que la plataforma tiene mapeadas (logo + tema en
// src/theme/universityThemes.ts). La navegación real solo se habilita para las
// que aparecen en el registro maestro (getUniversidades); el resto se muestra
// como "Llegan pronto". Logos locales en public/logos/ (Wikimedia Commons,
// atribución en README.md § Arquitectura multi-universidad).
export const UNIVERSITY_LOGOS: { sigla: string; name: string; codigo: string }[] = [
  { sigla: 'UNA', name: 'Universidad Nacional del Altiplano - Puno', codigo: 'una' },
  { sigla: 'UNAJ', name: 'Universidad Nacional de Juliaca', codigo: 'unaj' },
  { sigla: 'UNMSM', name: 'Universidad Nacional Mayor de San Marcos', codigo: 'sanmarcos' },
  { sigla: 'UNI', name: 'Universidad Nacional de Ingeniería', codigo: 'uni' },
  { sigla: 'UNSA', name: 'Universidad Nacional de San Agustín - Arequipa', codigo: 'unsa' },
  { sigla: 'UNSAAC', name: 'Universidad Nacional de San Antonio Abad - Cusco', codigo: 'unsaac' },
  { sigla: 'UNCP', name: 'Universidad Nacional del Centro del Perú', codigo: 'uncp' },
  { sigla: 'UNFV', name: 'Universidad Nacional Federico Villarreal', codigo: 'unfv' },
  { sigla: 'UNALM', name: 'Universidad Nacional Agraria La Molina', codigo: 'unalm' },
  { sigla: 'UNT', name: 'Universidad Nacional de Trujillo', codigo: 'unt' },
  { sigla: 'UNP', name: 'Universidad Nacional de Piura', codigo: 'unp' },
  { sigla: 'UNSCH', name: 'Universidad Nacional San Cristóbal de Huamanga', codigo: 'unsch' },
];

/** Ilustraciones propias del Landing (lobito y áreas). Las 3D vienen de ILLUSTRATIONS_3D. */
export const LANDING_ASSETS = {
  lobitoSaludo: `${BASE}illustrations/lobito-saludo.webp`,
  lobitoCelebra: `${BASE}illustrations/lobito-celebra.webp`,
  lobitoPensando: `${BASE}illustrations/lobito-pensando.webp`,
  mascotaLobito: `${BASE}illustrations/mascota-lobito.webp`,
  areaIngenierias: `${BASE}illustrations/area-ingenierias.webp`,
  areaBiomedicas: `${BASE}illustrations/area-biomedicas.webp`,
  areaSociales: `${BASE}illustrations/area-sociales.webp`,
} as const;

/** Scroll suave a una sección por id, respetando prefers-reduced-motion. */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

/** Universidad lista para pintar (registro maestro + logo resuelto). */
export interface UniActiva {
  codigo: string;
  nombreCorto: string;
  nombre: string;
  estado: Universidad['estado'];
  colores?: Universidad['colores'];
  logoUrl: string;
}

export interface UniProxima {
  codigo: string;
  sigla: string;
  name: string;
  logoUrl: string;
}

/**
 * Estado de universidades del Landing, derivado SOLO del registro maestro:
 * - activas: las del registro (estado activa|piloto), en su orden.
 * - Si el registro falla, UNA Puno queda disponible igual (compatibilidad
 *   histórica: la ruta /una funciona aunque el registro v2 no cargue).
 * - proximas: el resto del catálogo mapeado.
 */
export function useLandingUniversities() {
  const navigate = useNavigate();
  const registro = useUniversityStore(s => s.registro);
  const loadRegistro = useUniversityStore(s => s.loadRegistro);
  const loading = useUniversityStore(s => s.loading);
  const error = useUniversityStore(s => s.error);
  const activa = useUniversityStore(s => s.activa);

  useEffect(() => {
    loadRegistro();
  }, [loadRegistro]);

  const activas = useMemo<UniActiva[]>(() => {
    if (registro.length > 0) {
      return [...registro]
        .sort((a, b) => a.orden - b.orden)
        .map(u => ({
          codigo: u.codigo,
          nombreCorto: u.nombreCorto,
          nombre: u.nombre,
          estado: u.estado,
          colores: u.colores,
          logoUrl: resolveLogoUrl(u.codigo, u.logo),
        }));
    }
    if (loading) return [];
    // Sin registro (error o vacío): UNA Puno sigue siendo navegable.
    return [{
      codigo: 'una',
      nombreCorto: 'UNA Puno',
      nombre: 'Universidad Nacional del Altiplano',
      estado: 'activa' as Universidad['estado'],
      logoUrl: resolveLogoUrl('una'),
    }];
  }, [registro, loading]);

  const proximas = useMemo<UniProxima[]>(() => {
    const registrados = new Set(['una', ...registro.map(u => u.codigo)]);
    return UNIVERSITY_LOGOS
      .filter(l => !registrados.has(l.codigo))
      .map(l => ({ ...l, logoUrl: resolveLogoUrl(l.codigo) }));
  }, [registro]);

  /** Universidad ya elegida antes (persistida) y vigente en el registro. */
  const activaVigente = activa && activas.some(u => u.codigo === activa) ? activa : null;

  const irAUniversidad = (codigo: string) => navigate(`/${codigo}`);

  /**
   * CTA "hacer mi simulacro": si ya eligió universidad va directo a su página;
   * si no, lo llevamos al selector (sección Universidades).
   */
  const irASimulacro = () => {
    if (activaVigente) navigate(`/${activaVigente}`);
    else scrollToSection('universidades');
  };

  return {
    activas,
    proximas,
    loading: loading && registro.length === 0,
    error: registro.length === 0 ? error : null,
    activaVigente,
    totalMapeadas: UNIVERSITY_LOGOS.length,
    irAUniversidad,
    irASimulacro,
  };
}
