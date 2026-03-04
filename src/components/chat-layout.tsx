"use client";

import { useState, useEffect, useRef } from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { ConnectionIndicator } from "@/components/connection-indicator";
import { SettingsDialog } from "@/components/settings-dialog";
import { ModelSelector } from "@/components/model-selector";
import { useStore } from "@/lib/store";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";

export function ChatLayout() {
  const { state, actions } = useStore();

  const activeConv = state.activeConversationId
    ? state.conversations.find((c) => c.id === state.activeConversationId)
    : null;

  const title = activeConv?.title ?? state.agentIdentity?.name ?? "ChatClaw";

  // Rename dialog state
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const openRename = () => {
    if (!activeConv) return;
    setRenameValue(activeConv.title);
    setRenameOpen(true);
  };

  const confirmRename = () => {
    if (activeConv && renameValue.trim()) {
      actions.renameConversation(activeConv.id, renameValue.trim());
    }
    setRenameOpen(false);
  };

  useEffect(() => {
    if (renameOpen) {
      setTimeout(() => renameInputRef.current?.select(), 0);
    }
  }, [renameOpen]);

  return (
    <SidebarProvider className="!min-h-0 h-dvh">
      <AppSidebar />
      <SidebarInset className="min-h-0">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/50 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 !h-4" />
          <div className="flex flex-1 items-center gap-1 min-w-0">
            <h1 className="truncate text-sm font-medium">{title}</h1>
            {activeConv && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={openRename}
                title="Rename conversation"
                className="shrink-0"
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                console.log("=== DEBUG INFO ===");
                console.log("menuData:", state.modelMenuData);
                console.log("currentModel:", state.currentModel);
                console.log("availableModels:", state.availableModels);
                console.log("connectionStatus:", state.connectionStatus);
                alert("Debug info logged to console. Press F12 to view.");
              }}
              style={{
                padding: "4px 8px",
                fontSize: "11px",
                background: "transparent",
                border: "1px solid hsl(var(--border))",
                borderRadius: "4px",
                cursor: "pointer",
                color: "hsl(var(--muted-foreground))",
              }}
              title="Debug: Log info to console"
            >
              DEBUG
            </button>
            <ModelSelector
              menuData={state.modelMenuData}
              currentModel={state.currentModel}
              onSwitch={(model) => {
                console.log("[chat-layout] Model selected:", model);
                // Switch model
                actions.switchModel(model);
                // Create a new conversation if needed and send the model info
                const msg = `使用大模型：${model}`;
                console.log("[chat-layout] Sending model info message:", msg);
                // Get or create a conversation
                let convId = state.activeConversationId;
                if (!convId) {
                  // Need to create a new conversation
                  actions.newConversation().then((newId) => {
                    console.log("[chat-layout] Created conversation:", newId);
                    setTimeout(() => {
                      actions.sendMessage(msg, newId);
                    }, 200);
                  });
                } else {
                  actions.sendMessage(msg, convId);
                }
              }}
            />
            <ConnectionIndicator />
            <SettingsDialog />
          </div>
        </header>

        {/* Messages */}
        <ChatMessages />

        {/* Input */}
        <ChatInput />
      </SidebarInset>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription>Enter a new title for this conversation.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              confirmRename();
            }}
          >
            <Input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Conversation title"
            />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!renameValue.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
