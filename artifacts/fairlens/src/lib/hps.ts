import { LoanRecord, HpsResult, BiasMetric, RegulatoryFlag, AnalysisReport } from "./types";
import { socioContextDB } from "./socioContext";

export function computeHps(metrics: BiasMetric[], dataset: LoanRecord[]): HpsResult {
  let maxDisparity = 0;
  metrics.forEach(m => {
    if (m.demographicParityDifference > maxDisparity) maxDisparity = m.demographicParityDifference;
  });

  let proxyStrength = 0;
  dataset.forEach(r => {
    if (socioContextDB[r.zipcode]?.race_correlation > 0.7) proxyStrength += 1;
  });
  proxyStrength = proxyStrength / dataset.length;

  const domainWeight = 1.0;
  
  const rawScore = 0.4 * maxDisparity + 0.3 * proxyStrength + 0.3 * domainWeight;
  const score = Math.min(100, Math.round(rawScore * 100));

  let riskLevel: HpsResult["riskLevel"] = "Low";
  if (score > 80) riskLevel = "Critical";
  else if (score > 60) riskLevel = "High";
  else if (score > 40) riskLevel = "Medium";

  return {
    score,
    riskLevel,
    reasoning: `Score driven by a max disparity of ${(maxDisparity * 100).toFixed(1)}% and strong geographic proxies for protected attributes.`,
    breakdown: {
      disparity: maxDisparity,
      proxyStrength,
      domainWeight
    }
  };
}

export function computeRegulatoryFlags(metrics: BiasMetric[], hps: HpsResult): RegulatoryFlag[] {
  const flags: RegulatoryFlag[] = [];

  const genderMetric = metrics.find(m => m.attribute === "gender");
  if (genderMetric && genderMetric.demographicParityDifference > 0.1) {
    flags.push({
      id: "reg-b",
      severity: "High",
      title: "Potential ECOA Reg B Violation",
      citation: "12 CFR § 1002.4",
      explanation: `Gender disparity of ${(genderMetric.demographicParityDifference * 100).toFixed(1)}% exceeds acceptable thresholds for credit decisioning.`
    });
  }

  if (hps.breakdown.proxyStrength > 0.2) {
    flags.push({
      id: "fha-proxy",
      severity: "Critical",
      title: "Geographic Redlining Risk via Proxy",
      citation: "Fair Housing Act & EU AI Act Art. 10",
      explanation: "Zipcode acts as a strong proxy for race, leading to indirect discrimination in predominantly minority neighborhoods."
    });
  }

  return flags;
}

export function generateReport(metrics: BiasMetric[], hps: HpsResult, flags: RegulatoryFlag[]): AnalysisReport {
  return {
    tldr: `The model exhibits a ${hps.riskLevel.toLowerCase()} risk of bias, primarily driven by geographic proxies and gender disparities.`,
    keyRisks: flags.map(f => `${f.title}: ${f.explanation}`),
    businessImpact: `Failure to address these biases could result in regulatory action under ECOA and reputational damage. Approvals in minority neighborhoods are artificially suppressed.`,
    suggestedFixes: [
      "Remove or de-weight 'zipcode' as a feature, replacing it with direct financial indicators.",
      "Calibrate the decision threshold for female applicants to achieve demographic parity.",
      "Conduct further adversarial testing on the credit scoring sub-model."
    ]
  };
}
