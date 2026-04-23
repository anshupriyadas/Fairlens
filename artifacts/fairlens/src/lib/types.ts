export type Prediction = "Approved" | "Rejected";

export interface LoanRecord {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Non-binary";
  race: "White" | "Black" | "Hispanic" | "Asian" | "Other";
  zipcode: string;
  income: number;
  credit_score: number;
  loan_amount: number;
  employment_years: number;
  debt_to_income: number;
  prior_default: 0 | 1;
  prediction: Prediction;
  prediction_proba: number;
}

export interface SocioContext {
  race_correlation: number;
  median_income: number;
  income_level: "low" | "mid" | "high";
  note: string;
}

export interface BiasMetric {
  attribute: string;
  demographicParityDifference: number;
  equalizedOddsDifference: number;
  calibrationGap: number;
  subgroupRates: Record<string, { approvalRate: number; count: number }>;
}

export interface ShapContribution {
  feature: keyof LoanRecord;
  value: number | string;
  contribution: number;
}

export interface HpsResult {
  score: number;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  reasoning: string;
  breakdown: {
    disparity: number;
    proxyStrength: number;
    domainWeight: number;
  };
}

export interface RegulatoryFlag {
  id: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  title: string;
  citation: string;
  explanation: string;
}

export interface AnalysisReport {
  tldr: string;
  keyRisks: string[];
  businessImpact: string;
  suggestedFixes: string[];
}
