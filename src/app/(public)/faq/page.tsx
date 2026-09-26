import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { ChevronDown } from "lucide-react";

export const metadata: Metadata = {
  title: "FAQ - Geothority Local SEO Platform | Frequently Asked Questions",
  description:
    "Answers for local business owners about the free website scan, paid plans, setup, approvals, supported connections, and what to expect from Geothority.",
  alternates: { canonical: "https://geothority.io/faq" },
  openGraph: {
    title: "Geothority FAQ - Local SEO Questions Answered",
    description:
      "Understand Geothority’s free scan, ongoing tools, and the work shared with your business or website provider.",
    url: "https://geothority.io/faq",
    type: "website",
  },
};

const questions = [
  {
    "question": "Who is Geothority for?",
    "answer": "Geothority is for small businesses that depend on local customers and want a clearer path to improving online visibility. Insurance agencies, home service companies, professional services, and local practices share this challenge. Start with a website scan to see the findings for your own business."
  },
  {
    "question": "What will I get from the free scan?",
    "answer": "Create a free account, add your business details and website, and run a scan. You get a visibility score, findings grouped by area, and prioritized next steps. No payment card is required for the Free plan, and signing up does not start a paid subscription."
  },
  {
    "question": "What do I need to get started?",
    "answer": "You need an account, your business details, and your website address. You do not need a customer list for the website scan. You can connect supported services later when you choose to use features that need them."
  },
  {
    "question": "What does the visibility score mean?",
    "answer": "The Trust Stack score is Geothority’s assessment of the signals it can check, grouped into website foundations, business information, local content, reviews, and AI readiness. Use the score and individual findings to prioritize work and compare scans. It is not a Google score, a search ranking, or a prediction of leads."
  },
  {
    "question": "Will this work with my existing website?",
    "answer": "You can scan your existing public website without replacing it. Applying changes depends on your website platform, access, and available integrations. Where direct publishing is supported and connected, you can use that workflow. Otherwise, use the prepared content or instructions in your website builder, or share them with your website provider."
  },
  {
    "question": "What does Geothority do, and what do I do?",
    "answer": "Geothority checks available signals, organizes findings, and provides recommendations and supported tools for the next step. You confirm business details, review content for accuracy, connect the accounts you want to use, and approve customer-facing work. Website changes that cannot be applied through a supported connection need you or your website provider."
  },
  {
    "question": "How much time should I set aside?",
    "answer": "Start by entering your business details and reviewing the first report. The ongoing time depends on the findings, your chosen tools, and whether you or a website provider applies changes. Focus on a few priorities at a time. We do not promise a fixed setup time or a completely hands-off service."
  },
  {
    "question": "What do paid plans add?",
    "answer": "Starter adds tools for a connected Google Business Profile, business listing checks, and email support. Growth adds AI visibility checks, competitor tracking, Google post tools, supported listing sync, and review request workflows. Authority adds local and service page drafts, FAQ and other content drafts, reporting exports, and an onboarding call. Connected features require setup; see Pricing for the current scope and limits."
  },
  {
    "question": "How does the 14-day paid trial work?",
    "answer": "Choose a paid plan in Billing after creating your account. Paid checkout includes a 14-day trial and collects a payment card. Billing begins automatically at the end of the trial unless you cancel first. The free account and website scan are separate and do not require a card. Review the price and renewal date before completing checkout."
  },
  {
    "question": "Why keep using Geothority after the first scan?",
    "answer": "The first scan establishes your starting point. Continue using the tools in your plan to revisit findings, review changes, compare competitors where included, and work through improvements. With Authority, you can also prepare new content as your services and locations need it. Progress comes from reviewing and implementing appropriate changes, not simply running more scans."
  },
  {
    "question": "What is local search visibility?",
    "answer": "It is how easily someone in your service area can find your business when looking for what you offer. Examples include an insurance shopper searching for a nearby agent, a homeowner looking for a plumber, or a patient searching for a local practice. Geothority helps you inspect the business information and website signals that support discovery."
  },
  {
    "question": "What do AI visibility checks tell me?",
    "answer": "They show results from the supported AI sources and queries checked for your business. Coverage depends on available connections and source access. A checked result, an unavailable source, and an estimate are different; review the status in your results. A mention in one check does not guarantee future recommendations or visibility for every search."
  },
  {
    "question": "How do business listing checks and sync work?",
    "answer": "Listing checks help you review whether your business name, address, phone, and other details agree across supported sources. Sync can submit or update information through a supported connected service where available. A submitted change is not a guarantee that every directory has accepted or published it; some listings still require owner verification or a manual update."
  },
  {
    "question": "How do review requests work?",
    "answer": "Review workflows help you invite customers to share honest experiences and organize follow-up after setup. Use customer details you are authorized to contact and review the message before sending. Every invited customer should have the same opportunity to leave a public review, regardless of sentiment. Private feedback is an optional channel, not a filter for who receives the public review link."
  },
  {
    "question": "How quickly will my ranking or inquiries improve?",
    "answer": "There is no guaranteed timeline or ranking increase. Results depend on your starting point, competition, the changes you implement, and how search services respond. Start by checking whether the recommended changes were completed and whether scan findings changed. Track actual calls, inquiries, or bookings separately when you have that data."
  },
  {
    "question": "Are there scan limits?",
    "answer": "Website scans currently allow up to 3 requests in a rolling 24-hour window per account on every plan. Other tools may have separate limits. If you reach the scan limit, wait for earlier requests to leave that window before trying again. Paid plans unlock additional tools rather than unlimited use of every feature."
  },
  {
    "question": "Can I manage multiple businesses or locations?",
    "answer": "The standard account is designed for one business. Contact us before signing up for multiple businesses, locations, team seats, white-label reporting, or API access so we can confirm your setup and availability."
  },
  {
    "question": "Where can I read about data and subscription terms?",
    "answer": "Read our Privacy Policy for how information is used and our Terms of Service for subscription, cancellation, and refund terms. Only connect accounts you are authorized to manage, and review requested permissions before connecting a service."
  }
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: questions.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
};

const faqs = faqSchema.mainEntity;

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <PublicHeader />

      <section className="pt-32 pb-12 px-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm font-medium mb-5 border border-emerald-500/20">
          Help Center
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
        <p className="text-[var(--muted-foreground)] max-w-xl mx-auto mb-4">
          Clear answers about your first scan, the work involved, and what happens next.
        </p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Can&apos;t find your answer?{" "}
          <Link href="mailto:hello@geothority.io" className="text-emerald-400 hover:underline">
            Email us
          </Link>
        </p>
      </section>

      <section className="px-4 pb-20">
        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((item) => (
            <FAQAccordion key={item.name} question={item.name} answer={item.acceptedAnswer.text} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[var(--card)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to see where you stand?</h2>
          <p className="text-[var(--muted-foreground)] mb-6">
            Create a free account to scan your website and review your next priorities. No payment card required.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold py-3 px-8 rounded-xl transition-colors"
          >
            Check my business’s visibility →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image src="/logo.svg" alt="Geothority" width={128} height={32} className="h-8 w-auto object-contain" />
              <span className="font-semibold">Geothority</span>
            </div>
            <div className="flex flex-wrap items-center gap-5 text-sm text-[var(--muted-foreground)]">
              <Link href="/faq" className="hover:text-[var(--foreground)] transition-colors">FAQ</Link>
              <Link href="/pricing" className="hover:text-[var(--foreground)] transition-colors">Pricing</Link>
              <Link href="/service-facts" className="hover:text-[var(--foreground)] transition-colors">What You Get</Link>
              <Link href="/compare/geothority-vs-brightlocal" className="hover:text-[var(--foreground)] transition-colors">Compare</Link>
              <Link href="/insurance-agents" className="hover:text-[var(--foreground)] transition-colors">Insurance Agents</Link>
              <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">Terms of Service</Link>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">© {new Date().getFullYear()} Geothority. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FAQAccordion({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-emerald-500/30 transition-colors">
      <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-semibold text-sm leading-relaxed hover:text-emerald-400 transition-colors">
        {question}
        <ChevronDown className="w-4 h-4 flex-shrink-0 text-[var(--muted-foreground)] group-open:rotate-180 transition-transform duration-200" />
      </summary>
      <div className="px-6 pb-5 text-sm text-[var(--muted-foreground)] leading-relaxed border-t border-[var(--border)]">
        <div className="pt-4">{answer}</div>
      </div>
    </details>
  );
}
