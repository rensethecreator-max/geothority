import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSafeRedirect } from "@/lib/auth/safe-redirect";
import { normalizePublicHttpUrl } from "@/lib/security/public-url";
import { isSafeGoogleReviewUrl } from "@/lib/reputation/template-utils";

describe("authentication redirects", () => {
  it("keeps same-origin application paths and their query/hash", () => {
    assert.equal(getSafeRedirect("/dashboard?tab=overview#top"), "/dashboard?tab=overview#top");
  });

  it("rejects absolute, scheme-relative, backslash, and control-character redirects", () => {
    for (const value of ["https://attacker.example", "//attacker.example", "/\\attacker.example", "/dashboard\n//attacker.example"]) {
      assert.equal(getSafeRedirect(value), "/dashboard");
    }
  });
});

describe("scanner URL validation", () => {
  it("normalizes public HTTP URLs and removes fragments", () => {
    assert.equal(normalizePublicHttpUrl("example.com/path#private").toString(), "https://example.com/path");
  });

  it("rejects local, reserved, credentialed, and nonstandard-port targets", () => {
    for (const value of [
      "http://127.0.0.1",
      "http://10.0.0.8",
      "http://169.254.169.254/latest/meta-data",
      "http://[::1]/",
      "https://user:pass@example.com",
      "https://example.com:8443",
      "file:///etc/passwd",
    ]) {
      assert.throws(() => normalizePublicHttpUrl(value), `Expected ${value} to be rejected`);
    }
  });
});

describe("Google review destination validation", () => {
  it("accepts HTTPS links on supported Google review hosts", () => {
    for (const value of ["https://g.page/r/example/review", "https://maps.app.goo.gl/example", "https://www.google.com/maps?cid=123"]) {
      assert.equal(isSafeGoogleReviewUrl(value), true);
    }
  });

  it("rejects lookalike domains and non-HTTPS links", () => {
    for (const value of ["http://google.com/maps", "https://google.com.attacker.example/", "https://g.page.attacker.example/"]) {
      assert.equal(isSafeGoogleReviewUrl(value), false);
    }
  });
});
