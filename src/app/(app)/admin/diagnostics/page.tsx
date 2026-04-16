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
import {
  RefreshCw, Wrench, AlertTriangle, CheckCircle2, XCircle, Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DiagnosticIssue {
  id: number;
  issueType: string;
  severity: "critical" | "high" | "medium" | "low" | null;
  status: "detected" | "analyzing" | "repairing" | "resolved" | "failed" | null;
  description: string | null;
  autoRepairAttempted: boolean;
  detectedAt: string | null;
  resolvedAt: string | null;
}

interface RepairAction {
  id: number;
  issueId: number;
  actionType: string;
  status: "pending" | "running" | "success" | "failed" | null;
  result: string | null;
  errorMessage: string | null;
  executedAt: string | null;
}

export default function AdminDiagnosticsPage() {
  const { toast } = useToast();
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: issues = [], isLoading: issuesLoading } = useQuery<DiagnosticIssue[]>({
    queryKey: ["/api/diagnostics/issues"],
    queryFn: async () => {
      const res = await fetch("/api/diagnostics/issues");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: repairs = [], isLoading: repairsLoading } = useQuery<RepairAction[]>({
    queryKey: ["/api/diagnostics/repairs"],
    queryFn: async () => {
      const res = await fetch("/api/diagnostics/repairs");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/diagnostics/scan");
      if (!res.ok) throw new Error("Scan failed");
      return res.json();
    },
    onSuccess: (data: { detected: number }) => {
      toast({ title: "Scan Complete", description: `Detected ${data.detected} new issues` });
      queryClient.invalidateQueries({ queryKey: ["/api/diagnostics/issues"] });
    },
    onError: (err: Error) => {
      toast({ title: "Scan Failed", description: err.message, variant: "destructive" });
    },
  });

  const repairMutation = useMutation({
    mutationFn: async (issueId: number) => {
      const res = await apiRequest("POST", `/api/diagnostics/issues/${issueId}/repair`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Repair Initiated", description: "Auto-repair actions have been triggered" });
      queryClient.invalidateQueries({ queryKey: ["/api/diagnostics/issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diagnostics/repairs"] });
    },
    onError: (err: Error) => {
      toast({ title: "Repair Failed", description: err.message, variant: "destructive" });
    },
  });

  const filteredIssues = issues.filter((issue) => {
    if (severityFilter !== "all" && issue.severity !== severityFilter) return false;
    if (statusFilter !== "all" && issue.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: issues.length,
    critical: issues.filter((i) => i.severity === "critical").length,
    autoRepairs: issues.filter((i) => i.autoRepairAttempted).length,
    resolved: issues.filter((i) => i.status === "resolved").length,
  };

  const isLoading = issuesLoading || repairsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">System Diagnostics</h1>
          <p className="text-sm text-muted-foreground">
            Monitor system health, auto-repairs, and detected issues
          </p>
        </div>
        <Button
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
          className="bg-electric-500 hover:bg-electric-400"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${scanMutation.isPending ? "animate-spin" : ""}`} />
          Run Scan
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[1,2,3,4].map(i => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-12 w-full" /></CardContent></Card>)}
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Total Issues", value: stats.total, icon: AlertTriangle },
              { title: "Critical", value: stats.critical, icon: XCircle },
              { title: "Auto-Repairs", value: stats.autoRepairs, icon: Wrench },
              { title: "Resolved", value: stats.resolved, icon: CheckCircle2 },
            ].map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Active Issues</CardTitle>
                  <CardDescription>{filteredIssues.length} of {issues.length} issues</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v ?? "all")}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Severities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="detected">Detected</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredIssues.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Issue Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Detected</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIssues.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell className="font-medium text-sm">
                          {issue.issueType?.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={issue.severity === "critical" || issue.severity === "high" ? "destructive" : "secondary"}>
                            {issue.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={issue.status === "resolved" ? "secondary" : issue.status === "failed" ? "destructive" : "outline"}>
                            {issue.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {issue.description || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {issue.detectedAt
                            ? formatDistanceToNow(new Date(issue.detectedAt), { addSuffix: true })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {issue.status === "detected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => repairMutation.mutate(issue.id)}
                              disabled={repairMutation.isPending}
                            >
                              <Wrench className="h-4 w-4 mr-1" />
                              Repair
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {issues.length === 0 ? "No issues detected. System is healthy!" : "No issues match your filters."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Repair History</CardTitle>
              <CardDescription>Latest auto-repair actions</CardDescription>
            </CardHeader>
            <CardContent>
              {repairs.length > 0 ? (
                <div className="space-y-3">
                  {repairs.map((repair) => (
                    <div key={repair.id} className="flex items-center justify-between gap-4 p-4 border border-border rounded-md">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-sm">{repair.actionType?.replace(/_/g, " ")}</span>
                        </div>
                        {repair.result && <p className="text-sm text-muted-foreground truncate">{repair.result}</p>}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {repair.executedAt
                            ? formatDistanceToNow(new Date(repair.executedAt), { addSuffix: true })
                            : ""}
                        </span>
                        <Badge variant={repair.status === "success" ? "secondary" : repair.status === "failed" ? "destructive" : "outline"}>
                          {repair.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No repair actions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
