import { LoanRecord, DetectedAttribute, PipelineResult, BiasMetric, PipelineStageResult } from "./types";
import { computeAllMetrics, computeSubgroupRates } from "./biasMetrics";
import { computeShap } from "./shap";
import { computeInteractions } from "./shapInteractions";
import { getSocioContext } from "./socioContext";
import { computeHps, computeRegulatoryFlags } from "./hps";
import { findMinimalFlip } from "./counterfactual";

// STAGE 1
export function validateInput(dataset: LoanRecord[]): PipelineStageResult {
  const start = performance.now();
  const ok = dataset.length > 0;
  const missingValues = 0; // simplified
  let detectedTarget = "prediction";
  if (dataset.length && !("prediction" in dataset[0])) {
    detectedTarget = "approved"; // fallback
  }
  return {
    ok,
    missingValues,
    schemaIssues: [],
    detectedTarget,
    warnings: [],
    durationMs: performance.now() - start
  };
}

// STAGE 2
const SYNONYMS: Record<string, string[]> = {
  gender: ["sex", "identity"],
  race: ["ethnicity"],
  age: ["dob", "birth"],
  zipcode: ["postcode", "zip", "postal"],
  religion: [],
  nationality: ["country"]
};

export function detectProtectedAttributes(dataset: LoanRecord[]): PipelineStageResult & { attributes: DetectedAttribute[] } {
  const start = performance.now();
  if (dataset.length === 0) return { attributes: [], durationMs: performance.now() - start };

  const keys = Object.keys(dataset[0]);
  const attributes: DetectedAttribute[] = [];

  for (const key of keys) {
    let matchType = null;
    let confidence = 0;
    let reason = "";

    const lowerKey = key.toLowerCase();

    for (const [type, syns] of Object.entries(SYNONYMS)) {
      if (lowerKey === type) {
        matchType = type;
        confidence = 0.95;
        reason = `Exact column name match for '${type}'`;
        break;
      }
      for (const syn of syns) {
        if (lowerKey.includes(syn)) {
          matchType = type;
          confidence = 0.8;
          reason = `Column name contains synonym '${syn}' for '${type}'`;
          break;
        }
      }
      if (matchType) break;
    }

    if (matchType) {
      attributes.push({
        column: key,
        type: matchType,
        confidence,
        reason,
        enabled: true
      });
    }
  }

  return { attributes, durationMs: performance.now() - start };
}

// STAGE 3
function computeEntropy(rates: Record<string, { count: number }>, total: number) {
  let entropy = 0;
  for (const k in rates) {
    const p = rates[k].count / total;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  const maxEntropy = Math.log2(Object.keys(rates).length || 1);
  return maxEntropy > 0 ? entropy / maxEntropy : 1;
}

export function preScan(dataset: LoanRecord[], attrs: string[]): PipelineStageResult {
  const start = performance.now();
  const signals: string[] = [];
  const reasons: string[] = [];
  let highestRisk = "low";

  for (const attr of attrs) {
    const rates = computeSubgroupRates(dataset, attr as keyof LoanRecord);
    const total = dataset.length;
    
    const normEntropy = computeEntropy(rates, total);
    if (normEntropy < 0.5) {
      signals.push("High Imbalance");
      reasons.push(`${attr} has highly skewed representation (entropy: ${normEntropy.toFixed(2)}).`);
      highestRisk = "medium";
    }

    const appRates = Object.values(rates).map(r => r.approvalRate);
    if (appRates.length > 0) {
      const maxRate = Math.max(...appRates);
      const minRate = Math.min(...appRates);
      const variance = maxRate - minRate;
      
      if (variance > 0.15) {
        signals.push("High Skew");
        reasons.push(`${attr} approval rates vary by ${(variance * 100).toFixed(1)}%.`);
        highestRisk = "high";
      } else if (variance > 0.05) {
        if (highestRisk === "low") highestRisk = "medium";
      }
    }
  }

  return {
    riskFlag: highestRisk,
    signals,
    reasons,
    durationMs: performance.now() - start
  };
}

// STAGE 4
export function fullDisparityAnalysis(dataset: LoanRecord[], attrs: string[]): PipelineStageResult & { metrics: BiasMetric[] } {
  const start = performance.now();
  const metrics = computeAllMetrics(dataset, attrs);
  
  metrics.sort((a, b) => {
    const maxA = Math.max(a.demographicParityDifference, a.equalizedOddsDifference, a.calibrationGap);
    const maxB = Math.max(b.demographicParityDifference, b.equalizedOddsDifference, b.calibrationGap);
    return maxB - maxA;
  });

  return { metrics, durationMs: performance.now() - start };
}

// STAGE 5
export function decisionNode(metrics: BiasMetric[], datasetLen: number): PipelineStageResult {
  const start = performance.now();
  let maxDisparity = 0;
  for (const m of metrics) {
    if (m.demographicParityDifference > maxDisparity) maxDisparity = m.demographicParityDifference;
  }

  const verdict = maxDisparity < 0.05 ? "PASS" : "INVESTIGATE";
  const confidence = Math.min(100, Math.max(0, 50 + (datasetLen / 10) - (maxDisparity * 100)));
  const summary = verdict === "PASS" 
    ? `Max disparity is ${(maxDisparity*100).toFixed(1)}% (under 5% threshold).`
    : `Significant disparity detected: ${(maxDisparity*100).toFixed(1)}% exceeds 5% threshold.`;

  return { verdict, confidence, summary, decidingMetric: maxDisparity, durationMs: performance.now() - start };
}

// STAGE 6
export function archaeology(dataset: LoanRecord[], topRecordId: string | null, attrs: string[]): PipelineStageResult {
  const start = performance.now();
  if (!topRecordId) return { skipped: true, reason: "No record selected", durationMs: performance.now() - start };
  
  const record = dataset.find(r => r.id === topRecordId);
  if (!record) return { skipped: true, reason: "Record not found", durationMs: performance.now() - start };

  const datasetAvg = {
    credit_score: dataset.reduce((acc, r) => acc + r.credit_score, 0) / dataset.length,
    debt_to_income: dataset.reduce((acc, r) => acc + r.debt_to_income, 0) / dataset.length,
    prior_default: dataset.reduce((acc, r) => acc + r.prior_default, 0) / dataset.length,
    income: dataset.reduce((acc, r) => acc + r.income, 0) / dataset.length,
  };

  const shapContributions = computeShap(record, datasetAvg);
  const interactions = computeInteractions(record);
  
  const reasoningChains = [];

  // Proxy detection mock
  for (let i = 0; i < Math.min(3, shapContributions.length); i++) {
    const shap = shapContributions[i];
    if (shap.feature === "zipcode") {
      const ctx = getSocioContext(String(record.zipcode));
      if (ctx && ctx.race_correlation > 0.5) {
        reasoningChains.push({
          feature: "zipcode",
          proxyAttribute: "race",
          harmNote: ctx.note,
          proxyScore: ctx.race_correlation
        });
      }
    }
  }

  return { reasoningChains, shapContributions, interactions, durationMs: performance.now() - start };
}

// STAGE 7
export function counterfactualSummary(record: LoanRecord | null, dataset: LoanRecord[]): PipelineStageResult {
  const start = performance.now();
  if (!record) return { skipped: true, reason: "No record selected", durationMs: performance.now() - start };

  const datasetAvg = {
    credit_score: dataset.reduce((acc, r) => acc + r.credit_score, 0) / dataset.length,
    debt_to_income: dataset.reduce((acc, r) => acc + r.debt_to_income, 0) / dataset.length,
    prior_default: dataset.reduce((acc, r) => acc + r.prior_default, 0) / dataset.length,
    income: dataset.reduce((acc, r) => acc + r.income, 0) / dataset.length,
  };

  const minimalFlip = findMinimalFlip(record, datasetAvg);
  
  const alternatives = [];
  if (record.prediction === "Rejected") {
    alternatives.push({ label: "Option A", changes: { credit_score: Math.min(850, record.credit_score + 50) }, outcome: "Approved", distance: 50 });
    alternatives.push({ label: "Option B", changes: { debt_to_income: Math.max(0, record.debt_to_income - 0.2) }, outcome: "Approved", distance: 0.2 });
    if (record.zipcode !== "94103") {
      alternatives.push({ label: "Option C", changes: { zipcode: "94103" }, outcome: "Approved", distance: 1 });
    } else {
      alternatives.push({ label: "Option C", changes: { gender: record.gender === "Male" ? "Female" : "Male" }, outcome: "Approved", distance: 1 });
    }
  } else {
    alternatives.push({ label: "Option A", changes: { credit_score: Math.max(300, record.credit_score - 80) }, outcome: "Rejected", distance: 80 });
    alternatives.push({ label: "Option B", changes: { debt_to_income: Math.min(1, record.debt_to_income + 0.3) }, outcome: "Rejected", distance: 0.3 });
    alternatives.push({ label: "Option C", changes: { prior_default: 1 }, outcome: "Rejected", distance: 1 });
  }

  return { minimalFlip, alternatives, durationMs: performance.now() - start };
}

// STAGE 8
export function explainableHps(metrics: BiasMetric[], dataset: LoanRecord[], archaeologyResult: any, weights: any, domain: any): PipelineStageResult {
  const start = performance.now();
  const result = computeHps(metrics, dataset, weights, domain);
  return { ...result, durationMs: performance.now() - start };
}

// STAGE 9
export function regulatoryAndRemediation(metrics: BiasMetric[], hpsResult: any): PipelineStageResult {
  const start = performance.now();
  const flags = computeRegulatoryFlags(metrics, hpsResult);
  return { flags, durationMs: performance.now() - start };
}

// ORCHESTRATOR
export async function runPipeline(
  dataset: LoanRecord[], 
  opts: {
    enabledAttrs?: string[],
    topRecordId?: string | null,
    weights?: any,
    domain?: any,
    onProgress?: (stage: string) => void
  } = {}
): Promise<PipelineResult> {
  const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

  opts.onProgress?.("validate");
  await wait(0);
  const validate = validateInput(dataset);

  opts.onProgress?.("detect");
  await wait(0);
  const detect = detectProtectedAttributes(dataset);
  const activeAttrs = opts.enabledAttrs || detect.attributes.filter(a => a.enabled).map(a => a.column);

  opts.onProgress?.("preScan");
  await wait(0);
  const preScanRes = preScan(dataset, activeAttrs);
  const fastPass = preScanRes.riskFlag === "low";

  let disparity: PipelineStageResult = { skipped: true, reason: "fastPass" };
  let decision: PipelineStageResult = { verdict: "PASS", confidence: 100, summary: "Skipped via fast pass", decidingMetric: 0 };
  let archaeologyRes: PipelineStageResult = { skipped: true, reason: "fastPass" };
  let counterfactual: PipelineStageResult = { skipped: true, reason: "fastPass" };
  let hps: PipelineStageResult = { skipped: true, reason: "fastPass" };
  let regulatory: PipelineStageResult = { skipped: true, reason: "fastPass" };

  let metrics: BiasMetric[] = [];

  if (!fastPass) {
    opts.onProgress?.("disparity");
    await wait(0);
    const dispRun = fullDisparityAnalysis(dataset, activeAttrs);
    disparity = dispRun;
    metrics = dispRun.metrics;

    opts.onProgress?.("decision");
    await wait(0);
    decision = decisionNode(metrics, dataset.length);

    if (decision.verdict === "INVESTIGATE") {
      opts.onProgress?.("archaeology");
      await wait(0);
      archaeologyRes = archaeology(dataset, opts.topRecordId || (dataset.length > 0 ? dataset[0].id : null), activeAttrs);
    } else {
      archaeologyRes = { skipped: true, reason: "Decision PASS" };
    }

    opts.onProgress?.("counterfactual");
    await wait(0);
    counterfactual = counterfactualSummary(opts.topRecordId ? dataset.find(r => r.id === opts.topRecordId) || dataset[0] : dataset[0], dataset);

    opts.onProgress?.("hps");
    await wait(0);
    hps = explainableHps(metrics, dataset, archaeologyRes, opts.weights, opts.domain);

    opts.onProgress?.("regulatory");
    await wait(0);
    regulatory = regulatoryAndRemediation(metrics, hps as any);
  }

  opts.onProgress?.("done");

  return {
    ranAt: Date.now(),
    fastPass,
    stages: {
      validate,
      detect,
      preScan: preScanRes,
      disparity,
      decision,
      archaeology: archaeologyRes,
      counterfactual,
      hps,
      regulatory
    }
  };
}