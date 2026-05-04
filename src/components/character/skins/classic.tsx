"use client";

import { useEffect, useState } from "react";
import type { CharacterSkinProps } from "./types";

type BlinkState = "open" | "closing" | "closed" | "opening";

// 메모 (클래식). 사람형 — 머리/몸/팔 분리, 머리카락. 레벨별 액세서리(꽃/책/이어폰/왕관).
export function CharacterSkinClassic({
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

  const mouth = (() => {
    if (isAsleep) {
      return <ellipse cx="80" cy="98" rx="5" ry="3" fill="#C8B89F" opacity="0.6" />;
    }
    if (expression === "yawn") {
      return <ellipse cx="80" cy="101" rx="6" ry="7" fill="#7A6A55" />;
    }
    if (expression === "happy-closed") {
      return (
        <path d="M70 95 Q80 106 90 95" stroke="#7A6A55" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      );
    }
    if (expression === "sad") {
      return (
        <path d="M73 100 Q80 94 87 100" stroke="#7A6A55" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      );
    }
    return (
      <path d="M73 96 Q80 103 87 96" stroke="#7A6A55" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    );
  })();

  const headTilt = lookX * 1.2;

  const accessory =
    level >= 5
      ? "crown"
      : level === 4
        ? "earphones"
        : level === 3
          ? "book"
          : level === 2
            ? "flower"
            : null;

  return (
    <div style={{ position: "relative", display: "inline-block", lineHeight: 0 }}>
      <style>{`
        @keyframes memo-breath {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.018); }
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
          18%  { transform: scale(1.08, 0.88); }
          45%  { transform: scale(0.94, 1.06); }
          75%  { transform: scale(1.02, 0.98); }
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
        .memo-figure-awake { animation: memo-breath 4.2s ease-in-out infinite; transform-origin: 80px 130px; }
        .memo-figure-asleep { animation: memo-bob-slow 4.5s ease-in-out infinite; }
        .memo-squash { animation: memo-squash 0.55s cubic-bezier(.2,.7,.3,1.4) both; transform-origin: 80px 156px; }
        .memo-sparkle-grp { animation: memo-sparkle 0.8s ease-out forwards; transform-origin: center; transform-box: fill-box; }
        .memo-heart-grp { animation: memo-heart 1s ease-out forwards; transform-origin: center; transform-box: fill-box; }
        .memo-eye { transition: cx 0.18s ease-out; }
        .memo-head { transition: transform 0.25s ease-out; transform-origin: 80px 90px; transform-box: fill-box; }
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
        <ellipse cx="80" cy="165" rx="32" ry="6" fill={isAsleep ? "#ccc" : "#4A3D2E"} opacity="0.12" />

        <g key={`squash-${squashKey}`} className={squashKey > 0 ? "memo-squash" : undefined}>
          <g className={isAsleep ? "memo-figure-asleep" : "memo-figure-awake"}>
            <rect
              x="54"
              y="110"
              width="52"
              height="44"
              rx="16"
              fill={isAsleep ? "#d0c8c0" : "#F5EEDF"}
              stroke={isAsleep ? "#b0a8a0" : "#C8B89F"}
              strokeWidth="1.5"
            />

            <path
              d="M54 138 L106 138 L106 138 Q106 154 90 154 L70 154 Q54 154 54 138 Z"
              fill={isAsleep ? "#b8b0a8" : "#C97B6B"}
              opacity="0.28"
            />

            <ellipse
              cx="42"
              cy="126"
              rx="9"
              ry="14"
              fill={isAsleep ? "#d0c8c0" : "#F5EEDF"}
              stroke={isAsleep ? "#b0a8a0" : "#C8B89F"}
              strokeWidth="1.2"
              transform="rotate(-10 42 126)"
            />

            <ellipse
              cx="118"
              cy="126"
              rx="9"
              ry="14"
              fill={isAsleep ? "#d0c8c0" : "#F5EEDF"}
              stroke={isAsleep ? "#b0a8a0" : "#C8B89F"}
              strokeWidth="1.2"
              transform="rotate(10 118 126)"
            />

            <g className="memo-head" style={{ transform: `rotate(${headTilt}deg)` }}>
              <ellipse
                cx="80"
                cy="82"
                rx="38"
                ry="36"
                fill={isAsleep ? "#d0c8c0" : "#F5EEDF"}
                stroke={isAsleep ? "#b0a8a0" : "#C8B89F"}
                strokeWidth="1.5"
              />

              <ellipse cx="80" cy="50" rx="34" ry="14" fill={isAsleep ? "#8a8480" : "#4A3D2E"} />
              <ellipse cx="52" cy="62" rx="10" ry="16" fill={isAsleep ? "#8a8480" : "#4A3D2E"} />
              <ellipse cx="108" cy="62" rx="10" ry="16" fill={isAsleep ? "#8a8480" : "#4A3D2E"} />

              {eyesClosedHappy ? (
                <path d="M61 84 Q67 78 73 84" stroke="#2A2118" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              ) : (
                <>
                  <ellipse
                    className="memo-eye"
                    cx={67 + lookX}
                    cy="82"
                    rx="5"
                    ry="6"
                    fill={isAsleep ? "#888" : "#2A2118"}
                    style={{
                      transformOrigin: `${67 + lookX}px 82px`,
                      transform: `scaleY(${eyeScaleY})`,
                      transition: "transform 0.06s",
                    }}
                  />
                  {!isAsleep && blinkState === "open" && (
                    <circle cx={69 + lookX} cy="80" r="1.5" fill="white" opacity="0.8" />
                  )}
                </>
              )}

              {eyesClosedHappy ? (
                <path d="M87 84 Q93 78 99 84" stroke="#2A2118" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              ) : (
                <>
                  <ellipse
                    className="memo-eye"
                    cx={93 + lookX}
                    cy="82"
                    rx="5"
                    ry="6"
                    fill={isAsleep ? "#888" : "#2A2118"}
                    style={{
                      transformOrigin: `${93 + lookX}px 82px`,
                      transform: `scaleY(${eyeScaleY})`,
                      transition: "transform 0.06s",
                    }}
                  />
                  {!isAsleep && blinkState === "open" && (
                    <circle cx={95 + lookX} cy="80" r="1.5" fill="white" opacity="0.8" />
                  )}
                </>
              )}

              {!isAsleep && (
                <>
                  <ellipse cx="57" cy="92" rx="7" ry="4" fill="#E5B5A8" opacity={expression === "happy-closed" ? 0.85 : 0.55} />
                  <ellipse cx="103" cy="92" rx="7" ry="4" fill="#E5B5A8" opacity={expression === "happy-closed" ? 0.85 : 0.55} />
                </>
              )}

              {mouth}

              {accessory === "crown" && (
                <g transform="translate(62, 30)">
                  <polygon points="18,0 0,16 8,10 18,18 28,10 36,16" fill="#D9A05B" stroke="#C97B6B" strokeWidth="1" />
                </g>
              )}
              {accessory === "earphones" && (
                <>
                  <circle cx="42" cy="80" r="6" fill="#4A3D2E" opacity="0.85" />
                  <path d="M42 74 Q50 55 80 52 Q110 55 118 74" stroke="#4A3D2E" strokeWidth="2" fill="none" />
                  <circle cx="118" cy="80" r="6" fill="#4A3D2E" opacity="0.85" />
                </>
              )}
              {accessory === "flower" && (
                <g transform="translate(106, 44)">
                  <circle cx="8" cy="8" r="8" fill="#E5B5A8" />
                  <circle cx="8" cy="8" r="4" fill="#D9A05B" />
                </g>
              )}
            </g>

            {accessory === "book" && (
              <g transform="translate(108, 118)">
                <rect width="20" height="26" rx="2" fill="#8A9A7B" />
                <rect x="2" y="4" width="16" height="1.5" rx="1" fill="white" opacity="0.6" />
                <rect x="2" y="8" width="12" height="1.5" rx="1" fill="white" opacity="0.6" />
                <line x1="10" y1="0" x2="10" y2="26" stroke="#6a7a5b" strokeWidth="1" />
              </g>
            )}
          </g>
        </g>

        {isAsleep && (
          <>
            <text x="110" y="55" fontSize="14" style={{ animation: "memo-zzz 2s ease-in-out infinite" }}>💤</text>
            <text x="120" y="38" fontSize="10" style={{ animation: "memo-zzz 2s ease-in-out infinite 0.7s" }}>z</text>
            <text x="128" y="25" fontSize="8" style={{ animation: "memo-zzz 2s ease-in-out infinite 1.4s" }}>z</text>
          </>
        )}

        {showSparkle && (
          <g key={`sparkle-${popKey}`} className="memo-sparkle-grp">
            <g transform="translate(112, 38)">
              <path
                d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z"
                fill="#FBD7A0"
                stroke="#D9A05B"
                strokeWidth="0.5"
              />
            </g>
            <g transform="translate(96, 24)"><circle r="2.5" fill="#FBD7A0" /></g>
            <g transform="translate(124, 52)"><circle r="1.8" fill="#FBD7A0" /></g>
          </g>
        )}

        {showHeart && (
          <g key={`heart-${popKey}`} className="memo-heart-grp">
            <g transform="translate(54, 70)">
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
