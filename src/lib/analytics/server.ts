import "server-only";
import { PostHog } from "posthog-node";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let _client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!KEY) return null;
  if (!_client) {
    _client = new PostHog(KEY, {
      host: HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return _client;
}

export async function captureServer(
  event: string,
  distinctId: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    client.capture({ distinctId, event, properties });
    await client.flush();
  } catch {
    // analytics는 사용자 흐름을 깨지 않는다
  }
}
