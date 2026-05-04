"use client";

import { useEffect, useState } from "react";
import type { CharacterSkinProps } from "./types";

type BlinkState = "open" | "closing" | "closed" | "opening";

// 메모 (병아리). Finch 스타일 — 부리/날개/발 명확. 알 → 병아리 → 새 성장.
export function CharacterSkinChick({
  level,
  isAsleep,
  size = 160,
  expression = "auto",
  lookX = 0,
  showSparkle = false,
  showHeart = false,
  popKey = 0,
  squashKey = 0,
}: CharacterSkinProps) {
  const [blinkState, setBlinkState] = useState<BlinkState>("open");

  useEffect(() => {
    if (isAsleep) {
      setBlinkState("closed");
      return;
    }
    let timeouts: ReturnType<typeof setTimeout>[] = [];
    const blink = () => {
      setBlinkState("closing");
      timeouts.push(setTimeout(() => setBlinkState("closed"), 60));
      timeouts.push(setTimeout(() => setBlinkState("opening"), 120));
      timeouts.push(setTimeout(() => setBlinkState("open"), 180));
    };
    const randomBlink = () => {
      blink();
      timeouts.push(setTimeout(randomBlink, 3000 + Math.random() * 3000));
    };
    timeouts.push(setTimeout(randomBlink, 2000 + Math.random() * 2000));
    return () => {
      timeouts.forEach(clearTimeout);
      timeouts = [];
    };
  }, [isAsleep]);

  const eyesClosedHappy = !isAsleep && expression === "happy-closed";
  const eyeScaleY = isAsleep
    ? 0.05
    : eyesClosedHappy
      ? 0
      : blinkState === "closed"
        ? 0.05
        : blinkState === "closing" || blinkState === "opening"
          ? 0.4
          : 1;

  const eyeShift = lookX * 1.5;

  const C_BODY = isAsleep ? "#d8d0c5" : "#FDF3DC";
  const C_BODY_STROKE = isAsleep ? "#b0a8a0" : "#E8D6B0";
  const C_WING = isAsleep ? "#c8c0b5" : "#F0E2C0";
  const C_EYE = isAsleep ? "#888" : "#2A2118";
  const C_CHEEK = "#F0B5A8";
  const C_MOUTH = "#7A6A55";
  const C_BEAK = isAsleep ? "#a89a80" : "#E8B868";
  const C_BEAK_STROKE = isAsleep ? "#807460" : "#C99548";
  const C_FEET = isAsleep ? "#a89a80" : "#D9A05B";

  const beak = (() => {
    if (expression === "yawn") {
      return (
        <>
          <path
            d="M 76 104 L 80 110 L 84 104 Z"
            fill={C_BEAK}
            stroke={C_BEAK_STROKE}
            strokeWidth="0.7"
          />
          <path
            d="M 77 116 L 80 112 L 83 116 Z"
            fill={C_BEAK}
            stroke={C_BEAK_STROKE}
            strokeWidth="0.7"
          />
        </>
      );
    }
    return (
      <path
        d="M 76 105 L 80 114 L 84 105 Z"
        fill={C_BEAK}
        stroke={C_BEAK_STROKE}
        strokeWidth="0.7"
      />
    );
  })();

  const mouth = (() => {
    if (isAsleep) return null;
    if (expression === "yawn") return null;
    if (expression === "happy-closed") {
      return (
        <path
          d="M 70 124 Q 80 134 90 124"
          stroke={C_MOUTH}
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
      );
    }
    if (expression === "sad") {
      return (
        <path
          d="M 74 128 Q 80 124 86 128"
          stroke={C_MOUTH}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      );
    }
    return (
      <path
        d="M 74 124 Q 80 128 86 124"
        stroke={C_MOUTH}
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
    );
  })();

  const crest = (() => {
    if (level <= 1) {
      return (
        <>
          <path
            d="M 76 56 Q 78 46 82 50 Q 80 56 76 56 Z"
            fill={C_BODY}
            stroke={C_BODY_STROKE}
            strokeWidth="1"
            opacity="0.8"
          />
          <path
            d="M 80 56 Q 82 48 84 52"
            stroke={C_FEET}
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    }
    if (level === 2) {
      return (
        <g>
          <path
            d="M 76 58 Q 78 46 82 52"
            stroke={C_FEET}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 82 56 Q 86 48 88 54"
            stroke={C_FEET}
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
    }
    if (level === 3) {
      return (
        <g>
          <path
            d="M 73 58 Q 75 44 80 50"
            stroke={C_FEET}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 80 56 Q 82 42 86 50"
            stroke={C_FEET}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 86 58 Q 90 46 92 52"
            stroke={C_FEET}
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
    }
    if (level === 4) {
      return (
        <g>
          <path d="M 71 58 Q 73 42 78 48" stroke={C_FEET} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 78 56 Q 80 38 84 46" stroke={C_FEET} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 84 56 Q 88 42 90 50" stroke={C_FEET} strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="80" cy="38" r="2.4" fill="#F2A6B5" opacity="0.85" />
        </g>
      );
    }
    return (
      <g>
        <path d="M 68 60 Q 68 40 75 46" stroke={C_FEET} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 74 58 Q 74 36 80 44" stroke={C_FEET} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 80 56 Q 80 32 86 42" stroke={C_FEET} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 86 58 Q 88 36 92 46" stroke={C_FEET} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 92 60 Q 96 44 96 50" stroke={C_FEET} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <g transform="translate(96, 50)">
          <circle cx="-2" cy="0" r="2.2" fill="#F2A6B5" />
          <circle cx="2" cy="0" r="2.2" fill="#F2A6B5" />
          <circle cx="0" cy="-2" r="2.2" fill="#F2A6B5" />
          <circle cx="0" cy="2" r="2.2" fill="#F2A6B5" />
          <circle cx="0" cy="0" r="1.5" fill="#E8B868" />
        </g>
      </g>
    );
  })();

  const tail = level >= 3 && !isAsleep ? (
    <g transform="translate(124, 110)">
      <path
        d="M 0 0 Q 12 -2 14 4 Q 12 8 0 6 Z"
        fill={C_WING}
        stroke={C_BODY_STROKE}
        strokeWidth="1.2"
      />
      {level >= 4 && (
        <path
          d="M 2 4 Q 14 6 16 12 Q 12 14 2 10 Z"
          fill={C_WING}
          stroke={C_BODY_STROKE}
          strokeWidth="1.2"
          opacity="0.9"
        />
      )}
    </g>
  ) : null;

  const bodyTilt = lookX * 0.6;

  return (
    <div style={{ position: "relative", display: "inline-block", lineHeight: 0 }}>
      <style>{`
        @keyframes memo-breath {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.022); }
        }
        @keyframes memo-bob-slow {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-4px); }
        }
        @keyframes memo-zzz {
          0%   { opacity: 0; transform: translate(0, 0) scale(0.6); }
          50%  { opacity: 1; }
          100% { opacity: 0; transform: translate(10px, -16px) scale(1); }
        }
        @keyframes memo-squash {
          0%   { transform: scale(1, 1); }
          18%  { transform: scale(1.10, 0.86); }
          45%  { transform: scale(0.92, 1.08); }
          75%  { transform: scale(1.03, 0.97); }
          100% { transform: scale(1, 1); }
        }
        @keyframes memo-sparkle {
          0%   { opacity: 0; transform: translate(0, 0) scale(0.4); }
          25%  { opacity: 1; transform: translate(0, -2px) scale(1.1); }
          70%  { opacity: 1; transform: translate(0, -10px) scale(1); }
          100% { opacity: 0; transform: translate(0, -18px) scale(0.7); }
        }
        @keyframes memo-heart {
          0%   { opacity: 0; transform: translate(0, 0) scale(0.4); }
          15%  { opacity: 1; transform: translate(0, -4px) scale(1.15); }
          85%  { opacity: 1; transform: translate(2px, -22px) scale(0.95); }
          100% { opacity: 0; transform: translate(2px, -32px) scale(0.7); }
        }
        @keyframes memo-wing-flap {
          0%, 100% { transform: rotate(-2deg); }
          50%      { transform: rotate(3deg); }
        }
        .memo-figure-awake { animation: memo-breath 4.2s ease-in-out infinite; transform-origin: 80px 152px; }
        .memo-figure-asleep { animation: memo-bob-slow 4.5s ease-in-out infinite; }
        .memo-squash { animation: memo-squash 0.55s cubic-bezier(.2,.7,.3,1.4) both; transform-origin: 80px 152px; }
        .memo-wing-l { animation: memo-wing-flap 3.4s ease-in-out infinite; transform-origin: 36px 116px; transform-box: fill-box; }
        .memo-wing-r { animation: memo-wing-flap 3.4s ease-in-out infinite reverse; transform-origin: 124px 116px; transform-box: fill-box; }
        .memo-sparkle-grp { animation: memo-sparkle 0.8s ease-out forwards; transform-origin: center; transform-box: fill-box; }
        .memo-heart-grp { animation: memo-heart 1s ease-out forwards; transform-origin: center; transform-box: fill-box; }
        .memo-eye { transition: cx 0.18s ease-out; }
        .memo-body-tilt { transition: transform 0.25s ease-out; transform-origin: 80px 150px; transform-box: fill-box; }
      `}</style>

      <svg
        width={size}
        height={size}
        viewBox="0 0 160 180"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: isAsleep ? "grayscale(1) brightness(0.85)" : "none",
          transition: "filter 0.6s ease",
          overflow: "visible",
        }}
      >
        <ellipse cx="80" cy="158" rx="38" ry="5" fill={isAsleep ? "#ccc" : "#4A3D2E"} opacity="0.13" />

        {!isAsleep && level >= 2 && (
          <g stroke={C_FEET} strokeWidth="2" fill="none" strokeLinecap="round">
            <path d="M 67 152 L 67 160 M 64 162 L 67 160 L 70 162" />
            <path d="M 93 152 L 93 160 M 90 162 L 93 160 L 96 162" />
          </g>
        )}
        {!isAsleep && level <= 1 && (
          <g>
            <path d="M 38 150 Q 42 140 48 144 Q 46 152 38 150 Z" fill={C_BODY} stroke={C_BODY_STROKE} strokeWidth="1" opacity="0.85" />
            <path d="M 122 150 Q 118 140 112 144 Q 114 152 122 150 Z" fill={C_BODY} stroke={C_BODY_STROKE} strokeWidth="1" opacity="0.85" />
          </g>
        )}

        {tail}

        <g key={`squash-${squashKey}`} className={squashKey > 0 ? "memo-squash" : undefined}>
          <g className={isAsleep ? "memo-figure-asleep" : "memo-figure-awake"}>
            <g className="memo-body-tilt" style={{ transform: `rotate(${bodyTilt}deg)` }}>
              <ellipse cx="80" cy="108" rx="44" ry="48" fill={C_BODY} stroke={C_BODY_STROKE} strokeWidth="2" />

              {!isAsleep && level >= 2 && (
                <>
                  <g className="memo-wing-l">
                    <path
                      d="M 36 100 Q 22 112 28 132 Q 38 134 42 116 Z"
                      fill={C_WING}
                      stroke={C_BODY_STROKE}
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                  </g>
                  <g className="memo-wing-r">
                    <path
                      d="M 124 100 Q 138 112 132 132 Q 122 134 118 116 Z"
                      fill={C_WING}
                      stroke={C_BODY_STROKE}
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                  </g>
                </>
              )}

              {!isAsleep && (
                <>
                  <ellipse cx="50" cy="113" rx="8" ry="4" fill={C_CHEEK} opacity={expression === "happy-closed" ? 0.9 : 0.6} />
                  <ellipse cx="110" cy="113" rx="8" ry="4" fill={C_CHEEK} opacity={expression === "happy-closed" ? 0.9 : 0.6} />
                </>
              )}

              {eyesClosedHappy ? (
                <path d="M 56 95 Q 64 88 72 95" stroke={C_EYE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
              ) : (
                <>
                  <ellipse
                    className="memo-eye"
                    cx={64 + eyeShift}
                    cy="95"
                    rx="6.5"
                    ry="8.5"
                    fill={C_EYE}
                    style={{
                      transformOrigin: `${64 + eyeShift}px 95px`,
                      transform: `scaleY(${eyeScaleY})`,
                      transition: "transform 0.06s",
                    }}
                  />
                  {!isAsleep && blinkState === "open" && (
                    <>
                      <circle cx={66 + eyeShift} cy="91" r="2.3" fill="white" opacity="0.95" />
                      <circle cx={68 + eyeShift} cy="98" r="0.9" fill="white" opacity="0.6" />
                    </>
                  )}
                </>
              )}

              {eyesClosedHappy ? (
                <path d="M 88 95 Q 96 88 104 95" stroke={C_EYE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
              ) : (
                <>
                  <ellipse
                    className="memo-eye"
                    cx={96 + eyeShift}
                    cy="95"
                    rx="6.5"
                    ry="8.5"
                    fill={C_EYE}
                    style={{
                      transformOrigin: `${96 + eyeShift}px 95px`,
                      transform: `scaleY(${eyeScaleY})`,
                      transition: "transform 0.06s",
                    }}
                  />
                  {!isAsleep && blinkState === "open" && (
                    <>
                      <circle cx={98 + eyeShift} cy="91" r="2.3" fill="white" opacity="0.95" />
                      <circle cx={100 + eyeShift} cy="98" r="0.9" fill="white" opacity="0.6" />
                    </>
                  )}
                </>
              )}

              {beak}
              {mouth}
              {crest}
            </g>
          </g>
        </g>

        {isAsleep && (
          <>
            <text x="118" y="60" fontSize="14" style={{ animation: "memo-zzz 2s ease-in-out infinite" }}>💤</text>
            <text x="128" y="42" fontSize="10" style={{ animation: "memo-zzz 2s ease-in-out infinite 0.7s" }}>z</text>
            <text x="136" y="28" fontSize="8" style={{ animation: "memo-zzz 2s ease-in-out infinite 1.4s" }}>z</text>
          </>
        )}

        {showSparkle && (
          <g key={`sparkle-${popKey}`} className="memo-sparkle-grp">
            <g transform="translate(116, 50)">
              <path
                d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z"
                fill="#FBD7A0"
                stroke="#D9A05B"
                strokeWidth="0.5"
              />
            </g>
            <g transform="translate(102, 36)"><circle r="2.5" fill="#FBD7A0" /></g>
            <g transform="translate(126, 64)"><circle r="1.8" fill="#FBD7A0" /></g>
          </g>
        )}

        {showHeart && (
          <g key={`heart-${popKey}`} className="memo-heart-grp">
            <g transform="translate(58, 78)">
              <path
                d="M0 4 C 0 0, -6 0, -6 -4 C -6 -8, 0 -8, 0 -4 C 0 -8, 6 -8, 6 -4 C 6 0, 0 0, 0 4 Z"
                fill="#E08DA1"
                stroke="#C97B6B"
                strokeWidth="0.6"
              />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
