import { create } from 'zustand';

/**
 * Estado global mínimo del conmutador rápido de universidad (Ctrl+K / Cmd+K).
 * Vive fuera de React para que tanto el botón trigger de LandingNavbar como el
 * propio diálogo (QuickSwitch.tsx) puedan abrir/cerrar sin acoplarse por props
 * ni requerir un Context Provider adicional en App.tsx.
 */
interface QuickSwitchState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useQuickSwitchStore = create<QuickSwitchState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
