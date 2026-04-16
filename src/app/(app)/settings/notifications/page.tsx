"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, BellOff, Smartphone } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PushPreferences {
  enabled: boolean;
  categoryProductUpdates: boolean;
  categoryJourney: boolean;
  categoryAlerts: boolean;
  categoryDigest: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  maxPerDay: number;
  timezone: string;
}

export default function NotificationSettingsPage() {
  const { toast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [prefs, setPrefs] = useState<PushPreferences>({
    enabled: true,
    categoryProductUpdates: true,
    categoryJourney: true,
    categoryAlerts: true,
    categoryDigest: true,
    quietHoursStart: null,
    quietHoursEnd: null,
    maxPerDay: 5,
    timezone: "America/New_York",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["/api/push/preferences"],
    queryFn: async () => {
      const res = await fetch("/api/push/preferences");
      if (!res.ok) return null;
      return res.json() as Promise<PushPreferences>;
    },
  });

  useEffect(() => {
    if (data) setPrefs(data);
  }, [data]);

  // Check if currently subscribed
  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/push/preferences", prefs);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/push/preferences"] });
      toast({ title: "Saved", description: "Notification preferences updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save preferences", variant: "destructive" });
    },
  });

  const handleSubscribe = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast({ title: "Not Supported", description: "Push notifications are not supported in this browser", variant: "destructive" });
      return;
    }

    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({ title: "Permission Denied", description: "Please allow notifications in your browser settings", variant: "destructive" });
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        toast({ title: "Error", description: "Push notifications not configured", variant: "destructive" });
        return;
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      const subJson = subscription.toJSON();
      await apiRequest("POST", "/api/push/subscribe", {
        endpoint: subJson.endpoint,
        keys: subJson.keys,
        userAgent: navigator.userAgent,
      });

      setIsSubscribed(true);
      toast({ title: "Subscribed!", description: "You'll now receive push notifications from Geothority" });
    } catch (err) {
      console.error("[push] subscribe error:", err);
      toast({ title: "Error", description: "Failed to subscribe to push notifications", variant: "destructive" });
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async () => {
    setSubscribing(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const subJson = sub.toJSON();
        await sub.unsubscribe();
        await apiRequest("DELETE", "/api/push/subscribe", { endpoint: subJson.endpoint });
      }
      setIsSubscribed(false);
      toast({ title: "Unsubscribed", description: "You'll no longer receive push notifications" });
    } catch {
      toast({ title: "Error", description: "Failed to unsubscribe", variant: "destructive" });
    } finally {
      setSubscribing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground">Manage how Geothority notifies you about local SEO updates.</p>
      </div>

      {/* Browser Push */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-electric-400" />
            Browser Push Notifications
          </CardTitle>
          <CardDescription>Get instant alerts for ranking changes and audit results</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <p className="font-medium text-sm">Push Notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isSubscribed ? "Active on this device" : "Not active on this device"}
              </p>
            </div>
            <Button
              variant={isSubscribed ? "outline" : "default"}
              onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
              disabled={subscribing}
              className={!isSubscribed ? "bg-electric-500 hover:bg-electric-400" : ""}
            >
              {subscribing ? "..." : isSubscribed ? (
                <><BellOff className="h-4 w-4 mr-2" /> Unsubscribe</>
              ) : (
                <><Bell className="h-4 w-4 mr-2" /> Enable Push</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Categories</CardTitle>
          <CardDescription>Choose which types of notifications you receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "enabled" as const, label: "All Push Notifications", desc: "Master toggle for all push notifications" },
            { key: "categoryAlerts" as const, label: "Ranking Alerts", desc: "When your rankings or competitors' change significantly" },
            { key: "categoryDigest" as const, label: "Weekly Digest", desc: "Weekly local SEO health summary" },
            { key: "categoryJourney" as const, label: "Onboarding Tips", desc: "Guided tips to improve your Trust Stack™ score" },
            { key: "categoryProductUpdates" as const, label: "Product Updates", desc: "New features and improvements" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <Label className="font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                checked={prefs[key]}
                onCheckedChange={(checked) => setPrefs((p) => ({ ...p, [key]: checked }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Quiet Hours</CardTitle>
          <CardDescription>Pause notifications during these hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start (24h)</Label>
              <Input
                type="time"
                value={prefs.quietHoursStart ?? ""}
                onChange={(e) => setPrefs((p) => ({ ...p, quietHoursStart: e.target.value || null }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End (24h)</Label>
              <Input
                type="time"
                value={prefs.quietHoursEnd ?? ""}
                onChange={(e) => setPrefs((p) => ({ ...p, quietHoursEnd: e.target.value || null }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Max per day</Label>
            <Input
              type="number"
              min={0}
              max={20}
              value={prefs.maxPerDay}
              onChange={(e) => setPrefs((p) => ({ ...p, maxPerDay: parseInt(e.target.value) || 5 }))}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full bg-electric-500 hover:bg-electric-400"
      >
        {saveMutation.isPending ? "Saving..." : "Save Preferences"}
      </Button>
    </div>
  );
}
