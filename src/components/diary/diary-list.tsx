"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { DiaryCard } from "./diary-card";
import { deleteDiaryAction } from "@/lib/diary/actions";

interface DiaryListItem {
  id: string;
  title: string;
  content: string;
  images: string[];
  createdAt: string;
}

interface DiariesPage {
  items: DiaryListItem[];
  nextCursor: string | null;
}

const QUERY_KEY = ["diaries"] as const;

interface DiaryListProps {
  initialData: DiariesPage;
}

export function DiaryList({ initialData }: DiaryListProps) {
  const qc = useQueryClient();
  const router = useRouter();

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

  const del = useMutation<unknown, Error, string, { prev?: DiariesPage }>({
    mutationFn: async (id) => {
      const result = await deleteDiaryAction(id);
      if (!result.ok) throw new Error(result.error);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueryData<DiariesPage>(QUERY_KEY);
      if (prev) {
        qc.setQueryData<DiariesPage>(QUERY_KEY, {
          ...prev,
          items: prev.items.filter((d) => d.id !== id),
        });
      }
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(QUERY_KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      router.refresh();
    },
  });

  if (error) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error.message}
      </p>
    );
  }

  if (data.items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-base font-medium">아직 일기가 없어요</p>
        <p className="text-sm text-muted-foreground">
          오른쪽 아래 + 버튼으로 첫 일기를 써보세요.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {data.items.map((diary) => (
        <li key={diary.id}>
          <DiaryCard
            diary={diary}
            onDelete={() => del.mutate(diary.id)}
            deleting={del.isPending && del.variables === diary.id}
          />
        </li>
      ))}
    </ul>
  );
}
