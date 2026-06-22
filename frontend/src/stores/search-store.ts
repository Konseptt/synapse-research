import { create } from "zustand";

import type { SearchFilters } from "@/types/paper";

interface SearchState {
  query: string;
  submittedQuery: string;
  filters: SearchFilters;
  selectedPaperId: string | null;
  comparePaperIds: string[];
  chatPaperIds: string[] | null;
  setQuery: (query: string) => void;
  submitSearch: () => void;
  searchTopic: (topic: string) => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  setSelectedPaperId: (id: string | null) => void;
  toggleComparePaper: (id: string) => void;
  clearCompare: () => void;
  setChatPaperIds: (ids: string[] | null) => void;
}

const MAX_COMPARE = 3;

export const useSearchStore = create<SearchState>((set, get) => ({
  query: "",
  submittedQuery: "",
  filters: {},
  selectedPaperId: null,
  comparePaperIds: [],
  chatPaperIds: null,
  setQuery: (query) => set({ query }),
  submitSearch: () => {
    const trimmed = get().query.trim();
    if (trimmed.length > 2) {
      set({ submittedQuery: trimmed, selectedPaperId: null, comparePaperIds: [], chatPaperIds: null });
    }
  },
  searchTopic: (topic) => {
    const trimmed = topic.trim();
    if (trimmed.length > 2) {
      set({
        query: trimmed,
        submittedQuery: trimmed,
        selectedPaperId: null,
        comparePaperIds: [],
        chatPaperIds: null,
      });
    }
  },
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  setSelectedPaperId: (selectedPaperId) => set({ selectedPaperId }),
  toggleComparePaper: (id) =>
    set((s) => {
      const current = s.comparePaperIds;
      if (current.includes(id)) {
        return { comparePaperIds: current.filter((x) => x !== id) };
      }
      if (current.length >= MAX_COMPARE) return s;
      return { comparePaperIds: [...current, id] };
    }),
  clearCompare: () => set({ comparePaperIds: [], chatPaperIds: null }),
  setChatPaperIds: (chatPaperIds) => set({ chatPaperIds }),
}));
