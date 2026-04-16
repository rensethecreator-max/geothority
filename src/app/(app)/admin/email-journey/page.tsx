"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Pause, Mail, BarChart2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function EmailJourneyAdminPage() {
  const { toast } = useToast();
  const [journeyFilter, setJourneyFilter] = useState("onboarding");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: stepsData } = useQuery({
    queryKey: ["/api/email-journey/steps"],
    queryFn: async () => {
      const res = await fetch("/api/email-journey/steps");
      if (!res.ok) return { steps: [] };
      return res.json();
    },
  });

  const { data: progressData, isLoading } = useQuery({
    queryKey: ["/api/email-journey/progress", journeyFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (journeyFilter) params.set("journeyId", journeyFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/email-journey/progress?${params}`);
      if (!res.ok) return { progress: [], total: 0 };
      return res.json();
    },
  });

  const { data: funnelData } = useQuery({
    queryKey: ["/api/email-journey/funnel", journeyFilter],
    queryFn: async () => {
      const res = await fetch(`/api/email-journey/funnel?journeyId=${journeyFilter}`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("PATCH", `/api/email-journey/progress/${userId}/pause?journeyId=${journeyFilter}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-journey/progress"] });
      toast({ title: "Paused", description: "Journey paused for user" });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("PATCH", `/api/email-journey/progress/${userId}/resume?journeyId=${journeyFilter}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-journey/progress"] });
      toast({ title: "Resumed", description: "Journey resumed for user" });
    },
  });

  const steps = (stepsData?.steps ?? []).filter((s: any) => s.journeyId === journeyFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Email Journey Admin</h1>
          <p className="text-sm text-muted-foreground">Manage user email journeys and sequences</p>
        </div>
        <div className="flex gap-2">
          <Select value={journeyFilter} onValueChange={(v) => setJourneyFilter(v ?? "onboarding")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="onboarding">Onboarding</SelectItem>
              <SelectItem value="win_back">Win-Back</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Journey Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-electric-400" />
            Journey Steps
          </CardTitle>
          <CardDescription>Email sequence for the {journeyFilter} journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {steps.map((step: any) => (
              <div key={step.stepOrder} className="flex items-center gap-4 p-3 border border-border rounded-lg">
                <div className="w-7 h-7 rounded-full bg-electric-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-electric-400">{step.stepOrder}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{step.name}</p>
                  <p className="text-xs text-muted-foreground">{step.subject}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {step.type === "immediate" ? "Immediate" : step.type === "delay" ? `Day ${step.delayDays}` : `Trigger: ${step.triggerEvent}`}
                </Badge>
              </div>
            ))}
            {steps.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No steps found for this journey</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Funnel Stats */}
      {funnelData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-electric-400" />
              Conversion Funnel
            </CardTitle>
            <CardDescription>
              {funnelData.totalEnrolled} users enrolled · {funnelData.completionRate}% completion rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnelData.steps?.map((step: any) => (
                <div key={step.stepOrder} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{step.name}</span>
                    <span className="text-muted-foreground">{step.reached} ({step.conversionRate}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-electric-500 rounded-full" style={{ width: `${step.conversionRate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Progress Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Progress</CardTitle>
          <CardDescription>{progressData?.total ?? 0} users in this journey</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (progressData?.progress?.length ?? 0) > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sent</TableHead>
                  <TableHead>Next Send</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {progressData?.progress?.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.user_id?.slice(0, 8)}...</TableCell>
                    <TableCell>Step {row.current_step_order}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "active" ? "secondary" : row.status === "completed" ? "outline" : "destructive"}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.last_sent_at ? formatDistanceToNow(new Date(row.last_sent_at), { addSuffix: true }) : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.next_send_at ? formatDistanceToNow(new Date(row.next_send_at), { addSuffix: true }) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.status === "active" ? (
                        <Button size="sm" variant="outline" onClick={() => pauseMutation.mutate(row.user_id)}>
                          <Pause className="h-3 w-3 mr-1" /> Pause
                        </Button>
                      ) : row.status === "paused" ? (
                        <Button size="sm" variant="outline" onClick={() => resumeMutation.mutate(row.user_id)}>
                          <Play className="h-3 w-3 mr-1" /> Resume
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center">
              <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No users in this journey yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
