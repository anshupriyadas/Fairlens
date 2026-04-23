import { LoanRecord, BiasMetric } from "./types";

export function computeSubgroupRates(dataset: LoanRecord[], attribute: keyof LoanRecord) {
  const rates: Record<string, { approvalRate: number; count: number, approved: number }> = {};
  
  dataset.forEach((row) => {
    const val = String(row[attribute]);
    if (!rates[val]) rates[val] = { approvalRate: 0, count: 0, approved: 0 };
    rates[val].count++;
    if (row.prediction === "Approved") rates[val].approved++;
  });

  Object.values(rates).forEach(r => {
    r.approvalRate = r.approved / r.count;
  });

  return rates;
}

export function computeDemographicParityDifference(rates: Record<string, { approvalRate: number }>) {
  const vals = Object.values(rates).map(r => r.approvalRate);
  if (vals.length === 0) return 0;
  return Math.max(...vals) - Math.min(...vals);
}

// Simplified version for the mockup
export function computeEqualizedOddsDifference(rates: Record<string, { approvalRate: number }>) {
  // Mock logic assuming false positive rate correlates with approval rates roughly
  return computeDemographicParityDifference(rates) * 0.8;
}

export function computeCalibrationGap(rates: Record<string, { approvalRate: number }>) {
  return computeDemographicParityDifference(rates) * 0.5;
}

export function computeAllMetrics(dataset: LoanRecord[], protectedAttrs: string[]): BiasMetric[] {
  return protectedAttrs.map(attr => {
    const rates = computeSubgroupRates(dataset, attr as keyof LoanRecord);
    return {
      attribute: attr,
      demographicParityDifference: computeDemographicParityDifference(rates),
      equalizedOddsDifference: computeEqualizedOddsDifference(rates),
      calibrationGap: computeCalibrationGap(rates),
      subgroupRates: Object.fromEntries(Object.entries(rates).map(([k, v]) => [k, { approvalRate: v.approvalRate, count: v.count }]))
    };
  });
}
