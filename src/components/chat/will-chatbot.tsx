"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  X,
  Send,
  Zap,
  Search,
  Bot,
  Wand2,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  type?: "text" | "action";
  actions?: Array<{ label: string; href: string; icon?: React.ElementType }>;
}

const WILL_OPENED_KEY = "will_has_opened";
const WILL_INTERACTED_KEY = "will_has_interacted";

const HIDDEN_PATH_PREFIXES = ["/login", "/signup", "/forgot-password", "/reset-password"];
const MARKETING_PATH_PREFIXES = ["/for", "/insurance-agents", "/pricing", "/service-facts", "/faq", "/contact", "/compare", "/bundle", "/privacy", "/terms", "/locations", "/profiles", "/profile", "/api-docs", "/google-business"];

function isMarketingPath(pathname: string) {
  return pathname === "/" || MARKETING_PATH_PREFIXES.some(path => pathname === path || pathname.startsWith(`${path}/`));
}

const QUICK_ACTIONS = [
  { label: "Run a scan", href: "/scan", icon: Search },
  { label: "Show quick wins", href: "/dashboard", icon: Zap },
  { label: "Fix my schema", href: "/schema-generator", icon: Wand2 },
  { label: "Check AI visibility", href: "/ai-visibility", icon: TrendingUp },
];

function getContextGreeting(pathname: string): Message {
  if (isMarketingPath(pathname)) {
    return {
      role: "assistant",
      type: "action",
      content: "Hi! I’m Will, Geothority’s AI assistant. I can explain the free scan, what’s included in each plan, and which improvements need your input. What would you like to know?",
      actions: [
        { label: "Get my free scan", href: "/signup", icon: Search },
        { label: "See how it works", href: pathname === "/" ? "#how-it-works" : "/#how-it-works", icon: Zap },
      ],
    };
  }
  const greetings: Record<string, { content: string; actions?: Message["actions"] }> = {
    "/dashboard": {
      content: "Welcome to your dashboard! I can help you read your Trust Stack scores, see which fixes are automatic vs guided, and prioritize what to do next. Want me to walk you through it?",
      actions: [
        { label: "Show quick wins", href: "/dashboard", icon: Zap },
        { label: "Run new scan", href: "/scan", icon: Search },
      ],
    },
    "/scan": {
      content: "Ready to scan? Enter your website and business details in the scan form. I can explain what the report checks and which improvements need your input.",
    },
  };

  // Find matching greeting or default
  const match = Object.entries(greetings).find(([path]) => pathname === path || pathname.startsWith(`${path}/`));
  const greeting = match?.[1] || {
    content: "Hey! I'm Will, your Geothority AI assistant. I can help you understand your Trust Stack scores, explain available fixes, or explore any feature. What can I help with?",
  };

  return {
    role: "assistant",
    content: greeting.content,
    type: "action",
    actions: greeting.actions,
  };
}

export function WillChatbot() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const shouldHide = HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isMarketing = isMarketingPath(pathname);
  const quickActions = isMarketing ? [
    { label: "Get my free scan", href: "/signup", icon: Search },
    { label: "Compare plans", href: "/pricing", icon: Zap },
    { label: "What’s included", href: "/service-facts", icon: ChevronRight },
  ] : QUICK_ACTIONS;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize greeting based on current page
  useEffect(() => {
    setMessages([getContextGreeting(pathname)]);
    setIsOpen(false);
    setShowNudge(false);
  }, [pathname]);

  // Auto-open on first visit after 3s
  useEffect(() => {
    if (shouldHide) return;
    let hasOpened = false;
    let hasInteracted = false;
    try {
      hasOpened = !!localStorage.getItem(WILL_OPENED_KEY);
      hasInteracted = !!localStorage.getItem(WILL_INTERACTED_KEY);
    } catch { /* Chat remains usable when storage is unavailable. */ }

    if (!hasOpened && !isMarketing) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        try { localStorage.setItem(WILL_OPENED_KEY, "1"); } catch { /* ignore */ }
      }, 3000);
      return () => clearTimeout(timer);
    }

    // Show nudge bubble if they haven't interacted
    if (!hasInteracted && !nudgeDismissed) {
      const timer = setTimeout(() => setShowNudge(true), isMarketing ? 14000 : 8000);
      return () => clearTimeout(timer);
    }
  }, [nudgeDismissed, isMarketing, shouldHide, pathname]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try { localStorage.setItem(WILL_INTERACTED_KEY, "1"); } catch { /* ignore */ }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMessage: Message = {
          role: "assistant",
          content: data.message || data.error || "I'm having trouble right now. Please try again.",
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I'm having a moment — please try again in a few seconds.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Connection issue. Please try again.",
        },
      ]);
    }

    setIsLoading(false);
  };

  const handleQuickAction = (href: string) => {
    if (href.startsWith("#")) {
      // Anchor link — close chat and scroll
      setIsOpen(false);
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    } else {
      setIsOpen(false);
      router.push(href);
    }
    try { localStorage.setItem(WILL_INTERACTED_KEY, "1"); } catch { /* ignore */ }
  };

  if (!isMounted || shouldHide) return null;

  return (
    <>
      {/* Nudge bubble */}
      {showNudge && !isOpen && !nudgeDismissed && (
        <div className="fixed bottom-24 right-4 z-50 max-w-[240px] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl sm:right-6">
          <button
            type="button"
            aria-label="Dismiss chat suggestion"
            onClick={() => { setShowNudge(false); setNudgeDismissed(true); }}
            className="absolute -top-3 -right-2 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:text-slate-950"
          >
            ×
          </button>
          <button type="button" onClick={() => { setIsOpen(true); setShowNudge(false); }} className="text-left text-sm leading-6 text-slate-700">
            {isMarketing ? "Questions about the free scan or how Geothority works? Ask me here." : "Need help? I can explain your report and next steps."}
          </button>
        </div>
      )}

      {/* Chat toggle button */}
      <button
        ref={toggleRef}
        type="button"
        aria-label={isOpen ? "Close Geothority chat" : "Open Geothority chat"}
        aria-expanded={isOpen}
        aria-controls="will-chat-panel"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-700 shadow-lg transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14 sm:rounded-2xl"
      >
        {isOpen ? (
          <X className="w-5 h-5 !text-white" aria-hidden="true" />
        ) : (
          <Bot className="w-6 h-6 !text-white" aria-hidden="true" />
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div id="will-chat-panel" role="dialog" aria-label="Chat with Will, Geothority’s AI assistant" className="fixed bottom-20 right-3 z-50 flex max-h-[min(600px,calc(100dvh-112px))] w-[calc(100vw-24px)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0e17] shadow-[0_24px_80px_rgba(0,0,0,0.6)] sm:bottom-24 sm:right-6">
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 px-4 py-3 border-b border-white/8 bg-gradient-to-r from-emerald-500/10 to-teal-500/5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Will</div>
              <div className="text-[10px] text-emerald-400/80">Geothority AI Assistant</div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} role="log" aria-label="Chat messages" aria-live="polite" className="h-[300px] min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-emerald-500/20 border border-emerald-400/20 text-white"
                      : "bg-white/[0.04] border border-white/8 text-white/85"
                  }`}
                >
                  {msg.content}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {msg.actions.map((action) => (
                        <button
                          key={action.label}
                          onClick={() => handleQuickAction(action.href)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 text-emerald-300 text-xs font-medium hover:bg-emerald-400/10 transition-colors text-left"
                        >
                          {action.icon && <action.icon className="w-3.5 h-3.5 flex-shrink-0" />}
                          {action.label}
                          <ChevronRight className="w-3 h-3 ml-auto opacity-50" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.04] border border-white/8 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick actions (always visible at bottom) */}
          <div className="shrink-0 px-4 pt-2 pb-1">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.href)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/8 bg-white/[0.03] text-[11px] text-white/60 whitespace-nowrap hover:border-white/15 hover:text-white/80 transition-colors flex-shrink-0"
                >
                  {action.icon && <action.icon className="w-3 h-3" />}
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="shrink-0 px-4 py-3 border-t border-white/8">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                aria-label="Your question for Geothority"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask about Geothority..."
                className="min-w-0 flex-1 bg-white/[0.05] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/38 focus:outline-none focus:border-emerald-400/35 focus:ring-1 focus:ring-emerald-400/20 transition-colors"
              />
              <button
                type="button"
                aria-label="Send message"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 shrink-0 rounded-xl bg-emerald-700 flex items-center justify-center !text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
