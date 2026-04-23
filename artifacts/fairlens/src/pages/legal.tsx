import { useFairLensStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export default function Legal() {
  const { dataset, flags, report } = useFairLensStore();

  if (!dataset) {
    return <div className="p-8 text-center text-muted-foreground">No case loaded.</div>;
  }

  return (
    <div className="space-y-8 print:bg-white print:text-black max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Legal & Compliance Audit</h1>
        <p className="text-muted-foreground">Formal breakdown of regulatory findings and suggested remediation.</p>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2 border-b pb-2">
          <AlertTriangle className="w-5 h-5" /> Cited Violations
        </h2>
        
        {flags.length > 0 ? (
          <div className="space-y-6">
            {flags.map((flag) => (
              <div key={flag.id} className="border border-border rounded-lg overflow-hidden break-inside-avoid">
                <div className={`p-4 border-b ${flag.severity === 'Critical' ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-accent/10 border-accent/20 text-accent-foreground'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{flag.title}</h3>
                      <div className="font-mono text-sm mt-1">{flag.citation}</div>
                    </div>
                    <span className="uppercase text-xs font-bold tracking-widest px-2 py-1 rounded bg-background/50 border border-current/20">
                      {flag.severity}
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">Details</div>
                    <p className="text-sm">{flag.explanation}</p>
                  </div>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">Recommended Action</div>
                    <p className="text-sm">Legal counsel advises immediate review of features leading to this citation to mitigate liability.</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4 opacity-50" />
              <p>No actionable compliance citations found.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">Summary Notes</h2>
        <div className="text-sm leading-relaxed space-y-4">
          <p>{report?.tldr}</p>
          <p>{report?.businessImpact}</p>
        </div>
      </div>
      
      <div className="pt-8 text-center">
        <button onClick={() => window.print()} className="text-sm text-primary hover:underline print:hidden">Print this report</button>
      </div>
    </div>
  );
}