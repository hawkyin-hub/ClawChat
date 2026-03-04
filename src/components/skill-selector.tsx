"use client";

import { useRef, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Skill {
  name: string;
  description: string;
  path: string;
}

interface SkillSelectorProps {
  onSelect: (skill: Skill) => void;
  onComplete: (skillName: string) => void;
  onClose: () => void;
  searchQuery: string;
  selectedIndex: number;
}

const AVAILABLE_SKILLS: Skill[] = [
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

export function SkillSelector({ onSelect, onComplete, onClose, searchQuery, selectedIndex }: SkillSelectorProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const filteredSkills = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return AVAILABLE_SKILLS.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Auto-scroll to selected item
  useEffect(() => {
    const selectedEl = listRef.current?.children[selectedIndex] as HTMLElement;
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleClick = (skill: Skill) => {
    onSelect(skill);
  };

  return (
    <div
      ref={listRef}
      className="left-0 right-0 mb-2 max-h-64 overflow-auto rounded-lg border border-border bg-background shadow-lg"
    >
      {filteredSkills.length === 0 ? (
        <div className="p-3 text-center text-sm text-muted-foreground">
          No skills found
        </div>
      ) : (
        filteredSkills.map((skill, index) => (
          <div
            key={skill.path}
            className={cn(
              "cursor-pointer px-3 py-2 hover:bg-muted",
              index === selectedIndex && "bg-muted"
            )}
            onClick={() => handleClick(skill)}
          >
            <div className="font-medium text-foreground">{skill.name}</div>
            <div className="text-xs text-muted-foreground">{skill.description}</div>
          </div>
        ))
      )}
    </div>
  );
}
