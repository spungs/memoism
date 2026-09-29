// 작성 화면(diary-form)과 검토 화면(review-gate)이 함께 쓰는 브라우저 저장소 키.
// 두 화면이 같은 초안을 만들고 지우므로 이름을 한곳에 둔다 — 한쪽만 바뀌면
// 저장한 초안이 지워지지 않고 남는다(2026-09-29 점검 H4).

/** AI 정리 결과를 검토 화면으로 넘기는 초안 (sessionStorage). */
export const PENDING_DRAFT_KEY = "memoism:pendingDraft";

/** 작성 중 자동저장 초안 (localStorage). */
export const DRAFT_KEY_NEW = "memoism:draft:new";
