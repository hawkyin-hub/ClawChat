"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { invoke } from "@tauri-apps/api/core";
import {
  getSettings,
  saveSettings,
  updateTheme,
  getAllConversations,
  getConversation,
  createConversation,
  updateConversationTitle,
  deleteConversation as dbDeleteConversation,
  deleteAllConversations as dbDeleteAllConversations,
  getMessages,
  addMessage,
} from "@/lib/db";
import { getGateway, resetGateway } from "@/lib/gateway";
import type {
  Settings,
  Conversation,
  Message,
  ConnectionStatus,
  AgentIdentity,
  ChatEventPayload,
  AppState,
} from "@/types";

// ── Action Types ────────────────────────────────────────────────────

type Action =
  | { type: "SET_SETTINGS"; settings: Settings | null }
  | { type: "SET_SETTINGS_LOADED" }
  | { type: "SET_CONNECTION_STATUS"; status: ConnectionStatus }
  | { type: "SET_AGENT_IDENTITY"; identity: AgentIdentity }
  | { type: "SET_CONVERSATIONS"; conversations: Conversation[] }
  | { type: "ADD_CONVERSATION"; conversation: Conversation }
  | { type: "UPDATE_CONVERSATION_TITLE"; id: string; title: string }
  | { type: "REMOVE_CONVERSATION"; id: string }
  | { type: "SET_ACTIVE_CONVERSATION"; id: string | null }
  | { type: "SET_MESSAGES"; messages: Message[] }
  | { type: "ADD_MESSAGE"; message: Message }
  | { type: "SET_DETECTED_GATEWAY"; url: string | null; token: string | null }
  | { type: "SET_STREAMING"; isStreaming: boolean; conversationId?: string | null }
  | { type: "SET_STREAMING_CONTENT"; content: string; runId: string | null }
  | { type: "SET_THEME"; theme: "dark" | "light" }
  | { type: "SET_MODELS"; models: string[] }
  | { type: "SET_CURRENT_MODEL"; model: string | null }
  | { type: "SET_MODEL_MENU"; menuData: Record<string, string[]> }
  | { type: "SET_NICKNAMES"; assistant: string | null; user: string | null };

// ── Initial State ───────────────────────────────────────────────────

const initialState: AppState = {
  settings: null,
  settingsLoaded: false,
  connectionStatus: "disconnected",
  agentIdentity: null,
  conversations: [],
  activeConversationId: null,
  detectedGatewayUrl: null,
  detectedToken: null,
  messages: [],
  isStreaming: false,
  streamingContent: "",
  currentRunId: null,
  streamingConversationId: null,
  availableModels: [],
  currentModel: null,
  modelMenuData: {},
  assistantNickname: null,
  userNickname: null,
};

// ── Reducer ─────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_SETTINGS":
      return { ...state, settings: action.settings };
    case "SET_SETTINGS_LOADED":
      return { ...state, settingsLoaded: true };
    case "SET_CONNECTION_STATUS":
      return { ...state, connectionStatus: action.status };
    case "SET_AGENT_IDENTITY":
      return { ...state, agentIdentity: action.identity };
    case "SET_CONVERSATIONS":
      return { ...state, conversations: action.conversations };
    case "ADD_CONVERSATION":
      return {
        ...state,
        conversations: [action.conversation, ...state.conversations],
      };
    case "UPDATE_CONVERSATION_TITLE":
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.id ? { ...c, title: action.title } : c
        ),
      };
    case "REMOVE_CONVERSATION":
      return {
        ...state,
        conversations: state.conversations.filter((c) => c.id !== action.id),
        activeConversationId:
          state.activeConversationId === action.id
            ? null
            : state.activeConversationId,
        messages:
          state.activeConversationId === action.id ? [] : state.messages,
      };
    case "SET_ACTIVE_CONVERSATION":
      return { ...state, activeConversationId: action.id };
    case "SET_DETECTED_GATEWAY":
      return { ...state, detectedGatewayUrl: action.url, detectedToken: action.token };
    case "SET_MESSAGES":
      return { ...state, messages: action.messages };
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.message] };
    case "SET_STREAMING":
      return {
        ...state,
        isStreaming: action.isStreaming,
        ...(action.isStreaming
          ? { streamingConversationId: action.conversationId ?? state.streamingConversationId }
          : { streamingContent: "", currentRunId: null, streamingConversationId: null }),
      };
    case "SET_STREAMING_CONTENT":
      return {
        ...state,
        streamingContent: action.content,
        currentRunId: action.runId,
      };
    case "SET_THEME":
      return {
        ...state,
        settings: state.settings
          ? { ...state.settings, theme: action.theme }
          : null,
      };
    case "SET_MODELS":
      return { ...state, availableModels: action.models };
    case "SET_CURRENT_MODEL":
      return { ...state, currentModel: action.model };
    case "SET_MODEL_MENU":
      return { ...state, modelMenuData: action.menuData };
    case "SET_NICKNAMES":
      return { ...state, assistantNickname: action.assistant, userNickname: action.user };
    default:
      return state;
  }
}

// ── Context ─────────────────────────────────────────────────────────

interface StoreContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  actions: StoreActions;
}

const StoreContext = createContext<StoreContextValue | null>(null);

// ── Actions ─────────────────────────────────────────────────────────

interface StoreActions {
  loadSettings: () => Promise<void>;
  saveAndConnect: (url: string, token: string) => Promise<void>;
  connectGateway: () => void;
  disconnectGateway: () => void;
  loadConversations: () => Promise<void>;
  newConversation: () => Promise<string>;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  deleteAllConversations: () => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  sendMessage: (content: string, convId?: string) => Promise<void>;
  abortStreaming: () => Promise<void>;
  toggleTheme: () => Promise<void>;
  loadModels: () => Promise<void>;
  loadModelMenu: () => Promise<void>;
  switchModel: (model: string) => Promise<void>;
}

// ── Provider ────────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Track accumulated text for delta computation
  const lastTextRef = useRef("");

  // ── Gateway event handlers ──────────────────────────────────────

  const handleConnectionStatus = useCallback(
    (status: ConnectionStatus) => {
      dispatch({ type: "SET_CONNECTION_STATUS", status });
      // Load models when connected
      if (status === "connected") {
        const gw = getGateway();
        // First get current model from config
        invoke<{ currentModel: string | null }>("get_current_model")
          .then((data) => {
            console.log("[store] get_current_model result:", data);
            if (data.currentModel) {
              dispatch({ type: "SET_CURRENT_MODEL", model: data.currentModel });
            }
          })
          .catch((e) => {
            console.log("[store] get_current_model error (non-critical):", e);
          });
        // Get model menu from config
        invoke<Record<string, string[]>>("get_model_menu")
          .then((data) => {
            console.log("[store] get_model_menu result:", data);
            dispatch({ type: "SET_MODEL_MENU", menuData: data });
          })
          .catch((e) => {
            console.log("[store] get_model_menu error (non-critical):", e);
          });
        // Then get available models
        gw.listModels().then((res) => {
          if (res.ok && res.payload) {
            const rawModels = (res.payload as any).models || [];
            const models = rawModels.map((m: string | { name: string }) =>
              typeof m === "string" ? m : (m.name || String(m))
            );
            dispatch({ type: "SET_MODELS", models });
            // Only set default if no current model from config
            if (!stateRef.current.currentModel && models.length > 0) {
              dispatch({ type: "SET_CURRENT_MODEL", model: models[0] });
            }
          }
        }).catch((e) => {
          console.log("[store] listModels error (non-critical):", e);
        });
      }
    },
    []
  );

  const handleChatEvent = useCallback(
    (payload: ChatEventPayload) => {
      console.log("[store] handleChatEvent payload:", JSON.stringify(payload));
      const current = stateRef.current;
      // Try different field names for message content
      const text =
        payload.message?.content?.[0]?.text ??
        (payload as any).message?.text ??
        (payload as any).text ??
        "";

      console.log("[store] extracted text:", text);

      switch (payload.state) {
        case "delta": {
          dispatch({
            type: "SET_STREAMING_CONTENT",
            content: text,
            runId: payload.runId,
          });
          break;
        }
        case "final": {
          const finalText = text || current.streamingContent;
          if (finalText && current.activeConversationId) {
            const msg: Message = {
              id: uuidv4(),
              conversationId: current.activeConversationId!,
              role: "assistant",
              content: finalText,
              createdAt: payload.message?.timestamp ?? Date.now(),
            };
            addMessage(msg).then(() => {
              dispatch({ type: "ADD_MESSAGE", message: msg });
            });
          } else if (current.activeConversationId) {
            // No text in event, try to fetch from chat history
            const conv = current.conversations.find(
              (c) => c.id === current.activeConversationId
            );
            console.log("[store] Looking for conversation:", current.activeConversationId);
            console.log("[store] Found conversation:", conv);
            if (conv?.sessionKey) {
              console.log("[store] No text in final event, fetching chat history with sessionKey:", conv.sessionKey);
              getGateway()
                .getChatHistory(conv.sessionKey, 10)
                .then((res) => {
                  console.log("[store] chat.history response:", JSON.stringify(res));
                  const historyAny = res as any;
                  const messages = historyAny.result?.messages || [];
                  console.log("[store] History messages count:", messages.length);
                  // Find the last assistant message
                  const lastAssistant = messages
                    .filter((m: any) => m.role === "assistant")
                    .pop();
                  console.log("[store] Last assistant message:", lastAssistant);
                  if (lastAssistant?.content) {
                    // content is an array, extract text from text type items
                    const contentArray = Array.isArray(lastAssistant.content)
                      ? lastAssistant.content
                      : [lastAssistant.content];
                    const textContent = contentArray
                      .filter((c: any) => c.type === "text")
                      .map((c: any) => c.text)
                      .join("");
                    console.log("[store] Extracted text content:", textContent);
                    if (textContent) {
                      const msg: Message = {
                        id: uuidv4(),
                        conversationId: current.activeConversationId!,
                        role: "assistant",
                        content: textContent,
                        createdAt: Date.now(),
                      };
                      console.log("[store] Adding message from history:", msg);
                      addMessage(msg).then(() => {
                        dispatch({ type: "ADD_MESSAGE", message: msg });
                      });
                    } else {
                      console.log("[store] No text content found in assistant message");
                    }
                  }
                })
                .catch((e) => {
                  console.error("[store] Failed to fetch chat history:", e);
                });
            }
          }
          dispatch({ type: "SET_STREAMING", isStreaming: false });
          lastTextRef.current = "";
          break;
        }
        case "error": {
          const errText =
            payload.error || text || "An error occurred";
          if (current.activeConversationId) {
            const msg: Message = {
              id: uuidv4(),
              conversationId: current.activeConversationId!,
              role: "assistant",
              content: `Error: ${errText}`,
              createdAt: Date.now(),
            };
            addMessage(msg).then(() => {
              dispatch({ type: "ADD_MESSAGE", message: msg });
            });
          }
          dispatch({ type: "SET_STREAMING", isStreaming: false });
          lastTextRef.current = "";
          break;
        }
        case "aborted": {
          // Save whatever we had
          const abortedText = current.streamingContent;
          if (abortedText && current.activeConversationId) {
            const msg: Message = {
              id: uuidv4(),
              conversationId: current.activeConversationId!,
              role: "assistant",
              content: abortedText,
              createdAt: Date.now(),
            };
            addMessage(msg).then(() => {
              dispatch({ type: "ADD_MESSAGE", message: msg });
            });
          }
          dispatch({ type: "SET_STREAMING", isStreaming: false });
          lastTextRef.current = "";
          break;
        }
      }
    },
    []
  );

  const handleAgentIdentity = useCallback(
    (identity: AgentIdentity) => {
      dispatch({ type: "SET_AGENT_IDENTITY", identity });
    },
    []
  );

  const handleError = useCallback(
    (_error: string) => {
      // Could display toast notification
    },
    []
  );

  // ── Actions ─────────────────────────────────────────────────────

  const loadSettings = useCallback(async () => {
    const settings = await getSettings();
    dispatch({ type: "SET_SETTINGS", settings });
    dispatch({ type: "SET_SETTINGS_LOADED" });

    // Load nicknames from IDENTITY.md and USER.md
    try {
      const result = await invoke<{ assistant: string | null; user: string | null }>("get_nicknames");
      console.log("[store] get_nicknames result:", result);
      dispatch({ type: "SET_NICKNAMES", assistant: result.assistant, user: result.user });
    } catch (e) {
      console.error("Failed to load nicknames:", e);
    }
  }, []);

  const connectGateway = useCallback(() => {
    const s = stateRef.current.settings;
    if (!s?.gatewayUrl || !s?.token) return;

    const gw = getGateway();
    gw.configure(s.gatewayUrl, s.token, {
      onConnectionStatus: handleConnectionStatus,
      onChatEvent: handleChatEvent,
      onAgentIdentity: handleAgentIdentity,
      onError: handleError,
    });
    gw.connect();
  }, [handleConnectionStatus, handleChatEvent, handleAgentIdentity, handleError]);

  const disconnectGateway = useCallback(() => {
    resetGateway();
    dispatch({ type: "SET_CONNECTION_STATUS", status: "disconnected" });
  }, []);

  const saveAndConnect = useCallback(
    async (url: string, token: string) => {
      const theme = stateRef.current.settings?.theme ?? "dark";
      const settings = await saveSettings(url, token, theme);
      dispatch({ type: "SET_SETTINGS", settings });
      // Reconnect with new settings
      resetGateway();
      const gw = getGateway();
      gw.configure(url, token, {
        onConnectionStatus: handleConnectionStatus,
        onChatEvent: handleChatEvent,
        onAgentIdentity: handleAgentIdentity,
        onError: handleError,
      });
      gw.connect();
    },
    [handleConnectionStatus, handleChatEvent, handleAgentIdentity, handleError]
  );

  const loadConversations = useCallback(async () => {
    const conversations = await getAllConversations();
    dispatch({ type: "SET_CONVERSATIONS", conversations });
  }, []);

  const newConversation = useCallback(async () => {
    // If current conversation is empty (no messages), just stay on it
    const current = stateRef.current;
    if (current.activeConversationId) {
      const activeConv = current.conversations.find(c => c.id === current.activeConversationId);
      if (activeConv && activeConv.title === "New Chat" && current.messages.length === 0) {
        return current.activeConversationId;
      }
    }

    const id = uuidv4();
    const sessionKey = uuidv4();
    const conv = await createConversation(id, sessionKey, "New Chat");
    dispatch({ type: "ADD_CONVERSATION", conversation: conv });
    dispatch({ type: "SET_ACTIVE_CONVERSATION", id });
    dispatch({ type: "SET_MESSAGES", messages: [] });
    return id;
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    dispatch({ type: "SET_ACTIVE_CONVERSATION", id });
    const msgs = await getMessages(id);
    dispatch({ type: "SET_MESSAGES", messages: msgs });
  }, []);

  const doDeleteConversation = useCallback(async (id: string) => {
    await dbDeleteConversation(id);
    dispatch({ type: "REMOVE_CONVERSATION", id });
  }, []);

  const doRenameConversation = useCallback(async (id: string, title: string) => {
    await updateConversationTitle(id, title);
    dispatch({ type: "UPDATE_CONVERSATION_TITLE", id, title });
  }, []);

  const doDeleteAllConversations = useCallback(async () => {
    await dbDeleteAllConversations();
    dispatch({ type: "SET_CONVERSATIONS", conversations: [] });
    dispatch({ type: "SET_ACTIVE_CONVERSATION", id: null });
    dispatch({ type: "SET_MESSAGES", messages: [] });
  }, []);

  const sendMessageAction = useCallback(async (content: string, convId?: string) => {
    console.log("[store] sendMessage called:", content, "convId:", convId);
    const current = stateRef.current;
    let activeId = convId || current.activeConversationId;

    // Create a new conversation if needed
    if (!activeId) {
      console.log("[store] No activeId, creating new conversation...");
      activeId = await newConversation();
      console.log("[store] Created new conversation:", activeId);
    }

    // Only block sending if this conversation is already streaming
    if (current.isStreaming && current.streamingConversationId === activeId) return;

    // Try state first, fall back to DB (state may not have re-rendered yet)
    let conv = stateRef.current.conversations.find(
      (c) => c.id === activeId
    );
    console.log("[store] Found conversation in state:", conv);
    if (!conv) {
      conv = await getConversation(activeId!);
      console.log("[store] Found conversation in DB:", conv);
    }
    if (!conv) {
      console.error("[store] Conversation still not found after DB lookup:", activeId);
      return;
    }

    console.log("[store] Ready to send, sessionKey:", conv.sessionKey);

    // Add user message to DB and state
    const userMsg: Message = {
      id: uuidv4(),
      conversationId: activeId!,
      role: "user",
      content,
      createdAt: Date.now(),
    };
    await addMessage(userMsg);
    dispatch({ type: "ADD_MESSAGE", message: userMsg });

    // Auto-title from first message
    if (conv.title === "New Chat") {
      const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
      await updateConversationTitle(conv.id, title);
      dispatch({
        type: "UPDATE_CONVERSATION_TITLE",
        id: conv.id,
        title,
      });
    }

    // Start streaming
    dispatch({ type: "SET_STREAMING", isStreaming: true, conversationId: activeId });
    lastTextRef.current = "";

    // Send via gateway
    const gw = getGateway();
    try {
      const response = await gw.sendMessage(conv.sessionKey, content);
      console.log("[store] sendMessage response:", JSON.stringify(response));

      // Backup: try to extract message from response if handleChatEvent fails
      const resAny = response as any;
      const responseContent = resAny.result?.content ?? resAny.result?.message ?? resAny.result?.text ?? "";
      console.log("[store] response content:", responseContent);

      if (responseContent) {
        const msg: Message = {
          id: uuidv4(),
          conversationId: activeId,
          role: "assistant",
          content: responseContent,
          createdAt: Date.now(),
        };
        console.log("[store] Adding from response:", msg);
        await addMessage(msg);
        dispatch({ type: "ADD_MESSAGE", message: msg });
      }
    } catch (e) {
      console.error("Failed to send message:", e);
      dispatch({ type: "SET_STREAMING", isStreaming: false });
    }
  }, []);

  const abortStreaming = useCallback(async () => {
    const current = stateRef.current;
    if (!current.isStreaming || !current.activeConversationId) return;

    const conv = current.conversations.find(
      (c) => c.id === current.activeConversationId
    );
    if (!conv) return;

    const gw = getGateway();
    try {
      await gw.abortChat(conv.sessionKey, current.currentRunId ?? undefined);
    } catch {
      // Force stop UI anyway
      dispatch({ type: "SET_STREAMING", isStreaming: false });
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const current = stateRef.current;
    const newTheme = current.settings?.theme === "light" ? "dark" : "light";
    if (current.settings) {
      await updateTheme(newTheme);
      dispatch({ type: "SET_THEME", theme: newTheme });
    }
  }, []);

  const loadModels = useCallback(async () => {
    const gw = getGateway();
    if (!gw.isConnected()) return;
    try {
      const res = await gw.listModels();
      if (res.ok && res.payload) {
        const rawModels = (res.payload as any).models || [];
        const models = rawModels.map((m: string | { name: string }) =>
          typeof m === "string" ? m : (m.name || String(m))
        );
        dispatch({ type: "SET_MODELS", models });
        if (models.length > 0 && !stateRef.current.currentModel) {
          dispatch({ type: "SET_CURRENT_MODEL", model: models[0] });
        }
      }
    } catch (e) {
      console.error("[store] Failed to load models:", e);
    }
  }, []);

  const loadModelMenu = useCallback(async () => {
    try {
      const data = await invoke<Record<string, string[]>>("get_model_menu");
      console.log("[store] get_model_menu result:", data);
      dispatch({ type: "SET_MODEL_MENU", menuData: data });
    } catch (e) {
      console.error("[store] Failed to load model menu:", e);
    }
  }, []);

  const switchModel = useCallback(async (model: string) => {
    console.log("[store] switchModel called:", model);
    // Just update local state - OpenClaw Gateway doesn't support switchModel
    dispatch({ type: "SET_CURRENT_MODEL", model });
    console.log("[store] Model switched to:", model);
  }, []);

  // ── Init ────────────────────────────────────────────────────────

  useEffect(() => {
    loadSettings().then(async () => {
      loadConversations();
      // If no saved settings, try to detect local OpenClaw config
      const s = stateRef.current.settings;
      if (!s?.gatewayUrl) {
        try {
          const res = await fetch("/api/detect-gateway");
          const data = await res.json();
          if (data.found) {
            dispatch({ type: "SET_DETECTED_GATEWAY", url: data.url, token: data.token });
          }
        } catch { /* ignore */ }
      }
    });
    return () => {
      resetGateway();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-connect when settings are loaded
  useEffect(() => {
    if (state.settingsLoaded && state.settings?.gatewayUrl && state.settings?.token) {
      connectGateway();
    }
  }, [state.settingsLoaded, state.settings?.gatewayUrl, state.settings?.token, connectGateway]);

  // Theme class on html
  useEffect(() => {
    const theme = state.settings?.theme ?? "dark";
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
  }, [state.settings?.theme]);

  const actions: StoreActions = {
    loadSettings,
    saveAndConnect,
    connectGateway,
    disconnectGateway,
    loadConversations,
    newConversation,
    selectConversation,
    deleteConversation: doDeleteConversation,
    deleteAllConversations: doDeleteAllConversations,
    renameConversation: doRenameConversation,
    sendMessage: sendMessageAction,
    abortStreaming,
    toggleTheme,
    loadModels,
    loadModelMenu,
    switchModel,
  };

  return (
    <StoreContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </StoreContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────────────

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
