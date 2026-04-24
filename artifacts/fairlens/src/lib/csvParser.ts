import { LoanRecord, Prediction } from "./types";

export interface CsvParseResult {
  records: LoanRecord[];
  warnings: string[];
  detectedColumns: string[];
}

export class CsvParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvParseError";
  }
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') {
        out.push(cur);
        cur = "";
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[\s-]+/g, "_");
}

function coerceNumber(v: string, fallback = 0): number {
  if (v === "" || v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function coerceGender(v: string): LoanRecord["gender"] {
  const s = (v || "").toLowerCase().trim();
  if (s === "m" || s === "male") return "Male";
  if (s === "f" || s === "female") return "Female";
  if (s === "nb" || s === "non-binary" || s === "nonbinary" || s === "other") return "Non-binary";
  return "Male";
}

function coerceRace(v: string): LoanRecord["race"] {
  const s = (v || "").toLowerCase().trim();
  if (s.includes("white") || s.includes("caucasian")) return "White";
  if (s.includes("black") || s.includes("african")) return "Black";
  if (s.includes("hispanic") || s.includes("latino") || s.includes("latina")) return "Hispanic";
  if (s.includes("asian")) return "Asian";
  return "Other";
}

function coercePrediction(v: string): Prediction {
  const s = (v || "").toLowerCase().trim();
  if (s === "1" || s === "true" || s === "approved" || s === "approve" || s === "yes" || s === "y") return "Approved";
  return "Rejected";
}

function coerceProba(v: string, prediction: Prediction): number {
  const n = coerceNumber(v, NaN);
  if (Number.isFinite(n)) {
    if (n < 0) return 0;
    if (n > 1) return Math.min(1, n / 100);
    return n;
  }
  return prediction === "Approved" ? 0.75 : 0.25;
}

const REQUIRED_COLUMNS = ["prediction"];

export function parseCsv(text: string): CsvParseResult {
  const warnings: string[] = [];
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = cleaned.split("\n").filter(l => l.trim().length > 0);

  if (lines.length < 2) {
    throw new CsvParseError("CSV must contain a header row and at least one data row.");
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const headerSet = new Set(headers);

  for (const required of REQUIRED_COLUMNS) {
    if (!headerSet.has(required)) {
      throw new CsvParseError(
        `Missing required column "${required}". Expected at least: ${REQUIRED_COLUMNS.join(", ")}. ` +
        `Got: ${headers.join(", ")}`
      );
    }
  }

  if (!headerSet.has("prediction_proba") && !headerSet.has("probability") && !headerSet.has("score")) {
    warnings.push("No probability column found — synthesizing from prediction (Approved=0.75, Rejected=0.25).");
  }

  const protectedAttrs = ["gender", "race", "zipcode", "age", "ethnicity"].filter(a => headerSet.has(a));
  if (protectedAttrs.length === 0) {
    warnings.push("No protected attributes detected (gender/race/zipcode/age). Bias analysis may be limited.");
  }

  const records: LoanRecord[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.length === 1 && cells[0] === "") continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });

    try {
      const prediction = coercePrediction(row.prediction);
      const probaRaw = row.prediction_proba || row.probability || row.score || "";
      const prediction_proba = coerceProba(probaRaw, prediction);

      const record: LoanRecord = {
        id: row.id || row.loan_id || `LN-${10000 + i}`,
        name: row.name || row.applicant || `Applicant ${i}`,
        age: coerceNumber(row.age, 35),
        gender: coerceGender(row.gender || row.sex || ""),
        race: coerceRace(row.race || row.ethnicity || ""),
        zipcode: row.zipcode || row.zip || row.postal_code || "00000",
        income: coerceNumber(row.income || row.annual_income, 50000),
        credit_score: coerceNumber(row.credit_score || row.fico, 650),
        loan_amount: coerceNumber(row.loan_amount || row.amount, 25000),
        employment_years: coerceNumber(row.employment_years || row.tenure, 5),
        debt_to_income: coerceNumber(row.debt_to_income || row.dti, 0.3),
        prior_default: (coerceNumber(row.prior_default || row.default, 0) >= 1 ? 1 : 0) as 0 | 1,
        prediction,
        prediction_proba,
      };
      records.push(record);
    } catch (rowErr: any) {
      errors.push(`Row ${i + 1}: ${rowErr?.message || "parse error"}`);
      if (errors.length > 5) {
        errors.push("...additional row errors suppressed.");
        break;
      }
    }
  }

  if (records.length === 0) {
    throw new CsvParseError(
      `No valid rows parsed.${errors.length ? " First errors: " + errors.slice(0, 3).join("; ") : ""}`
    );
  }

  if (errors.length > 0) {
    warnings.push(`${errors.length} row(s) skipped due to parse errors.`);
  }

  return { records, warnings, detectedColumns: headers };
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
