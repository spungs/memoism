"use client";

import { useEffect, useState } from "react";

interface CharacterSVGProps {
  level: number;
  isAsleep: boolean;
  size?: number;
}

type BlinkState = "open" | "closing" | "closed" | "opening";

export function CharacterSVG({ level, isAsleep, size = 160 }: CharacterSVGProps) {
  const [blinkState, setBlinkState] = useState<BlinkState>("open");

  // 눈 깜빡임 로직 (잠들었을 때는 항상 눈 감음)
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

    // 3~6초마다 랜덤 깜빡임
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

  const eyeScaleY =
    blinkState === "closed"
      ? 0.05
      : blinkState === "closing" || blinkState === "opening"
        ? 0.4
        : 1;

  // 레벨별 액세서리
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
    <div style={{ position: "relative", display: "inline-block" }}>
      <style>{`
        @keyframes memo-bob {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes memo-zzz {
          0%   { opacity: 0; transform: translate(0, 0) scale(0.6); }
          50%  { opacity: 1; }
          100% { opacity: 0; transform: translate(10px, -16px) scale(1); }
        }
        .memo-char-bob {
          animation: memo-bob 3s ease-in-out infinite;
        }
        .memo-char-bob-slow {
          animation: memo-bob 4s ease-in-out infinite;
        }
      `}</style>

      <svg
        width={size}
        height={size}
        viewBox="0 0 160 180"
        xmlns="http://www.w3.org/2000/svg"
        className={isAsleep ? "memo-char-bob-slow" : "memo-char-bob"}
        style={{
          filter: isAsleep ? "grayscale(1) brightness(0.85)" : "none",
          transition: "filter 0.6s ease",
        }}
      >
        {/* 그림자 */}
        <ellipse
          cx="80"
          cy="165"
          rx="32"
          ry="6"
          fill={isAsleep ? "#ccc" : "#4A3D2E"}
          opacity="0.12"
        />

        {/* 몸 */}
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

        {/* 옷 포인트 (브랜드 색) */}
        <path
          d="M54 138 L106 138 L106 138 Q106 154 90 154 L70 154 Q54 154 54 138 Z"
          fill={isAsleep ? "#b8b0a8" : "#C97B6B"}
          opacity="0.28"
        />

        {/* 팔 (왼) */}
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

        {/* 팔 (오른) */}
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

        {/* 머리 */}
        <ellipse
          cx="80"
          cy="82"
          rx="38"
          ry="36"
          fill={isAsleep ? "#d0c8c0" : "#F5EEDF"}
          stroke={isAsleep ? "#b0a8a0" : "#C8B89F"}
          strokeWidth="1.5"
        />

        {/* 머리카락 */}
        <ellipse cx="80" cy="50" rx="34" ry="14" fill={isAsleep ? "#8a8480" : "#4A3D2E"} />
        <ellipse cx="52" cy="62" rx="10" ry="16" fill={isAsleep ? "#8a8480" : "#4A3D2E"} />
        <ellipse cx="108" cy="62" rx="10" ry="16" fill={isAsleep ? "#8a8480" : "#4A3D2E"} />

        {/* 눈 (왼) */}
        <ellipse
          cx="67"
          cy="82"
          rx="5"
          ry="6"
          fill={isAsleep ? "#888" : "#2A2118"}
          style={{
            transformOrigin: "67px 82px",
            transform: `scaleY(${eyeScaleY})`,
            transition: "transform 0.06s",
          }}
        />
        {!isAsleep && blinkState === "open" && (
          <circle cx="69" cy="80" r="1.5" fill="white" opacity="0.8" />
        )}

        {/* 눈 (오른) */}
        <ellipse
          cx="93"
          cy="82"
          rx="5"
          ry="6"
          fill={isAsleep ? "#888" : "#2A2118"}
          style={{
            transformOrigin: "93px 82px",
            transform: `scaleY(${eyeScaleY})`,
            transition: "transform 0.06s",
          }}
        />
        {!isAsleep && blinkState === "open" && (
          <circle cx="95" cy="80" r="1.5" fill="white" opacity="0.8" />
        )}

        {/* 볼 홍조 */}
        {!isAsleep && (
          <>
            <ellipse cx="57" cy="92" rx="7" ry="4" fill="#E5B5A8" opacity="0.55" />
            <ellipse cx="103" cy="92" rx="7" ry="4" fill="#E5B5A8" opacity="0.55" />
          </>
        )}

        {/* 입 */}
        {isAsleep ? (
          <ellipse cx="80" cy="98" rx="5" ry="3" fill="#C8B89F" opacity="0.6" />
        ) : (
          <path
            d="M73 96 Q80 103 87 96"
            stroke="#7A6A55"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* 레벨별 액세서리 */}
        {accessory === "crown" && (
          <g transform="translate(62, 30)">
            <polygon
              points="18,0 0,16 8,10 18,18 28,10 36,16"
              fill="#D9A05B"
              stroke="#C97B6B"
              strokeWidth="1"
            />
          </g>
        )}
        {accessory === "earphones" && (
          <>
            <circle cx="42" cy="80" r="6" fill="#4A3D2E" opacity="0.85" />
            <path
              d="M42 74 Q50 55 80 52 Q110 55 118 74"
              stroke="#4A3D2E"
              strokeWidth="2"
              fill="none"
            />
            <circle cx="118" cy="80" r="6" fill="#4A3D2E" opacity="0.85" />
          </>
        )}
        {accessory === "book" && (
          <g transform="translate(108, 118)">
            <rect width="20" height="26" rx="2" fill="#8A9A7B" />
            <rect x="2" y="4" width="16" height="1.5" rx="1" fill="white" opacity="0.6" />
            <rect x="2" y="8" width="12" height="1.5" rx="1" fill="white" opacity="0.6" />
            <line x1="10" y1="0" x2="10" y2="26" stroke="#6a7a5b" strokeWidth="1" />
          </g>
        )}
        {accessory === "flower" && (
          <g transform="translate(106, 44)">
            <circle cx="8" cy="8" r="8" fill="#E5B5A8" />
            <circle cx="8" cy="8" r="4" fill="#D9A05B" />
          </g>
        )}

        {/* 💤 이펙트 */}
        {isAsleep && (
          <>
            <text x="110" y="55" fontSize="14" style={{ animation: "memo-zzz 2s ease-in-out infinite" }}>
              💤
            </text>
            <text
              x="120"
              y="38"
              fontSize="10"
              style={{ animation: "memo-zzz 2s ease-in-out infinite 0.7s" }}
            >
              z
            </text>
            <text
              x="128"
              y="25"
              fontSize="8"
              style={{ animation: "memo-zzz 2s ease-in-out infinite 1.4s" }}
            >
              z
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
