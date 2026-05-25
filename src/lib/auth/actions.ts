"use server";

import { Prisma, SubscriptionStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "./password";
import { signupSchema, loginSchema } from "./schemas";
import { createSession, deleteSession, getSession } from "./session";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password" | "consent", string>>;
};

export async function signupAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    consent: formData.get("consent"),
  });

  if (!parsed.success) {
    const fieldErrors: AuthFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0] as
        | "email"
        | "password"
        | "consent"
        | undefined;
      if (path && !fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return { fieldErrors };
  }

  const { email, password } = parsed.data;
  const passwordHash = await hashPassword(password);

  // Create the User, their friend Character, and UserPersona row together.
  //   - User ↔ Character 1:1 invariant (schema.prisma)
  //   - UserPersona 기본값 row 1개 (D14: 베타엔 UI 미노출, 기본값으로만 동작)
  //   - 베타 정책: 전원 Basic 자동 부여 (ACTIVE). 트라이얼 개념 자체 폐기.
  //   - externalLLMConsent: signup 폼 필수 체크박스로 받음 (MIG-9).
  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          externalLLMConsent: true,
        },
        select: { id: true, email: true },
      });
      await tx.character.create({
        data: {
          userId: created.id,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
        },
      });
      await tx.userPersona.create({
        data: { userId: created.id },
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

  // New users start at tokenVersion 0 (DB default).
  await createSession(user.id, user.email, 0);
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
    select: { id: true, email: true, passwordHash: true, tokenVersion: true },
  });

  // Constant-ish time: still run bcrypt even if user is missing to avoid leaking
  // existence via timing. Use a fixed dummy hash so the compare still runs.
  const DUMMY_HASH =
    "$2b$12$0000000000000000000000000000000000000000000000000000O";
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !ok) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다" };
  }

  await createSession(user.id, user.email, user.tokenVersion);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}

export type ChangePasswordState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string>>;
};

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await getSession();
  if (!session) return { error: "로그인이 필요합니다" };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const fieldErrors: NonNullable<ChangePasswordState["fieldErrors"]> = {};
  if (!currentPassword) fieldErrors.currentPassword = "현재 비밀번호를 입력해주세요";
  if (newPassword.length < 8) fieldErrors.newPassword = "8자 이상이어야 합니다";
  else if (newPassword.length > 72) fieldErrors.newPassword = "72자를 초과할 수 없습니다";
  if (confirmPassword !== newPassword) fieldErrors.confirmPassword = "새 비밀번호가 일치하지 않습니다";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true },
  });
  if (!user) return { error: "사용자를 찾을 수 없습니다" };

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) return { fieldErrors: { currentPassword: "현재 비밀번호가 올바르지 않습니다" } };

  if (await verifyPassword(newPassword, user.passwordHash)) {
    return { fieldErrors: { newPassword: "현재 비밀번호와 다르게 설정해주세요" } };
  }

  const newHash = await hashPassword(newPassword);
  // Bump tokenVersion to invalidate sessions issued before this change (QA M-10).
  // Re-issue this device's cookie with the new tokenVersion so the current user
  // stays logged in; only *other* devices get invalidated by getSession().
  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash: newHash, tokenVersion: { increment: 1 } },
    select: { tokenVersion: true },
  });
  await createSession(session.userId, session.email, updated.tokenVersion);

  return { ok: true };
}
