import { SocioContext } from "./types";

export const socioContextDB: Record<string, SocioContext> = {
  "94601": { race_correlation: 0.84, median_income: 42000, income_level: "low", note: "Historically redlined district with low social mobility." },
  "94605": { race_correlation: 0.76, median_income: 48000, income_level: "low", note: "High concentration of minority-owned small businesses." },
  "94611": { race_correlation: 0.65, median_income: 75000, income_level: "mid", note: "Gentrifying area with shifting demographics." },
  "94621": { race_correlation: 0.88, median_income: 38000, income_level: "low", note: "Deeply entrenched systemic underinvestment." },
  "94103": { race_correlation: 0.45, median_income: 110000, income_level: "high", note: "Tech hub adjacent, high income variance." },
  "94110": { race_correlation: 0.35, median_income: 130000, income_level: "high", note: "Affluent tech sector zone." },
  "94114": { race_correlation: 0.55, median_income: 95000, income_level: "mid", note: "Historically Hispanic, rapid gentrification." },
  "94122": { race_correlation: 0.20, median_income: 150000, income_level: "high", note: "Very high income, predominantly white/asian." },
  "94124": { race_correlation: 0.40, median_income: 88000, income_level: "mid", note: "Sunset district, heavy Asian demographic." },
  "94132": { race_correlation: 0.30, median_income: 105000, income_level: "high", note: "Residential, high property values." },
  "94112": { race_correlation: 0.45, median_income: 90000, income_level: "mid", note: "Suburban feel, mixed demographics." },
  "94134": { race_correlation: 0.50, median_income: 82000, income_level: "mid", note: "Working-class to middle-class transition." },
};

export function getSocioContext(zipcode: string): SocioContext | undefined {
  return socioContextDB[zipcode];
}
