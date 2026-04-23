import { useFairLensStore } from "@/lib/store";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, Search, MapPin, AlertCircle, ArrowRight } from "lucide-react";
import { useState, useMemo } from "react";
import { computeShap } from "@/lib/shap";
import { getSocioContext } from "@/lib/socioContext";
import { motion, AnimatePresence } from "framer-motion";

export default function Archaeology() {
  const [, setLocation] = useLocation();
  const { dataset, selectedRecordId, setSelectedRecordId } = useFairLensStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  const filteredDataset = useMemo(() => {
    if (!dataset) return [];
    if (!searchTerm) return dataset.slice(0, 50);
    return dataset.filter(r => 
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 50);
  }, [dataset, searchTerm]);

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

  const shapContributions = useMemo(() => {
    if (!selectedRecord) return [];
    return computeShap(selectedRecord, datasetAvg);
  }, [selectedRecord, datasetAvg]);

  if (!dataset) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
          <Upload className="w-10 h-10 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">No active case</h2>
          <p className="text-muted-foreground max-w-md">Load a dataset to investigate specific decisions.</p>
        </div>
        <Link href="/upload">
          <Button size="lg" data-testid="btn-go-upload">Ingest Data</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 pb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Decision Archaeology</h1>
        <p className="text-muted-foreground">Inspect individual model decisions and contextual feature attributions.</p>
      </div>

      <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
        {/* Record List */}
        <Card className="w-80 flex flex-col shrink-0 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by ID or Name..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-record"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredDataset.map((record) => (
              <div 
                key={record.id}
                onClick={() => {
                  setSelectedRecordId(record.id);
                  setExpandedFeature(null);
                }}
                className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                  selectedRecordId === record.id 
                    ? "bg-primary/10 border-primary/20" 
                    : "bg-card border-transparent hover:border-border hover:bg-secondary/50"
                }`}
                data-testid={`record-${record.id}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm">{record.id}</span>
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${
                    record.prediction === 'Approved' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'
                  }`}>
                    {record.prediction}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground truncate">{record.name}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Record Detail */}
        <div className="flex-1 overflow-y-auto bg-card rounded-xl border border-border shadow-sm">
          {selectedRecord ? (
            <div className="p-8">
              <div className="flex justify-between items-start mb-8 pb-6 border-b border-border">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{selectedRecord.id}</h2>
                  <p className="text-muted-foreground">{selectedRecord.name} • {selectedRecord.age}yo {selectedRecord.gender} • {selectedRecord.race}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-widest">Model Decision</div>
                  <div className={`text-2xl font-bold ${selectedRecord.prediction === 'Approved' ? 'text-primary' : 'text-destructive'}`}>
                    {selectedRecord.prediction}
                  </div>
                  <div className="text-sm font-mono mt-1 text-muted-foreground">
                    Confidence: {(selectedRecord.prediction_proba * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Feature Attributions</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation("/counterfactual")}
                  className="gap-2"
                >
                  <ArrowRight className="w-4 h-4" /> Open in Counterfactual Sandbox
                </Button>
              </div>

              <div className="space-y-4 relative">
                {/* Zero line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border z-0" />
                
                {shapContributions.map((shap, index) => {
                  const isPositive = shap.contribution > 0;
                  const isContextual = shap.feature === 'zipcode' || shap.feature === 'gender';
                  const width = Math.min(100, Math.abs(shap.contribution) * 400); // Scale for viz
                  const isExpanded = expandedFeature === shap.feature;
                  
                  return (
                    <motion.div 
                      key={shap.feature}
                      initial={{ opacity: 0, x: isPositive ? -20 : 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative z-10"
                    >
                      <div 
                        className={`flex items-center gap-4 group cursor-pointer p-2 -mx-2 rounded-md transition-colors ${
                          isExpanded ? 'bg-secondary/50' : 'hover:bg-secondary/30'
                        }`}
                        onClick={() => isContextual ? setExpandedFeature(isExpanded ? null : shap.feature) : null}
                      >
                        {/* Label Left */}
                        <div className="w-[calc(50%-1rem)] text-right flex flex-col items-end justify-center">
                          <span className="font-medium text-sm capitalize">{String(shap.feature).replace('_', ' ')}</span>
                          <span className="text-xs text-muted-foreground font-mono">{String(shap.value)}</span>
                        </div>

                        {/* Bar Center */}
                        <div className="w-8 flex justify-center">
                          {isContextual && <AlertCircle className={`w-4 h-4 ${isExpanded ? 'text-primary' : 'text-muted-foreground opacity-50 group-hover:opacity-100'}`} />}
                        </div>

                        {/* Right Area (Bar container) */}
                        <div className="w-[calc(50%-1rem)] relative h-8 flex items-center">
                          <div 
                            className={`h-4 rounded-sm ${isPositive ? 'bg-primary' : 'bg-destructive'} absolute`}
                            style={{ 
                              width: `${Math.max(1, width)}%`,
                              [isPositive ? 'left' : 'right']: isPositive ? 0 : '100%',
                              transform: isPositive ? 'none' : 'translateX(100%)'
                            }}
                          />
                        </div>
                      </div>

                      {/* Expandable Context */}
                      <AnimatePresence>
                        {isExpanded && isContextual && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-[50%] pl-6 pr-4 py-4 mt-2 border-l-2 border-primary bg-primary/5 rounded-r-lg mb-4">
                              {shap.feature === 'zipcode' ? (() => {
                                const ctx = getSocioContext(String(shap.value));
                                return ctx ? (
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 font-semibold text-primary">
                                      <MapPin className="w-4 h-4" /> Regional Context mapping
                                    </div>
                                    <p className="text-muted-foreground">{ctx.note}</p>
                                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-primary/20">
                                      <div>
                                        <div className="text-xs uppercase text-primary/70 mb-1">Race Correlation</div>
                                        <div className="font-mono font-medium">{(ctx.race_correlation * 100).toFixed(1)}%</div>
                                      </div>
                                      <div>
                                        <div className="text-xs uppercase text-primary/70 mb-1">Median Income</div>
                                        <div className="font-mono font-medium">${ctx.median_income.toLocaleString()}</div>
                                      </div>
                                    </div>
                                  </div>
                                ) : <div className="text-sm text-muted-foreground">No specific context mapped for this zipcode.</div>;
                              })() : (
                                <div className="space-y-2 text-sm">
                                  <p className="text-muted-foreground">Gender acts directly as a penalty/boost in this model segment, indicating potential disparate treatment independent of creditworthiness.</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Search className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a record from the list to inspect.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}