import { create } from 'zustand';
import { SyncDepUser } from '../types/core.types';

interface AuthState {
  currentUser: SyncDepUser | null;
  setCurrentUser: (user: SyncDepUser | null) => void;
  isLoading: boolean;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  isLoading: false,
}));
