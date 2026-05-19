import { z } from "zod";

// HTML checkbox 미체크 시 FormData에 키 자체가 없음.
// formData.get("consent") === null → preprocess로 boolean false로 정규화.
const checkboxBoolean = z.preprocess(
  (v) => v === "on" || v === true,
  z.boolean(),
);

export const signupSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다")
    .max(72, "비밀번호는 72자를 초과할 수 없습니다"),
  consent: checkboxBoolean.refine(
    (v) => v === true,
    "사진·텍스트의 AI 분석 동의가 필요합니다",
  ),
});

export const loginSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
