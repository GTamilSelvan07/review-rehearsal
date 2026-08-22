import { verifyReferences } from "../lib/refcheck";

const refs = [
  { key: "11", raw: "", title: "Hybrid harmony: a multi-person neurofeedback application for interpersonal synchrony", authors: [], year: null, venue: "", doi: null },
  { key: "15", raw: "", title: "Meetscript: designing transcript-based interactions to support active participation in group video meetings", authors: ["Xinyue Chen"], year: 2023, venue: "", doi: null },
  { key: "17", raw: "", title: "Promoting social connectedness through multi-person neurofeedback", authors: [], year: null, venue: "", doi: null },
  { key: "18", raw: "", title: "Towards an informational account of interpersonal coordination", authors: [], year: null, venue: "", doi: null },
  { key: "20", raw: "", title: "Common ground", authors: ["Robert Stalnaker"], year: 2002, venue: "", doi: null },
  { key: "22", raw: "", title: "Referring as a collaborative process", authors: ["Herbert H. Clark", "Deanna Wilkes-Gibbs"], year: 1986, venue: "", doi: null },
  { key: "30", raw: "", title: "Coming to terms: Quantifying the benefits of linguistic coordination", authors: [], year: null, venue: "", doi: null },
];

async function main() {
const audit = await verifyReferences(refs);
for (const v of audit.verdicts) {
  console.log(`[${v.key}] ${v.status.toUpperCase()} (${v.score.toFixed(2)}) via ${v.source ?? "-"} — ${v.matchedTitle ?? v.notes}`);
}
console.log(JSON.stringify(audit.summary));
}
main();
