import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export async function handleOAuthSignIn() {
  const supabase = createClientComponentClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      scopes: ["https://www.googleapis.com/auth/business.manage"],
      redirectTo: `${window.location.origin}/api/auth/callback`,
    },
  });
  if (error) {
    console.log("Error signing in with Google:", error);
  }
  return data;
}
