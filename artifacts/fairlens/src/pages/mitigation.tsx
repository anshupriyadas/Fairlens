import { useState, useMemo } from "react";
import { useFairLensStore } from "@/lib/store";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wand2, Upload, ArrowRight, Info, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { simulateMitigation, MitigationStrategy, MitigationResult } from "@/lib/mitigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const STRATEGIES: { id: MitigationStrategy; title: string; description: string }[] = [
  {
    id: "reweight",
    title: "Subgroup Reweighting",
    description: "Apply sample weights to balance subgroup representation during training."
  },
  {
    id: "drop_proxy",
    title: "Proxy Feature Removal",
    description: "Remove features that act as proxies for protected attributes (e.g., Zipcode)."
  },
  {
    id: "threshold_calibration",
    title: "Threshold Calibration",
    description: "Adjust decision thresholds per-subgroup to equalize outcomes post-hoc."
  },
  {
    id: "fairness_constraint",
    title: "Fairness Constraints",
    description: "Incorporate fairness penalties directly into the model's loss function."
  }
];

export default function MitigationStudio() {
  const { dataset, metrics, hpsResult, pipelineResult } = useFairLensStore();
  const [selectedStrategy, setSelectedStrategy] = useState<MitigationStrategy | null>(null);
  const [simulationResult, setSimulationResult] = useState<MitigationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  if (!dataset || !pipelineResult) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
          <Upload className="w-10 h-10 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">No active case</h2>
          <p className="text-muted-foreground max-w-md">Load a dataset to explore mitigation strategies.</p>
        </div>
        <Link href="/upload">
          <Button size="lg">Ingest Data</Button>
        </Link>
      </div>
    );
  }

  const handleSimulate = () => {
    if (!selectedStrategy) return;
    setIsSimulating(true);
    setTimeout(() => {
      try {
        const res = simulateMitigation(dataset, metrics, selectedStrategy);
        setSimulationResult(res);
      } catch (err: any) {
        console.error("Mitigation simulation failed:", err);
        setSimulationResult(null);
      } finally {
        setIsSimulating(false);
      }
    }, 600);
  };

  const chartData = simulationResult ? metrics.map((m, i) => ({
    name: m.attribute,
    before: +(m.demographicParityDifference * 100).toFixed(1),
    after: +(simulationResult.newMetrics[i].demographicParityDifference * 100).toFixed(1)
  })) : [];

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Mitigation Studio</h1>
        <p className="text-muted-foreground">Simulate intervention strategies to reduce model bias and harm risk.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STRATEGIES.map((strategy) => (
          <Card 
            key={strategy.id} 
            className={`cursor-pointer transition-all hover:border-primary/50 ${selectedStrategy === strategy.id ? 'border-primary ring-1 ring-primary' : 'border-border'}`}
            onClick={() => setSelectedStrategy(strategy.id)}
          >
            <CardHeader className="p-4">
              <CardTitle className="text-base">{strategy.title}</CardTitle>
              <CardDescription className="text-xs">{strategy.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button 
          size="lg" 
          disabled={!selectedStrategy || isSimulating} 
          onClick={handleSimulate}
          className="gap-2 w-full md:w-auto min-w-[200px]"
        >
          {isSimulating ? "Processing..." : "Simulate Strategy"}
          <Wand2 className="w-4 h-4" />
        </Button>
      </div>

      <AnimatePresence>
        {simulationResult && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Demographic Parity Comparison</CardTitle>
                  <CardDescription>Before vs After mitigation (DP Diff %)</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" />
                      <YAxis unit="%" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      />
                      <Legend />
                      <Bar dataKey="before" fill="hsl(var(--muted-foreground))" name="Before" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="after" fill="hsl(var(--primary))" name="After" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="flex flex-col justify-center items-center text-center p-6">
                <div className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-widest">HPS Projection</div>
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-4xl font-bold text-muted-foreground line-through">{hpsResult?.score}</span>
                  <ArrowRight className="w-6 h-6 text-primary" />
                  <span className="text-6xl font-bold text-primary">{simulationResult.newHps}</span>
                </div>
                <Badge variant={simulationResult.newHps < 30 ? "default" : "outline"} className="mt-2">
                  {simulationResult.newHps < 30 ? "LOW RISK TARGET" : "IMPROVED"}
                </Badge>
                <div className="mt-8 w-full space-y-2 text-left">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Estimated Implementation Cost</div>
                  <div className="text-sm font-mono bg-secondary p-2 rounded border border-border">
                    {simulationResult.costEstimate}
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Metric Delta Table</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Attribute</TableHead>
                        <TableHead className="text-right">Original DP</TableHead>
                        <TableHead className="text-right">New DP</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.map((m, i) => {
                        const newM = simulationResult.newMetrics[i];
                        const diff = newM.demographicParityDifference - m.demographicParityDifference;
                        return (
                          <TableRow key={m.attribute}>
                            <TableCell className="capitalize font-medium">{m.attribute}</TableCell>
                            <TableCell className="text-right">{(m.demographicParityDifference * 100).toFixed(1)}%</TableCell>
                            <TableCell className="text-right">{(newM.demographicParityDifference * 100).toFixed(1)}%</TableCell>
                            <TableCell className={`text-right font-mono ${diff < 0 ? 'text-green-500' : 'text-destructive'}`}>
                              {(diff * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Info className="w-5 h-5 text-primary" />
                      Strategy Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{simulationResult.summary}</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      Potential Side Effects
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {simulationResult.sideEffects.map((effect, i) => (
                        <li key={i} className="text-sm flex gap-2 items-start text-muted-foreground">
                          <span className="text-amber-500 mt-1">•</span>
                          {effect}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-block">
                          <Button disabled variant="outline" className="gap-2">
                            Apply to Production
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Demo only — would dispatch to MLOps pipeline</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
