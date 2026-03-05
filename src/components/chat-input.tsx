"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { SkillSelector } from "./skill-selector";
import { FileUploadButton } from "./file-upload-button";

const MIN_HEIGHT = 72; // ~3 rows
const MAX_HEIGHT = 300;

export function ChatInput() {
  const { state, actions } = useStore();
  const [input, setInput] = useState("");
  const [showSkillSelector, setShowSkillSelector] = useState(false);
  const [skillQuery, setSkillQuery] = useState("");
  const [skillSelectedIndex, setSkillSelectedIndex] = useState(0);
  const [activeSkill, setActiveSkill] = useState<{ name: string; description: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [historyInput, setHistoryInput] = useState("");

  // 获取当前会话的用户历史输入
  const userHistory = state.messages
    .filter((m) => m.role === "user" && m.content.trim())
    .map((m) => m.content)
    .reverse();

  const isStreamingHere =
    state.isStreaming &&
    state.streamingConversationId === state.activeConversationId;

  const canSend =
    input.trim().length > 0 &&
    !isStreamingHere &&
    state.connectionStatus === "connected";

  // Detect "/" trigger for skill selector
  useEffect(() => {
    if (input.startsWith("/") && !input.startsWith("/ ")) {
      const query = input.slice(1).trim();
      setSkillQuery(query);
      setSkillSelectedIndex(0);

      // Show selector if there's at least one match
      const matches = skillList.filter(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.description.toLowerCase().includes(query.toLowerCase())
      );

      if (matches.length >= 1) {
        setShowSkillSelector(true);
        setActiveSkill(null);
      } else {
        setShowSkillSelector(false);
      }
    } else if (input.startsWith("/ ")) {
      // Exact match with space - show active skill
      const query = input.slice(1).trim();
      const matches = skillList.filter(
        (s) => s.name.toLowerCase() === query.toLowerCase()
      );
      if (matches.length === 1) {
        setActiveSkill({ name: matches[0].name, description: matches[0].description });
      } else {
        setActiveSkill(null);
      }
      setShowSkillSelector(false);
    } else {
      setShowSkillSelector(false);
      setSkillQuery("");
      setActiveSkill(null);
    }
  }, [input]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.max(MIN_HEIGHT, Math.min(el.scrollHeight, MAX_HEIGHT));
    el.style.height = next + "px";
  }, [input]);

  // Auto-focus when conversation changes
  useEffect(() => {
    textareaRef.current?.focus();
  }, [state.activeConversationId]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreamingHere) return;

    setInput("");
    setActiveSkill(null);
    setHistoryIndex(-1);
    setHistoryInput("");
    actions.sendMessage(text, state.activeConversationId || undefined);
  }, [input, isStreamingHere, state.activeConversationId, actions]);

  const handleSkillSelect = (skill: { name: string; description: string; path: string }) => {
    setInput(`/${skill.name} `);
    setActiveSkill({ name: skill.name, description: skill.description });
    setShowSkillSelector(false);
    textareaRef.current?.focus();
  };

  const handleSkillComplete = (skillName: string) => {
    const skill = skillList.find(s => s.name === skillName);
    setInput(`/${skillName} `);
    if (skill) {
      setActiveSkill({ name: skill.name, description: skill.description });
    }
    setShowSkillSelector(false);
    textareaRef.current?.focus();
  };

  const handleFileSelect = (files: File[]) => {
    // TODO: Implement file upload - for now just log the files
    console.log("[ChatInput] Files selected:", files.map(f => f.name));
    // The actual upload would send files via gateway
    alert(`Selected ${files.length} file(s). File upload feature coming soon!`);
  };

  // Skill list
  const skillList = [
    { name: "weather", description: "Get weather and forecasts", path: "weather" },
    { name: "blogwatcher", description: "Monitor blogs and RSS feeds", path: "blogwatcher" },
    { name: "coding-agent", description: "Delegate coding tasks to Codex/Claude", path: "coding-agent" },
    { name: "gh-issues", description: "Fetch GitHub issues and create PRs", path: "gh-issues" },
    { name: "healthcheck", description: "Security hardening and risk assessment", path: "healthcheck" },
    { name: "session-logs", description: "Search session logs with jq", path: "session-logs" },
    { name: "tmux", description: "Control tmux sessions", path: "tmux" },
    { name: "feishu-doc", description: "Feishu document operations", path: "feishu-doc" },
    { name: "feishu-wiki", description: "Feishu knowledge base operations", path: "feishu-wiki" },
    { name: "feishu-drive", description: "Feishu cloud storage management", path: "feishu-drive" },
    { name: "fabric", description: "Prompt pattern system with 240+ patterns", path: "fabric" },
    { name: "OSINT", description: "Open source intelligence gathering", path: "OSINT" },
    { name: "data-analysis", description: "Data analysis with Python/Pandas", path: "data-analysis" },
    { name: "docx", description: "Word document processing", path: "docx" },
    { name: "pdf", description: "PDF processing", path: "pdf" },
    { name: "xlsx", description: "Excel file processing", path: "xlsx" },
    { name: "pptx", description: "PowerPoint processing", path: "pptx" },
    { name: "telos", description: "Life OS and project analysis", path: "telos" },
    { name: "news-digest", description: "Premium news aggregation", path: "NewsDigest" },
    { name: "sec-updates", description: "Security news aggregation", path: "SECUpdates" },
    { name: "baoyu-image-gen", description: "Generate images using ModelScope", path: "baoyu-image-gen" },
    { name: "baoyu-article-illustrator", description: "Smart article illustration", path: "baoyu-article-illustrator" },
    { name: "baoyu-comic", description: "Knowledge comic creator", path: "baoyu-comic" },
    { name: "baoyu-cover-image", description: "Generate elegant cover images", path: "baoyu-cover-image" },
    { name: "baoyu-infographic", description: "Professional infographics generator", path: "baoyu-infographic" },
    { name: "baoyu-slide-deck", description: "Generate slide deck images", path: "baoyu-slide-deck" },
    { name: "baoyu-post-to-wechat", description: "Post to WeChat Official Account", path: "baoyu-post-to-wechat" },
    { name: "baoyu-post-to-x", description: "Post content to X (Twitter)", path: "baoyu-post-to-x" },
    { name: "baoyu-xhs-images", description: "Generate Xiaohongshu infographics", path: "baoyu-xhs-images" },
    { name: "baoyu-url-to-markdown", description: "Convert URL to markdown", path: "baoyu-url-to-markdown" },
    { name: "baoyu-compress-image", description: "Cross-platform image compression", path: "baoyu-compress-image" },
  ];

  const filteredSkills = skillList.filter(
    (s) =>
      s.name.toLowerCase().includes(skillQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(skillQuery.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle history navigation (only when no skill selector and no composition)
    if (!showSkillSelector && !composingRef.current && userHistory.length > 0) {
      // ArrowUp: 正在浏览历史 OR 输入框为空，都可以进入/继续浏览
      if (e.key === "ArrowUp") {
        e.preventDefault();
        // 如果不是正在浏览历史，保存当前输入并开始浏览
        if (historyIndex === -1) {
          setHistoryInput(input);
          setHistoryIndex(0);
          setInput(userHistory[0]);
        } else if (historyIndex < userHistory.length - 1) {
          // 继续浏览更早的历史
          setHistoryIndex(historyIndex + 1);
          setInput(userHistory[historyIndex + 1]);
        }
        return;
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex > 0) {
          setHistoryIndex(historyIndex - 1);
          setInput(userHistory[historyIndex - 1]);
        } else if (historyIndex === 0) {
          // 回到起点，恢复用户之前输入的内容
          setHistoryIndex(-1);
          setInput(historyInput);
          setHistoryInput("");
        }
        // 如果 historyIndex === -1 (已经回到起点)，输入框内容保持不动
        return;
      }
    }

    // Reset history navigation when user starts typing (non-arrow keys)
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") {
      if (historyIndex !== -1) {
        setHistoryIndex(-1);
        setHistoryInput("");
      }
    }

    // Handle skill selector navigation
    if (showSkillSelector) {
      if (e.key === "Escape") {
        setShowSkillSelector(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSkillSelectedIndex((i) => (i + 1) % filteredSkills.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSkillSelectedIndex((i) => (i - 1 + filteredSkills.length) % filteredSkills.length);
      } else if (e.key === "Tab") {
        e.preventDefault();
        if (filteredSkills[skillSelectedIndex]) {
          handleSkillComplete(filteredSkills[skillSelectedIndex].name);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredSkills[skillSelectedIndex]) {
          handleSkillSelect(filteredSkills[skillSelectedIndex]);
        }
      }
      return;
    }

    // Normal send handling
    if (e.key === "Enter" && !e.shiftKey && !composingRef.current) {
      e.preventDefault();
      if (canSend) handleSend();
    }
  };

  return (
    <div className="shrink-0 bg-gradient-to-t from-background via-background to-background/80 pt-2 pb-4">
      <div className="mx-auto max-w-3xl px-4">
        <div className="relative">
          {activeSkill && (
            <div className="mb-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 shadow-sm">
              <div className="text-sm font-medium text-primary">{activeSkill.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{activeSkill.description}</div>
            </div>
          )}
          {showSkillSelector && !activeSkill && (
            <SkillSelector
              onSelect={handleSkillSelect}
              onComplete={handleSkillComplete}
              onClose={() => setShowSkillSelector(false)}
              searchQuery={skillQuery}
              selectedIndex={skillSelectedIndex}
            />
          )}
          <div
            className={cn(
              "relative flex items-end gap-3 rounded-3xl border border-border/60 bg-muted/40 px-5 py-4",
              "shadow-sm transition-all duration-200",
              "focus-within:border-primary/40 focus-within:bg-muted/60 focus-within:shadow-md focus-within:shadow-primary/5"
            )}
          >
            {/* <FileUploadButton onFileSelect={handleFileSelect} /> */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => { composingRef.current = true; }}
              onCompositionEnd={() => { composingRef.current = false; }}
              placeholder={
                state.connectionStatus !== "connected"
                  ? "Connect to a gateway first..."
                  : state.activeConversationId
                    ? "Send a message... (type / for skills)"
                    : "Start a new conversation..."
              }
              disabled={state.connectionStatus !== "connected"}
              rows={3}
              className={cn(
                "flex-1 resize-none bg-transparent text-base outline-none leading-relaxed",
                "placeholder:text-muted-foreground/40 placeholder:leading-relaxed",
                "disabled:cursor-not-allowed disabled:opacity-40",
                "transition-[height] duration-150 ease-out"
              )}
              style={{ minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT }}
            />
            {isStreamingHere ? (
              <Button
                size="icon"
                variant="destructive"
                onClick={() => actions.abortStreaming()}
                className="mb-0.5 size-8 shrink-0 rounded-full shadow-sm"
              >
                <Square className="size-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!canSend}
                className={cn(
                  "mb-0.5 size-8 shrink-0 rounded-full shadow-sm transition-opacity",
                  canSend ? "opacity-100" : "opacity-50"
                )}
              >
                <ArrowUp className="size-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground/30">
          Enter to send &middot; Shift+Enter for new line &middot; Type / for skills
        </p>
      </div>
    </div>
  );
}
