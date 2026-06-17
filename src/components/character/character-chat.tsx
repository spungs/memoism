"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, SquarePen } from "lucide-react";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";

type Role = "user" | "assistant";
type RelatedDiary = { id: string; title: string; createdAt: string };
type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  relatedDiaries?: RelatedDiary[];
};

// Asia/Seoul 기준 YYYY-MM-DD 키 (날짜 구분선 비교용). en-CA = YYYY-MM-DD 포맷.
function kstDayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

// 날짜 구분선 라벨: 오늘 / 어제 / "6월 10일 (수)". KST는 DST가 없어 24h 차감으로 어제 계산 안전.
function dayDividerLabel(iso: string): string {
  const now = Date.now();
  const today = kstDayKey(new Date(now).toISOString());
  const yesterday = kstDayKey(new Date(now - 24 * 60 * 60 * 1000).toISOString());
  const key = kstDayKey(iso);
  if (key === today) return "오늘";
  if (key === yesterday) return "어제";
  return new Date(iso).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

// 빈 화면에서 탭하면 바로 전송되는 예시 질문 (메이가 먼저 건네는 첫 대화 가이드)
const EXAMPLE_QUESTIONS = [
  "최근에 행복했던 날은?",
  "요즘 기분이 어땠어?",
  "지난주에 뭐 했지?",
];

const INPUT_MIN_H = 38;
const INPUT_MAX_H = 160;

interface Props {
  characterName: string;
  initialMessages: Message[];
  initialBoundaryAt: string | null;
  initialCapExhausted: boolean;
}

export function CharacterChat({
  characterName,
  initialMessages,
  initialBoundaryAt,
  initialCapExhausted,
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  // "새 대화" 경계 시각(ISO). 이 시각 이후가 현재 대화 — 그 앞에 "새 대화" 구분선을 그린다.
  const [boundaryAt, setBoundaryAt] = useState<string | null>(initialBoundaryAt);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capExhausted, setCapExhausted] = useState(initialCapExhausted);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 새 메시지 추가 / 새 대화 시작 시 스크롤 최하단으로 (리셋 땐 messages는 그대로라 boundaryAt도 의존)
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, boundaryAt]);

  // 입력창 높이 자동 조정 — 내용 없을 때 minHeight로 리셋, 입력하면 최대 maxHeight까지 확장
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "1px";
    ta.style.height = Math.min(Math.max(ta.scrollHeight, INPUT_MIN_H), INPUT_MAX_H) + "px";
  }, [draft]);

  async function send(textArg?: string) {
    const text = (textArg ?? draft).trim();
    if (!text || sending || capExhausted) return;
    setSending(true);
    setError(null);
    const userMsg: Message = {
      id: `local-${Date.now()}-u`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.capExhausted) setCapExhausted(true);
        setError(data?.error ?? "메이가 잠시 응답하지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}-a`,
          role: "assistant",
          content: data.message,
          createdAt: new Date().toISOString(),
          relatedDiaries: data.relatedDiaries,
        },
      ]);
    } catch {
      setError("메이가 잠시 응답하지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  async function handleReset() {
    if (resetting) return;
    setResetting(true);
    try {
      const res = await fetch("/api/chat/reset", { method: "POST" });
      if (!res.ok) {
        setError("새 대화를 시작하지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
      // 비파괴: 기록은 그대로 두고 경계만 현재로 옮긴다 → 이전 대화는 구분선 위에 남는다.
      setBoundaryAt(new Date().toISOString());
      setError(null);
      setResetOpen(false);
    } catch {
      setError("네트워크 오류로 새 대화를 시작하지 못했어요.");
    } finally {
      setResetting(false);
    }
  }

  // "현재 대화"(경계선 이후)가 비었는가 — 첫 사용이거나 방금 새 대화를 시작한 직후.
  // 이때만 인사말+예시 칩을 보여주고, "새 대화하기"는 더 나눌 게 없으니 비활성화한다.
  const currentEmpty = boundaryAt
    ? !messages.some((m) => m.createdAt >= boundaryAt)
    : messages.length === 0;

  const canSend = !!draft.trim() && !sending && !capExhausted;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100svh - 52px - env(safe-area-inset-bottom))",
        backgroundColor: "var(--bg)",
      }}
    >
      {/* 헤더 — glass 블러 바 */}
      <header
        className="glass"
        style={{
          position: "relative",
          borderBottom: "1px solid var(--separator)",
          padding: "12px var(--space-5)",
          flexShrink: 0,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-md)",
            fontWeight: 600,
            letterSpacing: "var(--tracking-tight)",
            color: "var(--fg)",
          }}
        >
          {characterName}
        </h1>
        <p
          style={{
            margin: "2px 0 0 0",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            color: "var(--fg-placeholder)",
            letterSpacing: 0,
          }}
        >
          내 일기를 기억하는 AI 친구
        </p>
        {/* 새 대화하기 — 이전 대화 맥락을 비워 오염된 기억 반복을 끊는다 */}
        <button
          type="button"
          onClick={() => setResetOpen(true)}
          disabled={sending || currentEmpty}
          aria-label="새 대화하기"
          className="pressable"
          style={{
            position: "absolute",
            right: "var(--space-4)",
            top: "50%",
            transform: "translateY(-50%)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            borderRadius: "var(--radius-pill)",
            border: "none",
            backgroundColor: "transparent",
            color:
              sending || currentEmpty
                ? "var(--fg-placeholder)"
                : "var(--tint)",
            cursor: sending || currentEmpty ? "default" : "pointer",
          }}
        >
          <SquarePen size={19} aria-hidden strokeWidth={2} />
        </button>
      </header>

      {/* 메시지 목록 */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          padding: "var(--space-4) var(--space-4)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        {messages.length === 0 && (
          <Greeting
            text={`안녕하세요, 저는 ${characterName}예요.\n일기에 대해 뭐든 편하게 물어보세요.`}
            sending={sending}
            capExhausted={capExhausted}
            onPick={(q) => void send(q)}
          />
        )}

        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const sameSenderAsPrev = prev?.role === m.role;
          // 날짜가 바뀌면(또는 첫 메시지) 날짜 구분선 — 카톡식 연속 스크롤 + 날짜 divider.
          const showDateDivider =
            !prev || kstDayKey(prev.createdAt) !== kstDayKey(m.createdAt);
          // "새 대화" 경계를 넘는 첫 메시지 앞엔 경계 구분선 (날짜 구분선보다 우선).
          const crossedBoundary =
            !!boundaryAt &&
            m.createdAt >= boundaryAt &&
            (!prev || prev.createdAt < boundaryAt);
          return (
            <Fragment key={m.id}>
              {crossedBoundary ? (
                <BoundaryDivider />
              ) : (
                showDateDivider && <DateDivider label={dayDividerLabel(m.createdAt)} />
              )}
              <div
                style={{
                  marginTop:
                    crossedBoundary || showDateDivider ? 0 : sameSenderAsPrev ? 4 : 12,
                }}
              >
                <Bubble role={m.role} showAvatar={!sameSenderAsPrev}>
                  {m.content}
                </Bubble>
                {m.role === "assistant" && m.relatedDiaries && m.relatedDiaries.length > 0 && (
                  <div style={{ paddingLeft: 36 }}>
                    <RelatedDiaryChips diaries={m.relatedDiaries} onNavigate={(id) => router.push(`/diary/${id}`)} />
                  </div>
                )}
              </div>
            </Fragment>
          );
        })}

        {/* 경계가 모든 메시지 뒤(방금 "새 대화" 누름)이면 맨 아래 구분선 + 인사말 — 다음 메시지가 그 아래로 */}
        {boundaryAt &&
          messages.length > 0 &&
          messages[messages.length - 1].createdAt < boundaryAt && (
            <>
              <BoundaryDivider />
              <Greeting
                text={"다시 만나서 반가워요.\n무엇이든 편하게 물어보세요."}
                sending={sending}
                capExhausted={capExhausted}
                onPick={(q) => void send(q)}
              />
            </>
          )}

        {sending && (
          <div style={{ marginTop: 12 }}>
            <TypingIndicator />
          </div>
        )}
      </div>

      {/* 에러 / cap 배너 */}
      {(error || capExhausted) && (
        <div
          role="alert"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            color: "var(--danger)",
            backgroundColor: "color-mix(in srgb, var(--danger) 8%, transparent)",
            padding: "var(--space-2) var(--space-5)",
            borderTop: "1px solid var(--separator)",
            textAlign: "center",
          }}
        >
          {capExhausted
            ? "오늘 AI 사용 횟수를 모두 사용했어요. 내일 다시 만나요."
            : error}
        </div>
      )}

      {/* 입력 바 — glass */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="glass"
        style={{
          borderTop: "1px solid var(--separator)",
          padding: "var(--space-2) var(--space-4)",
          paddingBottom: "var(--space-2)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            alignItems: "flex-end",
          }}
        >
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={sending || capExhausted}
            placeholder={
              capExhausted
                ? "내일 다시 만나요"
                : `${characterName}에게 물어보기`
            }
            aria-label="메시지 입력"
            style={{
              flex: 1,
              resize: "none",
              height: INPUT_MIN_H,
              maxHeight: INPUT_MAX_H,
              overflow: "hidden",
              padding: "9px var(--space-4)",
              border: "none",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--fill-2)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-md)",
              color: "var(--fg)",
              outline: "none",
              lineHeight: "var(--leading-normal)",
              display: "block",
            }}
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="전송"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: "var(--radius-pill)",
              border: "none",
              backgroundColor: canSend ? "var(--tint)" : "var(--fill-1)",
              color: canSend ? "var(--on-tint)" : "var(--fg-placeholder)",
              cursor: canSend ? "pointer" : "not-allowed",
              flexShrink: 0,
              transition: "background-color var(--duration-fast), color var(--duration-fast)",
            }}
          >
            <ArrowUp size={16} aria-hidden strokeWidth={2.5} />
          </button>
        </div>
      </form>

      <ConfirmSheet
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => void handleReset()}
        title="새 대화를 시작할까요?"
        description="여기까지 마무리하고 새 대화를 시작해요. 이전 대화는 위로 넘기면 다시 볼 수 있어요."
        confirmLabel="새 대화 시작"
        confirmVariant="primary"
        isLoading={resetting}
      />
    </div>
  );
}

// ── 빈 현재 대화 인사 — 메이 인사말 + 예시 질문 칩 (첫 사용 / 새 대화 직후 공용) ──
function Greeting({
  text,
  sending,
  capExhausted,
  onPick,
}: {
  text: string;
  sending: boolean;
  capExhausted: boolean;
  onPick: (q: string) => void;
}) {
  return (
    <>
      <Bubble role="assistant">{text}</Bubble>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "var(--space-2)",
          marginTop: "var(--space-3)",
          paddingLeft: 2,
        }}
      >
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            disabled={sending || capExhausted}
            className="pressable"
            style={{
              padding: "8px var(--space-4)",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--separator)",
              backgroundColor: "var(--surface)",
              color: "var(--tint)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              cursor: sending || capExhausted ? "not-allowed" : "pointer",
              textAlign: "left",
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </>
  );
}

// ── 버블 ──────────────────────────────────────────────────
function Bubble({
  role,
  children,
  muted,
  showAvatar = true,
}: {
  role: Role;
  children: React.ReactNode;
  muted?: boolean;
  showAvatar?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        alignItems: "flex-end",
        gap: 8,
      }}
    >
      {/* 메이 아바타 — "내 일기를 기억하는 친구"의 시각적 정체성.
          연속 버블에선 자리만 유지해 정렬을 지킨다. */}
      {!isUser &&
        (showAvatar ? (
          <MeiAvatar />
        ) : (
          <span aria-hidden style={{ width: 28, flexShrink: 0 }} />
        ))}
      <div
        style={{
          maxWidth: "78%",
          padding: "10px 14px",
          borderRadius: 18,
          backgroundColor: isUser ? "var(--tint)" : "var(--tint-soft)",
          color: isUser ? "var(--on-tint)" : "var(--fg)",
          fontFamily: "var(--font-sans)",
          fontSize: 16,
          lineHeight: "var(--leading-relaxed)",
          whiteSpace: "pre-wrap",
          opacity: muted ? 0.5 : 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// 메이 아바타 — 코랄 원 + 흰 스파크 (AI 친구의 최소 캐릭터 층)
function MeiAvatar() {
  return (
    <span
      aria-hidden
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        backgroundColor: "var(--tint)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFFFF">
        <path d="M12 3 L13.8 9.2 L20 11 L13.8 12.8 L12 19 L10.2 12.8 L4 11 L10.2 9.2 Z" />
      </svg>
    </span>
  );
}

// ── 타이핑 인디케이터 ──────────────────────────────────────
function TypingIndicator() {
  return (
    <>
      <style>{`
        @keyframes _dot-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-5px); opacity: 1; }
        }
        ._dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--fg-placeholder); animation: _dot-bounce 1.2s ease-in-out infinite; }
        ._dot:nth-child(2) { animation-delay: 0.2s; }
        ._dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        <MeiAvatar />
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "12px 16px",
            borderRadius: 18,
            backgroundColor: "var(--tint-soft)",
          }}
        >
          <span className="_dot" />
          <span className="_dot" />
          <span className="_dot" />
        </div>
      </div>
    </>
  );
}

// ── 날짜 구분선 ────────────────────────────────────────────
function DateDivider({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        margin: "var(--space-4) 0 var(--space-2)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          fontWeight: 500,
          color: "var(--fg-placeholder)",
          backgroundColor: "var(--fill-1)",
          padding: "3px var(--space-3)",
          borderRadius: "var(--radius-pill)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── "새 대화" 경계 구분선 (비파괴) — 이 위는 이전 대화, 아래는 현재 대화 ──
function BoundaryDivider() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        margin: "var(--space-5) 0 var(--space-2)",
      }}
    >
      <span style={{ flex: 1, height: 1, backgroundColor: "var(--separator)" }} />
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          fontWeight: 500,
          color: "var(--fg-placeholder)",
        }}
      >
        새 대화
      </span>
      <span style={{ flex: 1, height: 1, backgroundColor: "var(--separator)" }} />
    </div>
  );
}

// ── 관련 일기 칩 ───────────────────────────────────────────
function RelatedDiaryChips({
  diaries,
  onNavigate,
}: {
  diaries: RelatedDiary[];
  onNavigate: (id: string) => void;
}) {
  return (
    <div style={{ marginTop: "var(--space-2)", paddingLeft: 2 }}>
      <p
        style={{
          margin: "0 0 var(--space-1) 0",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          color: "var(--fg-placeholder)",
        }}
      >
        관련된 일기
      </p>
      <div
        className="hide-scrollbar"
        style={{
          display: "flex",
          overflowX: "auto",
          gap: "var(--space-2)",
        }}
      >
        {diaries.map((d) => {
          const dateLabel = new Date(d.createdAt).toLocaleDateString("ko-KR", {
            timeZone: "Asia/Seoul",
            month: "long",
            day: "numeric",
          });
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onNavigate(d.id)}
              className="pressable"
              style={{
                backgroundColor: "var(--surface)",
                border: "none",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-xs)",
                fontFamily: "var(--font-sans)",
                padding: "var(--space-2) var(--space-3)",
                whiteSpace: "nowrap",
                cursor: "pointer",
                flexShrink: 0,
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--fg-placeholder)",
                  lineHeight: 1,
                }}
              >
                {dateLabel}
              </span>
              {d.title?.trim() && (
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: 600,
                    color: "var(--fg)",
                    lineHeight: 1.3,
                  }}
                >
                  {d.title.trim()}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
