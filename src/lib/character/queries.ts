import "server-only";
import { prisma } from "@/lib/db";
import { maxImagesForStatus } from "./utils";

// 사용자의 구독 상태로 사진 첨부 상한을 계산한다 (ACTIVE 10장, 그 외 5장).
// 캐릭터가 없는 비정상 케이스는 보수적으로 비활성(5장)으로 처리.
export async function getMaxImagesForUser(userId: string): Promise<number> {
  const character = await prisma.character.findUnique({
    where: { userId },
    select: { subscriptionStatus: true },
  });
  return maxImagesForStatus(character?.subscriptionStatus ?? "NONE");
}
