"use client";

import { useCallback, useState } from "react";
import { DiaryList } from "./diary-list";
import { DiarySearchView } from "./diary-search-view";

interface DiaryListItem {
  id: string;
  title: string;
  content: string;
  thumbnailUrl: string | null;
  mood: string | null;
  source: string;
  createdAt: string;
}

interface Props {
  initialData: {
    items: DiaryListItem[];
    nextCursor: string | null;
  };
}

export function DiaryListWithSearch({ initialData }: Props) {
  const [searchActive, setSearchActive] = useState(false);
  const onActiveChange = useCallback((active: boolean) => {
    setSearchActive(active);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <DiarySearchView onActiveChange={onActiveChange} />
      <div style={{ display: searchActive ? "none" : "block" }}>
        <DiaryList initialData={initialData} />
      </div>
    </div>
  );
}
