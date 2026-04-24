import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { LoanRecord, BiasMetric, HpsResult, RegulatoryFlag, AnalysisReport, StreamAlert, DriftMode, ViewMode, HpsWeights, DomainType, PipelineResult, DetectedAttribute } from "./types";
import { computeAllMetrics } from "./biasMetrics";
import { computeHps, computeRegulatoryFlags, generateReport } from "./hps";
import { startStream } from "./streamSimulator";
import type { MitigationResult, MitigationStrategy } from "./mitigation";

interface AppliedMitigation {
  strategy: MitigationStrategy;
  strategyLabel: string;
  appliedAt: number;
  summary: string;
  costEstimate: string;
  sideEffects: string[];
  originalMetrics: BiasMetric[];
  originalHps: HpsResult | null;
  originalFlags: RegulatoryFlag[];
  originalReport: AnalysisReport | null;
}

interface FairLensState {
  dataset: LoanRecord[] | null;
  detectedProtectedAttrs: string[];
  metrics: BiasMetric[];
  hpsResult: HpsResult | null;
  flags: RegulatoryFlag[];
  report: AnalysisReport | null;
  selectedRecordId: string | null;
  
  pipelineResult: PipelineResult | null;
  detectedAttrs: DetectedAttribute[];
  analysisMode: 'fast' | 'full';

  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  
  streamEvents: LoanRecord[];
  isStreaming: boolean;
  driftMode: DriftMode;
  alerts: StreamAlert[];
  threshold: number;
  _stopStream: (() => void) | null;
  
  hpsWeights: HpsWeights;
  hpsDomain: DomainType;
  setHpsConfig: (weights: HpsWeights, domain: DomainType) => void;

  appliedMitigation: AppliedMitigation | null;
  applyMitigation: (strategy: MitigationStrategy, strategyLabel: string, result: MitigationResult) => void;
  resetMitigation: () => void;

  setDataset: (data: LoanRecord[]) => void;
  setSelectedRecordId: (id: string | null) => void;
  clearState: () => void;
  
  setPipelineResult: (result: PipelineResult | null) => void;
  toggleAttribute: (column: string) => void;
  setDetectedAttrs: (attrs: DetectedAttribute[]) => void;
  runFullAnalysisOverride: (dataset: LoanRecord[]) => void;

  startStream: () => void;
  stopStream: () => void;
  resetStream: () => void;
  setDriftMode: (mode: DriftMode) => void;
  setThreshold: (val: number) => void;
  pushAlert: (alert: StreamAlert) => void;
}

export const useFairLensStore = create<FairLensState>()(
  persist(
    (set, get) => ({
      dataset: null,
      detectedProtectedAttrs: ["gender", "race", "zipcode"],
      metrics: [],
      hpsResult: null,
      flags: [],
      report: null,
      selectedRecordId: null,
      
      pipelineResult: null,
      detectedAttrs: [],
      analysisMode: 'full',

      viewMode: "Technical",
      setViewMode: (mode) => set({ viewMode: mode }),

      streamEvents: [],
      isStreaming: false,
      driftMode: "none",
      alerts: [],
      threshold: 0.10,
      _stopStream: null,
      
      hpsWeights: { disparity: 0.4, proxyStrength: 0.3, domainWeight: 0.3 },
      hpsDomain: "Loan",

      appliedMitigation: null,

      applyMitigation: (strategy, strategyLabel, result) => {
        const { metrics, hpsResult, flags, report, dataset, hpsWeights, hpsDomain, appliedMitigation } = get();
        if (!dataset) return;

        const snapshot = appliedMitigation
          ? {
              originalMetrics: appliedMitigation.originalMetrics,
              originalHps: appliedMitigation.originalHps,
              originalFlags: appliedMitigation.originalFlags,
              originalReport: appliedMitigation.originalReport,
            }
          : {
              originalMetrics: metrics,
              originalHps: hpsResult,
              originalFlags: flags,
              originalReport: report,
            };

        const newHps = computeHps(result.newMetrics, dataset, hpsWeights, hpsDomain);
        const newFlags = computeRegulatoryFlags(result.newMetrics, newHps);
        const newReport = generateReport(result.newMetrics, newHps, newFlags);

        set({
          metrics: result.newMetrics,
          hpsResult: newHps,
          flags: newFlags,
          report: newReport,
          appliedMitigation: {
            strategy,
            strategyLabel,
            appliedAt: Date.now(),
            summary: result.summary,
            costEstimate: result.costEstimate,
            sideEffects: result.sideEffects,
            ...snapshot,
          },
        });
      },

      resetMitigation: () => {
        const { appliedMitigation } = get();
        if (!appliedMitigation) return;
        set({
          metrics: appliedMitigation.originalMetrics,
          hpsResult: appliedMitigation.originalHps,
          flags: appliedMitigation.originalFlags,
          report: appliedMitigation.originalReport,
          appliedMitigation: null,
        });
      },

      setHpsConfig: (weights, domain) => {
        set({ hpsWeights: weights, hpsDomain: domain });
        const { dataset, metrics } = get();
        if (dataset && metrics.length > 0) {
          const hps = computeHps(metrics, dataset, weights, domain);
          const flags = computeRegulatoryFlags(metrics, hps);
          const report = generateReport(metrics, hps, flags);
          set({ hpsResult: hps, flags, report });
        }
      },

      setDataset: (data) => {
        const { hpsWeights, hpsDomain, detectedProtectedAttrs } = get();
        const attrs = detectedProtectedAttrs.length > 0 ? detectedProtectedAttrs : ["gender", "race", "zipcode"];
        const metrics = computeAllMetrics(data, attrs);
        const hps = computeHps(metrics, data, hpsWeights, hpsDomain);
        const flags = computeRegulatoryFlags(metrics, hps);
        const report = generateReport(metrics, hps, flags);
        
        set({
          dataset: data,
          detectedProtectedAttrs: attrs,
          metrics,
          hpsResult: hps,
          flags,
          report,
        });
      },

      setPipelineResult: (result) => set({ pipelineResult: result }),
      
      toggleAttribute: (column) => {
        const { detectedAttrs } = get();
        const newAttrs = detectedAttrs.map(a => a.column === column ? { ...a, enabled: !a.enabled } : a);
        set({ detectedAttrs: newAttrs, detectedProtectedAttrs: newAttrs.filter(a => a.enabled).map(a => a.column) });
      },

      setDetectedAttrs: (attrs) => set({ detectedAttrs: attrs, detectedProtectedAttrs: attrs.filter(a => a.enabled).map(a => a.column) }),

      runFullAnalysisOverride: (dataset) => {
        set({ analysisMode: 'full' });
        get().setDataset(dataset);
      },

      setSelectedRecordId: (id) => set({ selectedRecordId: id }),
      
      clearState: () => {
        const { stopStream } = get();
        stopStream();
        set({
          dataset: null,
          metrics: [],
          hpsResult: null,
          flags: [],
          report: null,
          selectedRecordId: null,
          streamEvents: [],
          alerts: [],
          pipelineResult: null,
          detectedAttrs: [],
          appliedMitigation: null,
        });
      },
      
      startStream: () => {
        const { isStreaming, driftMode, _stopStream } = get();
        if (isStreaming) return;
        
        if (_stopStream) _stopStream();
        
        const stop = startStream((record) => {
          set((state) => {
            const newEvents = [record, ...state.streamEvents].slice(0, 500);
            return { streamEvents: newEvents };
          });
        }, { driftMode });
        
        set({ isStreaming: true, _stopStream: stop });
      },
      
      stopStream: () => {
        const { _stopStream } = get();
        if (_stopStream) _stopStream();
        set({ isStreaming: false, _stopStream: null });
      },
      
      resetStream: () => {
        const { stopStream } = get();
        stopStream();
        set({ streamEvents: [], alerts: [] });
      },
      
      setDriftMode: (mode) => {
        const { isStreaming, stopStream, startStream } = get();
        set({ driftMode: mode });
        if (isStreaming) {
          stopStream();
          startStream();
        }
      },
      
      setThreshold: (val) => set({ threshold: val }),
      pushAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts] }))
    }),
    {
      name: "fairlens-storage",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ 
        dataset: state.dataset, 
        metrics: state.metrics, 
        hpsResult: state.hpsResult, 
        flags: state.flags, 
        report: state.report, 
        selectedRecordId: state.selectedRecordId,
        viewMode: state.viewMode,
        hpsWeights: state.hpsWeights,
        hpsDomain: state.hpsDomain,
        pipelineResult: state.pipelineResult,
        detectedAttrs: state.detectedAttrs,
        analysisMode: state.analysisMode,
        appliedMitigation: state.appliedMitigation,
      }),
    }
  )
);
