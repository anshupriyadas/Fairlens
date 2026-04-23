import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { LoanRecord, BiasMetric, HpsResult, RegulatoryFlag, AnalysisReport } from "./types";
import { computeAllMetrics } from "./biasMetrics";
import { computeHps, computeRegulatoryFlags, generateReport } from "./hps";

interface FairLensState {
  dataset: LoanRecord[] | null;
  detectedProtectedAttrs: string[];
  metrics: BiasMetric[];
  hpsResult: HpsResult | null;
  flags: RegulatoryFlag[];
  report: AnalysisReport | null;
  selectedRecordId: string | null;
  
  setDataset: (data: LoanRecord[]) => void;
  setSelectedRecordId: (id: string | null) => void;
  clearState: () => void;
}

export const useFairLensStore = create<FairLensState>()(
  persist(
    (set) => ({
      dataset: null,
      detectedProtectedAttrs: ["gender", "race", "zipcode"],
      metrics: [],
      hpsResult: null,
      flags: [],
      report: null,
      selectedRecordId: null,

      setDataset: (data) => {
        const attrs = ["gender", "race", "zipcode"];
        const metrics = computeAllMetrics(data, attrs);
        const hps = computeHps(metrics, data);
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

      setSelectedRecordId: (id) => set({ selectedRecordId: id }),
      
      clearState: () => set({
        dataset: null,
        metrics: [],
        hpsResult: null,
        flags: [],
        report: null,
        selectedRecordId: null,
      })
    }),
    {
      name: "fairlens-storage",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
