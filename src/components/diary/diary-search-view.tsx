"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { MOOD_EMOJI, type MoodKey } from "./mood-data";

export interface SearchResultItem {
  id: string;
  title: string;
  content: string;
  mood: string | null;
  source: string;
  createdAt: string;
  thumbnailUrl: string | null;
}

interface Props {
  /** 검색 모드 활성 여부 (부모에서 query state 관리). 검색 끄면 일반 목록으로 돌아가게. */
  onActiveChange: (active: boolean) => void;
}

const DEBOUNCE_MS = 350;

const monthDayFmt = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
});

function snippet(content: string, n = 80): string {
  const plain = content.replace(/\s+/g, " ").trim();
  return plain.length > n ? `${plain.slice(0, n)}…` : plain;
}

export function DiarySearchView({ onActiveChange }: Props) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 검색어 변경 시 debounce → API 호출
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setItems([]);
      setError(null);
      setTouched(false);
      onActiveChange(false);
      return;
    }
    onActiveChange(true);
    setTouched(true);
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/diaries/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: trimmed }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error ?? "검색에 실패했어요");
          setItems([]);
        } else {
          setItems(data.items ?? []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "검색에 실패했어요");
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, onActiveChange]);

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-pill)",
          padding: "0 var(--space-3)",
          gap: "var(--space-2)",
        }}
      >
        <Search size={16} aria-hidden style={{ color: "var(--fg-subtle)", flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="카페, 여행, 친구 이름..."
          aria-label="일기 검색"
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            backgroundColor: "transparent",
            padding: "10px 0",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fg)",
          }}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="검색어 지우기"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              border: "none",
              background: "transparent",
              borderRadius: "50%",
              cursor: "pointer",
              color: "var(--fg-subtle)",
              flexShrink: 0,
            }}
          >
            <X size={14} aria-hidden />
          </button>
        )}
      </div>

      {/* 결과 */}
      {touched && (
        <div>
          {loading && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--fg-subtle)",
                textAlign: "center",
                padding: "var(--space-6) 0",
                margin: 0,
              }}
            >
              찾는 중...
            </p>
          )}

          {!loading && error && (
            <p
              role="alert"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--danger)",
                backgroundColor:
                  "color-mix(in srgb, var(--danger) 10%, transparent)",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                margin: 0,
              }}
            >
              {error}
            </p>
          )}

          {!loading && !error && items.length === 0 && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--fg-subtle)",
                textAlign: "center",
                padding: "var(--space-8) 0",
                margin: 0,
              }}
            >
              일치하는 일기를 찾지 못했어요.
            </p>
          )}

          {!loading && !error && items.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: "var(--space-3)",
              }}
            >
              {items.map((item) => (
                <SearchResultCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchResultCard({ item }: { item: SearchResultItem }) {
  const date = new Date(item.createdAt);
  const moodEmoji =
    item.mood && item.mood in MOOD_EMOJI
      ? MOOD_EMOJI[item.mood as MoodKey]
      : "📝";

  return (
    <Link
      href={`/diary/${item.id}`}
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          backgroundColor: "var(--paper-2)",
        }}
      >
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 720px) 50vw, 200px"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-serif)",
              fontSize: "var(--text-sm)",
              color: "var(--fg-subtle)",
              padding: "var(--space-3)",
              textAlign: "center",
              lineHeight: "var(--leading-snug)",
            }}
          >
            {snippet(item.title || item.content, 40)}
          </div>
        )}
      </div>
      <div
        style={{
          padding: "var(--space-2) var(--space-3) var(--space-3)",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            color: "var(--fg-subtle)",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span aria-hidden style={{ fontSize: 12 }}>
            {moodEmoji}
          </span>
          {monthDayFmt.format(date)}
        </p>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "var(--text-sm)",
            color: "var(--fg)",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontWeight: 600,
          }}
        >
          {item.title || "(제목 없음)"}
        </p>
      </div>
    </Link>
  );
}
