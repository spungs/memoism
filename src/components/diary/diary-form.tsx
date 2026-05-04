"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createDiaryAction,
  updateDiaryAction,
  type DiaryActionResult,
} from "@/lib/diary/actions";
import {
  diaryInputSchema,
  type DiaryInput,
  type DiaryLocation,
} from "@/lib/diary/schemas";

type Mode = "create" | "edit";

interface DiaryFormProps {
  mode: Mode;
  diaryId?: string;
  initial?: {
    title: string;
    content: string;
    images: string[];
    location: DiaryLocation | null;
  };
}

export function DiaryForm({ mode, diaryId, initial }: DiaryFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Image state — separate from RHF because file inputs are uncontrolled.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [keepExisting, setKeepExisting] = useState(
    Boolean(initial?.images?.[0]),
  );

  const [location, setLocation] = useState<DiaryLocation | null>(
    initial?.location ?? null,
  );
  const [locationError, setLocationError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<DiaryInput>({
    resolver: zodResolver(diaryInputSchema),
    defaultValues: {
      title: initial?.title ?? "",
      content: initial?.content ?? "",
      location: initial?.location ?? null,
    },
  });

  // Object URLs need to be revoked or they leak.
  useEffect(() => {
    if (!pickedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pickedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pickedFile]);

  const handlePickFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0] ?? null;
    setPickedFile(file);
    if (file) setKeepExisting(false);
  };

  const handleRemoveImage = () => {
    setPickedFile(null);
    setKeepExisting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAttachLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationError("이 기기는 위치 정보를 지원하지 않습니다");
      return;
    }
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => setLocationError("위치 권한이 거부되었습니다"),
      { timeout: 10000 },
    );
  };

  const onSubmit = (values: DiaryInput) => {
    setSubmitError(null);
    const fd = new FormData();
    fd.set("title", values.title);
    fd.set("content", values.content);
    fd.set("location", location ? JSON.stringify(location) : "null");

    if (pickedFile) {
      fd.set("image", pickedFile);
      fd.set("imageMode", "replace");
    } else if (mode === "edit") {
      fd.set("imageMode", keepExisting ? "__keep__" : "remove");
    }

    startTransition(async () => {
      const result: DiaryActionResult =
        mode === "create"
          ? await createDiaryAction(fd)
          : await updateDiaryAction(diaryId!, fd);

      if (!result.ok) {
        if (result.fieldErrors) {
          for (const [k, msg] of Object.entries(result.fieldErrors)) {
            if (k === "title" || k === "content") {
              setError(k, { message: msg });
            } else if (k === "image") {
              setSubmitError(msg ?? "이미지 처리 중 오류가 발생했습니다");
            }
          }
        }
        if (result.error) setSubmitError(result.error);
        return;
      }

      router.push(`/diary/${result.data.id}`);
      router.refresh();
    });
  };

  const showExistingImage = mode === "edit" && keepExisting && !pickedFile;
  const existingImage = initial?.images?.[0];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          autoComplete="off"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "title-error" : undefined}
          {...register("title")}
        />
        {errors.title && (
          <p id="title-error" className="text-sm text-destructive">
            {errors.title.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">내용 (마크다운 지원)</Label>
        <Textarea
          id="content"
          rows={12}
          aria-invalid={Boolean(errors.content)}
          aria-describedby={errors.content ? "content-error" : undefined}
          {...register("content")}
        />
        {errors.content && (
          <p id="content-error" className="text-sm text-destructive">
            {errors.content.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">이미지 (선택)</Label>
        {showExistingImage && existingImage && (
          <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border">
            <Image
              src={existingImage}
              alt="현재 첨부된 이미지"
              fill
              sizes="(max-width: 430px) 100vw, 430px"
              className="object-cover"
            />
          </div>
        )}
        {previewUrl && (
          <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border">
            <Image
              src={previewUrl}
              alt="선택한 이미지 미리보기"
              fill
              sizes="(max-width: 430px) 100vw, 430px"
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        <Input
          id="image"
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handlePickFile}
        />
        {(showExistingImage || previewUrl) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveImage}
            className="text-destructive hover:text-destructive"
          >
            이미지 제거
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label>위치 (선택)</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAttachLocation}
          >
            현재 위치 사용
          </Button>
          {location && (
            <>
              <span className="text-xs text-muted-foreground">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLocation(null)}
              >
                제거
              </Button>
            </>
          )}
        </div>
        {locationError && (
          <p className="text-sm text-destructive">{locationError}</p>
        )}
      </div>

      {submitError && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {submitError}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending
            ? mode === "create"
              ? "저장 중..."
              : "수정 중..."
            : mode === "create"
              ? "저장"
              : "수정 완료"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          취소
        </Button>
      </div>
    </form>
  );
}
