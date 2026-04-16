"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Send, Users, BarChart2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PushNotificationAdminPage() {
  const { toast } = useToast();
  const [sendTarget, setSendTarget] = useState<"user" | "segment">("segment");
  const [userId, setUserId] = useState("");
  const [segment, setSegment] = useState("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("/dashboard");
  const [range, setRange] = useState("7");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/push/stats", range],
    queryFn: async () => {
      const res = await fetch(`/api/push/stats?range=${range}`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/push/send", {
        userId: sendTarget === "user" ? userId : undefined,
        segment: sendTarget === "segment" ? segment : undefined,
        title: title.trim(),
        body: body.trim(),
        link,
        category: "alerts",
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sent!",
        description: `Notification sent to ${data.notified ?? data.sent ?? 0} subscriber(s)`,
      });
      setTitle("");
      setBody("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/push/test", { title, body, link });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Test Sent", description: "Test push sent to your device" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Push Notification Admin</h1>
        <p className="text-sm text-muted-foreground">Send push notifications and view delivery stats</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-12 w-full" /></CardContent></Card>)
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Subscribers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.activeSubscriptions ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sent ({range}d)</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalSent ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Clicked</CardTitle>
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalClicked ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">CTR</CardTitle>
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.ctr ?? 0}%</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Compose */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-electric-400" />
            Send Notification
          </CardTitle>
          <CardDescription>Compose and send a push notification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Target */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={sendTarget === "segment" ? "default" : "outline"}
              onClick={() => setSendTarget("segment")}
              className={sendTarget === "segment" ? "bg-electric-500 hover:bg-electric-400" : ""}
            >
              Send to Segment
            </Button>
            <Button
              variant={sendTarget === "user" ? "default" : "outline"}
              onClick={() => setSendTarget("user")}
              className={sendTarget === "user" ? "bg-electric-500 hover:bg-electric-400" : ""}
            >
              Send to User
            </Button>
          </div>

          {sendTarget === "segment" ? (
            <div className="space-y-2">
              <Label>Segment</Label>
              <Select value={segment} onValueChange={(v) => setSegment(v ?? "all")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subscribers</SelectItem>
                  <SelectItem value="active">Active Users (7d)</SelectItem>
                  <SelectItem value="inactive">Inactive Users (30d)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input
                placeholder="Supabase user UUID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="🗺️ Your local SEO update"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea
              placeholder="Your message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Link (optional)</Label>
            <Input
              placeholder="/dashboard"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1 bg-electric-500 hover:bg-electric-400"
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || !title.trim() || !body.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              {sendMutation.isPending ? "Sending..." : "Send Notification"}
            </Button>
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || !title.trim() || !body.trim()}
            >
              Test Send
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      {stats?.statusBreakdown && stats.statusBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
            <CardDescription>Delivery status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {stats.statusBreakdown.map((item: any) => (
                <div key={item.status} className="text-center p-4 border border-border rounded-lg">
                  <div className="text-2xl font-bold">{item.count}</div>
                  <div className="text-sm text-muted-foreground capitalize">{item.status}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
