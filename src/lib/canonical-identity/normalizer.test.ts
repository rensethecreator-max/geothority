/**
 * Basic verification for Canonical Identity Engine
 * Run: npx tsx src/lib/canonical-identity/normalizer.test.ts
 */

import {
  normalizeBusinessProfile,
  normalizePhoneE164,
  normalizePhoneCompare,
  normalizeAddress,
  normalizeBusinessName,
  normalizeState,
  normalizeWebsite,
  normalizeHours,
  validateCanonicalProfile,
  computeIdentityConfidence,
  diffCanonicalVsFound,
  scoreCitationImpact,
  prioritizeFixActions,
} from "./normalizer";
import type { CanonicalProfile, FieldDiff } from "./types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${label}`);
  }
}

function assertEq(actual: any, expected: any, label: string) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${label} — got "${actual}", expected "${expected}"`);
  }
}

// ── Phone ──────────────────────────────────────────────────
console.log("\n📞 Phone normalization");
assertEq(normalizePhoneE164("(555) 123-4567"), "+15551234567", "US phone E.164");
assertEq(normalizePhoneE164("555-123-4567"), "+15551234567", "dashed phone");
assertEq(normalizePhoneE164("15551234567"), "+15551234567", "11-digit phone");
assertEq(normalizePhoneCompare("(555) 123-4567"), "5551234567", "phone compare strips +1");

// ── Address ────────────────────────────────────────────────
console.log("🏠 Address normalization");
assertEq(normalizeAddress("123 Main Street, Suite 4"), "123 main st ste 4", "address abbreviations");
assertEq(normalizeAddress("456 North Avenue"), "456 n ave", "direction abbreviation");
assert(normalizeAddress("789 Blvd").includes("blvd"), "blvd preserved if already abbreviated");

// ── Business Name ──────────────────────────────────────────
console.log("🏢 Business name normalization");
assertEq(normalizeBusinessName("acme plumbing llc"), "Acme Plumbing LLC", "name + suffix");
assertEq(normalizeBusinessName("  joe's auto inc.  "), "Joe's Auto Inc", "name trim + suffix");

// ── State ──────────────────────────────────────────────────
console.log("🗺️ State normalization");
assertEq(normalizeState("california"), "CA", "state full name");
assertEq(normalizeState("ca"), "CA", "state code lowercase");
assertEq(normalizeState("NY"), "NY", "state code already correct");

// ── Website ────────────────────────────────────────────────
console.log("🌐 Website normalization");
assert(normalizeWebsite("WWW.Example.COM").includes("example.com"), "strips www");
assert(!normalizeWebsite("https://example.com/").endsWith("/"), "strips trailing slash");

// ── Hours ──────────────────────────────────────────────────
console.log("🕐 Hours normalization");
const hours = normalizeHours({
  monday: { open: "9:00 AM", close: "5:00 PM" },
  tuesday: { open: "08:00", close: "18:00" },
  wednesday: "closed",
});
assertEq(hours.monday?.open, "09:00", "12h to 24h conversion AM");
assertEq(hours.monday?.close, "17:00", "12h to 24h conversion PM");
assertEq(hours.tuesday?.open, "08:00", "24h passthrough");
assertEq(hours.wednesday, null, "closed = null");

// ── Full Profile Normalization ─────────────────────────────
console.log("\n📋 Full profile normalization");
const profile = normalizeBusinessProfile({
  businessName: "acme plumbing llc",
  streetAddress: "123 Main Street",
  city: "springfield",
  state: "illinois",
  postalCode: "62701",
  phone: "(555) 123-4567",
  website: "www.acmeplumbing.com/",
  categories: ["Plumber", "Emergency Plumber"],
  hours: { monday: { open: "8:00 AM", close: "6:00 PM" } },
});

assertEq(profile.businessName, "Acme Plumbing LLC", "profile name normalized");
assertEq(profile.state, "IL", "profile state normalized");
assertEq(profile.phone, "+15551234567", "profile phone E.164");
assert(profile.identityHash.length === 16, "identity hash is 16 chars");

// ── Validation ─────────────────────────────────────────────
console.log("\n✅ Validation");
const issues = validateCanonicalProfile(profile);
assert(issues.filter((i) => i.severity === "error").length === 0, "complete profile has no errors");
const badProfile = normalizeBusinessProfile({ businessName: "" });
const badIssues = validateCanonicalProfile(badProfile);
assert(badIssues.filter((i) => i.severity === "error").length >= 1, "empty profile has errors");

// ── Confidence Scoring ─────────────────────────────────────
console.log("\n🎯 Confidence scoring");
const confidence = computeIdentityConfidence([
  { field: "businessName", value: "Acme Plumbing", sources: ["gbp", "user_input"], lastVerified: new Date().toISOString(), hasValidation: true },
  { field: "phone", value: "+15551234567", sources: ["gbp"], lastVerified: new Date().toISOString(), hasValidation: true },
  { field: "streetAddress", value: "123 Main St", sources: ["user_input"], lastVerified: null, hasValidation: false },
  { field: "website", value: "https://acme.com", sources: ["website"], lastVerified: null, hasValidation: false },
]);
assert(confidence.overallScore >= 50, `confidence score reasonable: ${confidence.overallScore}`);
assert(confidence.topGaps.length > 0, "identifies gaps");
console.log(`  Overall confidence: ${confidence.overallScore} (${confidence.level})`);

// ── Diff Engine ─────────────────────────────────────────────
console.log("\n🔍 Diff engine (citation truth)");
const found = {
  name: "Acme Plumbing LLC",
  address: "123 Main St",
  phone: "(555) 123-4568", // wrong last digit
  city: "Springfield",
  state: "IL",
  website: "https://acmeplumbing.com",
  categories: ["Plumber"],
};
const diffs = diffCanonicalVsFound(profile, found);
const phoneDiff = diffs.find((d) => d.field === "phone");
assert(phoneDiff?.status === "mismatch", "phone mismatch detected");
const nameDiff = diffs.find((d) => d.field === "businessName");
assert(nameDiff?.status === "match", "name match detected");
console.log(`  Diffs: ${diffs.map((d) => `${d.field}=${d.status}`).join(", ")}`);

// ── Citation Impact ─────────────────────────────────────────
console.log("\n💥 Citation impact scoring");
if (phoneDiff) {
  const impact = scoreCitationImpact(phoneDiff);
  assert(impact.impactScore >= 30, `phone mismatch has high impact: ${impact.impactScore}`);
  assert(impact.affectedFactors.includes("NAP Consistency"), "phone affects NAP");
  console.log(`  Phone mismatch impact: ${impact.impactScore}/100, ~$${impact.estimatedMonthlyCost}/mo cost, urgency: ${impact.urgency}`);
}

// ── Prioritization ──────────────────────────────────────────
console.log("\n📊 Action prioritization");
const actions = prioritizeFixActions(diffs, "Yelp", "major");
assert(actions.length > 0, "actions generated");
assert(actions[0]?.impact.impactScore >= actions[actions.length - 1]?.impact.impactScore, "sorted by impact");
console.log(`  Top actions: ${actions.slice(0, 3).map((a) => `${a.field}(${a.impact.impactScore})`).join(", ")}`);

// ── Summary ────────────────────────────────────────────────
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("✅ All canonical identity engine checks passed!\n");
