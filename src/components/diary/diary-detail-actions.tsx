"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { deleteDiaryAction } from "@/lib/diary/actions";

interface DiaryDetailActionsProps {
  diaryId: string;
}

export function DiaryDetailActions({ diaryId }: DiaryDetailActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!window.confirm("이 일기를 삭제할까요?")) return;
    startTransition(async () => {
      const result = await deleteDiaryAction(diaryId);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      router.push("/diary");
      router.refresh();
    });
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-1)",
      }}
    >
      <Link
        href={`/diary/${diaryId}/edit`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "6px 10px",
          borderRadius: "var(--radius-md)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          fontWeight: 500,
          color: "var(--fg)",
          textDecoration: "none",
        }}
      >
        <Pencil size={14} aria-hidden />
        수정
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        aria-label="일기 삭제"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: "var(--radius-md)",
          border: "none",
          backgroundColor: "transparent",
          color: pending ? "var(--fg-placeholder)" : "var(--fg-muted)",
          cursor: pending ? "not-allowed" : "pointer",
        }}
      >
        <Trash2 size={16} aria-hidden />
      </button>
    </div>
  );
}
