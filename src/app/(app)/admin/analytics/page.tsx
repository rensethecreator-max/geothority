"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList,
} from "recharts";
import { Users, TrendingUp, BarChart2, DollarSign } from "lucide-react";

type Range = "7" | "30" | "90";

export default function AnalyticsDashboardPage() {
  const [range, setRange] = useState<Range>("30");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/analytics/dashboard", range],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/dashboard?range=${range}`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: funnelData } = useQuery({
    queryKey: ["/api/analytics/funnel", range],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/funnel?range=${range}`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">Platform usage and business metrics</p>
        </div>
        <div className="flex gap-2">
          {(["7", "30", "90"] as Range[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "outline"}
              onClick={() => setRange(r)}
              className={range === r ? "bg-electric-500 hover:bg-electric-400" : ""}
            >
              {r}d
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1,2,3,4].map(i => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Total Events", value: data?.totalEvents ?? 0, icon: BarChart2 },
              { title: "New Signups", value: data?.newSignups ?? 0, icon: Users },
              { title: "Page Views", value: data?.pageViews?.reduce((s: number, r: any) => s + (r.views ?? 0), 0) ?? 0, icon: TrendingUp },
              { title: "Revenue", value: `$${((data?.revenue?.reduce((s: number, r: any) => s + (r.revenue_cents ?? 0), 0) ?? 0) / 100).toFixed(0)}`, icon: DollarSign },
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

          {/* Page Views Chart */}
          {data?.pageViews?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Page Views</CardTitle>
                <CardDescription>Daily page view trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={data.pageViews}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Top Events */}
          {data?.topEvents?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Events</CardTitle>
                <CardDescription>Most frequent analytics events</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.topEvents.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="event_name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Signup Funnel */}
          {funnelData?.funnel && (
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>Signup to subscription conversion</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {funnelData.funnel.map((step: any, i: number) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{step.stage}</span>
                        <span className="font-medium">{step.count} ({step.conversionRate}%)</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-electric-500 rounded-full transition-all"
                          style={{ width: `${step.conversionRate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
