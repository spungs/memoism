/**
 * 일기 한 건이 가질 수 있는 사진 수. **티어와 무관한 고정값** —
 * 티어 차별은 스토리지 용량 쿼터(src/lib/storage/quota.ts)로만 한다.
 *
 * 용량 쿼터로 갈아탄 뒤에도 개수 상한을 남기는 이유:
 *   - AI 정리 경로의 사진은 전부 Gemini 입력이라 장수가 곧 호출 비용이다.
 *   - 직접 저장 경로는 Server Action 본문 4MB(next.config.ts)에 먼저 걸려
 *     "저장 중 문제" 같은 정체불명 실패가 난다. 명시적 상한이 있어야
 *     사용자에게 이유를 말해줄 수 있다.
 *
 * 서버·클라이언트 양쪽에서 쓰므로 server-only를 붙이지 않는다.
 */
export const MAX_IMAGES_PER_DIARY = 10;
