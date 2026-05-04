"use client";

import { useEffect, useState } from "react";
import type { CharacterSkinProps } from "./types";

type BlinkState = "open" | "closing" | "closed" | "opening";

// 메모 (모찌). 둥근 블롭 + 머리 위 새싹/꽃이 레벨에 따라 자람.
export function CharacterSkinMochi({
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

  const C_BODY = isAsleep ? "#d8d0c5" : "#F8EFE0";
  const C_BODY_STROKE = isAsleep ? "#b0a8a0" : "#E4D4B8";
  const C_EYE = isAsleep ? "#888" : "#2A2118";
  const C_CHEEK = "#F0B5A8";
  const C_MOUTH = "#7A6A55";
  const C_LEAF_DARK = isAsleep ? "#9aa898" : "#7E9C7B";
  const C_LEAF_LIGHT = isAsleep ? "#b0bcaf" : "#A2BFA0";
  const C_PETAL = isAsleep ? "#c8b6b0" : "#F2A6B5";
  const C_PETAL_CENTER = isAsleep ? "#b0a890" : "#E8B868";

  const mouth = (() => {
    if (isAsleep) {
      return <ellipse cx="80" cy="125" rx="5" ry="3" fill="#C8B89F" opacity="0.6" />;
    }
    if (expression === "yawn") {
      return <ellipse cx="80" cy="128" rx="6.5" ry="7.5" fill={C_MOUTH} />;
    }
    if (expression === "happy-closed") {
      return (
        <path
          d="M68 122 Q80 134 92 122"
          stroke={C_MOUTH}
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
      );
    }
    if (expression === "sad") {
      return (
        <path
          d="M73 128 Q80 122 87 128"
          stroke={C_MOUTH}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
      );
    }
    return (
      <path
        d="M70 122 Q75 128 80 124 Q85 128 90 122"
        stroke={C_MOUTH}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  })();

  const sprout = (() => {
    if (level <= 1) {
      return (
        <g transform="translate(80, 38)">
          <path d="M 0 8 Q 0 0 0 -2" stroke={C_LEAF_DARK} strokeWidth="2" strokeLinecap="round" fill="none" />
          <ellipse cx="-3" cy="-2" rx="3.5" ry="2.5" transform="rotate(-30 -3 -2)" fill={C_LEAF_DARK} />
          <ellipse cx="3" cy="-2" rx="3.5" ry="2.5" transform="rotate(30 3 -2)" fill={C_LEAF_LIGHT} />
        </g>
      );
    }
    if (level === 2) {
      return (
        <g transform="translate(80, 32)">
          <path d="M 0 14 Q 0 6 0 0" stroke={C_LEAF_DARK} strokeWidth="2" strokeLinecap="round" fill="none" />
          <ellipse cx="-5" cy="4" rx="4.5" ry="3" transform="rotate(-35 -5 4)" fill={C_LEAF_DARK} />
          <ellipse cx="5" cy="0" rx="4.5" ry="3" transform="rotate(35 5 0)" fill={C_LEAF_LIGHT} />
        </g>
      );
    }
    if (level === 3) {
      return (
        <g transform="translate(80, 28)">
          <path d="M 0 18 Q 0 8 0 2" stroke={C_LEAF_DARK} strokeWidth="2" strokeLinecap="round" fill="none" />
          <ellipse cx="-6" cy="8" rx="5" ry="3.5" transform="rotate(-35 -6 8)" fill={C_LEAF_DARK} />
          <ellipse cx="6" cy="3" rx="5" ry="3.5" transform="rotate(35 6 3)" fill={C_LEAF_LIGHT} />
          <circle cx="0" cy="-1" r="3" fill={C_PETAL} opacity="0.85" />
        </g>
      );
    }
    if (level === 4) {
      return (
        <g transform="translate(80, 24)">
          <path d="M 0 22 Q 0 12 0 6" stroke={C_LEAF_DARK} strokeWidth="2" strokeLinecap="round" fill="none" />
          <ellipse cx="-6" cy="12" rx="5" ry="3.5" transform="rotate(-35 -6 12)" fill={C_LEAF_DARK} />
          <ellipse cx="6" cy="7" rx="5" ry="3.5" transform="rotate(35 6 7)" fill={C_LEAF_LIGHT} />
          <ellipse cx="0" cy="0" rx="4" ry="5" fill={C_PETAL} />
          <ellipse cx="0" cy="0" rx="2" ry="3" fill={C_PETAL_CENTER} opacity="0.8" />
        </g>
      );
    }
    return (
      <g transform="translate(80, 22)">
        <path d="M 0 22 Q 0 14 0 8" stroke={C_LEAF_DARK} strokeWidth="2" strokeLinecap="round" fill="none" />
        <ellipse cx="-7" cy="14" rx="5" ry="3.5" transform="rotate(-35 -7 14)" fill={C_LEAF_DARK} />
        <ellipse cx="7" cy="9" rx="5" ry="3.5" transform="rotate(35 7 9)" fill={C_LEAF_LIGHT} />
        <g>
          <ellipse cx="0" cy="-5" rx="3" ry="4" fill={C_PETAL} />
          <ellipse cx="5" cy="-1" rx="3" ry="4" transform="rotate(72 5 -1)" fill={C_PETAL} />
          <ellipse cx="3" cy="5" rx="3" ry="4" transform="rotate(144 3 5)" fill={C_PETAL} />
          <ellipse cx="-3" cy="5" rx="3" ry="4" transform="rotate(216 -3 5)" fill={C_PETAL} />
          <ellipse cx="-5" cy="-1" rx="3" ry="4" transform="rotate(288 -5 -1)" fill={C_PETAL} />
        </g>
        <circle cx="0" cy="0" r="2.8" fill={C_PETAL_CENTER} />
      </g>
    );
  })();

  const bodyTilt = lookX * 0.6;

  return (
    <div style={{ position: "relative", display: "inline-block", lineHeight: 0 }}>
      <style>{`
        @keyframes memo-breath {
          0%, 100% { transform: scale(1, 1); }
          50%      { transform: scale(1.025, 0.975); }
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
        @keyframes memo-leaf-sway {
          0%, 100% { transform: rotate(-1deg); }
          50%      { transform: rotate(2deg); }
        }
        .memo-figure-awake { animation: memo-breath 4.2s ease-in-out infinite; transform-origin: 80px 152px; }
        .memo-figure-asleep { animation: memo-bob-slow 4.5s ease-in-out infinite; }
        .memo-squash { animation: memo-squash 0.55s cubic-bezier(.2,.7,.3,1.4) both; transform-origin: 80px 152px; }
        .memo-sprout-sway { animation: memo-leaf-sway 3.6s ease-in-out infinite; transform-origin: 80px 50px; transform-box: fill-box; }
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
        <ellipse cx="80" cy="158" rx="40" ry="6" fill={isAsleep ? "#ccc" : "#4A3D2E"} opacity="0.13" />

        <g key={`squash-${squashKey}`} className={squashKey > 0 ? "memo-squash" : undefined}>
          <g className={isAsleep ? "memo-figure-asleep" : "memo-figure-awake"}>
            <g className="memo-body-tilt" style={{ transform: `rotate(${bodyTilt}deg)` }}>
              <path
                d="M 30 102
                   Q 28 56, 80 50
                   Q 132 56, 130 102
                   Q 130 144, 100 152
                   Q 80 156, 60 152
                   Q 30 144, 30 102 Z"
                fill={C_BODY}
                stroke={C_BODY_STROKE}
                strokeWidth="2"
                strokeLinejoin="round"
              />

              {!isAsleep && (
                <>
                  <ellipse cx="48" cy="113" rx="9" ry="5" fill={C_CHEEK} opacity={expression === "happy-closed" ? 0.9 : 0.6} />
                  <ellipse cx="112" cy="113" rx="9" ry="5" fill={C_CHEEK} opacity={expression === "happy-closed" ? 0.9 : 0.6} />
                </>
              )}

              {eyesClosedHappy ? (
                <path d="M53 96 Q62 88 71 96" stroke={C_EYE} strokeWidth="2.6" fill="none" strokeLinecap="round" />
              ) : (
                <>
                  <ellipse
                    className="memo-eye"
                    cx={62 + eyeShift}
                    cy="97"
                    rx="7"
                    ry="9"
                    fill={C_EYE}
                    style={{
                      transformOrigin: `${62 + eyeShift}px 97px`,
                      transform: `scaleY(${eyeScaleY})`,
                      transition: "transform 0.06s",
                    }}
                  />
                  {!isAsleep && blinkState === "open" && (
                    <>
                      <circle cx={64 + eyeShift} cy="93" r="2.4" fill="white" opacity="0.95" />
                      <circle cx={66 + eyeShift} cy="100" r="0.9" fill="white" opacity="0.6" />
                    </>
                  )}
                </>
              )}

              {eyesClosedHappy ? (
                <path d="M89 96 Q98 88 107 96" stroke={C_EYE} strokeWidth="2.6" fill="none" strokeLinecap="round" />
              ) : (
                <>
                  <ellipse
                    className="memo-eye"
                    cx={98 + eyeShift}
                    cy="97"
                    rx="7"
                    ry="9"
                    fill={C_EYE}
                    style={{
                      transformOrigin: `${98 + eyeShift}px 97px`,
                      transform: `scaleY(${eyeScaleY})`,
                      transition: "transform 0.06s",
                    }}
                  />
                  {!isAsleep && blinkState === "open" && (
                    <>
                      <circle cx={100 + eyeShift} cy="93" r="2.4" fill="white" opacity="0.95" />
                      <circle cx={102 + eyeShift} cy="100" r="0.9" fill="white" opacity="0.6" />
                    </>
                  )}
                </>
              )}

              {mouth}

              <g className={isAsleep ? undefined : "memo-sprout-sway"}>{sprout}</g>
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
            <g transform="translate(116, 42)">
              <path
                d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z"
                fill="#FBD7A0"
                stroke="#D9A05B"
                strokeWidth="0.5"
              />
            </g>
            <g transform="translate(98, 26)"><circle r="2.5" fill="#FBD7A0" /></g>
            <g transform="translate(128, 56)"><circle r="1.8" fill="#FBD7A0" /></g>
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
