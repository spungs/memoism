import { DiaryCalendarSkeleton } from "@/components/layout/page-skeletons";

// (list) 그룹 안에 둬서 /diary 목록 화면에만 쓰인다. diary/ 바로 아래 두면 /diary/new·상세 등
// 하위 화면 전체를 감싸, 다른 탭에서 들어올 때 달력 스켈레톤이 먼저 잠깐 떴다(점검 L18).

export default function Loading() {
  return <DiaryCalendarSkeleton />;
}
