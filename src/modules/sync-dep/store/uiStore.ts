import { create } from 'zustand';
import { ViewState } from '../../../types';

interface UIState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  currentSyncDepView: ViewState;
  setCurrentSyncDepView: (view: ViewState) => void;
  
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: localStorage.getItem('syncDepSidebarOpen') !== 'false',
  toggleSidebar: () => set((state) => {
    const next = !state.isSidebarOpen;
    localStorage.setItem('syncDepSidebarOpen', String(next));
    return { isSidebarOpen: next };
  }),
  setSidebarOpen: (open) => set(() => {
    localStorage.setItem('syncDepSidebarOpen', String(open));
    return { isSidebarOpen: open };
  }),
  
  currentSyncDepView: 'SYNC_DEP_MY_DASHBOARD',
  setCurrentSyncDepView: (view) => set({ currentSyncDepView: view }),
  
  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  
  isDarkMode: localStorage.getItem('theme') === 'dark',
  toggleDarkMode: () => set((state) => {
    const next = !state.isDarkMode;
    localStorage.setItem('theme', next ? 'dark' : 'light');
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { isDarkMode: next };
  }),
}));
