import { useState } from "react";
import { useFairLensStore } from "@/lib/store";
import { generateSampleData } from "@/lib/sampleData";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UploadCloud, CheckCircle2, Loader2, Database } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STAGES = [
  "Detecting protected attributes...",
  "Computing parity metrics...",
  "Estimating SHAP attributions...",
  "Mapping socioeconomic context...",
  "Calculating Harm Probability Score..."
];

export default function Upload() {
  const [, setLocation] = useLocation();
  const { setDataset } = useFairLensStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState(0);

  const handleLoadSample = () => {
    setIsProcessing(true);
    setStage(0);

    // Fake the processing stages
    let currentStage = 0;
    const interval = setInterval(() => {
      currentStage++;
      if (currentStage < STAGES.length) {
        setStage(currentStage);
      } else {
        clearInterval(interval);
        const data = generateSampleData(400);
        setDataset(data);
        setIsProcessing(false);
        setLocation("/");
      }
    }, 400); // 400ms per stage = ~2s total
  };

  return (
    <div className="h-full flex items-center justify-center max-w-2xl mx-auto w-full">
      <Card className="w-full shadow-lg border-primary/10">
        <CardHeader className="text-center pb-8 pt-10">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
            <Database className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Data Ingestion</CardTitle>
          <CardDescription className="text-base mt-2">
            Upload your model predictions and features to begin the forensic audit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-10 px-10">
          <div className="border-2 border-dashed border-border rounded-xl p-12 text-center bg-secondary/30 transition-colors hover:bg-secondary/50">
            <UploadCloud className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">Drag and drop CSV</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Must include features, predicted classes, and probabilities.
            </p>
            <Button variant="secondary" disabled>Browse Files</Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-medium">Or</span>
            </div>
          </div>

          {!isProcessing ? (
            <Button 
              className="w-full h-14 text-base" 
              onClick={handleLoadSample}
              data-testid="btn-load-sample"
            >
              Use Sample Loan-Approval Dataset
            </Button>
          ) : (
            <div className="bg-secondary/50 rounded-xl p-6 space-y-4">
              <div className="flex justify-between text-sm font-medium mb-2">
                <span>Processing Case File...</span>
                <span>{Math.round(((stage) / STAGES.length) * 100)}%</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <div className="space-y-2 mt-4">
                <AnimatePresence mode="popLayout">
                  {STAGES.map((s, i) => (
                    i <= stage && (
                      <motion.div
                        key={s}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: i === stage ? 1 : 0.5, x: 0 }}
                        className="flex items-center gap-2 text-sm"
                      >
                        {i < stage ? (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        ) : (
                          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                        )}
                        <span className={i === stage ? "text-foreground font-medium" : "text-muted-foreground"}>
                          {s}
                        </span>
                      </motion.div>
                    )
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}