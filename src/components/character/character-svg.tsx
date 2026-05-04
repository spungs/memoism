"use client";

import { CharacterSkinChick } from "./skins/chick";
import { CharacterSkinMochi } from "./skins/mochi";
import { CharacterSkinClassic } from "./skins/classic";
import {
  DEFAULT_SKIN_SLUG,
  type CharacterSkinProps,
  type CharacterSkinSlug,
} from "./skins/types";

export type {
  CharacterExpression,
  CharacterSkinProps,
  CharacterSkinSlug,
} from "./skins/types";

const VARIANTS: Record<CharacterSkinSlug, (p: CharacterSkinProps) => React.ReactNode> = {
  chick: CharacterSkinChick,
  mochi: CharacterSkinMochi,
  classic: CharacterSkinClassic,
};

interface Props extends CharacterSkinProps {
  skin?: CharacterSkinSlug;
}

export function CharacterSVG({ skin, ...rest }: Props) {
  const slug = skin && skin in VARIANTS ? skin : DEFAULT_SKIN_SLUG;
  const Variant = VARIANTS[slug];
  return <Variant {...rest} />;
}
