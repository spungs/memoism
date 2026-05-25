/**
 * 관리자용 비밀번호 수동 재설정 CLI (베타 운영용).
 *
 * 베타엔 셀프 "비밀번호 찾기"가 없으므로(=V2), 지인 사용자가 비밀번호를 잊으면
 * 관리자가 이 스크립트로 직접 재설정한다. (DoD #13의 "베타엔 본인 수동 처리" 방침)
 *
 * 실행 (Node 23.6+ 의 네이티브 TS 실행을 사용 — 별도 tsx 불필요):
 *   pnpm reset-password <email>                # 조회만 (read-only): 사용자 존재 여부 확인
 *   pnpm reset-password <email> <newPassword>  # 재설정: 새 비밀번호로 변경
 *
 * 참고:
 *   - 해시는 src/lib/auth/password.ts 와 동일하게 bcryptjs SALT_ROUNDS=12 사용.
 *   - M-10(tokenVersion)은 V2로 보류 상태라, 재설정해도 기존 세션은 자동 무효화되지 않는다.
 *     비번을 잊은 사용자는 어차피 로그인 세션이 없으므로 베타엔 문제 없음.
 */
import { config as loadEnv } from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

// Next 스타일 env 로드 (.env → .env.local 우선). prisma.config.ts 와 동일한 순서.
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const SALT_ROUNDS = 12; // keep in sync with src/lib/auth/password.ts

async function run(): Promise<number> {
  const [emailArg, newPassword] = process.argv.slice(2);

  if (!emailArg) {
    console.error("사용법: pnpm reset-password <email> [newPassword]");
    console.error("  - newPassword 생략 시: 사용자 존재 여부만 조회 (변경 없음)");
    return 1;
  }

  const email = emailArg.trim().toLowerCase();

  // 단발 CLI라 HMR용 싱글턴(@/lib/db) 대신 직접 인스턴스를 만들고 끝에서 끊는다.
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      console.error(`❌ 해당 이메일의 사용자가 없습니다: ${email}`);
      return 1;
    }

    // 조회 모드 (read-only): 비밀번호 인자가 없으면 변경하지 않는다.
    if (newPassword === undefined) {
      console.log(`✅ 사용자 존재: ${user.email} (id: ${user.id})`);
      console.log("   비밀번호를 바꾸려면: pnpm reset-password <email> <newPassword>");
      return 0;
    }

    // 재설정 모드: changePasswordAction 과 동일한 길이 규칙 (8~72자, bcrypt 72바이트 한계).
    if (newPassword.length < 8 || newPassword.length > 72) {
      console.error("❌ 새 비밀번호는 8자 이상 72자 이하여야 합니다.");
      return 1;
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    console.log(`✅ 비밀번호를 재설정했습니다: ${user.email}`);
    console.log("   새 비밀번호를 사용자에게 전달하고, 로그인 후 설정 > 비밀번호 변경으로 바꾸도록 안내하세요.");
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

run()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("❌ 실패:", err);
    process.exit(1);
  });
