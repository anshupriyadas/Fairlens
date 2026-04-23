export type Prediction = "Approved" | "Rejected";
export type ViewMode = "Technical" | "Executive" | "Legal";
export type DriftMode = "none" | "gender" | "zipcode";
export type DomainType = "Loan" | "Hiring" | "Recommendations" | "Healthcare";

export interface StreamAlert {
  id: string;
  timestamp: number;
  message: string;
  metric: string;
  value: number;
}

export interface HpsWeights {
  disparity: number;
  proxyStrength: number;
  domainWeight: number;
}

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

export interface DetectedAttribute {
  column: string;
  type: string;
  confidence: number;
  reason: string;
  enabled: boolean;
}

export interface PipelineStageResult {
  skipped?: boolean;
  reason?: string;
  durationMs?: number;
  [key: string]: any;
}

export interface PipelineResult {
  ranAt: number;
  fastPass: boolean;
  stages: {
    validate: PipelineStageResult;
    detect: PipelineStageResult;
    preScan: PipelineStageResult;
    disparity?: PipelineStageResult;
    decision: PipelineStageResult;
    archaeology?: PipelineStageResult;
    counterfactual?: PipelineStageResult;
    hps: PipelineStageResult;
    regulatory: PipelineStageResult;
  };
}
