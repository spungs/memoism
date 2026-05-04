import Link from "next/link";
import { CharacterSVG } from "./character-svg";
import {
  calcGrowthPoints,
  getBubbleMessage,
  getGrowthLevel,
  getNextLevel,
  getProgressToNext,
} from "@/lib/character/growth";

interface CharacterCardProps {
  character: {
    age: number;
    bornAt: Date;
    isAsleep: boolean;
    coinBalance: number;
    subscriptionStatus: string;
  };
  diaryCount: number;
}

export function CharacterCard({ character, diaryCount }: CharacterCardProps) {
  const daysSinceBorn = Math.floor(
    (Date.now() - new Date(character.bornAt).getTime()) / 86400000,
  );
  const points = calcGrowthPoints(daysSinceBorn, diaryCount);
  const currentLevel = getGrowthLevel(points);
  const nextLevel = getNextLevel(currentLevel);
  const progress = getProgressToNext(points, currentLevel, nextLevel);
  const bubbleMessage = getBubbleMessage(currentLevel.name, character.isAsleep);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "var(--space-6) var(--space-4)",
      }}
    >
      {/* 레벨 뱃지 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          marginBottom: "var(--space-4)",
          padding: "4px 12px",
          borderRadius: "var(--radius-pill)",
          backgroundColor: "var(--accent-rose-soft)",
          border: "1px solid var(--accent-rose)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            color: "var(--accent-rose-deep)",
            fontWeight: 600,
            letterSpacing: "var(--tracking-wider)",
          }}
        >
          LV.{currentLevel.level} {currentLevel.name}
        </span>
      </div>

      {/* 말풍선 */}
      <Link
        href={character.isAsleep ? "#" : "/diary/new"}
        aria-disabled={character.isAsleep}
        tabIndex={character.isAsleep ? -1 : undefined}
        style={{
          position: "relative",
          backgroundColor: "var(--surface-raised)",
          border: "1.5px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-3) var(--space-5)",
          marginBottom: "var(--space-2)",
          boxShadow: "var(--shadow-sm)",
          textDecoration: "none",
          maxWidth: 240,
          pointerEvents: character.isAsleep ? "none" : "auto",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "var(--text-md)",
            color: character.isAsleep ? "var(--fg-subtle)" : "var(--fg)",
            lineHeight: "var(--leading-snug)",
            textAlign: "center",
            margin: 0,
          }}
        >
          {bubbleMessage}
        </p>
        {/* 말풍선 꼬리 (테두리) */}
        <div
          style={{
            position: "absolute",
            bottom: -10,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: "10px solid var(--border)",
          }}
        />
        {/* 말풍선 꼬리 (배경) */}
        <div
          style={{
            position: "absolute",
            bottom: -8,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "7px solid transparent",
            borderRight: "7px solid transparent",
            borderTop: "9px solid var(--surface-raised)",
          }}
        />
      </Link>

      {/* 캐릭터 SVG */}
      <CharacterSVG
        level={currentLevel.level}
        isAsleep={character.isAsleep}
        size={160}
      />

      {/* 성장 진행바 */}
      {nextLevel && (
        <div style={{ width: "100%", maxWidth: 200, marginTop: "var(--space-3)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-xs)",
                color: "var(--fg-subtle)",
              }}
            >
              성장 {progress}%
            </span>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-xs)",
                color: "var(--fg-subtle)",
              }}
            >
              → {nextLevel.name}
            </span>
          </div>
          <div
            style={{
              height: 6,
              backgroundColor: "var(--paper-2)",
              borderRadius: "var(--radius-pill)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                backgroundColor: "var(--accent-rose)",
                borderRadius: "var(--radius-pill)",
                transition: "width 1s var(--ease-out)",
              }}
            />
          </div>
        </div>
      )}

      {/* 코인 & 채팅 - 한 row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          marginTop: "var(--space-3)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fg-subtle)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          🪙 {character.coinBalance}
        </span>
        <Link
          href="/character"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--surface-raised)",
            backgroundColor: "var(--accent-rose)",
            padding: "4px 14px",
            borderRadius: "var(--radius-pill)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          💬 대화하기
        </Link>
      </div>

      {/* 잠든 상태 안내 */}
      {character.isAsleep && (
        <div
          style={{
            marginTop: "var(--space-3)",
            padding: "var(--space-3) var(--space-4)",
            backgroundColor: "var(--paper-2)",
            borderRadius: "var(--radius-md)",
            maxWidth: 240,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-xs)",
              color: "var(--fg-subtle)",
              margin: 0,
            }}
          >
            구독이 만료되어 캐릭터가 잠들었어요.
          </p>
        </div>
      )}
    </div>
  );
}
