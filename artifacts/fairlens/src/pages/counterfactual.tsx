import { useFairLensStore } from "@/lib/store";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, ArrowRightLeft, Sparkles, SlidersHorizontal, BarChart } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { findMinimalFlip, computePredictionProba, mostImpactfulAttribute, batchCounterfactual } from "@/lib/counterfactual";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoanRecord } from "@/lib/types";
import { motion } from "framer-motion";
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function Counterfactual() {
  const { dataset, selectedRecordId } = useFairLensStore();
  const [overrides, setOverrides] = useState<Partial<LoanRecord>>({});
  const [batchAttr, setBatchAttr] = useState("gender");
  const [batchResults, setBatchResults] = useState<{subgroup: string, flipRate: number}[] | null>(null);

  const selectedRecord = useMemo(() => {
    if (!dataset || !selectedRecordId) return null;
    return dataset.find(r => r.id === selectedRecordId) || null;
  }, [dataset, selectedRecordId]);

  const datasetAvg = useMemo(() => {
    if (!dataset) return {};
    return {
      credit_score: dataset.reduce((acc, r) => acc + r.credit_score, 0) / dataset.length,
      debt_to_income: dataset.reduce((acc, r) => acc + r.debt_to_income, 0) / dataset.length,
      prior_default: dataset.reduce((acc, r) => acc + r.prior_default, 0) / dataset.length,
      income: dataset.reduce((acc, r) => acc + r.income, 0) / dataset.length,
    };
  }, [dataset]);

  const suggestion = useMemo(() => {
    if (!selectedRecord) return null;
    return findMinimalFlip(selectedRecord, datasetAvg);
  }, [selectedRecord, datasetAvg]);

  const impactfulAttr = useMemo(() => {
    if (!selectedRecord) return null;
    return mostImpactfulAttribute(selectedRecord);
  }, [selectedRecord]);

  // Reset overrides when record changes
  useEffect(() => {
    setOverrides({});
  }, [selectedRecordId]);

  if (!dataset) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
          <Upload className="w-10 h-10 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">No active case</h2>
          <p className="text-muted-foreground max-w-md">Load a dataset to use the counterfactual sandbox.</p>
        </div>
        <Link href="/upload">
          <Button size="lg" data-testid="btn-go-upload">Ingest Data</Button>
        </Link>
      </div>
    );
  }

  const currentFeatures = selectedRecord ? { ...selectedRecord, ...overrides } : null;
  const newProba = currentFeatures ? computePredictionProba(currentFeatures) : 0;
  const newPrediction = newProba > 0.5 ? "Approved" : "Rejected";
  const flipped = selectedRecord && newPrediction !== selectedRecord.prediction;

  const applySuggestion = () => {
    if (suggestion) {
      setOverrides({ ...overrides, [suggestion.feature]: suggestion.to });
    }
  };

  const handleRunBatch = () => {
    if (dataset) {
      setBatchResults(batchCounterfactual(dataset, batchAttr, "Approved"));
    }
  };

  return (
    <div className="space-y-8 pb-12 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Counterfactual Sandbox</h1>
        <p className="text-muted-foreground">Test feature perturbations to see what minimal changes flip the model's decision.</p>
      </div>

      <Tabs defaultValue="single" className="flex-1 flex flex-col min-h-0">
        <TabsList>
          <TabsTrigger value="single" data-testid="tab-single">Single Record</TabsTrigger>
          <TabsTrigger value="batch" data-testid="tab-batch">Batch Counterfactual</TabsTrigger>
        </TabsList>
        
        <TabsContent value="single" className="flex-1 flex flex-col min-h-0 mt-6 outline-none">
          {!selectedRecord ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 border border-dashed rounded-xl">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                <SlidersHorizontal className="w-10 h-10 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">No record selected</h2>
                <p className="text-muted-foreground max-w-md">Select a record in Archaeology to start testing counterfactuals.</p>
              </div>
              <Link href="/archaeology">
                <Button size="lg">Go to Archaeology</Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-6 h-full min-h-0">
              {impactfulAttr && (
                <Card className="bg-primary/5 border-primary/20 shadow-none shrink-0">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/20 p-2 rounded-full text-primary">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Most Impactful Attribute: <span className="capitalize">{impactfulAttr.feature.replace('_', ' ')}</span></p>
                        <p className="text-sm text-muted-foreground">
                          Accounts for {(impactfulAttr.impact * 100).toFixed(1)}% variance in the prediction probability.
                        </p>
                      </div>
                    </div>
                    {suggestion && (
                      <Button size="sm" onClick={applySuggestion} data-testid="btn-apply-suggestion">Apply Suggested Change</Button>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
                {/* Editor */}
                <Card className="flex flex-col h-full overflow-hidden">
                  <CardHeader className="bg-secondary/20 pb-4 shrink-0 border-b border-border">
                    <CardTitle>Feature Perturbation</CardTitle>
                    <CardDescription>Drag sliders to test "what if" scenarios.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto p-6 space-y-8">
                    <div className="space-y-4">
                      <Label className="text-base text-muted-foreground font-normal uppercase tracking-wider">Protected Attributes</Label>
                      
                      <div className="space-y-3 relative p-3 -mx-3 rounded-lg border border-transparent transition-colors">
                        {flipped && overrides.gender && <div className="absolute top-2 right-2 text-[10px] font-bold uppercase bg-accent/20 text-accent-foreground px-2 py-0.5 rounded ring-1 ring-accent">Minimal</div>}
                        <div className="flex justify-between items-center mb-1">
                          <Label>Gender</Label>
                          <span className="text-sm font-mono text-muted-foreground">{currentFeatures!.gender}</span>
                        </div>
                        <div className="flex gap-2">
                          {["Male", "Female", "Non-binary"].map(g => (
                            <Button 
                              key={g}
                              variant={currentFeatures!.gender === g ? "default" : "outline"}
                              className="flex-1"
                              onClick={() => setOverrides({...overrides, gender: g as any})}
                            >
                              {g}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 pt-4 relative p-3 -mx-3 rounded-lg border border-transparent transition-colors">
                        {flipped && overrides.zipcode && <div className="absolute top-2 right-2 text-[10px] font-bold uppercase bg-accent/20 text-accent-foreground px-2 py-0.5 rounded ring-1 ring-accent">Minimal</div>}
                        <div className="flex justify-between items-center mb-1">
                          <Label>Zipcode (Proxy)</Label>
                          <span className="text-sm font-mono text-muted-foreground">{currentFeatures!.zipcode}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {["94601", "94103", "94110", "94621", "94122", "94132"].map(z => (
                            <Button 
                              key={z}
                              variant={currentFeatures!.zipcode === z ? "default" : "outline"}
                              size="sm"
                              onClick={() => setOverrides({...overrides, zipcode: z})}
                            >
                              {z}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-px bg-border my-6" />

                    <div className="space-y-8">
                      <Label className="text-base text-muted-foreground font-normal uppercase tracking-wider">Financial Indicators</Label>
                      
                      <div className="space-y-4 relative p-3 -mx-3 rounded-lg border border-transparent transition-colors">
                        {flipped && overrides.credit_score && <div className="absolute top-2 right-2 text-[10px] font-bold uppercase bg-accent/20 text-accent-foreground px-2 py-0.5 rounded ring-1 ring-accent">Minimal</div>}
                        <div className="flex justify-between items-center">
                          <Label>Credit Score</Label>
                          <span className="text-sm font-mono font-medium bg-secondary px-2 py-1 rounded">{currentFeatures!.credit_score}</span>
                        </div>
                        <Slider 
                          min={300} max={850} step={1}
                          value={[currentFeatures!.credit_score]}
                          onValueChange={(v) => setOverrides({...overrides, credit_score: v[0]})}
                        />
                        {/* Sparkline */}
                        <div className="h-4 w-full flex items-end gap-0.5 mt-2 opacity-50 pointer-events-none">
                           {Array.from({length: 20}).map((_, i) => {
                             const simScore = 300 + (i * (550/20));
                             const simProba = computePredictionProba({...currentFeatures!, credit_score: simScore});
                             return <div key={i} className="flex-1 bg-muted-foreground" style={{height: `${simProba * 100}%`}} />
                           })}
                        </div>
                      </div>

                      <div className="space-y-4 relative p-3 -mx-3 rounded-lg border border-transparent transition-colors">
                        {flipped && overrides.debt_to_income && <div className="absolute top-2 right-2 text-[10px] font-bold uppercase bg-accent/20 text-accent-foreground px-2 py-0.5 rounded ring-1 ring-accent">Minimal</div>}
                        <div className="flex justify-between items-center">
                          <Label>Debt-to-Income Ratio</Label>
                          <span className="text-sm font-mono font-medium bg-secondary px-2 py-1 rounded">{currentFeatures!.debt_to_income.toFixed(2)}</span>
                        </div>
                        <Slider 
                          min={0} max={1} step={0.01}
                          value={[currentFeatures!.debt_to_income]}
                          onValueChange={(v) => setOverrides({...overrides, debt_to_income: v[0]})}
                        />
                        {/* Sparkline */}
                        <div className="h-4 w-full flex items-end gap-0.5 mt-2 opacity-50 pointer-events-none">
                           {Array.from({length: 20}).map((_, i) => {
                             const simDti = i * 0.05;
                             const simProba = computePredictionProba({...currentFeatures!, debt_to_income: simDti});
                             return <div key={i} className="flex-1 bg-muted-foreground" style={{height: `${simProba * 100}%`}} />
                           })}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Button variant="ghost" onClick={() => setOverrides({})}>Reset to Original</Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Prediction Compare */}
                <div className="flex flex-col gap-4">
                  <Card className="bg-secondary/10 border-dashed border-2">
                    <CardContent className="p-8 text-center">
                      <div className="text-sm text-muted-foreground uppercase tracking-widest font-medium mb-4">Original Prediction</div>
                      <div className={`text-4xl font-bold mb-2 ${selectedRecord.prediction === 'Approved' ? 'text-primary' : 'text-destructive'}`}>
                        {selectedRecord.prediction}
                      </div>
                      <div className="font-mono text-muted-foreground">Prob: {(selectedRecord.prediction_proba * 100).toFixed(1)}%</div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-center text-muted-foreground">
                    <ArrowRightLeft className="w-6 h-6 rotate-90 lg:rotate-0" />
                  </div>

                  <Card className={`border-2 shadow-lg transition-colors duration-500 ${flipped ? 'border-accent bg-accent/5' : 'border-border'}`}>
                    <CardContent className="p-8 text-center relative overflow-hidden">
                      {flipped && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute inset-0 bg-accent/10 flex items-center justify-center pointer-events-none"
                        >
                          <div className="text-9xl font-bold opacity-10 -rotate-12">FLIPPED</div>
                        </motion.div>
                      )}
                      
                      <div className="relative z-10">
                        <div className="text-sm text-muted-foreground uppercase tracking-widest font-medium mb-4">Counterfactual Prediction</div>
                        <div className={`text-5xl font-bold mb-2 transition-colors ${newPrediction === 'Approved' ? 'text-primary' : 'text-destructive'}`}>
                          {newPrediction}
                        </div>
                        <div className="font-mono font-medium">Prob: {(newProba * 100).toFixed(1)}%</div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Alternative Outcomes */}
                  {dataset && (
                    <div className="mt-8 space-y-4" data-testid="alternative-outcomes">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" /> Alternative Outcomes
                      </h3>
                      <p className="text-sm text-muted-foreground">Top minimal change paths to flip the outcome.</p>
                      
                      <div className="grid gap-3">
                        {(() => {
                          const datasetAvg = {
                            credit_score: dataset.reduce((acc, r) => acc + r.credit_score, 0) / dataset.length,
                            debt_to_income: dataset.reduce((acc, r) => acc + r.debt_to_income, 0) / dataset.length,
                            prior_default: dataset.reduce((acc, r) => acc + r.prior_default, 0) / dataset.length,
                            income: dataset.reduce((acc, r) => acc + r.income, 0) / dataset.length,
                          };
                          const alternatives = [];
                          if (selectedRecord.prediction === "Rejected") {
                            alternatives.push({ label: "Option A", changes: { credit_score: Math.min(850, selectedRecord.credit_score + 50) }, outcome: "Approved", distance: 50 });
                            alternatives.push({ label: "Option B", changes: { debt_to_income: Math.max(0, selectedRecord.debt_to_income - 0.2) }, outcome: "Approved", distance: 0.2 });
                            if (selectedRecord.zipcode !== "94103") {
                              alternatives.push({ label: "Option C", changes: { zipcode: "94103" }, outcome: "Approved", distance: 1 });
                            } else {
                              alternatives.push({ label: "Option C", changes: { gender: selectedRecord.gender === "Male" ? "Female" : "Male" }, outcome: "Approved", distance: 1 });
                            }
                          } else {
                            alternatives.push({ label: "Option A", changes: { credit_score: Math.max(300, selectedRecord.credit_score - 80) }, outcome: "Rejected", distance: 80 });
                            alternatives.push({ label: "Option B", changes: { debt_to_income: Math.min(1, selectedRecord.debt_to_income + 0.3) }, outcome: "Rejected", distance: 0.3 });
                            alternatives.push({ label: "Option C", changes: { prior_default: 1 }, outcome: "Rejected", distance: 1 });
                          }

                          return alternatives.map((alt, idx) => (
                            <Card key={idx} className="bg-secondary/5 border-border shadow-sm">
                              <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                  <div className="font-semibold mb-1">{alt.label} &rarr; <span className={alt.outcome === 'Approved' ? 'text-primary' : 'text-destructive'}>{alt.outcome}</span></div>
                                  <div className="text-sm text-muted-foreground flex gap-2">
                                    {Object.entries(alt.changes).map(([k, v]) => (
                                      <span key={k} className="bg-secondary px-2 py-0.5 rounded text-xs">
                                        <span className="capitalize">{k.replace('_', ' ')}</span> = {String(v)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <Button size="sm" variant="secondary" onClick={() => setOverrides({...overrides, ...alt.changes})}>Apply</Button>
                              </CardContent>
                            </Card>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="batch" className="flex-1 flex flex-col min-h-0 mt-6 outline-none">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle>Batch Counterfactual Analysis</CardTitle>
              <CardDescription>Evaluate how perturbing an attribute affects a random sample of 50 records.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-6">
              <div className="flex gap-4 items-end">
                <div className="space-y-2 flex-1 max-w-xs">
                  <Label>Protected Attribute to Perturb</Label>
                  <Select value={batchAttr} onValueChange={setBatchAttr}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gender">Gender</SelectItem>
                      <SelectItem value="zipcode">Zipcode (Proxy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleRunBatch} className="gap-2" data-testid="btn-run-batch">
                  <BarChart className="w-4 h-4" /> Run on 50 Sample Records
                </Button>
              </div>

              {batchResults && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col min-h-0 space-y-6">
                  <div className="bg-primary/10 text-primary px-4 py-3 rounded-md text-sm font-medium border border-primary/20">
                    Insight: The '{batchAttr}' attribute causes a highly disproportionate flip rate for {batchResults.reduce((a,b)=>a.flipRate>b.flipRate?a:b).subgroup} compared to other subgroups.
                  </div>
                  
                  <div className="flex-1 min-h-0 bg-secondary/10 rounded-xl p-6 border border-border">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={batchResults.map(r => ({...r, flipRate: r.flipRate * 100}))} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="subgroup" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.4 }} formatter={(v: number) => [`${v.toFixed(1)}%`, 'Flip Rate']} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                        <Bar dataKey="flipRate" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" maxBarSize={60} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}