"use client";

import { ConfirmSheet } from "@/components/ui/confirm-sheet";

/**
 * 사진을 메이에게 보여줄지 묻는 최초 1회 동의.
 *
 * **사진을 고르기 전에** 묻는다 — 보낸 뒤에 물으면 이미 전달할지 말지를
 * 사용자가 정할 수 없다. 거부해도 사진 첨부 자체는 된다(일기엔 저장되고
 * 메이만 못 볼 뿐이다).
 */
export function PhotoConsentSheet({
  isOpen,
  onAllow,
  onDeny,
  isLoading,
}: {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
  isLoading: boolean;
}) {
  return (
    <ConfirmSheet
      isOpen={isOpen}
      onClose={onDeny}
      onConfirm={onAllow}
      title="사진을 메이에게 보여줄까요?"
      description="메이가 사진을 보고 대화할 수 있어요. 사진은 그때 대화를 위해서만 전달되고, 사진 설명이 일기에 저장되지는 않아요. 보여주지 않아도 사진은 일기에 그대로 저장돼요. 설정에서 언제든 바꿀 수 있어요."
      confirmLabel="보여주기"
      confirmVariant="primary"
      isLoading={isLoading}
    />
  );
}
