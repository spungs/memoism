"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import posthog from "posthog-js";

export function PageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    if (!pathname) return;

    const query = searchParams?.toString() ?? "";
    const key = query ? `${pathname}?${query}` : pathname;
    if (lastKey.current === key) return;
    lastKey.current = key;

    const url =
      typeof window !== "undefined"
        ? window.location.origin + key
        : key;

    posthog.capture("$pageview", { $current_url: url });

    if (searchParams?.get("utm_source") === "push") {
      posthog.capture("push_clicked", { path: pathname });
    }
  }, [pathname, searchParams]);

  return null;
}
