"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ModelPopupSelectorProps {
  menuData: Record<string, string[]>;
  currentModel: string | null;
  onSelect: (model: string) => void;
  onClose: () => void;
}

export function ModelPopupSelector({ menuData, currentModel, onSelect, onClose }: ModelPopupSelectorProps) {
  const providers = Object.keys(menuData);
  const [selectedProvider, setSelectedProvider] = useState(providers[0] || "");
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [focusedSide, setFocusedSide] = useState<"provider" | "model">("model");
  const providerListRef = useRef<HTMLDivElement>(null);
  const modelListRef = useRef<HTMLDivElement>(null);

  const currentModels = menuData[selectedProvider] || [];

  // Auto-scroll to selected model
  useEffect(() => {
    if (focusedSide === "model") {
      const selectedEl = modelListRef.current?.children[selectedModelIndex] as HTMLElement;
      selectedEl?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedModelIndex, focusedSide]);

  // Auto-scroll to selected provider
  useEffect(() => {
    const idx = providers.indexOf(selectedProvider);
    if (idx >= 0) {
      const selectedEl = providerListRef.current?.children[idx + 1] as HTMLElement; // +1 for header
      selectedEl?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedProvider, providers]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.preventDefault();

    if (e.key === "Escape") {
      onClose();
      return;
    }

    if (e.key === "Tab") {
      // Toggle focus side
      setFocusedSide((prev) => (prev === "provider" ? "model" : "provider"));
      return;
    }

    if (e.key === "ArrowLeft") {
      if (focusedSide === "model") {
        setFocusedSide("provider");
      }
      return;
    }

    if (e.key === "ArrowRight") {
      if (focusedSide === "provider") {
        setFocusedSide("model");
        setSelectedModelIndex(0);
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (focusedSide === "provider") {
        const idx = providers.indexOf(selectedProvider);
        if (idx > 0) {
          setSelectedProvider(providers[idx - 1]);
        }
      } else {
        setSelectedModelIndex((prev) => Math.max(0, prev - 1));
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (focusedSide === "provider") {
        const idx = providers.indexOf(selectedProvider);
        if (idx < providers.length - 1) {
          setSelectedProvider(providers[idx + 1]);
        }
      } else {
        setSelectedModelIndex((prev) => Math.min(currentModels.length - 1, prev + 1));
      }
      return;
    }

    if (e.key === "Enter") {
      if (focusedSide === "model" && currentModels.length > 0) {
        const modelId = currentModels[selectedModelIndex];
        const fullName = `${selectedProvider}/${modelId}`;
        onSelect(fullName);
      }
      return;
    }
  }, [focusedSide, selectedProvider, selectedModelIndex, providers, currentModels, onSelect, onClose]);

  // Handle click on provider
  const handleProviderClick = (provider: string, index: number) => {
    setSelectedProvider(provider);
    setFocusedSide("provider");
  };

  // Handle click on model
  const handleModelClick = (modelId: string, index: number) => {
    const fullName = `${selectedProvider}/${modelId}`;
    onSelect(fullName);
  };

  // Reset selection when provider changes
  useEffect(() => {
    setSelectedModelIndex(0);
  }, [selectedProvider]);

  if (providers.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute bottom-full left-0 mb-2 z-50 w-[420px] rounded-lg border border-border bg-popover p-0 shadow-lg"
      style={{ maxHeight: "350px" }}
      onKeyDown={handleKeyDown}
    >
      {/* 头部：当前模型 */}
      <div className="border-b border-border bg-muted/50 px-3 py-2">
        <div className="text-[10px] uppercase text-muted-foreground">当前使用</div>
        <div className="truncate text-sm font-medium">{currentModel || "未选择"}</div>
      </div>

      <div className="flex max-h-[300px] overflow-hidden">
        {/* 左侧：Provider 列表 */}
        <div
          ref={providerListRef}
          className="w-[140px] shrink-0 overflow-y-auto border-r border-border"
        >
          <div className="px-2 py-1.5 text-[10px] uppercase text-muted-foreground">Providers</div>
          {providers.map((provider, idx) => (
            <div
              key={provider}
              onClick={() => handleProviderClick(provider, idx)}
              className={cn(
                "cursor-pointer px-3 py-1.5 text-sm",
                selectedProvider === provider
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              )}
              style={{
                borderLeft: focusedSide === "provider" && selectedProvider === provider ? "2px solid hsl(var(--primary))" : "2px solid transparent",
              }}
            >
              {provider}
            </div>
          ))}
        </div>

        {/* 右侧：Models 列表 */}
        <div ref={modelListRef} className="flex-1 overflow-y-auto">
          <div className="px-2 py-1.5 text-[10px] uppercase text-muted-foreground">Models</div>
          {currentModels.map((modelId, idx) => {
            const fullName = `${selectedProvider}/${modelId}`;
            const isSelected = fullName === currentModel;
            return (
              <div
                key={modelId}
                onClick={() => handleModelClick(modelId, idx)}
                className={cn(
                  "cursor-pointer px-3 py-1.5 text-sm",
                  focusedSide === "model" && selectedModelIndex === idx && "bg-primary/10",
                  isSelected ? "text-primary" : "hover:bg-muted"
                )}
              >
                {modelId}
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部：操作提示 */}
      <div className="flex justify-between border-t border-border bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground">
        <span>← → 切换列 | ↑ ↓ 移动 | Enter 确认 | Esc 关闭</span>
        <button
          onClick={onClose}
          className="hover:text-foreground"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
