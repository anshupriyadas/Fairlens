import { useFairLensStore } from "@/lib/store";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, Download, AlertTriangle, ShieldCheck, CheckCircle2, Sliders } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRemediations } from "@/lib/remediation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DomainType } from "@/lib/types";

export default function Risk() {
  const { dataset, hpsResult, flags, report, hpsWeights, hpsDomain, setHpsConfig } = useFairLensStore();
  const [gaugeValue, setGaugeValue] = useState(0);

  useEffect(() => {
    if (hpsResult) {
      const timer = setTimeout(() => {
        setGaugeValue(hpsResult.score);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [hpsResult]);

  if (!dataset || !hpsResult || !report) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
          <Upload className="w-10 h-10 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">No active case</h2>
          <p className="text-muted-foreground max-w-md">Load a dataset to generate a risk report.</p>
        </div>
        <Link href="/upload">
          <Button size="lg" data-testid="btn-go-upload">Ingest Data</Button>
        </Link>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const getRiskColor = (level: string) => {
    if (level === 'Critical') return 'text-destructive';
    if (level === 'High') return 'text-accent';
    if (level === 'Medium') return 'text-primary';
    return 'text-green-500';
  };

  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (gaugeValue / 100) * circumference;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-12 print:bg-white print:text-black">
      <div className="flex justify-between items-start print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Compliance Risk Report</h1>
          <p className="text-muted-foreground">Executive summary and formal regulatory findings.</p>
        </div>
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Download PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Gauge Card */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-t-4 print:break-inside-avoid" style={{ borderTopColor: 'var(--color-destructive)' }}>
            <CardHeader className="text-center pb-0">
              <CardTitle className="text-lg text-muted-foreground font-medium uppercase tracking-widest">Harm Probability</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-6">
              <div className="relative w-64 h-64 flex items-center justify-center">
                {/* SVG Gauge */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 256 256">
                  <circle 
                    cx="128" cy="128" r="120" 
                    fill="none" stroke="currentColor" strokeWidth="12" 
                    className="text-secondary" 
                  />
                  <motion.circle 
                    cx="128" cy="128" r="120" 
                    fill="none" stroke="currentColor" strokeWidth="12" 
                    className={getRiskColor(hpsResult.riskLevel)}
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-6xl font-bold tracking-tighter">{gaugeValue}</span>
                  <span className={`text-lg font-semibold uppercase mt-2 ${getRiskColor(hpsResult.riskLevel)}`}>
                    {hpsResult.riskLevel} RISK
                  </span>
                </div>
              </div>
              
              <div className="mt-8 w-full space-y-3">
                <div className="text-sm font-medium mb-2 border-b border-border pb-2">Score Composition</div>
                <div className="h-6 w-full rounded-full flex overflow-hidden">
                   <div className="bg-destructive" style={{width: `${(hpsResult.breakdown.disparity * hpsWeights.disparity / 0.4) * 100}%`}} title="Disparity" />
                   <div className="bg-accent" style={{width: `${(hpsResult.breakdown.proxyStrength * hpsWeights.proxyStrength / 0.3) * 100}%`}} title="Proxy Strength" />
                   <div className="bg-primary" style={{width: `${(hpsResult.breakdown.domainWeight * hpsWeights.domainWeight / 0.3) * 100}%`}} title="Domain" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                   <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Disparity</span>
                   <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" /> Proxy</span>
                   <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Domain</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="print:hidden">
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 font-semibold hover:bg-secondary/50 transition-colors">
                <span className="flex items-center gap-2"><Sliders className="w-4 h-4" /> Weight Tuning (HPS 2.0)</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="p-4 pt-0 space-y-4 border-t border-border">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Domain</span>
                  </div>
                  <Select value={hpsDomain} onValueChange={(v) => setHpsConfig(hpsWeights, v as DomainType)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Loan">Loan Origination</SelectItem>
                      <SelectItem value="Hiring">Hiring / HR</SelectItem>
                      <SelectItem value="Recommendations">Content Recommendations</SelectItem>
                      <SelectItem value="Healthcare">Healthcare Triage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Disparity Weight</span>
                    <span className="font-mono">{hpsWeights.disparity.toFixed(1)}</span>
                  </div>
                  <Slider min={0} max={1} step={0.1} value={[hpsWeights.disparity]} onValueChange={(v) => setHpsConfig({...hpsWeights, disparity: v[0]}, hpsDomain)} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Proxy Strength Weight</span>
                    <span className="font-mono">{hpsWeights.proxyStrength.toFixed(1)}</span>
                  </div>
                  <Slider min={0} max={1} step={0.1} value={[hpsWeights.proxyStrength]} onValueChange={(v) => setHpsConfig({...hpsWeights, proxyStrength: v[0]}, hpsDomain)} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Domain Impact Weight</span>
                    <span className="font-mono">{hpsWeights.domainWeight.toFixed(1)}</span>
                  </div>
                  <Slider min={0} max={1} step={0.1} value={[hpsWeights.domainWeight]} onValueChange={(v) => setHpsConfig({...hpsWeights, domainWeight: v[0]}, hpsDomain)} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </div>

        {/* Exec Summary */}
        <div className="md:col-span-2 space-y-8">
          <Card className="print:break-inside-avoid shadow-none border-border">
            <CardHeader className="bg-secondary/20 pb-4">
              <CardTitle className="text-xl">Executive Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">TL;DR</h4>
                <p className="text-foreground leading-relaxed">{report.tldr}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Key Findings</h4>
                <ul className="space-y-3">
                  {report.keyRisks.map((risk, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Business Impact</h4>
                <p className="text-sm text-foreground bg-destructive/5 text-destructive border border-destructive/20 p-4 rounded-md leading-relaxed font-medium">
                  {report.businessImpact}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Regulatory Flags */}
          <div className="space-y-4 print:break-inside-avoid">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Formal Regulatory Citations
            </h3>
            {flags.length > 0 ? (
              flags.map(flag => (
                <Card key={flag.id} className="border-l-4" style={{ borderLeftColor: flag.severity === 'Critical' ? 'hsl(var(--destructive))' : 'hsl(var(--accent))' }}>
                  <CardContent className="p-4 flex gap-4">
                    <div className="mt-1">
                      <AlertTriangle className={`w-5 h-5 ${flag.severity === 'Critical' ? 'text-destructive' : 'text-accent'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{flag.title}</div>
                      <div className="text-xs font-mono text-muted-foreground mt-1 mb-2 bg-secondary inline-block px-2 py-0.5 rounded">{flag.citation}</div>
                      <p className="text-sm text-muted-foreground mb-4">{flag.explanation}</p>
                      
                      <Collapsible className="mt-2 border border-border rounded-md bg-secondary/10">
                        <CollapsibleTrigger className="w-full text-left p-3 text-sm font-medium hover:bg-secondary/30 flex justify-between items-center">
                          <span>Suggested Remediations</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="p-3 pt-0 border-t border-border space-y-3">
                          {getRemediations(flag.id).map((rem, i) => (
                            <div key={i} className="text-sm">
                              <span className="font-semibold block text-primary">{rem.title}</span>
                              <span className="text-muted-foreground">{rem.description}</span>
                            </div>
                          ))}
                          <div className="pt-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full">What would fix this?</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Playbook: {flag.title}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                  <p className="text-sm text-muted-foreground">Follow these steps to remediate the cited violation:</p>
                                  <ol className="list-decimal pl-5 space-y-3 text-sm">
                                    <li>Pause automated decisioning for the affected segment.</li>
                                    <li>Review feature attributions in the Archaeology tab to isolate the proxy variable.</li>
                                    <li>Use the Counterfactual Sandbox to determine minimal viable flips.</li>
                                    <li>Apply post-hoc threshold recalibration (Option A) or retrain excluding the proxy (Option B).</li>
                                    <li>Document the changes and rerun the Risk Report to verify compliance.</li>
                                  </ol>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-border border-dashed">
                <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mb-4 opacity-50" />
                  <p className="text-muted-foreground font-medium">No critical regulatory violations cited.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}