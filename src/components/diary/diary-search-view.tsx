"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { MoodBadge } from "./mood-badge";
import { KNOWN_MOOD_KEYS, type MoodKey } from "./mood-data";

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

const dateFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
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
      if (lastSearchedRef.current === trimmed) return;
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
      {/* 검색창 — pill, fill-2 배경, 테두리 없음 */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          backgroundColor: "var(--fill-2)",
          borderRadius: "var(--radius-pill)",
          height: 40,
          padding: "0 var(--space-3)",
          gap: "var(--space-2)",
        }}
      >
        <Search size={15} aria-hidden style={{ color: "var(--fg-placeholder)", flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="search"
          // 비제어 입력: value를 React가 다시 써넣지 않으므로 한글 IME 조합이
          // 깨지지 않는다.
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
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-base)",
            color: "var(--fg)",
            height: "100%",
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
              width: 20,
              height: 20,
              border: "none",
              background: "var(--fg-placeholder)",
              borderRadius: "50%",
              cursor: "pointer",
              color: "var(--surface)",
              flexShrink: 0,
              padding: 0,
            }}
          >
            <X size={11} aria-hidden />
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
                fontSize: "var(--text-base)",
                color: "var(--fg-muted)",
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
                fontSize: "var(--text-base)",
                color: "var(--danger)",
                backgroundColor: "color-mix(in srgb, var(--danger) 10%, transparent)",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                margin: 0,
              }}
            >
              {error}
            </p>
          )}

          {!loading && !error && items.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "var(--space-8) 0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              <span aria-hidden style={{ color: "var(--fg-placeholder)", lineHeight: 0 }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.2" y2="16.2" />
                </svg>
              </span>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-md)",
                  fontWeight: 600,
                  color: "var(--fg)",
                  margin: 0,
                }}
              >
                일치하는 일기가 없어요
              </p>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-base)",
                  color: "var(--fg-muted)",
                  margin: 0,
                }}
              >
                다른 단어로 검색해볼까요?
              </p>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div
              onMouseEnter={() => inputRef.current?.blur()}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    router.push(href);
  };

  return (
    <Link
      href={href}
      onMouseDown={handleMouseDown}
      className="pressable"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        backgroundColor: "var(--surface)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        padding: "var(--space-3) var(--space-4)",
        minHeight: 44,
      }}
    >
      {/* 썸네일 */}
      {item.thumbnailUrl ? (
        <div
          style={{
            position: "relative",
            flexShrink: 0,
            width: 64,
            height: 64,
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            backgroundColor: "var(--fill-2)",
          }}
        >
          <Image
            src={item.thumbnailUrl}
            alt=""
            fill
            sizes="64px"
            style={{ objectFit: "cover" }}
          />
        </div>
      ) : null}

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 메타: mood badge + 날짜 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            marginBottom: "var(--space-1)",
          }}
        >
          {item.mood && KNOWN_MOOD_KEYS.has(item.mood as MoodKey) ? (
            <MoodBadge mood={item.mood} size="sm" />
          ) : (
            // 감정 미설정도 자리를 비우지 않는다 — 회색 dot (month-view와 동일 어휘)
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "var(--fg-quaternary)",
                flexShrink: 0,
              }}
            />
          )}
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-xs)",
              color: "var(--fg-placeholder)",
            }}
          >
            {dateFmt.format(date)}
          </span>
        </div>
        {/* 제목 */}
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-md)",
            fontWeight: 600,
            color: "var(--fg)",
            letterSpacing: "var(--tracking-tight)",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.title || "(제목 없음)"}
        </p>
        {/* 본문 미리보기 */}
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-base)",
            color: "var(--fg-muted)",
            margin: "var(--space-1) 0 0",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: "var(--leading-normal)",
          }}
        >
          {snippet(item.content)}
        </p>
      </div>
    </Link>
  );
}
