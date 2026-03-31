"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function WillChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey! I'm Will, your Geothority assistant. I can help you understand your Trust Stack™ scores, figure out what to fix first, or troubleshoot CMS publishing. What can I help with?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

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
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-electric-500 hover:bg-electric-600 text-white shadow-lg shadow-electric-500/25 flex items-center justify-center transition-all duration-200 ${
          isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"
        }`}
        aria-label="Open chat with Will"
      >
        <span className="text-xl font-bold">W</span>
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
          <div>
            <div className="font-semibold text-sm">Will · Geothority Assistant</div>
            <div className="text-[10px] opacity-80">Powered by AI</div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
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
