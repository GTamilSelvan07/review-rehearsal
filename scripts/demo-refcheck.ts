import { verifyReferences } from "../lib/refcheck";

async function main() {
  const audit = await verifyReferences([
    // Real paper, deliberately wrong year (2016 → should be 2023): expect MISMATCH + corrected BibTeX
    { key: "wrongyear", raw: "", title: "Meetscript: designing transcript-based interactions to support active participation in group video meetings", authors: ["Xinyue Chen"], year: 2016, venue: "", doi: null },
    // Fabricated paper: expect NOT_FOUND
    { key: "fake", raw: "", title: "Empathic haptic keyboards reduce workplace burnout: a longitudinal diary study of remote knowledge workers", authors: ["J. Smith"], year: 2022, venue: "CHI '22", doi: null },
    // Real DOI (the MeetScript CSCW paper): expect VERIFIED via DOI resolution
    { key: "doipath", raw: "", title: "MeetScript: Designing Transcript-based Interactions to Support Active Participation in Group Video Meetings", authors: ["Xinyue Chen"], year: 2023, venue: "", doi: "10.1145/3610196" },
  ]);
  for (const v of audit.verdicts) {
    console.log(`--- [${v.key}] → ${v.status.toUpperCase()} (title score ${v.score.toFixed(2)}, source: ${v.source ?? "none"})`);
    if (v.matchedTitle) console.log(`    matched: "${v.matchedTitle}" (${v.matchedYear}) doi:${v.matchedDoi}`);
    if (v.notes) console.log(`    notes: ${v.notes}`);
    if (v.correctedBibtex) console.log(`    corrected BibTeX offered: yes`);
  }
}
main();
