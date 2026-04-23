import { useFairLensStore } from "@/lib/store";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { motion } from "framer-motion";
import { Upload } from "lucide-react";

export default function Metrics() {
  const { dataset, metrics } = useFairLensStore();

  if (!dataset || metrics.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
          <Upload className="w-10 h-10 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">No active case</h2>
          <p className="text-muted-foreground max-w-md">Load a dataset to view metrics.</p>
        </div>
        <Link href="/upload">
          <Button size="lg" data-testid="btn-go-upload">Ingest Data</Button>
        </Link>
      </div>
    );
  }

  const getSeverityColor = (val: number, threshold: number) => {
    if (val > threshold * 2) return "text-destructive";
    if (val > threshold) return "text-accent";
    return "text-primary";
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Bias Metrics Engine</h1>
        <p className="text-muted-foreground">Statistical breakdown of disparities across protected attributes.</p>
      </div>

      {metrics.map((metric) => {
        const chartData = Object.entries(metric.subgroupRates).map(([group, data]) => ({
          name: group,
          rate: data.approvalRate * 100,
          count: data.count
        })).sort((a, b) => b.rate - a.rate);

        const avgRate = chartData.reduce((acc, curr) => acc + curr.rate, 0) / chartData.length;

        return (
          <Card key={metric.attribute} className="overflow-hidden border-t-4" style={{ borderTopColor: metric.demographicParityDifference > 0.1 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))' }}>
            <CardHeader className="bg-secondary/20 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="capitalize text-xl mb-1">{metric.attribute}</CardTitle>
                  <CardDescription>Approval rates across {metric.attribute} subgroups.</CardDescription>
                </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-1">DP Diff</div>
                    <div className={`text-xl font-bold font-mono ${getSeverityColor(metric.demographicParityDifference, 0.05)}`}>
                      {(metric.demographicParityDifference * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-right border-l border-border pl-4">
                    <div className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-1">EO Diff</div>
                    <div className={`text-xl font-bold font-mono ${getSeverityColor(metric.equalizedOddsDifference, 0.05)}`}>
                      {(metric.equalizedOddsDifference * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(val) => `${val}%`}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.4 }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(val: number) => [`${val.toFixed(1)}%`, 'Approval Rate']}
                    />
                    <ReferenceLine y={avgRate} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                    <Bar 
                      dataKey="rate" 
                      radius={[4, 4, 0, 0]}
                      fill="hsl(var(--primary))"
                      activeBar={{ fill: 'hsl(var(--accent))' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-6 pt-6 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-4">
                {chartData.map((d) => (
                  <div key={d.name} className="bg-secondary/30 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">{d.name}</div>
                    <div className="flex items-end justify-between">
                      <span className="font-mono font-medium">{d.rate.toFixed(1)}%</span>
                      <span className="text-xs text-muted-foreground">n={d.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </motion.div>
  );
}