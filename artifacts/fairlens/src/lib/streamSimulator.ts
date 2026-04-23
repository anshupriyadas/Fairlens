import { LoanRecord, DriftMode } from "./types";
import { generateSampleData } from "./sampleData";

export function startStream(onEvent: (record: LoanRecord) => void, opts: { driftMode: DriftMode }) {
  let active = true;
  
  const tick = () => {
    if (!active) return;
    
    // Generate one record
    const record = generateSampleData(1)[0];
    
    // Apply drift if needed
    if (opts.driftMode === "gender") {
      // Force more female rejections
      if (record.gender === "Female" && Math.random() < 0.4) {
        record.prediction = "Rejected";
        record.prediction_proba = Math.random() * 0.5;
      }
    } else if (opts.driftMode === "zipcode") {
      // Force more rejections in certain zipcodes
      if (["94601", "94605", "94621"].includes(record.zipcode) && Math.random() < 0.5) {
        record.prediction = "Rejected";
        record.prediction_proba = Math.random() * 0.5;
      }
    }

    onEvent(record);
    
    if (active) {
      setTimeout(tick, 600 + Math.random() * 400); // ~800ms average
    }
  };
  
  tick();
  
  return () => {
    active = false;
  };
}
