import { PublicHeader } from "@/components/layout/public-header";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <PublicHeader />
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto prose prose-invert">
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-sm text-[var(--muted-foreground)] mb-8">
            Last updated: March 30, 2026
          </p>

          <div className="space-y-6 text-sm text-[var(--muted-foreground)] leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">1. Information We Collect</h2>
              <p>When you use Geothority, we collect:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong className="text-[var(--foreground)]">Account Information:</strong> Name, email address, and profile picture from your Google account when you sign in.</li>
                <li><strong className="text-[var(--foreground)]">Business Information:</strong> Business name, website URL, city, and state that you provide during scans.</li>
                <li><strong className="text-[var(--foreground)]">Scan Data:</strong> Results from website scans including scores, identified issues, and recommendations.</li>
                <li><strong className="text-[var(--foreground)]">Generated Content:</strong> Landing pages and other content created through our local page generator.</li>
                <li><strong className="text-[var(--foreground)]">Usage Data:</strong> How you interact with our application, including pages visited and features used.</li>
                <li><strong className="text-[var(--foreground)]">Payment Information:</strong> Processed securely by Stripe. We never store credit card numbers.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">2. How We Use Your Information</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Perform website scans and generate trust stack analyses</li>
                <li>Generate content for your insurance agency</li>
                <li>Publish content to your CMS on your behalf</li>
                <li>Process payments and manage your subscription</li>
                <li>Send relevant product updates and alerts</li>
                <li>Improve our scanning algorithms and content quality</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">3. Data Storage & Security</h2>
              <p>Your data is stored securely using Supabase (PostgreSQL) with row-level security. All data is encrypted in transit (TLS) and at rest. CMS credentials are encrypted before storage.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">4. Third-Party Services</h2>
              <p>We use the following third-party services:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong className="text-[var(--foreground)]">Google OAuth:</strong> Authentication</li>
                <li><strong className="text-[var(--foreground)]">Supabase:</strong> Database and authentication</li>
                <li><strong className="text-[var(--foreground)]">OpenAI:</strong> content generation and analysis</li>
                <li><strong className="text-[var(--foreground)]">Stripe:</strong> Payment processing</li>
                <li><strong className="text-[var(--foreground)]">Vercel:</strong> Application hosting</li>
                <li><strong className="text-[var(--foreground)]">Resend:</strong> Transactional email delivery</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">5. Your Rights</h2>
              <p>You can:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Access all data we hold about you</li>
                <li>Request deletion of your account and associated data</li>
                <li>Export your generated content at any time</li>
                <li>Revoke CMS publishing permissions</li>
                <li>Opt out of non-essential communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">6. Cookies</h2>
              <p>We use essential cookies for authentication and session management. No tracking cookies are used.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">7. Children&apos;s Privacy</h2>
              <p>Geothority is not intended for users under 18 years of age. We do not knowingly collect information from children.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">8. Changes to This Policy</h2>
              <p>We may update this policy from time to time. We will notify you of material changes via email or in-app notification.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">9. Contact</h2>
              <p>For privacy questions, contact us at: <a href="mailto:will@4minuteworkday.com" className="text-emerald-500 hover:underline">will@4minuteworkday.com</a></p>
            </section>
          </div>
        </div>
      </div>

      <footer className="border-t border-[var(--border)] py-8 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-sm text-[var(--muted-foreground)]">
          <Link href="/" className="hover:text-[var(--foreground)]">← Back to home</Link>
          <Link href="/terms" className="hover:text-[var(--foreground)]">Terms of Service →</Link>
        </div>
      </footer>
    </div>
  );
}
