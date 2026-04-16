"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface SupportMessage {
  id: number;
  conversation_id: number;
  role: string;
  content: string;
  created_at: string;
}

export default function FloatingHelpChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const storageKey = "geothority_support_conv_id";

  useEffect(() => {
    const savedId = localStorage.getItem(storageKey);
    if (savedId) {
      setConversationId(savedId);
    } else {
      const createConv = async () => {
        try {
          const response = await apiRequest("POST", "/api/support/conversations");
          if (response.ok) {
            const data = await response.json();
            setConversationId(data.id);
            localStorage.setItem(storageKey, data.id.toString());
          }
        } catch (err) {
          console.error("Failed to create support conversation:", err);
        }
      };
      createConv();
    }
  }, []);

  const { data: messages = [] } = useQuery<SupportMessage[]>({
    queryKey: ["/api/support/conversations", conversationId, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/support/conversations/${conversationId}/messages`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!conversationId && isOpen,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest(
        "POST",
        `/api/support/conversations/${conversationId}/messages`,
        { content }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/support/conversations", conversationId, "messages"],
      });
      setMessage("");
    },
  });

  useEffect(() => {
    if (scrollAreaRef.current && isOpen) {
      const viewport = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!message.trim() || !conversationId) return;
    sendMutation.mutate(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {!isOpen && (
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-electric-500 hover:bg-electric-400"
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[calc(100vw-3rem)] sm:w-96 h-[500px] max-w-md shadow-2xl z-50 flex flex-col overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4 border-b border-border">
            <div>
              <CardTitle className="text-lg font-semibold">Geothority Support</CardTitle>
              <p className="text-xs text-muted-foreground">Ask about local SEO, audits, or billing</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
              {messages.length > 0 ? (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-electric-500 flex-shrink-0">
                          <span className="text-white text-xs font-bold">G</span>
                        </div>
                      )}
                      <div
                        className={`rounded-md px-3 py-2 max-w-[75%] ${
                          msg.role === "user"
                            ? "bg-electric-500 text-white"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <MessageCircle className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">How can we help?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ask about audits, your Trust Stack™ score, or billing
                  </p>
                </div>
              )}
            </ScrollArea>

            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask about local SEO..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!conversationId || sendMutation.isPending}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!message.trim() || !conversationId || sendMutation.isPending}
                  className="bg-electric-500 hover:bg-electric-400"
                >
                  {sendMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
