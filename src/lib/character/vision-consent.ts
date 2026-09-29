import "server-only";
import { prisma } from "@/lib/db";

export async function setPhotoVisionOptIn(
  userId: string,
  value: boolean,
): Promise<void> {
  await prisma.character.update({
    where: { userId },
    data: { photoVisionOptIn: value },
  });
}
