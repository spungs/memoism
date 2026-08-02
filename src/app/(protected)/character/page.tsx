import { redirect } from "next/navigation";

/**
 * 메이는 `/`로 승격됐다(스펙 §7). 이 경로는 옛 링크·PWA 캐시·북마크 호환용으로만
 * 남는다 — 지우면 이미 배포된 클라이언트가 404를 만난다.
 */
export default function CharacterRedirect() {
  redirect("/");
}
