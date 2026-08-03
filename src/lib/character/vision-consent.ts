import "server-only";
import { prisma } from "@/lib/db";

/**
 * 사진을 메이(Gemini)에게 보여줄지에 대한 동의 상태.
 *
 * **세 상태를 구분한다** — `null`은 "아직 묻지 않음"이라 동의 시트를 띄울 조건이고,
 * `false`는 "물었고 거부함"이라 다시 묻지 않는다. boolean 하나로 뭉개면 거부한
 * 사용자에게 매번 다시 묻게 된다.
 *
 * 거부해도 사진 첨부 자체는 된다 — 일기에 저장되고 메이만 못 볼 뿐이다.
 */
export async function getPhotoVisionOptIn(
  userId: string,
): Promise<boolean | null> {
  const c = await prisma.character.findUnique({
    where: { userId },
    select: { photoVisionOptIn: true },
  });
  return c?.photoVisionOptIn ?? null;
}

export async function setPhotoVisionOptIn(
  userId: string,
  value: boolean,
): Promise<void> {
  await prisma.character.update({
    where: { userId },
    data: { photoVisionOptIn: value },
  });
}
