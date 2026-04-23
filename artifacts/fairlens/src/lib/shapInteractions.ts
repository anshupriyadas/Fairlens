import { LoanRecord } from "./types";

export function computeInteractions(record: LoanRecord) {
  // Mock a 4x4 matrix of pairwise interaction strengths
  // Top 4 features: credit_score, income, debt_to_income, zipcode
  const features = ["credit_score", "income", "debt_to_income", "zipcode"];
  const matrix: Record<string, Record<string, number>> = {};
  
  for (const f1 of features) {
    matrix[f1] = {};
    for (const f2 of features) {
      if (f1 === f2) {
        matrix[f1][f2] = 1.0;
      } else {
        // Deterministic mock interaction based on feature names and record values
        let val = (f1.length + f2.length) % 10 / 10;
        if ((f1 === "credit_score" && f2 === "income") || (f2 === "credit_score" && f1 === "income")) val = 0.8;
        if ((f1 === "zipcode" && f2 === "income") || (f2 === "zipcode" && f1 === "income")) val = 0.6;
        if ((f1 === "debt_to_income" && f2 === "credit_score") || (f2 === "debt_to_income" && f1 === "credit_score")) val = -0.7;
        matrix[f1][f2] = val;
      }
    }
  }
  
  return { features, matrix };
}
