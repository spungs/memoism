import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { calcGrowthPoints, getGrowthLevel } from "@/lib/character/growth";
import {
  SKIN_CATALOG,
  ensureSkinsSeeded,
  ensureUserDefaultSkin,
} from "@/lib/character/skins";
import { SkinCard } from "./skin-card";

export default async function CharacterShopPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await ensureSkinsSeeded();
  await ensureUserDefaultSkin(session.userId);

  const [character, diaryCount] = await Promise.all([
    prisma.character.findUnique({
      where: { userId: session.userId },
      include: {
        equipped: true,
        ownedOutfits: { select: { outfitId: true } },
      },
    }),
    prisma.diary.count({ where: { userId: session.userId } }),
  ]);

  if (!character) redirect("/login");

  const daysSinceBorn = Math.floor(
    (Date.now() - new Date(character.bornAt).getTime()) / 86400000,
  );
  const points = calcGrowthPoints(daysSinceBorn, diaryCount);
  const currentLevel = getGrowthLevel(points);

  const ownedIds = new Set(character.ownedOutfits.map((o) => o.outfitId));
  const equippedId = character.equipped?.outfitId ?? null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "calc(100svh - 56px)",
        backgroundColor: "var(--bg)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-4) var(--space-5)",
          paddingTop: "calc(var(--space-4) + env(safe-area-inset-top))",
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--surface)",
        }}
      >
        <Link
          href="/character"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fg-subtle)",
            textDecoration: "none",
          }}
        >
          ← 캐릭터
        </Link>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "var(--text-lg)",
            color: "var(--fg)",
            margin: 0,
          }}
        >
          상점
        </h1>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fg-subtle)",
          }}
        >
          🪙 {character.coinBalance}
        </span>
      </header>

      <section style={{ padding: "var(--space-5)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "var(--space-3)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "var(--fg-subtle)",
              fontWeight: 600,
              letterSpacing: "var(--tracking-wider)",
              margin: 0,
            }}
          >
            캐릭터 스킨
          </h2>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-xs)",
              color: "var(--fg-subtle)",
            }}
          >
            {ownedIds.size} / {SKIN_CATALOG.length} 보유
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
            gap: "var(--space-3)",
          }}
        >
          {SKIN_CATALOG.map((skin) => (
            <SkinCard
              key={skin.outfitId}
              outfitId={skin.outfitId}
              slug={skin.slug}
              name={skin.name}
              description={skin.description}
              coinPrice={skin.coinPrice}
              isOwned={ownedIds.has(skin.outfitId)}
              isEquipped={equippedId === skin.outfitId}
              characterLevel={currentLevel.level}
              isAsleep={character.isAsleep}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
