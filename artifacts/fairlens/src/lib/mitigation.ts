import { BiasMetric, LoanRecord } from "./types";

export type MitigationStrategy = "reweight" | "drop_proxy" | "threshold_calibration" | "fairness_constraint";

export interface MitigationResult {
  newMetrics: BiasMetric[];
  newHps: number;
  deltaApproval: Record<string, number>;
  costEstimate: string;
  summary: string;
  sideEffects: string[];
}

export function simulateMitigation(
  dataset: LoanRecord[],
  currentMetrics: BiasMetric[],
  strategy: MitigationStrategy,
  options: any = {}
): MitigationResult {
  let newMetrics: BiasMetric[] = JSON.parse(JSON.stringify(currentMetrics));
  let deltaApproval: Record<string, number> = {};
  let costEstimate = "$5,000 - $15,000 (Compute + Audit)";
  let summary = "";
  let sideEffects: string[] = [];

  const overallApprovalRate = dataset.filter(d => d.prediction === "Approved").length / dataset.length;

  switch (strategy) {
    case "reweight":
      summary = "Applying sample weights to balance subgroup representation during training.";
      sideEffects = ["Overall approval rate drops by 2.1%", "May reduce model accuracy by ~3%"];
      newMetrics = newMetrics.map(m => {
        const subgroupRates = { ...m.subgroupRates };
        const rates = Object.values(subgroupRates).map(r => r.approvalRate);
        const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
        
        Object.keys(subgroupRates).forEach(k => {
          const diff = subgroupRates[k].approvalRate - mean;
          subgroupRates[k].approvalRate = mean + diff * 0.4; // 60% reduction toward mean
        });

        return {
          ...m,
          subgroupRates,
          demographicParityDifference: Math.max(...Object.values(subgroupRates).map(r => r.approvalRate)) - Math.min(...Object.values(subgroupRates).map(r => r.approvalRate)),
          equalizedOddsDifference: m.equalizedOddsDifference * 0.5,
          calibrationGap: m.calibrationGap * 1.1 // Slight increase
        };
      });
      break;

    case "drop_proxy":
      summary = "Identifying and removing features that act as proxies for protected attributes (e.g., Zipcode).";
      sideEffects = ["Significant loss in predictive power for certain segments", "Requires complete model retraining"];
      newMetrics = newMetrics.map(m => ({
        ...m,
        demographicParityDifference: m.demographicParityDifference * 0.3,
        equalizedOddsDifference: m.equalizedOddsDifference * 0.3,
        calibrationGap: m.calibrationGap * 0.3
      }));
      break;

    case "threshold_calibration":
      summary = "Adjusting decision thresholds per-subgroup to equalize outcomes post-hoc.";
      sideEffects = ["May be legally sensitive in certain jurisdictions", "Increases False Positive Rate for protected groups"];
      newMetrics = newMetrics.map(m => {
        const subgroupRates = { ...m.subgroupRates };
        Object.keys(subgroupRates).forEach(k => {
          subgroupRates[k].approvalRate = overallApprovalRate;
        });
        return {
          ...m,
          subgroupRates,
          demographicParityDifference: m.demographicParityDifference * 0.05, // 95% reduction
          equalizedOddsDifference: m.equalizedOddsDifference * 0.4, // 60% reduction
          calibrationGap: m.calibrationGap
        };
      });
      break;

    case "fairness_constraint":
      summary = "Incorporating fairness penalties directly into the model's loss function.";
      sideEffects = ["Increases training time", "Requires custom objective functions", "Small trade-off in AUC-ROC"];
      newMetrics = newMetrics.map(m => ({
        ...m,
        demographicParityDifference: m.demographicParityDifference * 0.2, // 80% reduction
        equalizedOddsDifference: m.equalizedOddsDifference * 0.5, // 50% reduction
        calibrationGap: m.calibrationGap * 0.9 // 10% improvement
      }));
      break;
  }

  // Calculate new HPS based on max disparity
  let maxDisparity = 0;
  newMetrics.forEach(m => {
    if (m.demographicParityDifference > maxDisparity) maxDisparity = m.demographicParityDifference;
  });
  
  // Mock HPS calculation matching the logic in hps.ts but simplified
  const newHps = Math.min(100, Math.max(0, Math.round(maxDisparity * 100 * 0.8 + 10)));

  return {
    newMetrics,
    newHps,
    deltaApproval,
    costEstimate,
    summary,
    sideEffects
  };
}
