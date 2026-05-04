"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SKIN_CATALOG, ensureSkinsSeeded } from "./skins";

export type SkinActionResult = { ok: true } | { ok: false; error: string };

// 스킨 구매. coinBalance 검증·차감과 CoinTransaction(음수) + CharacterOutfitOwned 추가를
// 한 transaction 으로 묶는다 — coinBalance는 SUM(CoinTransaction.amount)의 캐시이므로
// 같은 트랜잭션에서 갱신해야 일관성이 깨지지 않는다 (schema.prisma 주석 참고).
export async function purchaseSkinAction(
  outfitId: string,
): Promise<SkinActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "로그인이 필요합니다" };

  const skin = SKIN_CATALOG.find((s) => s.outfitId === outfitId);
  if (!skin) return { ok: false, error: "존재하지 않는 스킨입니다" };

  await ensureSkinsSeeded();

  try {
    await prisma.$transaction(async (tx) => {
      const character = await tx.character.findUnique({
        where: { userId: session.userId },
        select: { id: true, coinBalance: true },
      });
      if (!character) throw new Error("캐릭터를 찾을 수 없습니다");

      if (character.coinBalance < skin.coinPrice) {
        throw new Error("코인이 부족합니다");
      }

      if (skin.coinPrice > 0) {
        await tx.coinTransaction.create({
          data: {
            userId: session.userId,
            amount: -skin.coinPrice,
            reason: `outfit:purchase:${outfitId}`,
          },
        });
        await tx.character.update({
          where: { id: character.id },
          data: { coinBalance: { decrement: skin.coinPrice } },
        });
      }

      await tx.characterOutfitOwned.create({
        data: {
          characterId: character.id,
          outfitId,
        },
      });
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { ok: false, error: "이미 보유한 스킨입니다" };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "구매에 실패했습니다",
    };
  }

  revalidatePath("/character/shop");
  return { ok: true };
}

// 보유 스킨 장착. CharacterEquipped는 1:1 (characterId가 PK)이라 upsert로 갱신.
export async function equipSkinAction(
  outfitId: string,
): Promise<SkinActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "로그인이 필요합니다" };

  const character = await prisma.character.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!character) return { ok: false, error: "캐릭터를 찾을 수 없습니다" };

  const owned = await prisma.characterOutfitOwned.findUnique({
    where: {
      characterId_outfitId: {
        characterId: character.id,
        outfitId,
      },
    },
  });
  if (!owned) return { ok: false, error: "보유하지 않은 스킨입니다" };

  await prisma.characterEquipped.upsert({
    where: { characterId: character.id },
    update: { outfitId },
    create: { characterId: character.id, outfitId },
  });

  revalidatePath("/character/shop");
  revalidatePath("/character");
  revalidatePath("/");
  return { ok: true };
}
