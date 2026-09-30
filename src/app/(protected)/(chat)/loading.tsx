import { ChatSkeleton } from "@/components/layout/page-skeletons";

// (chat) 그룹 안에 둬서 메이 화면(/)에만 쓰인다. (protected) 바로 아래 두면 보호된 화면 전체를
// 감싸, 로그인 뒤 다른 화면으로 바로 들어갈 때 채팅 스켈레톤이 먼저 떴다(점검 L18).

export default function Loading() {
  return <ChatSkeleton />;
}
