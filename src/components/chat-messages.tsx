"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";

// ── 时间格式化工具 ──────────────────────────────────────────────────
function formatTime(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const hh = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");

  if (isToday) {
    return `${hh}:${mm}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) {
    return `昨天 ${hh}:${mm}`;
  }

  const mo = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  return `${mo}/${dd} ${hh}:${mm}`;
}

// ── 空状态 ──────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      <div className="flex size-20 items-center justify-center rounded-2xl overflow-hidden">
        <Image src="/logo.png" alt="ChatClaw" width={80} height={80} />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold tracking-tight">
          Start a conversation
        </h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Type a message below to begin chatting with your AI agent.
        </p>
      </div>
    </div>
  );
}

// ── 输入中三点动画 ──────────────────────────────────────────────────
function StreamingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
      <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
      <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

// ── 流式光标 ────────────────────────────────────────────────────────
function StreamingCursor() {
  return (
    <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary/70 animate-pulse align-text-bottom rounded-sm" />
  );
}

// ── CSS 气泡尾巴（SVG 三角形） ──────────────────────────────────────
function BubbleTailLeft() {
  return (
    <svg
      className="absolute -left-[6px] top-3 shrink-0"
      width="8"
      height="12"
      viewBox="0 0 8 12"
      fill="none"
    >
      <path d="M8 0 Q0 4 8 12 Z" fill="#3a3a3a" />
    </svg>
  );
}

function BubbleTailRight() {
  return (
    <svg
      className="absolute -right-[6px] top-3 shrink-0"
      width="8"
      height="12"
      viewBox="0 0 8 12"
      fill="none"
    >
      <path d="M0 0 Q8 4 0 12 Z" fill="#95ec69" />
    </svg>
  );
}

// ── 主组件 ──────────────────────────────────────────────────────────
export function ChatMessages() {
  const { state } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, state.streamingContent]);

  if (!state.activeConversationId) {
    return <EmptyState />;
  }

  const isStreamingHere =
    state.isStreaming &&
    state.streamingConversationId === state.activeConversationId;

  const hasMessages = state.messages.length > 0 || isStreamingHere;

  if (!hasMessages) {
    return <EmptyState />;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* 微信风格：略带暖灰的背景 */}
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="space-y-4">
          {state.messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex items-start gap-2",
                  isUser ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* 头像 */}
                <Avatar
                  className={cn(
                    "size-9 shrink-0 mt-0.5 ring-1",
                    isUser
                      ? "bg-secondary ring-border/30"
                      : "bg-primary/10 ring-primary/20"
                  )}
                >
                  <AvatarFallback
                    className={cn(
                      isUser
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {isUser ? (
                      <User className="size-4" />
                    ) : state.agentIdentity?.emoji ? (
                      <span className="text-sm">{state.agentIdentity.emoji}</span>
                    ) : (
                      <Bot className="size-4" />
                    )}
                  </AvatarFallback>
                </Avatar>

                {/* 昵称 + 气泡 + 时间戳 */}
                <div
                  className={cn(
                    "flex flex-col gap-1 max-w-[68%] min-w-0",
                    isUser ? "items-end" : "items-start"
                  )}
                >
                  {/* 昵称 */}
                  <p className="text-xs font-medium text-muted-foreground px-1">
                    {isUser
                      ? state.userNickname ?? "You"
                      : state.assistantNickname ??
                        state.agentIdentity?.name ??
                        "Assistant"}
                  </p>

                  {/* 气泡 */}
                  <div className="relative">
                    {!isUser && <BubbleTailLeft />}
                    {isUser && <BubbleTailRight />}
                    <div
                      className={cn(
                        "text-sm leading-relaxed px-3.5 py-2.5 shadow-sm",
                        isUser
                          ? "bg-[#95ec69] text-black rounded-[18px] rounded-tr-[5px]"
                          : "bg-[#3a3a3a] text-zinc-100 rounded-[18px] rounded-tl-[5px]"
                      )}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <MarkdownRenderer content={msg.content} />
                      )}
                    </div>
                  </div>

                  {/* 时间戳 */}
                  <p className="text-[10px] text-muted-foreground/60 px-1">
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}

          {/* 流式输出中的 AI 气泡 */}
          {isStreamingHere && (
            <div className="flex items-start gap-2 flex-row">
              <Avatar className="size-9 shrink-0 mt-0.5 bg-primary/10 ring-1 ring-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {state.agentIdentity?.emoji ? (
                    <span className="text-sm">{state.agentIdentity.emoji}</span>
                  ) : (
                    <Bot className="size-4" />
                  )}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col gap-1 max-w-[68%] min-w-0 items-start">
                <p className="text-xs font-medium text-muted-foreground px-1">
                  {state.assistantNickname ??
                    state.agentIdentity?.name ??
                    "Assistant"}
                </p>
                <div className="relative">
                  <BubbleTailLeft />
                  <div className="text-sm leading-relaxed bg-[#3a3a3a] text-zinc-100 rounded-[18px] rounded-tl-[5px] px-3.5 py-2.5 shadow-sm">
                    {state.streamingContent ? (
                      <>
                        <MarkdownRenderer content={state.streamingContent} />
                        <StreamingCursor />
                      </>
                    ) : (
                      <StreamingDots />
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground/60 px-1">
                  {formatTime(Date.now())}
                </p>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
