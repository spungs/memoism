"use server";

import { Prisma, SubscriptionStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { captureServer } from "@/lib/analytics/server";
import { createSession } from "./session";
import { OAUTH_COOKIE, verifyGooglePending } from "./google";

export type GoogleConsentState = {
  error?: string;
  // true면 pending 만료/소실 → 폼에서 "처음부터 다시" 안내.
  restart?: boolean;
};

export async function completeGoogleSignupAction(
  _prev: GoogleConsentState,
  formData: FormData,
): Promise<GoogleConsentState> {
  const consentRaw = formData.get("consent");
  const consent = consentRaw === "on" || consentRaw === "true";
  if (!consent) {
    return { error: "사진·텍스트의 AI 분석 동의가 필요해요" };
  }

  const jar = await cookies();
  const pendingToken = jar.get(OAUTH_COOKIE.pending)?.value;
  const pending = pendingToken ? await verifyGooglePending(pendingToken) : null;
  if (!pending) {
    return { error: "인증이 만료되었어요. 처음부터 다시 시도해주세요.", restart: true };
  }

  let user: { id: string; email: string };
  try {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: pending.email,
          googleSub: pending.googleSub,
          externalLLMConsent: true,
        },
        select: { id: true, email: true },
      });
      await tx.character.create({
        data: { userId: created.id, subscriptionStatus: SubscriptionStatus.ACTIVE },
      });
      await tx.userPersona.create({ data: { userId: created.id } });
      return created;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      // 그 사이 같은 email/googleSub가 생성됨 → 로그인으로 보냄.
      return { error: "이미 가입된 계정이에요. 로그인해주세요.", restart: true };
    }
    throw e;
  }

  await createSession(user.id, user.email, 0);
  await captureServer("signup_completed", user.id, { email: user.email, method: "google" });
  jar.delete(OAUTH_COOKIE.pending);
  redirect("/");
}
