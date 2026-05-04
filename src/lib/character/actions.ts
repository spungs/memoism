"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const characterNameSchema = z
  .string()
  .trim()
  .min(1, "이름을 입력해주세요")
  .max(20, "20자 이내로 입력해주세요");

export type UpdateCharacterNameState = {
  ok?: boolean;
  error?: string;
};

export async function updateCharacterName(
  _prev: UpdateCharacterNameState,
  formData: FormData,
): Promise<UpdateCharacterNameState> {
  const session = await getSession();
  if (!session) return { error: "로그인이 필요합니다" };

  const parsed = characterNameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "올바르지 않은 이름입니다" };
  }

  await prisma.character.update({
    where: { userId: session.userId },
    data: { name: parsed.data },
  });

  revalidatePath("/settings");
  revalidatePath("/character");
  return { ok: true };
}
