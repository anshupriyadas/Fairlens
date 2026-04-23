import { LoanRecord, ShapContribution } from "./types";

export function computeShap(record: LoanRecord, datasetAvg: Record<string, number>): ShapContribution[] {
  const contributions: ShapContribution[] = [];

  const add = (feature: keyof LoanRecord, value: any, weight: number, diff: number) => {
    contributions.push({ feature, value, contribution: weight * diff });
  };

  add("credit_score", record.credit_score, 0.002, record.credit_score - (datasetAvg.credit_score || 650));
  add("debt_to_income", record.debt_to_income, -0.5, record.debt_to_income - (datasetAvg.debt_to_income || 0.3));
  add("prior_default", record.prior_default, -0.4, record.prior_default - (datasetAvg.prior_default || 0));
  add("income", record.income, 0.000001, record.income - (datasetAvg.income || 60000));
  
  // Proxies & Bias
  let zipCont = 0;
  if (["94601", "94605", "94621"].includes(record.zipcode)) zipCont = -0.15;
  else if (["94103", "94122"].includes(record.zipcode)) zipCont = 0.1;
  add("zipcode", record.zipcode, 1, zipCont);

  let genderCont = 0;
  if (record.gender === "Male") genderCont = 0.08;
  if (record.gender === "Female") genderCont = -0.05;
  add("gender", record.gender, 1, genderCont);

  return contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}
