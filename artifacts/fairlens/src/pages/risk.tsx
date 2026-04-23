import { useFairLensStore } from "@/lib/store";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, Download, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Risk() {
  const { dataset, hpsResult, flags, report } = useFairLensStore();
  const [gaugeValue, setGaugeValue] = useState(0);

  useEffect(() => {
    if (hpsResult) {
      const timer = setTimeout(() => {
        setGaugeValue(hpsResult.score);
      }, 300);
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
        <Card className="md:col-span-1 border-t-4 print:break-inside-avoid" style={{ borderTopColor: 'var(--color-destructive)' }}>
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
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
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
              <div className="text-sm font-medium mb-2 border-b border-border pb-2">Formula Breakdown</div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Max Disparity (40%)</span>
                <span className="font-mono">{(hpsResult.breakdown.disparity * 100).toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Proxy Strength (30%)</span>
                <span className="font-mono">{(hpsResult.breakdown.proxyStrength * 100).toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Domain Weight (30%)</span>
                <span className="font-mono">{(hpsResult.breakdown.domainWeight * 100).toFixed(1)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

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

              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Suggested Remediation</h4>
                <ul className="space-y-2">
                  {report.suggestedFixes.map((fix, i) => (
                    <li key={i} className="flex gap-3 text-sm items-start">
                      <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="leading-relaxed text-muted-foreground">{fix}</span>
                    </li>
                  ))}
                </ul>
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
                    <div>
                      <div className="font-semibold">{flag.title}</div>
                      <div className="text-xs font-mono text-muted-foreground mt-1 mb-2 bg-secondary inline-block px-2 py-0.5 rounded">{flag.citation}</div>
                      <p className="text-sm text-muted-foreground">{flag.explanation}</p>
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