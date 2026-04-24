import { LoanRecord, Prediction } from "./types";
import { socioContextDB } from "./socioContext";

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const firstNames = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa", "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley", "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle", "Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa", "Edward", "Deborah"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts"];

export function generateSampleData(count: number = 400): LoanRecord[] {
  const records: LoanRecord[] = [];
  const zipcodes = Object.keys(socioContextDB);

  for (let i = 0; i < count; i++) {
    const gender = Math.random() > 0.45 ? "Male" : Math.random() > 0.1 ? "Female" : "Non-binary";
    const raceR = Math.random();
    let race: LoanRecord["race"] = "White";
    if (raceR > 0.6) race = "Black";
    else if (raceR > 0.8) race = "Hispanic";
    else if (raceR > 0.9) race = "Asian";
    else if (raceR > 0.95) race = "Other";

    let zipcode = "";
    if (race === "Black" || race === "Hispanic") {
      zipcode = Math.random() > 0.3 ? randomChoice(["94601", "94605", "94621", "94110"]) : randomChoice(zipcodes);
    } else {
      zipcode = Math.random() > 0.3 ? randomChoice(["94103", "94114", "94122", "94132"]) : randomChoice(zipcodes);
    }

    const incomeBase = socioContextDB[zipcode]?.median_income || 60000;
    const income = Math.max(20000, Math.round(incomeBase + (Math.random() - 0.5) * 40000));
    const creditBase = income > 80000 ? 700 : 600;
    const credit_score = Math.min(850, Math.max(300, Math.round(creditBase + (Math.random() - 0.5) * 150)));
    const prior_default = Math.random() < (credit_score < 600 ? 0.3 : 0.05) ? 1 : 0;
    const debt_to_income = Math.round((0.1 + Math.random() * 0.4) * 100) / 100;
    
    // Bias logic
    let score = (credit_score / 850) * 0.5 - debt_to_income * 0.2 - prior_default * 0.2;
    if (gender === "Male") score += 0.05;
    if (gender === "Female") score -= 0.03;
    if (["94601", "94605", "94621"].includes(zipcode)) score -= 0.08; // proxy bias
    
    const prediction_proba = Math.min(1, Math.max(0, score + 0.3 + (Math.random() * 0.2)));
    const prediction: Prediction = prediction_proba > 0.5 ? "Approved" : "Rejected";

    records.push({
      id: `LN-${10000 + i}`,
      name: `${randomChoice(firstNames)} ${randomChoice(lastNames)}`,
      age: randomInt(21, 70),
      gender,
      race,
      zipcode,
      income,
      credit_score,
      loan_amount: randomInt(5000, 100000),
      employment_years: randomInt(0, 20),
      debt_to_income,
      prior_default,
      prediction,
      prediction_proba,
    });
  }
  return records;
}
