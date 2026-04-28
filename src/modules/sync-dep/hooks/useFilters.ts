import { create } from 'zustand';

interface FiltersState {
  search: string;
  statusIds: string[];
  priorities: string[];
  deadlineRange: { from: string | null; to: string | null };
  isOverdue: boolean;
  hasBlocker: boolean;
  departmentId: string | null;
  assigneeId: string | null;
  showArchived: boolean;
  
  setSearch: (s: string) => void;
  toggleStatus: (id: string) => void;
  togglePriority: (p: string) => void;
  setDeadlineRange: (range: { from: string | null; to: string | null }) => void;
  toggleOverdue: () => void;
  toggleBlocker: () => void;
  setDepartmentId: (id: string | null) => void;
  setAssigneeId: (id: string | null) => void;
  toggleArchived: () => void;
  resetFilters: () => void;
}

export const useFilters = create<FiltersState>((set) => ({
  search: '',
  statusIds: [],
  priorities: [],
  deadlineRange: { from: null, to: null },
  isOverdue: false,
  hasBlocker: false,
  departmentId: null,
  assigneeId: null,
  showArchived: false,
  
  setSearch: (search) => set({ search }),
  toggleStatus: (id) => set((state) => ({
    statusIds: state.statusIds.includes(id) 
      ? state.statusIds.filter(s => s !== id) 
      : [...state.statusIds, id]
  })),
  togglePriority: (p) => set((state) => ({
    priorities: state.priorities.includes(p) 
      ? state.priorities.filter(x => x !== p) 
      : [...state.priorities, p]
  })),
  setDeadlineRange: (range) => set({ deadlineRange: range }),
  toggleOverdue: () => set((state) => ({ isOverdue: !state.isOverdue })),
  toggleBlocker: () => set((state) => ({ hasBlocker: !state.hasBlocker })),
  setDepartmentId: (id) => set({ departmentId: id }),
  setAssigneeId: (id) => set({ assigneeId: id }),
  toggleArchived: () => set((state) => ({ showArchived: !state.showArchived })),
  resetFilters: () => set({
    search: '',
    statusIds: [],
    priorities: [],
    deadlineRange: { from: null, to: null },
    isOverdue: false,
    hasBlocker: false,
    departmentId: null,
    assigneeId: null,
    showArchived: false,
  })
}));
