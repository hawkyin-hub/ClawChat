"use client";

import { useState } from "react";

interface ModelSelectorProps {
  menuData: Record<string, string[]>;
  currentModel: string | null;
  onSwitch: (model: string) => void;
}

export function ModelSelector({ menuData, currentModel, onSwitch }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const providers = Object.keys(menuData);
  const hasMenuData = providers.length > 0;

  // Default to first provider
  const [selectedProvider, setSelectedProvider] = useState(providers[0] || "");

  if (!hasMenuData) {
    return null;
  }

  const handleModelSwitch = (provider: string, modelId: string) => {
    // Format: "provider/modelId"
    const fullName = `${provider}/${modelId}`;
    onSwitch(fullName);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "4px 8px",
          fontSize: "12px",
          background: "transparent",
          border: "1px solid transparent",
          borderRadius: "4px",
          cursor: "pointer",
          color: "inherit",
        }}
      >
        <span style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {currentModel || "Select Model"}
        </span>
        <span style={{ fontSize: "10px" }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          marginTop: "4px",
          display: "flex",
          width: "400px",
          borderRadius: "6px",
          border: "1px solid hsl(var(--border))",
          backgroundColor: "#1a1a1a",
          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)",
          zIndex: 50,
          overflow: "hidden",
        }}>
          {/* 第一级：Provider 列表 */}
          <div style={{
            width: "140px",
            borderRight: "1px solid hsl(var(--border))",
            overflow: "auto",
            maxHeight: "250px",
            backgroundColor: "#1a1a1a",
          }}>
            <div style={{ padding: "6px 8px", fontSize: "11px", fontWeight: 500, color: "hsl(var(--muted-foreground))", borderBottom: "1px solid hsl(var(--border))" }}>
              Providers
            </div>
            {providers.map((provider) => (
              <div
                key={provider}
                onClick={() => setSelectedProvider(provider)}
                style={{
                  padding: "6px 8px",
                  fontSize: "13px",
                  cursor: "pointer",
                  background: selectedProvider === provider ? "hsl(var(--primary) / 0.1)" : "transparent",
                  color: selectedProvider === provider ? "hsl(var(--primary))" : "inherit",
                  borderLeft: selectedProvider === provider ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                }}
              >
                {provider}
              </div>
            ))}
          </div>

          {/* 第二级：Models 列表 */}
          <div style={{
            flex: 1,
            overflow: "auto",
            maxHeight: "250px",
            backgroundColor: "#1a1a1a",
          }}>
            <div style={{ padding: "6px 8px", fontSize: "11px", fontWeight: 500, color: "hsl(var(--muted-foreground))", borderBottom: "1px solid hsl(var(--border))" }}>
              Models
            </div>
            {menuData[selectedProvider]?.map((modelId) => {
              const fullName = `${selectedProvider}/${modelId}`;
              const isSelected = fullName === currentModel;
              return (
                <div
                  key={modelId}
                  onClick={() => handleModelSwitch(selectedProvider, modelId)}
                  style={{
                    padding: "6px 8px",
                    fontSize: "13px",
                    cursor: "pointer",
                    background: isSelected ? "hsl(var(--primary) / 0.1)" : "transparent",
                    color: isSelected ? "hsl(var(--primary))" : "inherit",
                  }}
                >
                  {modelId}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
