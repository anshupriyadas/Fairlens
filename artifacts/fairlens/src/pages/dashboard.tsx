import { useFairLensStore } from "@/lib/store";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, ShieldAlert, FileText, Upload } from "lucide-react";

export default function Dashboard() {
  const { dataset, hpsResult, metrics, flags } = useFairLensStore();

  if (!dataset || !hpsResult) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
          <Upload className="w-10 h-10 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">No active case</h2>
          <p className="text-muted-foreground max-w-md">
            Load a dataset and model predictions to begin the forensic bias audit.
          </p>
        </div>
        <Link href="/upload">
          <Button size="lg" data-testid="btn-go-upload">Ingest Data</Button>
        </Link>
      </div>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Overview</h1>
        <p className="text-muted-foreground">Executive summary of model bias and compliance risks.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div variants={item} className="md:col-span-1">
          <Card className="h-full border-l-4" style={{ borderLeftColor: hpsResult.riskLevel === 'Critical' ? 'hsl(var(--destructive))' : hpsResult.riskLevel === 'High' ? 'hsl(var(--accent))' : 'hsl(var(--primary))' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Harm Probability Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tighter">{hpsResult.score}</span>
                <span className="text-xl text-muted-foreground">/ 100</span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  hpsResult.riskLevel === 'Critical' ? 'bg-destructive/20 text-destructive' :
                  hpsResult.riskLevel === 'High' ? 'bg-accent/20 text-accent-foreground' :
                  'bg-primary/20 text-primary'
                }`}>
                  {hpsResult.riskLevel.toUpperCase()} RISK
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="md:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                Regulatory Flags
              </CardTitle>
            </CardHeader>
            <CardContent>
              {flags.length > 0 ? (
                <div className="space-y-4">
                  {flags.slice(0, 2).map((flag) => (
                    <div key={flag.id} className="flex gap-4 items-start bg-secondary/50 p-3 rounded-md">
                      <div className="mt-0.5">
                        <div className={`w-2 h-2 rounded-full ${flag.severity === 'Critical' ? 'bg-destructive animate-pulse' : 'bg-accent'}`} />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{flag.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">{flag.citation}</div>
                      </div>
                    </div>
                  ))}
                  {flags.length > 2 && (
                    <Link href="/risk">
                      <Button variant="link" className="px-0 h-auto text-xs" data-testid="link-more-flags">
                        + {flags.length - 2} more flags in Risk Report →
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-md">
                  No critical regulatory violations detected.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top Line Disparities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {metrics.map((m, i) => (
                <div key={m.attribute} className={`pt-4 sm:pt-0 ${i !== 0 ? 'sm:pl-6' : ''}`}>
                  <div className="text-sm font-medium capitalize mb-2">{m.attribute}</div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Demographic Parity Diff</span>
                        <span className="font-mono">{(m.demographicParityDifference * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${m.demographicParityDifference > 0.1 ? 'bg-destructive' : 'bg-primary'}`}
                          style={{ width: `${Math.min(100, m.demographicParityDifference * 500)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Link href="/metrics">
                <Button variant="outline" size="sm" data-testid="btn-view-metrics">
                  View full metrics engine →
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}