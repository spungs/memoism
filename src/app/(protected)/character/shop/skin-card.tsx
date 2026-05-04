"use client";

import { useState, useTransition } from "react";
import {
  CharacterSVG,
  type CharacterSkinSlug,
} from "@/components/character/character-svg";
import {
  purchaseSkinAction,
  equipSkinAction,
} from "@/lib/character/skin-actions";

interface Props {
  outfitId: string;
  slug: CharacterSkinSlug;
  name: string;
  description: string;
  coinPrice: number;
  isOwned: boolean;
  isEquipped: boolean;
  characterLevel: number;
  isAsleep: boolean;
}

export function SkinCard({
  outfitId,
  slug,
  name,
  description,
  coinPrice,
  isOwned,
  isEquipped,
  characterLevel,
  isAsleep,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onPurchase = () => {
    setError(null);
    startTransition(async () => {
      const res = await purchaseSkinAction(outfitId);
      if (!res.ok) setError(res.error);
    });
  };

  const onEquip = () => {
    setError(null);
    startTransition(async () => {
      const res = await equipSkinAction(outfitId);
      if (!res.ok) setError(res.error);
    });
  };

  const action = isEquipped ? (
    <span
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-xs)",
        color: "var(--accent-rose-deep)",
        backgroundColor: "var(--accent-rose-soft)",
        border: "1px solid var(--accent-rose)",
        padding: "6px 14px",
        borderRadius: "var(--radius-pill)",
        fontWeight: 600,
        letterSpacing: "var(--tracking-wider)",
      }}
    >
      장착중
    </span>
  ) : isOwned ? (
    <button
      type="button"
      onClick={onEquip}
      disabled={isPending}
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        color: "var(--surface-raised)",
        backgroundColor: "var(--accent-rose)",
        border: "none",
        padding: "8px 18px",
        borderRadius: "var(--radius-pill)",
        cursor: isPending ? "wait" : "pointer",
        fontWeight: 500,
        opacity: isPending ? 0.6 : 1,
      }}
    >
      장착하기
    </button>
  ) : (
    <button
      type="button"
      onClick={onPurchase}
      disabled={isPending}
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        color: "var(--surface-raised)",
        backgroundColor: "var(--accent-rose-deep)",
        border: "none",
        padding: "8px 18px",
        borderRadius: "var(--radius-pill)",
        cursor: isPending ? "wait" : "pointer",
        fontWeight: 500,
        opacity: isPending ? 0.6 : 1,
      }}
    >
      {coinPrice === 0 ? "무료로 받기" : `🪙 ${coinPrice} 구매`}
    </button>
  );

  return (
    <div
      style={{
        backgroundColor: "var(--surface-raised)",
        border: isEquipped ? "1.5px solid var(--accent-rose)" : "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-4)",
        boxShadow: "var(--shadow-xs)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-3)",
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CharacterSVG
          skin={slug}
          level={characterLevel}
          isAsleep={isAsleep}
          size={120}
        />
      </div>

      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "var(--text-md)",
            color: "var(--fg)",
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          {name}
        </div>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            color: "var(--fg-subtle)",
            margin: 0,
            lineHeight: "var(--leading-snug)",
          }}
        >
          {description}
        </p>
      </div>

      {action}

      {error && (
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            color: "var(--accent-rose-deep)",
            margin: 0,
            textAlign: "center",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
