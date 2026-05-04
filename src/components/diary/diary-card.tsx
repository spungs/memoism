"use client";

import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { MOOD_EMOJI, type MoodKey } from "./mood-picker";

const dateFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function snippet(content: string, n = 100): string {
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

function moodEmoji(mood?: string | null): string | null {
  if (!mood) return null;
  return MOOD_EMOJI[mood as MoodKey] ?? null;
}

interface DiaryCardProps {
  diary: DiaryCardData;
  onDelete?: () => void;
  deleting?: boolean;
}

export function DiaryCard({ diary, onDelete, deleting }: DiaryCardProps) {
  const [isPending, startTransition] = useTransition();
  const cover = diary.images?.[0];

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!onDelete) return;
    if (!window.confirm("이 일기를 삭제할까요?")) return;
    startTransition(() => onDelete());
  };

  return (
    <Link
      href={`/diary/${diary.id}`}
      className="group block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
      aria-busy={deleting || isPending}
    >
      <div className="flex gap-3">
        {cover && (
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
            <Image
              src={cover}
              alt=""
              fill
              sizes="64px"
              className="object-cover"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="flex min-w-0 items-baseline gap-1.5 truncate text-base font-medium">
              {moodEmoji(diary.mood) && (
                <span aria-hidden className="text-base leading-none">
                  {moodEmoji(diary.mood)}
                </span>
              )}
              <span className="truncate">{diary.title}</span>
            </h3>
            <time className="flex-shrink-0 text-xs text-muted-foreground">
              {dateFmt.format(new Date(diary.createdAt))}
            </time>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {snippet(diary.content)}
          </p>
        </div>
      </div>

      {onDelete && (
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting || isPending}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {deleting || isPending ? "삭제 중..." : "삭제"}
          </Button>
        </div>
      )}
    </Link>
  );
}
