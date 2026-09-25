import assert from "node:assert/strict";
import { test } from "node:test";
import { createAdminClient } from "../e2e/helpers/supabase-admin.mjs";

test("E2E admin helper refuses the production Supabase project", () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://ugdpnzxphvdcakcctvqb.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-not-a-real-key";

  try {
    assert.throws(createAdminClient, /cannot write to the Geothority production Supabase project/);
  } finally {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousServiceKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceKey;
  }
});
