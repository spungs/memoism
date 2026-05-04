export type CharacterExpression = "auto" | "smile" | "happy-closed" | "yawn" | "sad";

export interface CharacterSkinProps {
  level: number;
  isAsleep: boolean;
  size?: number;
  expression?: CharacterExpression;
  lookX?: number;
  showSparkle?: boolean;
  showHeart?: boolean;
  popKey?: number;
  squashKey?: number;
}

export type CharacterSkinSlug = "chick" | "mochi" | "classic";

export const DEFAULT_SKIN_SLUG: CharacterSkinSlug = "chick";
