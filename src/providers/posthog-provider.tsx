"use client";

import posthog from "posthog-js";
import { PostHogProvider as Provider } from "posthog-js/react";
import { useEffect, useState } from "react";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let initialized = false;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!KEY) {
      setReady(true);
      return;
    }
    if (!initialized) {
      posthog.init(KEY, {
        api_host: HOST,
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        person_profiles: "identified_only",
      });
      initialized = true;
    }
    setReady(true);
  }, []);

  if (!KEY) return <>{children}</>;
  if (!ready) return <>{children}</>;
  return <Provider client={posthog}>{children}</Provider>;
}
