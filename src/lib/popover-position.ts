/**
 * 버튼 왼쪽 끝에 붙여 여는 팝오버를 화면 좌우 여백(gutter) 안으로 당기는 가로 이동량(px).
 *
 * 버튼이 오른쪽에 있으면(조각의 "날짜 옮기기") 버튼 왼쪽 끝에서 펼친 팝오버가 화면
 * 오른쪽 밖으로 나간다. 화면이 팝오버보다 좁으면 왼쪽 여백에 맞춘다.
 */
export function popoverShiftX(
  anchorLeft: number,
  width: number,
  viewportWidth: number,
  gutter = 16,
): number {
  const maxLeft = viewportWidth - gutter - width;
  const left = Math.max(gutter, Math.min(anchorLeft, maxLeft));
  return left - anchorLeft;
}
