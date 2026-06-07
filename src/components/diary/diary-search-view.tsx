"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  // 직전에 실제로 검색한 검색어. 한글 IME 조합 확정(blur 등)으로 같은 값이
  // 다시 들어와도 중복 요청하지 않도록 dedupe 한다.
  const lastSearchedRef = useRef<string | null>(null);

  // 검색어 변경 시 debounce → API 호출
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setItems([]);
      setError(null);
      setTouched(false);
      lastSearchedRef.current = null;
      onActiveChange(false);
      return;
    }
    onActiveChange(true);
    setTouched(true);
    const handle = setTimeout(async () => {
      if (lastSearchedRef.current === trimmed) return; // 같은 검색어 재요청 방지
      lastSearchedRef.current = trimmed;
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
    if (inputRef.current) inputRef.current.value = "";
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
          // 비제어 입력: value를 React가 다시 써넣지 않으므로 한글 IME 조합이
          // 깨지지 않는다. 조합 중 글자까지 query에 반영하려고 onChange와
          // onCompositionUpdate 양쪽에서 동기화 → blur로 조합 확정돼도 값이
          // 그대로라 재검색이 일어나지 않음.
          defaultValue=""
          onChange={(e) => setQuery(e.target.value)}
          onCompositionUpdate={(e) => setQuery(e.currentTarget.value)}
          placeholder="단어로 검색 (예: 카페, 가족, 제주도)"
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
              // 결과 영역에 마우스가 진입하면 입력창의 한글 IME 조합을 미리 확정한다.
              // mouseenter는 이동 기반이라 IME에 흡수되지 않으므로, 뒤이은 결과 클릭이
              // 조합 확정에 소비돼 씹히는 일을 막는다(데스크톱 웹 한정).
              onMouseEnter={() => inputRef.current?.blur()}
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
  const router = useRouter();
  const href = `/diary/${item.id}`;
  const date = new Date(item.createdAt);
  const moodEmoji =
    item.mood && item.mood in MOOD_EMOJI
      ? MOOD_EMOJI[item.mood as MoodKey]
      : "📝";

  // 한글 IME 조합 중 입력창이 포커스를 쥔 상태에서 결과를 클릭하면, 첫 click이
  // 조합 확정에 소비돼 네비게이션이 씹힌다(데스크톱 웹 한정). click보다 먼저
  // 발생하는 mousedown에서 이동시켜 한 번에 상세로 가게 한다. 수정키·중클릭·우클릭은
  // 기본 동작(새 탭 등)에 맡긴다.
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    router.push(href);
  };

  return (
    <Link
      href={href}
      onMouseDown={handleMouseDown}
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
