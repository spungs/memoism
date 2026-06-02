"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

type Role = "user" | "assistant";
type Message = { id: string; role: Role; content: string };

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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100svh - 56px - env(safe-area-inset-bottom))",
        backgroundColor: "var(--bg)",
      }}
    >
      <header
        style={{
          backgroundColor: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "var(--space-4) var(--space-5)",
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontSize: "var(--text-xl)",
            color: "var(--fg)",
            fontWeight: 600,
          }}
        >
          {characterName}
        </h1>
        <p
          style={{
            margin: "var(--space-1) 0 0 0",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            color: "var(--fg-subtle)",
          }}
        >
          내 일기를 기억하는 AI 친구
        </p>
      </header>

      <div
        ref={listRef}
        style={{
          flex: 1,
          padding: "var(--space-4) var(--space-5)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        {messages.length === 0 && (
          <>
            <Bubble role="assistant">
              {`안녕하세요, 저는 ${characterName}예요. 🌿\n일기에 대해 뭐든 편하게 물어보세요.`}
            </Bubble>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "var(--space-2)",
              }}
            >
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void send(q)}
                  disabled={sending || capExhausted}
                  style={{
                    padding: "8px var(--space-3)",
                    borderRadius: "var(--radius-pill)",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--surface-raised)",
                    color: "var(--fg)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)",
                    cursor:
                      sending || capExhausted ? "not-allowed" : "pointer",
                    textAlign: "left",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role}>
            {m.content}
          </Bubble>
        ))}
        {sending && (
          <Bubble role="assistant" muted>
            …
          </Bubble>
        )}
      </div>

      {(error || capExhausted) && (
        <div
          role="alert"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            color: "var(--danger)",
            backgroundColor: "color-mix(in srgb, var(--danger) 10%, transparent)",
            padding: "var(--space-2) var(--space-4)",
            borderTop: "1px solid var(--border)",
          }}
        >
          {capExhausted
            ? "오늘 AI 사용 횟수를 모두 사용했어요. 내일 다시 만나요."
            : error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        style={{
          borderTop: "1px solid var(--border)",
          padding: "var(--space-3) var(--space-4)",
          backgroundColor: "var(--surface-raised)",
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
              minHeight: 44,
              maxHeight: 160,
              padding: "10px var(--space-3)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              backgroundColor: "var(--surface)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "var(--fg)",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending || capExhausted}
            aria-label="전송"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: "var(--radius-pill)",
              border: "none",
              backgroundColor:
                !draft.trim() || sending || capExhausted
                  ? "var(--border)"
                  : "var(--fg)",
              color: "var(--bg)",
              cursor:
                !draft.trim() || sending || capExhausted ? "not-allowed" : "pointer",
              flexShrink: 0,
            }}
          >
            <Send size={16} aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}

function Bubble({
  role,
  children,
  muted,
}: {
  role: Role;
  children: React.ReactNode;
  muted?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
      }}
    >
      <div
        style={{
          maxWidth: "78%",
          padding: "10px var(--space-3)",
          borderRadius: "var(--radius-lg)",
          backgroundColor: isUser ? "var(--fg)" : "var(--surface)",
          color: isUser ? "var(--bg)" : "var(--fg)",
          border: isUser ? "none" : "1px solid var(--border)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          lineHeight: "var(--leading-relaxed)",
          whiteSpace: "pre-wrap",
          opacity: muted ? 0.6 : 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}
