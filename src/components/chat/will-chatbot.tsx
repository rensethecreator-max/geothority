"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WILL_OPENED_KEY = "will_has_opened";
const WILL_INTERACTED_KEY = "will_has_interacted";

function getContextGreeting(pathname: string): string {
  if (pathname === "/" || pathname === "") {
    return "Welcome to Geothority! Want me to show you how we help insurance agents dominate local search?";
  }
  if (pathname === "/dashboard") {
    return "Hey! I'm Will, your Geothority assistant. Need help reading your Trust Stack™ scores or figuring out what to fix first?";
  }
  if (pathname.startsWith("/scan")) {
    return "Here are your results! Want me to explain what each Trust Stack™ layer means and what to fix first?";
  }
  if (pathname === "/content" || pathname.startsWith("/content/generate")) {
    return "This is our AI Content Generator. Let me show you how to create geo-targeted landing pages that rank. What city and service do you want to target?";
  }
  if (pathname === "/competitors") {
    return "This is our Competitor Watchdog. Let me show you how to track — and outmaneuver — your top local competitors.";
  }
  if (pathname === "/analytics") {
    return "This is your Analytics hub. I can help you understand what the numbers mean and which trends to act on.";
  }
  if (pathname === "/gbp-monitor") {
    return "This is the GBP Monitor. Let me show you how to catch and fix Google Business Profile issues before they hurt your rankings.";
  }
  if (pathname === "/schema-generator") {
    return "This is our Schema Generator. Want me to walk you through creating schema markup that gets you into AI Overviews?";
  }
  if (pathname === "/ai-overview") {
    return "This is our AI Overview Optimizer. Let me show you how to get recommended by ChatGPT, Perplexity, and Google AI.";
  }
  // Default
  return "Hey! I'm Will, your Geothority assistant. I can help you understand your Trust Stack™ scores, figure out what to fix first, or troubleshoot anything. What can I help with?";
}

export function WillChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const pathname = usePathname();

  const contextGreeting = getContextGreeting(pathname);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: contextGreeting,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update greeting when page changes (only if no conversation has started)
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "assistant") {
        return [{ role: "assistant", content: getContextGreeting(pathname) }];
      }
      return prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Auto-open on first visit after 3s
  useEffect(() => {
    const hasOpened = typeof window !== "undefined" && localStorage.getItem(WILL_OPENED_KEY);
    const hasInteracted = typeof window !== "undefined" && localStorage.getItem(WILL_INTERACTED_KEY);

    if (!hasOpened && !hasInteracted) {
      const openTimer = setTimeout(() => {
        setIsOpen(true);
        localStorage.setItem(WILL_OPENED_KEY, "1");
      }, 3000);
      return () => clearTimeout(openTimer);
    }
  }, []);

  // Show nudge bubble after 5s on first visit (only if not opened)
  useEffect(() => {
    const hasInteracted = typeof window !== "undefined" && localStorage.getItem(WILL_INTERACTED_KEY);
    if (hasInteracted || isOpen) return;

    const nudgeTimer = setTimeout(() => {
      if (!isOpen) setShowNudge(true);
    }, 5000);

    // Hide nudge after 12s
    const hideTimer = setTimeout(() => {
      setShowNudge(false);
    }, 12000);

    return () => {
      clearTimeout(nudgeTimer);
      clearTimeout(hideTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hide nudge when chat opens
  useEffect(() => {
    if (isOpen) setShowNudge(false);
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const markInteracted = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(WILL_INTERACTED_KEY, "1");
      localStorage.setItem(WILL_OPENED_KEY, "1");
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setShowNudge(false);
    markInteracted();
  };

  const handleClose = () => {
    setIsOpen(false);
    markInteracted();
  };

  const dismissNudge = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowNudge(false);
    setNudgeDismissed(true);
    markInteracted();
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    markInteracted();

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();
      setMessages([
        ...newMessages,
        { role: "assistant", content: data.message },
      ]);
    } catch {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Nudge Bubble */}
      {showNudge && !nudgeDismissed && !isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 animate-in slide-in-from-bottom-2 fade-in duration-300"
          onClick={handleOpen}
        >
          <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-2xl rounded-br-sm px-4 py-2.5 shadow-lg cursor-pointer hover:border-electric-500/50 transition-colors max-w-[220px]">
            <p className="text-xs font-medium text-[var(--foreground)] leading-snug">
              Need help getting started? 👋
            </p>
            {/* Dismiss X */}
            <button
              onClick={dismissNudge}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--card)] transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-2.5 h-2.5 text-[var(--muted-foreground)]" />
            </button>
            {/* Tail */}
            <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-[var(--card)] border-r border-b border-[var(--border)] rotate-45" />
          </div>
        </div>
      )}

      {/* Chat Button */}
      <button
        onClick={handleOpen}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-electric-500 hover:bg-electric-600 text-white shadow-lg shadow-electric-500/25 flex items-center justify-center transition-all duration-200 ${
          isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"
        }`}
        aria-label="Open chat with Will"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Panel */}
      <div
        className={`fixed bottom-6 right-6 z-50 w-[340px] h-[480px] bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isOpen
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-95 opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-electric-500 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold">W</span>
            </div>
            <div>
              <div className="font-semibold text-sm">Will · Geothority Assistant</div>
              <div className="text-[10px] opacity-80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 inline-block" />
                Online · Powered by AI
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-electric-500 text-white rounded-br-md"
                    : "bg-[var(--muted)] text-[var(--foreground)] rounded-bl-md"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[var(--muted)] rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask about your scores..."
              className="flex-1 bg-[var(--muted)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-electric-500"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="p-2 bg-electric-500 hover:bg-electric-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
