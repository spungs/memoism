import { create } from 'zustand';

interface Diary {
  id: string;
  content: string;
  created_at: string;
}

interface DiaryState {
  diaries: Diary[];
  setDiaries: (diaries: Diary[]) => void;
  addDiary: (diary: Diary) => void;
  updateDiary: (id: string, content: string) => void;
  deleteDiary: (id: string) => void;
}

export const useDiaryStore = create<DiaryState>((set) => ({
  diaries: [],
  setDiaries: (diaries) => set({ diaries }),
  addDiary: (diary) => set((state) => ({ diaries: [...state.diaries, diary] })),
  updateDiary: (id, content) => set((state) => ({
    diaries: state.diaries.map((diary) => (diary.id === id ? { ...diary, content } : diary)),
  })),
  deleteDiary: (id) => set((state) => ({
    diaries: state.diaries.filter((diary) => diary.id !== id),
  })),
})); 