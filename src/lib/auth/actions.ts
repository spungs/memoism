"use server";

import { Prisma, SubscriptionStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { trialEndDate } from "@/lib/character/utils";
import { hashPassword, verifyPassword } from "./password";
import { signupSchema, loginSchema } from "./schemas";
import { createSession, deleteSession } from "./session";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
};

export async function signupAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: AuthFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0] as "email" | "password" | undefined;
      if (path && !fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return { fieldErrors };
  }

  const { email, password } = parsed.data;
  const passwordHash = await hashPassword(password);

  // Create the User and their AI character together so a User never exists
  // without the 1:1 Character ChatMessage and most app surfaces depend on.
  // The trial starts now and runs for 30 days (PRD §3.3).
  let user;
  try {
    const trialStart = new Date();
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email: email.toLowerCase(), passwordHash },
        select: { id: true, email: true },
      });
      await tx.character.create({
        data: {
          userId: created.id,
          subscriptionStatus: SubscriptionStatus.TRIAL,
          trialStartedAt: trialStart,
          subscriptionExpiresAt: trialEndDate(trialStart),
        },
      });
      return created;
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { fieldErrors: { email: "이미 사용 중인 이메일입니다" } };
    }
    throw e;
  }

  await createSession(user.id, user.email);
  redirect("/");
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: AuthFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0] as "email" | "password" | undefined;
      if (path && !fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return { fieldErrors };
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, passwordHash: true },
  });

  // Constant-ish time: still run bcrypt even if user is missing to avoid leaking
  // existence via timing. Use a fixed dummy hash so the compare still runs.
  const DUMMY_HASH =
    "$2b$12$0000000000000000000000000000000000000000000000000000O";
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !ok) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다" };
  }

  await createSession(user.id, user.email);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
