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

const QUICK_ACTIONS = [
  { label: "Run a scan", href: "/scan", icon: Search },
  { label: "Show quick wins", href: "/dashboard", icon: Zap },
  { label: "Fix my schema", href: "/schema-generator", icon: Wand2 },
  { label: "Check AI visibility", href: "/ai-visibility", icon: TrendingUp },
];

function getContextGreeting(pathname: string): Message {
  const greetings: Record<string, { content: string; actions?: Message["actions"] }> = {
    "/": {
      content: "Hey! I'm Will, your Geothority AI assistant. I can help you understand your local SEO, explain which fixes are available in-product, and show how your business appears across AI answer surfaces. What can I help with?",
      actions: [
        { label: "Run free scan", href: "/scan", icon: Search },
        { label: "See how it works", href: "#features", icon: Zap },
      ],
    },
    "/dashboard": {
      content: "Welcome to your dashboard! I can help you read your Trust Stack scores, see which fixes are automatic vs guided, and prioritize what to do next. Want me to walk you through it?",
      actions: [
        { label: "Show quick wins", href: "/dashboard", icon: Zap },
        { label: "Run new scan", href: "/scan", icon: Search },
      ],
    },
    "/scan": {
      content: "Ready to scan? Enter your business URL and I'll run a first-pass local presence scan in about 90 seconds. Want me to explain what the scan covers and what comes back as recommendations vs direct fixes?",
    },
  };

  // Find matching greeting or default
  const match = Object.entries(greetings).find(([path]) => pathname.startsWith(path));
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
  const pathname = usePathname();
  const shouldHide = HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isMarketingHome = pathname === "/";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize greeting based on current page
  useEffect(() => {
    setMessages([getContextGreeting(pathname)]);
  }, [pathname]);

  // Auto-open on first visit after 3s
  useEffect(() => {
    const hasOpened = typeof window !== "undefined" && localStorage.getItem(WILL_OPENED_KEY);
    const hasInteracted = typeof window !== "undefined" && localStorage.getItem(WILL_INTERACTED_KEY);

    if (!hasOpened && !isMarketingHome) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        try { localStorage.setItem(WILL_OPENED_KEY, "1"); } catch { /* ignore */ }
      }, 3000);
      return () => clearTimeout(timer);
    }

    // Show nudge bubble if they haven't interacted
    if (!hasInteracted && !nudgeDismissed) {
      const timer = setTimeout(() => setShowNudge(true), isMarketingHome ? 14000 : 8000);
      return () => clearTimeout(timer);
    }
  }, [nudgeDismissed, isMarketingHome]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
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
      el?.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push(href);
    }
    try { localStorage.setItem(WILL_INTERACTED_KEY, "1"); } catch { /* ignore */ }
  };

  if (!isMounted || shouldHide) return null;

  return (
    <>
      {/* Nudge bubble */}
      {showNudge && !isOpen && !nudgeDismissed && (
        <div
          className={`fixed z-50 max-w-[240px] rounded-2xl border border-white/10 bg-[#0f1117] px-4 py-3 shadow-xl animate-fade-in cursor-pointer ${isMarketingHome ? "bottom-28 right-4 sm:right-6" : "bottom-24 right-6"}`}
          onClick={() => { setIsOpen(true); setShowNudge(false); }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setShowNudge(false); setNudgeDismissed(true); }}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white text-xs"
          >
            ×
          </button>
          <p className="text-sm text-white/80">
            Need help? I can explain your scores and show what Geothority can handle directly. 👋
          </p>
        </div>
      )}

      {/* Chat toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed z-50 flex items-center justify-center shadow-lg transition-all hover:scale-105 ${isMarketingHome ? "bottom-4 right-4 h-12 w-12 rounded-xl sm:bottom-6 sm:right-6 sm:h-14 sm:w-14 sm:rounded-2xl" : "bottom-6 right-6 h-14 w-14 rounded-2xl"} ${
          isOpen
            ? "bg-white/10 border border-white/20"
            : "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-[0_8px_30px_rgba(92,230,186,0.3)]"
        }`}
      >
        {isOpen ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className={`fixed z-50 flex max-h-[600px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0e17] shadow-[0_24px_80px_rgba(0,0,0,0.6)] animate-fade-in ${isMarketingHome ? "bottom-20 right-3 w-[calc(100vw-24px)] max-w-[360px] sm:bottom-24 sm:right-6 sm:w-[380px]" : "bottom-24 right-6 w-[380px]"}`}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 bg-gradient-to-r from-emerald-500/10 to-teal-500/5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Will</div>
              <div className="text-[10px] text-emerald-400/80">Geothority AI Assistant</div>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-white/40">Online</span>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
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
          <div className="px-4 pt-2 pb-1">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {QUICK_ACTIONS.map((action) => (
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
          <div className="px-4 py-3 border-t border-white/8">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask Will anything about local SEO..."
                className="flex-1 bg-white/[0.05] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/38 focus:outline-none focus:border-emerald-400/35 focus:ring-1 focus:ring-emerald-400/20 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
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
