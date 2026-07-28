// AI 재정리의 입출력 선택 규칙 (순수 함수). 화면 컴포넌트·서버 양쪽에서 쓴다.
//
// 관통하는 원칙 하나: **사용자가 직접 고친 것은 AI가 덮어쓰지 않는다.**
// 본문(pickRegenerateText)도 제목(pickRegeneratedTitle)도 같은 규칙을 따른다.

/**
 * 검토화면(저장 전) "다시 생성"이 AI에 보낼 본문을 고른다.
 *
 * 세 갈래다:
 *   1) 사용자가 본문을 고쳤다        -> 고친 본문. (원래 버그: 이걸 무시했다)
 *   2) 안 고쳤는데 방향 지시가 있다  -> 화면의 본문. 지시는 "이 결과를 이렇게 바꿔줘"라는
 *                                      뜻이므로 지금 보고 있는 글에 적용해야 한다.
 *   3) 안 고쳤고 지시도 없다         -> "그냥 다시 뽑아줘". 최초 입력으로 되돌린다.
 *
 * 3번이 중요하다. AI 결과를 그대로 입력으로 되먹이면 모델이 자기 출력을 다듬을 뿐이라
 * 첫 결과와 더 비슷해진다 — "다시 눌러도 똑같다"는 원래 불만을 악화시킨다. 최초 입력
 * (사진만이었으면 빈 문자열)으로 돌려야 진짜 새 시도가 나온다.
 *
 * 편집화면(저장된 일기)에는 이 분기를 쓰지 않는다. 거기엔 "최초 입력"이 남아 있지 않고,
 * DB 본문이 AI가 쓴 것인지 사용자가 고쳐 저장한 것인지 구분할 방법이 없다. 구분하려고
 * source 라벨을 쓰면 사용자가 고쳐 저장한 본문을 버리던 원래 버그가 되살아난다.
 */
export function pickRegenerateText(opts: {
  /** 화면 textarea의 현재 값 */
  edited: string;
  /** 직전 AI 결과 본문 */
  lastAiContent: string;
  /** 작성 화면에서 사용자가 처음 쓴 텍스트 (사진만 올렸으면 undefined) */
  originalText: string | undefined;
  /** 이번 요청에 방향 지시가 붙었는지 */
  hasInstruction: boolean;
  /** 검토화면에 아직 남아 있는 사진이 있는지 (사용자가 지웠을 수 있다) */
  hasPhotos: boolean;
}): string {
  const untouched = opts.edited.trim() === opts.lastAiContent.trim();
  if (!untouched || opts.hasInstruction) return opts.edited;

  const original = opts.originalText ?? "";
  // 최초 입력으로 되돌렸는데 텍스트도 사진도 없는 경우(사진만 올렸다가 검토화면에서
  // 그 사진을 다 지움). 그대로 보내면 서버가 400 "정리할 내용이 없어요"를 준다 —
  // 화면에는 글이 멀쩡히 보이는데 그 메시지는 혼란스럽다. 보이는 글을 입력으로 쓴다.
  if (!original.trim() && !opts.hasPhotos) return opts.edited;
  return original;
}

/**
 * 편집화면(저장된 일기) 재정리 후 DB에 쓸 제목을 고른다.
 *
 * 재정리는 본문과 함께 제목도 AI가 새로 짓는다. 문제는 사용자가 제목을 고쳐놓고
 * (아직 저장 안 함) 재정리를 누르면 그 수정이 소리 없이 사라진다는 것 —
 * previousContent는 본문만 백업하고 되돌리기도 제목은 복구하지 않는다.
 *
 * 본문에 적용한 원칙을 제목에도 그대로 적용한다: 사용자가 직접 고쳤으면 그 제목을 지킨다.
 * 안 고쳤으면 지금까지처럼 AI가 새로 지은 제목을 쓴다.
 *
 * @param received 클라이언트가 보낸 현재 제목 (구 클라이언트는 안 보냄)
 * @param dbTitle  DB에 저장돼 있던 제목
 * @param aiTitle  이번에 AI가 새로 지은 제목
 */
export function pickRegeneratedTitle(
  received: string | undefined,
  dbTitle: string,
  aiTitle: string,
): string {
  const edited = received?.trim();
  if (!edited) return aiTitle; // 안 보냈거나 비웠다 -> AI 제목 (제목은 not null이라 빈 값 금지)
  if (edited === dbTitle.trim()) return aiTitle; // 손대지 않았다 -> 기존대로 AI가 새로
  return edited; // 사용자가 고쳤다 -> 지킨다
}
