import { useState, useEffect, useMemo } from "react";
import { useFairLensStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area } from "recharts";
import { computeSubgroupRates, computeDemographicParityDifference } from "@/lib/biasMetrics";
import { DriftMode } from "@/lib/types";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function Monitoring() {
  const { 
    streamEvents, isStreaming, driftMode, alerts, threshold,
    startStream, stopStream, resetStream, setDriftMode, setThreshold, pushAlert
  } = useFairLensStore();

  const [fps, setFps] = useState(0);
  const [lastCount, setLastCount] = useState(streamEvents.length);

  useEffect(() => {
    const timer = setInterval(() => {
      setFps(streamEvents.length - lastCount);
      setLastCount(streamEvents.length);
    }, 1000);
    return () => clearInterval(timer);
  }, [streamEvents.length, lastCount]);

  const chartData = useMemo(() => {
    // Generate rolling windows of 50 events to calculate DP Diff over time
    const data = [];
    const windowSize = 50;
    const step = 10;
    const events = [...streamEvents].reverse(); // Oldest first
    
    for (let i = 0; i < events.length; i += step) {
      const windowEvents = events.slice(Math.max(0, i - windowSize), i);
      if (windowEvents.length < 20) continue; // Need minimum sample size
      
      const genderRates = computeSubgroupRates(windowEvents, "gender");
      const dpDiff = computeDemographicParityDifference(genderRates);
      
      data.push({
        time: i,
        dpDiff: dpDiff * 100, // percentage
      });
    }
    
    return data.slice(-20); // Last 20 data points
  }, [streamEvents]);

  const driftHistoryData = useMemo(() => {
    const data = [];
    const windowSize = 20;
    const step = 5;
    const events = [...streamEvents].reverse().slice(-200);
    
    for (let i = 0; i < events.length; i += step) {
      const windowEvents = events.slice(Math.max(0, i - windowSize), i);
      if (windowEvents.length < 10) continue;
      
      const genderRates = computeSubgroupRates(windowEvents, "gender");
      const dpDiff = computeDemographicParityDifference(genderRates);
      
      data.push({
        index: i,
        dpDiff: dpDiff * 100,
      });
    }
    return data;
  }, [streamEvents]);

  const trend = useMemo(() => {
    if (driftHistoryData.length < 5) return "stable";
    const last5 = driftHistoryData.slice(-5);
    const n = last5.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    last5.forEach((d, i) => {
      sumX += i;
      sumY += d.dpDiff;
      sumXY += i * d.dpDiff;
      sumXX += i * i;
    });
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    if (slope > 0.5) return "rising";
    if (slope < -0.5) return "falling";
    return "stable";
  }, [driftHistoryData]);

  // Alert generation effect
  useEffect(() => {
    if (chartData.length === 0) return;
    const latest = chartData[chartData.length - 1];
    const thresholdPercentage = threshold * 100;
    
    if (latest.dpDiff > thresholdPercentage) {
      const alreadyAlertedRecently = alerts.some(a => Date.now() - a.timestamp < 5000);
      if (!alreadyAlertedRecently) {
        const newAlert = {
          id: Math.random().toString(36).substring(7),
          timestamp: Date.now(),
          message: `Gender Demographic Parity Difference exceeded threshold`,
          metric: "DP Diff (Gender)",
          value: latest.dpDiff
        };
        pushAlert(newAlert);
        toast.error(`Alert: ${newAlert.message}`, {
          description: `Current value: ${latest.dpDiff.toFixed(1)}% (Threshold: ${thresholdPercentage}%)`,
        });
      }
    }
  }, [chartData, threshold, alerts, pushAlert]);

  const approvalRate = streamEvents.length > 0
    ? (streamEvents.filter(e => e.prediction === "Approved").length / streamEvents.length) * 100
    : 0;

  return (
    <div className="space-y-8 h-full flex flex-col pb-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Live Monitoring</h1>
          <p className="text-muted-foreground">Real-time bias detection and drift simulation.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-secondary px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
            {isStreaming ? 'Live' : 'Paused'}
          </div>
          <div className="flex gap-2">
            {!isStreaming ? (
              <Button onClick={startStream} className="gap-2" data-testid="btn-start-stream">
                <Play className="w-4 h-4" /> Start Stream
              </Button>
            ) : (
              <Button onClick={stopStream} variant="secondary" className="gap-2" data-testid="btn-pause-stream">
                <Pause className="w-4 h-4" /> Pause
              </Button>
            )}
            <Button onClick={resetStream} variant="outline" size="icon" data-testid="btn-reset-stream">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Stream Rate</div>
            <div className="text-3xl font-bold">{fps} <span className="text-sm font-normal text-muted-foreground">events/sec</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Events</div>
            <div className="text-3xl font-bold">{streamEvents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Rolling Approval Rate</div>
            <div className="text-3xl font-bold">{approvalRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Active Alerts</div>
            <div className="text-3xl font-bold text-destructive">{alerts.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Demographic Parity (Gender)</CardTitle>
                <CardDescription>Rolling 50-event window</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground w-32">
                  <div className="flex justify-between mb-1">
                    <span>Threshold</span>
                    <span>{(threshold * 100).toFixed(0)}%</span>
                  </div>
                  <Slider 
                    min={0.05} max={0.3} step={0.01} 
                    value={[threshold]} 
                    onValueChange={(v) => setThreshold(v[0])}
                    data-testid="slider-threshold"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="time" hide />
                <YAxis 
                  domain={[0, Math.max(30, (threshold * 100) + 10)]} 
                  tickFormatter={(val) => `${val}%`}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  formatter={(val: number) => [`${val.toFixed(1)}%`, 'DP Difference']}
                  labelFormatter={() => ''}
                />
                <ReferenceLine y={threshold * 100} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ position: 'top', value: 'Alert Threshold', fill: 'hsl(var(--destructive))', fontSize: 12 }} />
                <Line 
                  type="monotone" 
                  dataKey="dpDiff" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Bias Drift History (rolling)</CardTitle>
                <CardDescription>Rolling DP-diff over last 200 stream events (20-event window)</CardDescription>
              </div>
              <Badge variant={trend === "rising" ? "destructive" : trend === "falling" ? "default" : "secondary"}>
                Trend: {trend}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={driftHistoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="index" hide />
                <YAxis 
                  domain={[0, Math.max(30, (threshold * 100) + 10)]} 
                  tickFormatter={(val) => `${val}%`}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  formatter={(val: number) => [`${val.toFixed(1)}%`, 'DP Difference']}
                />
                <ReferenceLine y={threshold * 100} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ position: 'top', value: 'Threshold', fill: 'hsl(var(--destructive))', fontSize: 10 }} />
                <Line 
                  type="monotone" 
                  dataKey="dpDiff" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 h-full">
          <Card className="shrink-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Simulation Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <label className="text-sm font-medium">Inject Data Drift</label>
                <Select value={driftMode} onValueChange={(v) => setDriftMode(v as DriftMode)}>
                  <SelectTrigger data-testid="select-drift">
                    <SelectValue placeholder="Select drift scenario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Drift (Baseline)</SelectItem>
                    <SelectItem value="gender">Adverse Gender Bias</SelectItem>
                    <SelectItem value="zipcode">Geographic Redlining</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground pt-1">
                  Simulates a degraded model deployment where approvals skew based on the selected attribute.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-destructive" /> Recent Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pt-2 space-y-3">
              {alerts.length > 0 ? (
                alerts.slice(0, 20).map((alert) => (
                  <div key={alert.id} className="bg-destructive/10 border border-destructive/20 p-3 rounded-md text-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-destructive">{alert.metric}</span>
                      <span className="text-xs text-muted-foreground">{format(alert.timestamp, 'HH:mm:ss')}</span>
                    </div>
                    <div className="text-foreground">{alert.message}</div>
                    <div className="font-mono text-xs mt-1 text-muted-foreground">Value: {alert.value.toFixed(1)}%</div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  No alerts triggered.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}