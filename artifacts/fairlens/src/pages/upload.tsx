import { useState, useRef } from "react";
import { useFairLensStore } from "@/lib/store";
import { generateSampleData } from "@/lib/sampleData";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UploadCloud, CheckCircle2, Loader2, Database, ShieldAlert, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { runPipeline } from "@/lib/pipeline";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { parseCsv, readFileAsText, CsvParseError } from "@/lib/csvParser";
import { LoanRecord } from "@/lib/types";

const STAGES = [
  { id: "validate", label: "Validating Input" },
  { id: "detect", label: "Detecting Protected Attributes" },
  { id: "preScan", label: "Pre-Scanning for Risk" },
  { id: "disparity", label: "Computing Parity Metrics" },
  { id: "decision", label: "Evaluating Decision Node" },
  { id: "archaeology", label: "Mapping Context & Archaeology" },
  { id: "counterfactual", label: "Generating Counterfactuals" },
  { id: "hps", label: "Calculating Harm Probability Score" },
  { id: "regulatory", label: "Checking Regulatory Flags" },
  { id: "done", label: "Analysis Complete" }
];

export default function Upload() {
  const [, setLocation] = useLocation();
  const { setDataset, setPipelineResult, setDetectedAttrs, detectedAttrs, toggleAttribute, runFullAnalysisOverride } = useFairLensStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStageId, setCurrentStageId] = useState("");
  const [pipelineFinished, setPipelineFinished] = useState(false);
  const [localDataset, setLocalDataset] = useState<any[]>([]);
  const [showCompleteOverlay, setShowCompleteOverlay] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runDatasetThroughPipeline = async (data: LoanRecord[]) => {
    setLocalDataset(data);
    const result = await runPipeline(data, {
      onProgress: (stage) => setCurrentStageId(stage),
    });
    setPipelineResult(result);
    if (result.stages.detect.attributes) {
      setDetectedAttrs(result.stages.detect.attributes);
    }
    if (result.fastPass) {
      setPipelineFinished(true);
    } else {
      setDataset(data);
      setShowCompleteOverlay(true);
      setTimeout(() => setLocation("/"), 1000);
    }
  };

  const handleLoadSample = async () => {
    setIsProcessing(true);
    setPipelineFinished(false);
    try {
      const data = generateSampleData(400);
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Sample dataset failed to generate.");
      }
      await runDatasetThroughPipeline(data);
    } catch (err: any) {
      console.error("Pipeline failed:", err);
      toast.error("Analysis failed", {
        description: err?.message || "An unexpected error occurred while running the pipeline."
      });
      setIsProcessing(false);
      setPipelineFinished(false);
      setShowCompleteOverlay(false);
      setCurrentStageId("");
    }
  };

  const handleFile = async (file: File) => {
    if (!file) return;

    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "csv" && file.type !== "text/csv" && file.type !== "application/vnd.ms-excel") {
      toast.error("Unsupported file type", {
        description: `Please upload a .csv file. Got: ${file.name}`,
      });
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Maximum supported size is 25 MB. Please sample your dataset first.",
      });
      return;
    }

    setIsProcessing(true);
    setPipelineFinished(false);
    setCurrentStageId("");

    try {
      const text = await readFileAsText(file);
      const { records, warnings } = parseCsv(text);

      toast.success(`Parsed ${records.length} rows from ${file.name}`, {
        description: warnings.length > 0 ? warnings[0] : `${records.length} records ready for analysis.`,
      });
      warnings.slice(1).forEach(w => toast.warning(w));

      await runDatasetThroughPipeline(records);
    } catch (err: any) {
      console.error("CSV upload failed:", err);
      const isParse = err instanceof CsvParseError;
      toast.error(isParse ? "Could not parse CSV" : "Upload failed", {
        description: err?.message || "Unexpected error reading the file.",
      });
      setIsProcessing(false);
      setPipelineFinished(false);
      setShowCompleteOverlay(false);
      setCurrentStageId("");
    }
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isProcessing) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleOverride = () => {
    runFullAnalysisOverride(localDataset);
    setLocation("/");
  };

  const currentIndex = STAGES.findIndex(s => s.id === currentStageId);

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
          {!isProcessing && !pipelineFinished ? (
            <>
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary/30 hover:bg-secondary/50"
                }`}
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleBrowse}
                data-testid="dropzone-csv"
              >
                <UploadCloud className={`w-10 h-10 mx-auto mb-4 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                <h3 className="font-semibold text-lg mb-1">
                  {isDragging ? "Drop to upload" : "Drag and drop CSV"}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Must include a <code className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">prediction</code> column. Other fields auto-detected.
                </p>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleBrowse(); }}
                  data-testid="btn-browse-files"
                >
                  Browse Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileInputChange}
                  data-testid="input-csv-file"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-medium">Or</span>
                </div>
              </div>

              <Button 
                className="w-full h-14 text-base" 
                onClick={handleLoadSample}
                data-testid="btn-load-sample"
              >
                Use Sample Loan-Approval Dataset
              </Button>
            </>
          ) : pipelineFinished ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 text-center" data-testid="fast-pass-card">
                <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-primary mb-2">Low Bias Risk — Fast Pass</h2>
                <p className="text-muted-foreground mb-4">
                  Initial scans show minimal disparities across detected protected attributes. Detailed disparity analysis has been skipped.
                </p>
                <div className="flex justify-center gap-4 text-sm font-medium mb-6">
                  <span className="bg-primary/20 text-primary px-3 py-1 rounded-full">Confidence: 95%</span>
                  <span className="bg-secondary px-3 py-1 rounded-full">Records: {localDataset.length}</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold">Detected Protected Attributes</h3>
                <div className="space-y-3">
                  {detectedAttrs.map(attr => (
                    <div key={attr.column} className="flex items-center justify-between bg-secondary/30 p-3 rounded-lg border border-border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{attr.column}</span>
                          <span className="text-xs text-muted-foreground uppercase">{attr.type}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{attr.reason}</div>
                        <div className="mt-2 h-1.5 w-full bg-secondary rounded-full overflow-hidden max-w-xs">
                          <div className="h-full bg-primary" style={{ width: `${attr.confidence * 100}%` }} />
                        </div>
                      </div>
                      <Switch 
                        checked={attr.enabled} 
                        onCheckedChange={() => toggleAttribute(attr.column)} 
                      />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full border-dashed" disabled>+ Add manual attribute</Button>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => { setIsProcessing(false); setPipelineFinished(false); }}>Cancel</Button>
                <Button className="flex-1" onClick={handleOverride} data-testid="btn-run-full-analysis">Run full analysis anyway</Button>
              </div>
            </motion.div>
          ) : (
            <div className="bg-secondary/50 rounded-xl p-6 space-y-4" data-testid="pipeline-stepper">
              <div className="flex justify-between text-sm font-medium mb-2">
                <span>Running Pipeline...</span>
                <span>{Math.round((Math.max(0, currentIndex) / (STAGES.length - 1)) * 100)}%</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${(Math.max(0, currentIndex) / (STAGES.length - 1)) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <div className="space-y-2 mt-4">
                <AnimatePresence mode="popLayout">
                  {STAGES.map((s, i) => (
                    i <= currentIndex && s.id !== 'done' && (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: i === currentIndex ? 1 : 0.5, x: 0 }}
                        className="flex items-center gap-2 text-sm"
                      >
                        {i < currentIndex ? (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        ) : (
                          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                        )}
                        <span className={i === currentIndex ? "text-foreground font-medium" : "text-muted-foreground"}>
                          {s.label}
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
      
      <AnimatePresence>
        {showCompleteOverlay && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card border border-border p-8 rounded-2xl shadow-2xl text-center space-y-4"
            >
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto text-primary">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Analysis Complete</h3>
                <p className="text-muted-foreground">Opening dashboard...</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}