"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DiaryCard } from "./diary-card";

interface DiaryListItem {
  id: string;
  title: string;
  content: string;
  thumbnailUrl: string | null;
  mood: string | null;
  source: string;
  createdAt: string;
}

interface DiariesPage {
  items: DiaryListItem[];
  nextCursor: string | null;
}

const QUERY_KEY = ["diaries"] as const;

const monthFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
});

interface MonthGroup {
  key: string;
  label: string;
  items: DiaryListItem[];
}

function groupByMonth(items: DiaryListItem[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>();
  for (const item of items) {
    const d = new Date(item.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let group = map.get(key);
    if (!group) {
      group = { key, label: monthFmt.format(d), items: [] };
      map.set(key, group);
    }
    group.items.push(item);
  }
  return Array.from(map.values());
}

interface DiaryListProps {
  initialData: DiariesPage;
}

export function DiaryList({ initialData }: DiaryListProps) {
  const { data, error } = useQuery<DiariesPage, Error>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/diaries", { cache: "no-store" });
      if (!res.ok) throw new Error("일기 목록을 불러오지 못했어요");
      return (await res.json()) as DiariesPage;
    },
    initialData,
    staleTime: 30_000,
  });

  const groups = useMemo(() => groupByMonth(data.items), [data.items]);

  if (error) {
    return (
      <p
        style={{
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-md)",
          backgroundColor: "color-mix(in srgb, #C47A6F 10%, transparent)",
          color: "#C47A6F",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
        }}
      >
        {error.message}
      </p>
    );
  }

  if (data.items.length === 0) {
    return <DiaryEmptyState />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {groups.map((group) => (
        <section key={group.key}>
          <h2
            style={{
              margin: "0 0 var(--space-3) 0",
              padding: "0 var(--space-1)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-xs)",
              color: "var(--fg-subtle)",
              fontWeight: 600,
              letterSpacing: "var(--tracking-wider)",
              textTransform: "uppercase",
            }}
          >
            {group.label}
            <span
              style={{
                marginLeft: "var(--space-2)",
                opacity: 0.7,
                fontWeight: 500,
              }}
            >
              {group.items.length}
            </span>
          </h2>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            {group.items.map((diary) => (
              <li key={diary.id}>
                <DiaryCard diary={diary} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function DiaryEmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-3)",
        padding: "var(--space-16) var(--space-4)",
        textAlign: "center",
      }}
    >
      <div
        aria-hidden
        style={{
          fontSize: 56,
          lineHeight: 1,
          marginBottom: "var(--space-2)",
          opacity: 0.85,
        }}
      >
        📔
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-serif)",
          fontSize: "var(--text-lg)",
          color: "var(--fg)",
        }}
      >
        아직 일기가 없어요
      </p>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          color: "var(--fg-subtle)",
          lineHeight: "var(--leading-normal)",
        }}
      >
        오늘의 첫 기록을 남겨볼까요?
      </p>
      <Link
        href="/diary/new"
        style={{
          marginTop: "var(--space-3)",
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-3) var(--space-5)",
          borderRadius: "var(--radius-pill)",
          backgroundColor: "var(--fg)",
          color: "var(--bg)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          letterSpacing: "var(--tracking-wide)",
          textDecoration: "none",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        ✏️ 새 일기 쓰기
      </Link>
    </div>
  );
}
