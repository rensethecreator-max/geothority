import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCheck, Search, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/layout/public-header";

type Industry = {
  name: string;
  h1: string;
  description: string;
  opportunities: { title: string; desc: string }[];
  example: { business: string; gap: string; action: string; approval: string };
  faqs: { q: string; a: string }[];
};

const industries: Record<string, Industry> = {
  "insurance-agents": {
    name: "Independent Insurance Agencies",
    h1: "Help local insurance shoppers find your agency.",
    description: "Identify gaps in your agency's online presence and get a clear list of what to improve. Help shoppers understand your services, your experience, and how to request a quote.",
    opportunities: [
      { title: "Explain the insurance you offer", desc: "Make your lines of business and service area easy to understand. A shopper should be able to tell whether you can help before calling." },
      { title: "Keep your agency details consistent", desc: "Review the business name, address, phone number, and hours shown on your website and public profiles. Work through conflicting information where you find it." },
      { title: "Build trust with honest feedback", desc: "Give all customers a consistent invitation to leave an honest review. Prepare responses that respect client privacy." },
    ],
    example: { business: "An independent agency offering home and auto insurance", gap: "An About page link was not detected on the scanned page.", action: "Check whether an About page exists and is clearly linked. Add verified agency experience, team information, and the communities served where useful.", approval: "The agency verifies business details and carrier references; its website provider applies approved changes." },
    faqs: [
      { q: "Do I need to upload client or policy information?", a: "No. The initial website scan needs business details and a public website, not client records or policy documents." },
      { q: "Who reviews insurance content?", a: "Your agency does. Check generated drafts for coverage accuracy, licensing details, carrier requirements, and your own approval process before publishing." },
    ],
  },
  "home-services": {
    name: "Home Service Businesses",
    h1: "Help nearby homeowners find your business when they need you.",
    description: "For plumbers, HVAC companies, electricians, cleaners, and other local service businesses. Find gaps in your online presence and make your services and coverage area easier to understand.",
    opportunities: [
      { title: "Make your service area clear", desc: "Show the towns and neighborhoods you actually serve so homeowners can quickly decide whether to contact you." },
      { title: "Explain the work you do", desc: "Give specific services a useful explanation. Help a visitor distinguish repairs, installation, routine maintenance, and emergency work where offered." },
      { title: "Make it easier to choose you", desc: "Keep contact details current, explain how to request service, and support a consistent process for inviting honest customer reviews." },
    ],
    example: { business: "A local HVAC company", gap: "A service-area page link was not detected on the scanned page.", action: "Review the existing navigation. Link to a useful service-area page that accurately explains which towns the company serves.", approval: "The owner verifies availability, licensing claims, and services; the website provider publishes the approved content." },
    faqs: [
      { q: "Can this work for a business that travels to customers?", a: "Yes. Use your real service area and public business details. Any Google Business Profile changes should reflect how your business actually operates, including whether customers visit your address." },
      { q: "Will Geothority book jobs or answer my calls?", a: "Geothority focuses on visibility findings and improvement work. Your existing phone, booking, and dispatch systems continue to handle customer inquiries." },
    ],
  },
  "accountants": {
    name: "Accountants & Bookkeepers",
    h1: "Help local clients find the right accounting help.",
    description: "Make your expertise easier to discover and understand. Find website visibility gaps and plan useful improvements for the clients, services, and communities your firm serves.",
    opportunities: [
      { title: "Clarify who you help", desc: "Help prospective clients distinguish personal tax preparation, bookkeeping, payroll, and business advisory services that your firm actually offers." },
      { title: "Show your experience clearly", desc: "Bring verified qualifications, team information, and areas of focus into view so visitors can assess whether your firm fits their needs." },
      { title: "Make the first contact straightforward", desc: "Keep your hours and contact details clear, and explain how a prospective client can arrange an initial conversation." },
    ],
    example: { business: "A bookkeeping firm serving local small businesses", gap: "An FAQ page link was not detected on the scanned page.", action: "Check for existing questions and answers. Add a clear link or prepare useful answers about monthly bookkeeping and arranging a consultation.", approval: "The firm verifies credentials and service descriptions; its website provider publishes the approved draft." },
    faqs: [
      { q: "Does Geothority need client financial records?", a: "No. Start with your public website and business details. The initial visibility scan does not require tax returns, bookkeeping records, or client documents." },
      { q: "Can I review every content draft?", a: "Yes. Your firm should check all descriptions of qualifications, services, and financial topics before publishing. Generated drafts support your editorial process." },
    ],
  },
  "real-estate-agents": {
    name: "Real Estate Professionals",
    h1: "Help local buyers and sellers discover your expertise.",
    description: "Give prospective clients a clearer view of the communities you serve and the help you offer. Start with a website scan and a practical list of visibility improvements.",
    opportunities: [
      { title: "Make your local knowledge visible", desc: "Use accurate, firsthand information about the communities you serve. Give visitors something useful beyond a list of city names." },
      { title: "Explain your services", desc: "Help buyers and sellers understand what working with you involves and how to start a conversation." },
      { title: "Keep your professional details clear", desc: "Check brokerage, contact, and service-area information for accuracy. Review public business details when your office or affiliation changes." },
    ],
    example: { business: "An agent helping first-time buyers", gap: "An FAQ page link was not detected on the scanned page.", action: "Check the existing navigation and prepare clearly linked answers to common buyer questions, using the agent's firsthand local knowledge.", approval: "The agent and brokerage verify local facts, disclosures, and wording before publishing." },
    faqs: [
      { q: "Does Geothority replace my property listings or CRM?", a: "No. It helps you review and improve your public online presence. Your existing listing, CRM, and transaction tools remain separate." },
      { q: "Can I create pages for different communities?", a: "Content tools can help prepare drafts where included in your plan. Each page should contain useful, accurate information about a community you serve, with your own review before publication." },
    ],
  },
  "dentists": {
    name: "Dental Practices",
    h1: "Help nearby patients find and understand your practice.",
    description: "Make your practice's services, location, and next steps easier to discover. Identify website visibility gaps and prioritize improvements with your team.",
    opportunities: [
      { title: "Explain the care you provide", desc: "Help patients understand your services and how to contact the practice. Keep treatment descriptions accurate and easy to read." },
      { title: "Keep practice information current", desc: "Review your location, phone number, office hours, and public business details so patients know where and how to reach you." },
      { title: "Build a thoughtful review process", desc: "Invite honest feedback consistently and keep responses focused on the practice. Protect patient confidentiality in every public response." },
    ],
    example: { business: "A neighborhood family dental practice", gap: "A phone number was not detected on the scanned page.", action: "Check the page and add the correct practice phone number where patients can easily find it, alongside accurate contact information.", approval: "The practice verifies its phone number and contact details; its website provider publishes approved changes." },
    faqs: [
      { q: "Do I need to share patient information?", a: "No. The initial scan uses your public website and business details. Patient records are not needed to review website visibility." },
      { q: "Who approves treatment descriptions?", a: "Your practice does. A qualified member of your team should review clinical wording and any claims before publication." },
    ],
  },
  "lawyers": {
    name: "Law Firms",
    h1: "Help local clients understand how your firm can help.",
    description: "Make your practice areas, location, and experience easier to discover. Get a clearer starting point for improving your firm's public online presence.",
    opportunities: [
      { title: "Clarify your practice areas", desc: "Help visitors understand the types of matters you handle and where you practice, without promising an outcome." },
      { title: "Make experience easy to assess", desc: "Bring accurate attorney biographies, qualifications, and contact information into view for prospective clients." },
      { title: "Organize your next improvements", desc: "Use scan findings to prioritize website information and technical fixes, then coordinate approved changes with your website provider." },
    ],
    example: { business: "A local estate-planning practice", gap: "An About page link was not detected on the scanned page.", action: "Check whether attorney and firm information is clearly linked. Add verified biographies, qualifications, and practice information where needed.", approval: "The firm checks legal wording and applicable advertising requirements before its website provider publishes changes." },
    faqs: [
      { q: "Is generated content ready to publish without review?", a: "Treat it as a draft. Your firm should verify legal accuracy and applicable advertising requirements before publication." },
      { q: "Does the scan need client or case information?", a: "No. Start with public business details and your website. Confidential client or case information is not needed for the initial scan." },
    ],
  },
  "restaurants": {
    name: "Restaurants & Cafés",
    h1: "Help nearby diners find the details they need to choose you.",
    description: "Make your restaurant's menu, location, and contact information easier to find. Start with a website scan and a clear plan for improving your public presence.",
    opportunities: [
      { title: "Make essential details easy to find", desc: "Help diners locate the menu, opening hours, address, and available reservation or ordering options." },
      { title: "Keep information consistent", desc: "Review public details when hours, menus, or contact information change so customers can make plans with confidence." },
      { title: "Invite honest customer feedback", desc: "Create a consistent review invitation and response routine. Keep the invitation open to customers regardless of their experience." },
    ],
    example: { business: "A neighborhood café", gap: "Business schema markup was not detected on the scanned page.", action: "Review the existing website setup and prepare structured business details, such as the café's name, address, and opening hours, for the website provider.", approval: "The owner verifies business details and hours; the website provider reviews and applies approved markup." },
    faqs: [
      { q: "Does this replace my ordering or reservation system?", a: "No. Geothority helps you review your public presence. Your existing ordering, reservation, and point-of-sale systems remain separate." },
      { q: "Will a review campaign guarantee a higher rating?", a: "No. Reviews should reflect customers' honest experiences. Invite feedback consistently and use it to inform your service and response process." },
    ],
  },
};

const sharedFaqs = [
  { q: "What do I get when I start?", a: "Create a free account, enter your business details and website, and run a scan. Review the findings and recommended priorities. Paid tools and ongoing monitoring depend on the plan you choose." },
  { q: "Will this work with my existing website?", a: "Start with your current public website. Geothority does not require a website rebuild. Applying changes may need your website provider's help; connected actions require supported access and setup." },
  { q: "Will Geothority guarantee rankings or new customers?", a: "No. It gives you findings and tools to guide improvement work. Rankings, AI answers, and customer activity vary. A scan score is a view of measured signals, not a search position or a promise of leads." },
];

export function generateStaticParams() {
  return Object.keys(industries).map((slug) => ({ slug }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const data = Object.prototype.hasOwnProperty.call(industries, slug) ? industries[slug] : undefined;
  if (!data) return {};
  return {
    title: `Local Visibility for ${data.name} | Geothority`,
    description: data.description,
    alternates: { canonical: slug === "insurance-agents" ? "https://geothority.io/insurance-agents" : `https://geothority.io/for/${slug}` },
    openGraph: { title: data.h1, description: data.description },
  };
}

export default async function IndustryPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const data = Object.prototype.hasOwnProperty.call(industries, slug) ? industries[slug] : undefined;
  if (!data) notFound();
  const faqs = [...data.faqs, ...sharedFaqs];
  const cta = slug === "insurance-agents" ? "Check my agency's visibility" : "Check my business's visibility";

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PublicHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        <section className="text-center mb-16">
          <div className="inline-block px-4 py-1.5 border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 rounded-full text-sm font-medium mb-6">Built for {data.name.toLowerCase()}</div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight tracking-tight text-balance">{data.h1}</h1>
          <p className="text-lg leading-8 text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">{data.description}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl font-semibold transition-colors">{cta} <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>
            <Link href="#industry-example" className="inline-flex items-center justify-center px-7 py-4 rounded-xl border border-[var(--border)] font-semibold hover:border-emerald-400 transition-colors">See an example</Link>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] mt-5">Create a free account to run your scan. No credit card needed for the free plan.</p>
        </section>

        <section id="industry-example" className="scroll-mt-24 bg-[var(--card)] border border-emerald-500/30 rounded-3xl p-6 sm:p-9 mb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300 mb-3">Illustrative example · not a customer result</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-8">{data.example.business}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { label: "The gap", text: data.example.gap },
              { label: "The next step", text: data.example.action },
              { label: "Your role", text: data.example.approval },
            ].map((item) => (<div key={item.label} className="border-t border-[var(--border)] pt-4"><h3 className="font-semibold text-emerald-300 mb-2">{item.label}</h3><p className="text-sm leading-7 text-[var(--muted-foreground)]">{item.text}</p></div>))}
          </div>
          <p className="text-xs leading-relaxed text-[var(--muted-foreground)] mt-6">Your findings depend on your website and available data. Content tools and monitoring vary by plan.</p>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-3 text-center">Make the next improvement clear.</h2>
          <p className="text-[var(--muted-foreground)] text-center mb-9 max-w-2xl mx-auto leading-7">Focus on the information that helps people understand your business and take the next step.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {data.opportunities.map((item) => (<div key={item.title} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6"><CheckCircle2 className="w-6 h-6 text-emerald-300 mb-4" aria-hidden="true" /><h3 className="font-semibold mb-3">{item.title}</h3><p className="text-sm text-[var(--muted-foreground)] leading-7">{item.desc}</p></div>))}
          </div>
        </section>

        <section className="mb-16 rounded-3xl border border-[var(--border)] p-6 sm:p-9">
          <h2 className="text-3xl font-bold mb-8">A practical way to get started.</h2>
          <div className="grid md:grid-cols-3 gap-7">
            {[
              { icon: Search, title: "Scan your website", text: "Use your business details and public website to establish a starting point. No customer records are needed for the initial scan." },
              { icon: ClipboardCheck, title: "Choose your priorities", text: "Review the findings and decide what to improve first. Use the tools available in your plan to prepare the next steps." },
              { icon: ShieldCheck, title: "Review and follow through", text: "Approve business details and content before publication. Coordinate website changes with your provider, then revisit the measured signals." },
            ].map((step) => (<div key={step.title}><step.icon className="h-6 w-6 text-emerald-300 mb-4" aria-hidden="true" /><h3 className="font-semibold mb-3">{step.title}</h3><p className="text-sm leading-7 text-[var(--muted-foreground)]">{step.text}</p></div>))}
          </div>
          <Link href="/service-facts" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 underline underline-offset-4">See what Geothority includes <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </section>

        <section className="mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Before you get started.</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (<details key={faq.q} className="bg-[var(--card)] rounded-2xl border border-[var(--border)]"><summary className="p-5 cursor-pointer font-semibold">{faq.q}</summary><p className="px-5 pb-5 text-sm text-[var(--muted-foreground)] leading-7">{faq.a}</p></details>))}
          </div>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })) }).replace(/</g, "\\u003c") }} />
        </section>

        <section className="text-center bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-3xl border border-emerald-500/20 p-7 sm:p-10">
          <h2 className="text-3xl font-bold mb-4">See what to improve first.</h2>
          <p className="text-[var(--muted-foreground)] mb-7 max-w-lg mx-auto leading-7">Start with your own website and a clear set of priorities for your business.</p>
          <Link href="/signup" className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl font-semibold transition-colors">{cta} <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>
          <div className="mt-5"><Link href="/pricing" className="text-sm text-[var(--muted-foreground)] underline underline-offset-4">Compare free and paid plans</Link></div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--muted-foreground)]">
          <p>&copy; {new Date().getFullYear()} Geothority. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Link href="/" className="hover:text-[var(--foreground)]">For local businesses</Link>
            <Link href="/pricing" className="hover:text-[var(--foreground)]">Pricing</Link>
            <Link href="/privacy" className="hover:text-[var(--foreground)]">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--foreground)]">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
