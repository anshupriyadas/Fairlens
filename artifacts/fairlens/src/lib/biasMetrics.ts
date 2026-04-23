import { LoanRecord, BiasMetric } from "./types";

function bucketValue(attribute: string, raw: any): string {
  if (attribute === "age") {
    const n = Number(raw);
    if (!Number.isFinite(n)) return "unknown";
    if (n < 30) return "<30";
    if (n < 45) return "30-44";
    if (n < 60) return "45-59";
    return "60+";
  }
  return String(raw);
}

export function computeSubgroupRates(dataset: LoanRecord[], attribute: keyof LoanRecord) {
  const rates: Record<string, { approvalRate: number; count: number, approved: number }> = {};
  
  dataset.forEach((row) => {
    const val = bucketValue(String(attribute), row[attribute]);
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
