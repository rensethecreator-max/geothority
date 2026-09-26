import { redirect } from "next/navigation";

/**
 * /signup → redirects to /login?mode=signup
 * Ensures /signup URLs in marketing, emails, etc. work seamlessly.
 */
export default async function SignupPage(
  props: {
    searchParams: Promise<{ redirect?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const target = searchParams.redirect
    ? `/login?mode=signup&redirect=${encodeURIComponent(searchParams.redirect)}`
    : "/login?mode=signup";
  redirect(target);
}
