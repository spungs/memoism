"use client";

import { useEffect, useRef, useState } from "react";
import {
  CharacterSVG,
  type CharacterExpression,
  type CharacterSkinSlug,
} from "./character-svg";

interface Props {
  level: number;
  isAsleep: boolean;
  size?: number;
  skin?: CharacterSkinSlug;
}

type MicroAction =
  | "none"
  | "look-left"
  | "look-right"
  | "look-around"
  | "yawn";

const PET_DURATION = 700;
const PET_COOLDOWN = 250;

export function CharacterCompanion({ level, isAsleep, size = 160, skin }: Props) {
  const [microAction, setMicroAction] = useState<MicroAction>("none");
  const [isPetting, setIsPetting] = useState(false);
  const [popKey, setPopKey] = useState(0);
  const [squashKey, setSquashKey] = useState(0);
  const [petCount, setPetCount] = useState(0);
  const lastTapAtRef = useRef<number>(0);
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // 미세 자율 동작 스케줄러 (idle 상태에서 4~9초마다 랜덤)
  useEffect(() => {
    if (isAsleep || reducedRef.current || isPetting) return;
    if (microAction !== "none") return;

    const delay = 4000 + Math.random() * 5000;
    const timer = setTimeout(() => {
      const choices: MicroAction[] = [
        "look-left",
        "look-right",
        "look-around",
        "look-around",
        "yawn",
      ];
      const pick = choices[Math.floor(Math.random() * choices.length)];
      setMicroAction(pick);

      // 동작별 지속 시간 (look-around는 좌→우→가운데 시퀀스)
      if (pick === "look-around") {
        const t1 = setTimeout(() => setMicroAction("look-right"), 700);
        const t2 = setTimeout(() => setMicroAction("none"), 1500);
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      }
      const duration = pick === "yawn" ? 1300 : 850;
      setTimeout(() => setMicroAction("none"), duration);
    }, delay);

    return () => clearTimeout(timer);
  }, [isAsleep, isPetting, microAction]);

  const triggerPet = () => {
    if (isAsleep) return;
    const now = Date.now();
    if (now - lastTapAtRef.current < PET_COOLDOWN) return;
    lastTapAtRef.current = now;

    setMicroAction("none");
    setIsPetting(true);
    setPopKey((k) => k + 1);
    setSquashKey((k) => k + 1);
    setPetCount((c) => c + 1);

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(15);
    }

    setTimeout(() => setIsPetting(false), PET_DURATION);
  };

  // 화면 상태 → 시각 prop 매핑
  const expression: CharacterExpression = isAsleep
    ? "auto"
    : isPetting
      ? "happy-closed"
      : microAction === "yawn"
        ? "yawn"
        : "smile";

  const lookX =
    microAction === "look-left"
      ? -2.5
      : microAction === "look-right"
        ? 2.5
        : 0;

  // 연타하면 하트도 같이 (3회 이상 누르면)
  const showHeart = isPetting && petCount >= 3;

  return (
    <div
      onClick={triggerPet}
      onPointerDown={triggerPet}
      role={isAsleep ? undefined : "button"}
      aria-label={isAsleep ? undefined : "메모 쓰다듬기"}
      tabIndex={isAsleep ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          triggerPet();
        }
      }}
      style={{
        cursor: isAsleep ? "default" : "pointer",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        display: "inline-block",
        outline: "none",
      }}
    >
      <CharacterSVG
        skin={skin}
        level={level}
        isAsleep={isAsleep}
        size={size}
        expression={expression}
        lookX={lookX}
        showSparkle={isPetting}
        showHeart={showHeart}
        popKey={popKey}
        squashKey={squashKey}
      />
    </div>
  );
}
