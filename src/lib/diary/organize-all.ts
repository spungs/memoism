/** 한번에 정리하는 최대 날 수. 한 달치면 충분하고, 결과 칩 목록이 끝없이 길어지지 않는다. */
export const MAX_ORGANIZE_ALL_DAYS = 31;

/**
 * 한번에 정리한 결과 말풍선(메이 말투). 화면이 날마다 정리 API를 부른 뒤 센 숫자로 만든다.
 *
 * @param done 정리한 날 수
 * @param failed 정리하다 문제가 생긴 날 수
 * @param capStopped 사용 횟수를 다 써서 시도하지 못한 날 수
 */
export function organizeAllReply(done: number, failed: number, capStopped: number): string {
  const parts = [`${done}일 일기로 정리했어.`];
  if (failed > 0) parts.push(`${failed}일은 정리하다가 문제가 생겨서 못 했어.`);
  // 권유는 끝에 한 번만 — 횟수가 다 떨어졌으면 "조금 뒤"에 해도 소용없다.
  if (capStopped > 0) {
    parts.push(`남은 ${capStopped}일은 오늘 사용 횟수를 다 써서 못 했어. 내일 다시 정리해줘.`);
  } else if (failed > 0) {
    parts.push("조금 뒤에 다시 해볼래?");
  }
  return parts.join(" ");
}
