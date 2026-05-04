import { SubscriptionStatus, type Character } from "@prisma/client";

// The helpers only read these two fields, so accept the narrowest shape that
// still satisfies them. This lets callers `select` just what they need.
type SubscriptionFields = Pick<
  Character,
  "subscriptionStatus" | "subscriptionExpiresAt"
>;

export const TRIAL_DURATION_DAYS = 30;
export const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;

export function trialEndDate(start: Date = new Date()): Date {
  return new Date(start.getTime() + TRIAL_DURATION_MS);
}

export function isTrialActive(
  character: SubscriptionFields,
  now: Date = new Date(),
): boolean {
  return (
    character.subscriptionStatus === SubscriptionStatus.TRIAL &&
    character.subscriptionExpiresAt !== null &&
    character.subscriptionExpiresAt > now
  );
}

export function isSubscriptionActive(
  character: SubscriptionFields,
  now: Date = new Date(),
): boolean {
  if (character.subscriptionStatus === SubscriptionStatus.ACTIVE) {
    // ACTIVE without expiry is treated as ongoing (e.g. a lifetime grant).
    return (
      character.subscriptionExpiresAt === null ||
      character.subscriptionExpiresAt > now
    );
  }
  return isTrialActive(character, now);
}

// PRD 3.2: character "sleeps (greyed avatar + Zzz animation) when subscription
// inactive". The persisted Character.isAsleep field is a cached projection of
// this — recompute on read for views that need real-time accuracy.
export function shouldBeAsleep(
  character: SubscriptionFields,
  now: Date = new Date(),
): boolean {
  return !isSubscriptionActive(character, now);
}
