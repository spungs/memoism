"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export function Identifier({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    if (!userId) return;
    posthog.identify(userId, { email });
  }, [userId, email]);
  return null;
}
