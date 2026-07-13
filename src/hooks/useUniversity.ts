import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Universidad } from '../types';
import { getUniversidades } from '../services/api';

interface UniversityStore {
  /** Código de la universidad activa (según la ruta :universidad actual) */
  activa: string | null;
  /** Registro maestro de universidades (de getUniversidades) */
  registro: Universidad[];
  loading: boolean;
  error: string | null;

  loadRegistro: () => Promise<void>;
  setActiva: (codigo: string) => void;
  getUniversidad: (codigo: string) => Universidad | undefined;
}

export const useUniversityStore = create<UniversityStore>()(
  persist(
    (set, get) => ({
      activa: null,
      registro: [],
      loading: false,
      error: null,

      loadRegistro: async () => {
        if (get().registro.length > 0 || get().loading) return;
        set({ loading: true, error: null });
        try {
          const registro = await getUniversidades();
          set({ registro, loading: false });
        } catch (error) {
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Error al cargar el registro de universidades'
          });
        }
      },

      setActiva: (codigo: string) => set({ activa: codigo }),

      getUniversidad: (codigo: string) => get().registro.find(u => u.codigo === codigo),
    }),
    {
      name: 'simulauna_universidad',
      // Solo persistimos el código activo; el registro se vuelve a pedir en cada carga
      // para no quedar con datos desactualizados (colores, procesos, estado).
      partialize: (state) => ({ activa: state.activa }),
    }
  )
);
