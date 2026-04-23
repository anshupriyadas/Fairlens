import { useFairLensStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingUp } from "lucide-react";

export default function Executive() {
  const { dataset, hpsResult, report } = useFairLensStore();

  if (!dataset || !hpsResult || !report) {
    return <div className="p-8 text-center text-muted-foreground">No case loaded.</div>;
  }

  const getRiskColor = (level: string) => {
    if (level === 'Critical') return 'bg-destructive text-destructive-foreground';
    if (level === 'High') return 'bg-accent text-accent-foreground';
    if (level === 'Medium') return 'bg-primary text-primary-foreground';
    return 'bg-green-500 text-white';
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-8">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Executive Briefing</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          High-level overview of model fairness and business risk.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Overall Harm Probability</div>
          <div className="text-8xl font-bold mb-4">{hpsResult.score}</div>
          <div className={`px-6 py-2 rounded-full text-xl font-bold uppercase tracking-widest ${getRiskColor(hpsResult.riskLevel)}`}>
            {hpsResult.riskLevel} RISK
          </div>
        </Card>

        <div className="space-y-6 flex flex-col justify-center">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2 border-b pb-2">Bottom Line</h3>
            <p className="text-lg leading-relaxed">{report.tldr}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2 border-b pb-2">Business Impact</h3>
            <p className="text-lg leading-relaxed text-destructive">{report.businessImpact}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Key Findings</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {report.keyRisks.map((risk, i) => (
              <li key={i} className="flex gap-4 items-start text-lg">
                <AlertTriangle className="w-6 h-6 text-accent shrink-0 mt-1" />
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}