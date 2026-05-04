"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MoodBadge } from "./mood-badge";
import { MOOD_COLOR, MOOD_EMOJI, type MoodKey } from "./mood-picker";

const dayFmt = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
});
const weekdayFmt = new Intl.DateTimeFormat("ko-KR", { weekday: "short" });

function snippet(content: string, n = 120): string {
  // Strip markdown noise so previews don't show **bold** literals etc.
  const plain = content
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_~>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > n ? `${plain.slice(0, n)}…` : plain;
}

export interface DiaryCardData {
  id: string;
  title: string;
  content: string;
  images?: string[];
  mood?: string | null;
  createdAt: string | Date;
}

function moodColor(mood?: string | null): string | null {
  if (!mood) return null;
  return MOOD_COLOR[mood as MoodKey] ?? null;
}

interface DiaryCardProps {
  diary: DiaryCardData;
}

export function DiaryCard({ diary }: DiaryCardProps) {
  const date = new Date(diary.createdAt);
  const accent = moodColor(diary.mood);

  return (
    <Link
      href={`/diary/${diary.id}`}
      style={{
        position: "relative",
        display: "block",
        padding: "var(--space-4) var(--space-5)",
        paddingLeft: accent ? "calc(var(--space-5) + 3px)" : "var(--space-5)",
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-xs)",
        textDecoration: "none",
        color: "inherit",
        transition: "box-shadow var(--duration-fast, 120ms) var(--ease-out, ease)",
        overflow: "hidden",
      }}
      className="diary-card"
    >
      {accent && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            backgroundColor: accent,
          }}
        />
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          color: "var(--fg-subtle)",
          letterSpacing: "var(--tracking-wide)",
        }}
      >
        <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>
          {diary.mood && diary.mood in MOOD_EMOJI
            ? MOOD_EMOJI[diary.mood as MoodKey]
            : "📝"}
        </span>
        <time dateTime={date.toISOString()} style={{ fontWeight: 600 }}>
          {dayFmt.format(date)}
        </time>
        <span style={{ opacity: 0.6 }}>·</span>
        <span>{weekdayFmt.format(date)}요일</span>
      </div>

      <p
        style={{
          margin: "var(--space-3) 0 0 0",
          fontFamily: "var(--font-serif)",
          fontSize: "var(--text-base)",
          lineHeight: "var(--leading-relaxed)",
          color: "var(--fg)",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {snippet(diary.content) || (
          <span style={{ color: "var(--fg-subtle)", fontStyle: "italic" }}>
            (내용 없음)
          </span>
        )}
      </p>

      <div
        style={{
          marginTop: "var(--space-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-2)",
          minHeight: 22,
        }}
      >
        <div>{diary.mood && <MoodBadge mood={diary.mood} size="sm" />}</div>
        <ArrowRight
          aria-hidden
          size={16}
          style={{
            color: "var(--fg-subtle)",
            opacity: 0.7,
            flexShrink: 0,
          }}
        />
      </div>
    </Link>
  );
}
