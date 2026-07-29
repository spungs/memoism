/**
 * 채팅 메시지 순서 복구 — 같은 트랜잭션에서 만들어져 created_at이 똑같아진
 * USER/ASSISTANT 쌍에서 ASSISTANT를 1ms 뒤로 민다.
 *
 * 왜 생겼나: `@default(now())`는 Postgres `now()`로 컴파일되고, `now()`는
 * **트랜잭션 시작 시각**을 돌려준다. 한 트랜잭션에서 두 행을 만들면 밀리초까지
 * 같아지고, created_at 정렬이 순서를 보장하지 못해 답변이 질문보다 먼저 보인다.
 * (코드는 고쳤다 — 이 스크립트는 이미 쌓인 과거 데이터용.)
 *
 * 실행: pnpm fix-chat-order                                  (dry-run)
 *       pnpm fix-chat-order -- --write                        (로컬 반영)
 *       pnpm fix-chat-order -- --env .env.local.prod-backup --write   (운영)
 *
 * 안전: ASSISTANT 행의 created_at만 +1ms. 내용·역할·관계는 건드리지 않는다.
 */
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

const envIdx = process.argv.indexOf("--env");
const ENV_PATH = envIdx >= 0 ? process.argv[envIdx + 1] : ".env.local";
const WRITE = process.argv.includes("--write");

loadEnv({ path: ".env", quiet: true });
loadEnv({ path: ENV_PATH, override: true, quiet: true });

const prisma = new PrismaClient();

async function main() {
  console.log(WRITE ? "MODE: --write (실제 반영)" : "MODE: dry-run (변경 없음)");

  const rows = await prisma.chatMessage.findMany({
    select: { id: true, userId: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`전체 메시지: ${rows.length}건`);

  // (userId, createdAt) 조합으로 묶어 USER·ASSISTANT가 겹치는 쌍을 찾는다.
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = `${r.userId}|${r.createdAt.getTime()}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
  }

  const toBump: { id: string; to: Date }[] = [];
  for (const [, g] of groups) {
    if (g.length < 2) continue;
    const hasUser = g.some((r) => r.role === "USER");
    const assistants = g.filter((r) => r.role === "ASSISTANT");
    if (!hasUser || assistants.length === 0) continue;
    for (const a of assistants) {
      toBump.push({ id: a.id, to: new Date(a.createdAt.getTime() + 1) });
    }
  }

  console.log(`순서가 모호한 쌍의 ASSISTANT: ${toBump.length}건`);

  if (!WRITE) {
    console.log("\ndry-run 종료 — 반영하려면 --write");
    return;
  }

  for (const b of toBump) {
    await prisma.chatMessage.update({
      where: { id: b.id },
      data: { createdAt: b.to },
    });
  }
  console.log(`반영: ${toBump.length}건`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌", e);
    await prisma.$disconnect();
    process.exit(1);
  });
