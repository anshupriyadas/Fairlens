import { LoanRecord } from "./types";
import { computeShap } from "./shap";

export function findMinimalFlip(
  record: LoanRecord,
  datasetAvg: Record<string, number>
): { feature: keyof LoanRecord; from: any; to: any } | null {
  // Simple heuristic: find the top feature that contributes to the current prediction
  // and flip it to a typical opposite value.
  const contributions = computeShap(record, datasetAvg);
  const targetProb = record.prediction === "Approved" ? 0.4 : 0.6; // We want to cross 0.5
  
  // Try flipping protected attributes first as they are most insightful for bias
  if (record.prediction === "Rejected") {
    if (record.gender === "Female" || record.gender === "Non-binary") {
      return { feature: "gender", from: record.gender, to: "Male" };
    }
    if (["94601", "94605", "94621"].includes(record.zipcode)) {
      return { feature: "zipcode", from: record.zipcode, to: "94103" };
    }
    // Otherwise try to improve credit score
    return { feature: "credit_score", from: record.credit_score, to: Math.min(850, record.credit_score + 100) };
  } else {
    // Prediction is Approved
    if (record.gender === "Male") {
      return { feature: "gender", from: "Male", to: "Female" };
    }
    return { feature: "credit_score", from: record.credit_score, to: Math.max(300, record.credit_score - 100) };
  }
}

export function computePredictionProba(record: Partial<LoanRecord>): number {
  const credit_score = record.credit_score || 650;
  const debt_to_income = record.debt_to_income || 0.3;
  const prior_default = record.prior_default || 0;
  const gender = record.gender || "Female";
  const zipcode = record.zipcode || "94103";

  let score = (credit_score / 850) * 0.5 - debt_to_income * 0.2 - prior_default * 0.2;
  if (gender === "Male") score += 0.05;
  if (gender === "Female") score -= 0.03;
  if (["94601", "94605", "94621"].includes(zipcode)) score -= 0.08;
  
  return Math.min(1, Math.max(0, score + 0.3 + 0.1)); // simplified
}
