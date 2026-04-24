import { jsPDF } from "jspdf";

export function exportAuditReport(state: any): { ok: boolean; error?: string } {
  try {
    const { dataset, hpsResult, metrics, flags, report } = state || {};
    if (!dataset || !hpsResult || !report) {
      return { ok: false, error: "No active case — load a dataset first." };
    }

    return runExport({ dataset, hpsResult, metrics: metrics || [], flags: flags || [], report });
  } catch (err: any) {
    console.error("PDF export failed:", err);
    return { ok: false, error: err?.message || "Failed to generate PDF" };
  }
}

function runExport({ dataset, hpsResult, metrics, flags, report }: any): { ok: boolean; error?: string } {
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString();
  const caseName = "Loan Approval Model v1.2";

  // Page 1: Cover Page
  doc.setFillColor(20, 30, 70); // Dark navy
  doc.rect(0, 0, 210, 297, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(40);
  doc.text("FairLens", 105, 80, { align: "center" });
  doc.setFontSize(20);
  doc.text("Compliance Audit Report", 105, 100, { align: "center" });

  doc.setFontSize(12);
  doc.text(`Case: ${caseName}`, 105, 130, { align: "center" });
  doc.text(`Generated: ${timestamp}`, 105, 140, { align: "center" });

  // Risk Level Color Block
  let riskColor: [number, number, number] = [0, 255, 0];
  if (hpsResult.riskLevel === "Critical") riskColor = [220, 38, 38];
  else if (hpsResult.riskLevel === "High") riskColor = [245, 158, 11];
  else if (hpsResult.riskLevel === "Medium") riskColor = [37, 99, 235];

  doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
  doc.rect(60, 160, 90, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text(`${hpsResult.score}`, 105, 180, { align: "center" });
  doc.setFontSize(14);
  doc.text(`${hpsResult.riskLevel.toUpperCase()} RISK`, 105, 192, { align: "center" });

  // Page 2: Executive Summary
  doc.addPage();
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(20);
  doc.text("Executive Summary", 20, 30);
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TL;DR", 20, 50);
  doc.setFont("helvetica", "normal");
  const tldrLines = doc.splitTextToSize(report.tldr, 170);
  doc.text(tldrLines, 20, 58);

  doc.setFont("helvetica", "bold");
  doc.text("Business Impact", 20, 90);
  doc.setFont("helvetica", "normal");
  const impactLines = doc.splitTextToSize(report.businessImpact, 170);
  doc.text(impactLines, 20, 98);

  doc.setFont("helvetica", "bold");
  doc.text("Top 3 Key Risks", 20, 130);
  doc.setFont("helvetica", "normal");
  report.keyRisks.slice(0, 3).forEach((risk: string, i: number) => {
    const lines = doc.splitTextToSize(`• ${risk}`, 170);
    doc.text(lines, 20, 140 + (i * 15));
  });

  // Page 3: Metrics Table
  doc.addPage();
  doc.setFontSize(20);
  doc.text("Bias Metrics Analysis", 20, 30);

  doc.setFontSize(10);
  doc.line(20, 45, 190, 45);
  doc.setFont("helvetica", "bold");
  doc.text("Attribute", 25, 52);
  doc.text("DP Diff", 80, 52);
  doc.text("EO Diff", 120, 52);
  doc.text("Calibration", 160, 52);
  doc.setFont("helvetica", "normal");
  doc.line(20, 55, 190, 55);

  metrics.forEach((m: any, i: number) => {
    const y = 62 + (i * 10);
    doc.text(m.attribute, 25, y);
    doc.text(`${(m.demographicParityDifference * 100).toFixed(1)}%`, 80, y);
    doc.text(`${(m.equalizedOddsDifference * 100).toFixed(1)}%`, 120, y);
    doc.text(`${(m.calibrationGap * 100).toFixed(1)}%`, 160, y);
    doc.line(20, y + 3, 190, y + 3);
  });

  // Page 4: Regulatory Flags
  doc.addPage();
  doc.setFontSize(20);
  doc.text("Regulatory Findings", 20, 30);

  flags.forEach((flag: any, i: number) => {
    const y = 50 + (i * 50);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(flag.title, 20, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text(flag.citation, 20, y + 7);
    doc.setFont("helvetica", "normal");
    const explLines = doc.splitTextToSize(flag.explanation, 170);
    doc.text(explLines, 20, y + 15);
    doc.rect(20, y - 5, 2, 35, "F"); // Side bar
  });

  // Page 5: Recommended Fixes
  doc.addPage();
  doc.setFontSize(20);
  doc.text("Recommended Remediation", 20, 30);

  report.suggestedFixes.forEach((fix: string, i: number) => {
    const y = 50 + (i * 20);
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(`${i + 1}. ${fix}`, 170);
    doc.text(lines, 20, y);
  });

  doc.save(`fairlens-audit-${Date.now()}.pdf`);
  return { ok: true };
}
