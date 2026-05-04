"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthFormState } from "@/lib/auth/actions";

type Mode = "login" | "signup";

interface AuthFormProps {
  mode: Mode;
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}

const COPY = {
  login: {
    title: "다시 만나서 반가워요",
    description: "이메일과 비밀번호로 로그인하세요.",
    submit: "로그인",
    submitting: "로그인 중...",
    altPrompt: "아직 계정이 없으신가요?",
    altLabel: "회원가입",
    altHref: "/signup",
  },
  signup: {
    title: "Memoism에 오신 걸 환영해요",
    description: "이메일과 비밀번호로 계정을 만드세요.",
    submit: "계정 만들기",
    submitting: "계정 생성 중...",
    altPrompt: "이미 계정이 있으신가요?",
    altLabel: "로그인",
    altHref: "/login",
  },
} as const;

export function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    action,
    {},
  );
  const copy = COPY[mode];

  return (
    <Card className="border-none shadow-none sm:border sm:shadow-sm">
      <CardHeader className="px-0 sm:px-6">
        <CardTitle className="text-2xl">{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>

      <form action={formAction} noValidate>
        <CardContent className="space-y-4 px-0 sm:px-6">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              aria-invalid={Boolean(state.fieldErrors?.email)}
              aria-describedby={
                state.fieldErrors?.email ? "email-error" : undefined
              }
            />
            {state.fieldErrors?.email && (
              <p id="email-error" className="text-sm text-destructive">
                {state.fieldErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              required
              minLength={mode === "signup" ? 8 : undefined}
              aria-invalid={Boolean(state.fieldErrors?.password)}
              aria-describedby={
                state.fieldErrors?.password ? "password-error" : undefined
              }
            />
            {state.fieldErrors?.password && (
              <p id="password-error" className="text-sm text-destructive">
                {state.fieldErrors.password}
              </p>
            )}
            {mode === "signup" && !state.fieldErrors?.password && (
              <p className="text-xs text-muted-foreground">
                8자 이상 입력해주세요.
              </p>
            )}
          </div>

          {state.error && (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex-col gap-3 px-0 pt-2 sm:px-6">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? copy.submitting : copy.submit}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {copy.altPrompt}{" "}
            <Link
              href={copy.altHref}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {copy.altLabel}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
