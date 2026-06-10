"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";

type Role = "user" | "assistant";
type RelatedDiary = { id: string; title: string; createdAt: string };
type Message = { id: string; role: Role; content: string; relatedDiaries?: RelatedDiary[] };

// 빈 화면에서 탭하면 바로 전송되는 예시 질문 (메이가 먼저 건네는 첫 대화 가이드)
const EXAMPLE_QUESTIONS = [
  "최근에 행복했던 날은?",
  "요즘 기분이 어땠어?",
  "지난주에 뭐 했지?",
];

interface Props {
  characterName: string;
  initialMessages: Message[];
}

export function CharacterChat({ characterName, initialMessages }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capExhausted, setCapExhausted] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 새 메시지 추가 시 스크롤 최하단으로
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(textArg?: string) {
    const text = (textArg ?? draft).trim();
    if (!text || sending || capExhausted) return;
    setSending(true);
    setError(null);
    const userMsg: Message = {
      id: `local-${Date.now()}-u`,
      role: "user",
      content: text,
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
        setError(data?.error ?? "응답을 받지 못했어요");
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}-a`,
          role: "assistant",
          content: data.message,
          relatedDiaries: data.relatedDiaries,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter: 전송 / Shift+Enter: 줄바꿈
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  }

  const canSend = !!draft.trim() && !sending && !capExhausted;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100svh - 56px - env(safe-area-inset-bottom))",
        backgroundColor: "var(--bg)",
      }}
    >
      {/* 헤더 — glass 블러 바 */}
      <header
        className="glass"
        style={{
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
          <>
            <Bubble role="assistant">
              {`안녕하세요, 저는 ${characterName}예요.\n일기에 대해 뭐든 편하게 물어보세요.`}
            </Bubble>
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
                  onClick={() => void send(q)}
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
        )}

        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const sameSenderAsPrev = prev?.role === m.role;
          return (
            <div
              key={m.id}
              style={{ marginTop: sameSenderAsPrev ? 4 : 12 }}
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
          );
        })}

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
          paddingBottom: "calc(var(--space-2) + env(safe-area-inset-bottom, 0px))",
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
            onKeyDown={onKeyDown}
            disabled={sending || capExhausted}
            placeholder={
              capExhausted
                ? "내일 다시 만나요"
                : `${characterName}에게 말 걸기...`
            }
            aria-label="메시지 입력"
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              minHeight: 38,
              maxHeight: 160,
              padding: "9px var(--space-4)",
              border: "none",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--fill-2)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-md)",
              color: "var(--fg)",
              outline: "none",
              lineHeight: "var(--leading-normal)",
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
    </div>
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
