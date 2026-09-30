// 빈 일기 조건. 목록(queries.ts)과 메이 회상(rag.ts)이 같이 쓴다 — queries.ts는 스토리지까지
// 끌고 와서 회상 쪽 테스트가 가볍게 import할 수 있도록 조건만 따로 둔다.
/**
 * 아무것도 없는 일기(제목·본문·사진·조각 전부 없음)를 목록·개수에서 제외한다.
 *
 * 왜 생기나: 채팅 캡처가 그날 컨테이너를 자동 생성하는데(`getOrCreateDiaryForDate`),
 * 마지막 조각을 다른 날로 옮기거나 지우면 껍데기만 남는다. 그대로 두면 캘린더·목록에
 * 날짜만 있는 빈 카드가 뜬다.
 *
 * **삭제하지 않고 숨기는 이유**: 채팅 칩(`ChatMessage.captureRef.diaryId`)이 그 일기를
 * 가리키고 있다. 지우면 칩 링크가 깨진다. 껍데기는 남겨도 손해가 없다.
 */
export const NOT_EMPTY_DIARY = {
  OR: [
    { title: { not: "" } },
    { content: { not: "" } },
    { images: { some: {} } },
    { fragments: { some: {} } },
  ],
};
