import { redirect } from "next/navigation";

/**
 * /signup → redirects to /login?mode=signup
 * Ensures /signup URLs in marketing, emails, etc. work seamlessly.
 */
export default function SignupPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const target = searchParams.redirect
    ? `/login?mode=signup&redirect=${encodeURIComponent(searchParams.redirect)}`
    : "/login?mode=signup";
  redirect(target);
}
