import { prisma } from "@/lib/db";
import {
  DEFAULT_SKIN_SLUG,
  type CharacterSkinSlug,
} from "@/components/character/skins/types";

export interface SkinDefinition {
  slug: CharacterSkinSlug;
  outfitId: string;
  name: string;
  description: string;
  coinPrice: number;
  isDefault: boolean;
}

// 단일 진실: 코드 상의 SVG 변형 ↔ DB의 CharacterOutfit row 매핑.
// outfitId 는 deterministic 하게 고정 — 시드/조회/매핑이 전부 이 ID에 의존한다.
export const SKIN_CATALOG: SkinDefinition[] = [
  {
    slug: "chick",
    outfitId: "skin-chick",
    name: "병아리 메모",
    description: "갓 부화한 따뜻한 병아리. 알에서 새로 자라요.",
    coinPrice: 0,
    isDefault: true,
  },
  {
    slug: "mochi",
    outfitId: "skin-mochi",
    name: "모찌 메모",
    description: "둥근 모찌 모양. 머리 위 새싹이 꽃으로 자라요.",
    coinPrice: 0,
    isDefault: false,
  },
  {
    slug: "classic",
    outfitId: "skin-classic",
    name: "클래식 메모",
    description: "사람 모양 메모. 레벨마다 꽃·책·이어폰·왕관을 가져요.",
    coinPrice: 0,
    isDefault: false,
  },
];

export function outfitIdToSkin(
  id: string | null | undefined,
): CharacterSkinSlug {
  if (!id) return DEFAULT_SKIN_SLUG;
  return SKIN_CATALOG.find((s) => s.outfitId === id)?.slug ?? DEFAULT_SKIN_SLUG;
}

export function getSkinDefinition(slug: CharacterSkinSlug): SkinDefinition {
  return SKIN_CATALOG.find((s) => s.slug === slug) ?? SKIN_CATALOG[0];
}

// 카탈로그 row를 idempotent 하게 DB에 반영. 별도 db:seed 스크립트가 갖춰지기 전이라
// 상점 페이지 진입 시 자가 시드한다 (upsert이므로 다회 호출 안전).
export async function ensureSkinsSeeded(): Promise<void> {
  await Promise.all(
    SKIN_CATALOG.map((skin) =>
      prisma.characterOutfit.upsert({
        where: { id: skin.outfitId },
        update: {
          name: skin.name,
          description: skin.description,
          coinPrice: skin.coinPrice,
        },
        create: {
          id: skin.outfitId,
          name: skin.name,
          description: skin.description,
          coinPrice: skin.coinPrice,
          // imageUrl은 schema.prisma에서 required지만 UI는 SVG 컴포넌트로 직접 렌더하므로 미사용.
          // 향후 imageUrl을 optional로 마이그레이션할 때 정리.
          imageUrl: `/character-previews/${skin.slug}.svg`,
        },
      }),
    ),
  );
}

// 기본 스킨(chick)은 모든 유저에게 자동 보유 + 미장착 상태면 자동 장착.
// 신규 가입자뿐 아니라 기존 유저도 상점 진입 시 backfill 된다.
export async function ensureUserDefaultSkin(userId: string): Promise<void> {
  const defaultSkin = SKIN_CATALOG.find((s) => s.isDefault);
  if (!defaultSkin) return;

  const character = await prisma.character.findUnique({
    where: { userId },
    select: { id: true, equipped: { select: { outfitId: true } } },
  });
  if (!character) return;

  await prisma.characterOutfitOwned.upsert({
    where: {
      characterId_outfitId: {
        characterId: character.id,
        outfitId: defaultSkin.outfitId,
      },
    },
    update: {},
    create: {
      characterId: character.id,
      outfitId: defaultSkin.outfitId,
    },
  });

  if (!character.equipped) {
    await prisma.characterEquipped.create({
      data: {
        characterId: character.id,
        outfitId: defaultSkin.outfitId,
      },
    });
  }
}
