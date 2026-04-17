"use client";

import { useState } from "react";
import { Code, CheckCircle2, Copy, ExternalLink, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";

const SCHEMA_TYPES = [
  { id: "LocalBusiness", label: "Local Business", desc: "General local business listing" },
  { id: "InsuranceAgency", label: "Insurance Agency", desc: "Insurance agency with coverage details" },
  { id: "ProfessionalService", label: "Professional Service", desc: "Lawyers, accountants, consultants" },
  { id: "MedicalBusiness", label: "Medical / Dental", desc: "Healthcare providers & clinics" },
  { id: "RealEstateAgent", label: "Real Estate Agent", desc: "Realtors & property agencies" },
  { id: "AutoDealer", label: "Auto Dealer", desc: "Car dealerships & auto services" },
  { id: "Restaurant", label: "Restaurant", desc: "Restaurants, cafes, food businesses" },
  { id: "FAQPage", label: "FAQ Page", desc: "Q&A content for rich results" },
  { id: "Service", label: "Service", desc: "Specific service offering" },
];

interface BusinessDetails {
  name: string;
  url: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  description: string;
  openHours: string;
  priceRange: string;
  faqItems: { question: string; answer: string }[];
}

function generateSchema(type: string, details: BusinessDetails): Record<string, unknown> {
  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": type,
    name: details.name,
    url: details.url,
    telephone: details.phone,
    email: details.email || undefined,
    description: details.description || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: details.address,
      addressLocality: details.city,
      addressRegion: details.state,
      postalCode: details.zip,
      addressCountry: "US",
    },
    openingHours: details.openHours ? [details.openHours] : undefined,
    priceRange: details.priceRange || undefined,
    sameAs: [],
  };

  if (type === "FAQPage") {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      name: details.name,
      mainEntity: details.faqItems
        .filter((f) => f.question && f.answer)
        .map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.answer,
          },
        })),
    };
  }

  // Remove undefined keys
  return Object.fromEntries(Object.entries(base).filter(([, v]) => v !== undefined));
}

export default function SchemaGeneratorPage() {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState("");
  const [copied, setCopied] = useState(false);
  const [details, setDetails] = useState<BusinessDetails>({
    name: "",
    url: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    description: "",
    openHours: "Mo-Fr 09:00-17:00",
    priceRange: "$$",
    faqItems: [
      { question: "", answer: "" },
      { question: "", answer: "" },
    ],
  });

  const schema = selectedType ? generateSchema(selectedType, details) : null;
  const schemaJson = schema ? JSON.stringify(schema, null, 2) : "";
  const schemaTag = `<script type="application/ld+json">\n${schemaJson}\n</script>`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(schemaTag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isFaq = selectedType === "FAQPage";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          Schema Generator
          <InfoTooltip
            content="Code that tells search engines exactly what your business is. It's like a digital business card for Google - helps you appear in rich results."
            side="right"
          />
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Generate valid JSON-LD schema markup to unlock Google rich results.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                s < step
                  ? "bg-emerald-500 text-white"
                  : s === step
                  ? "bg-electric-500 text-white"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)]"
              }`}
            >
              {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
            </div>
            <span
              className={`text-sm font-medium ${s === step ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}
            >
              {s === 1 ? "Schema Type" : s === 2 ? "Business Details" : "Preview & Copy"}
            </span>
            {s < 3 && <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />}
          </div>
        ))}
      </div>

      {/* Step 1 - Select schema type */}
      {step === 1 && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="font-semibold mb-4">Select Schema Type</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SCHEMA_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  selectedType === t.id
                    ? "border-electric-500 bg-electric-500/10"
                    : "border-[var(--border)] hover:border-electric-500/40 hover:bg-[var(--muted)]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{t.label}</span>
                  {selectedType === t.id && (
                    <CheckCircle2 className="w-4 h-4 text-electric-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">{t.desc}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedType}
              className="flex items-center gap-2 px-5 py-2.5 bg-electric-500 hover:bg-electric-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Next: Business Details
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2 - Business details */}
      {step === 2 && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="font-semibold mb-4">Business Details</h2>
          {!isFaq ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { key: "name", label: "Business Name", placeholder: "Smith Insurance Agency", required: true },
                { key: "url", label: "Website URL", placeholder: "https://smithinsurance.com" },
                { key: "phone", label: "Phone Number", placeholder: "(512) 555-0100" },
                { key: "email", label: "Email", placeholder: "info@smithinsurance.com" },
                { key: "address", label: "Street Address", placeholder: "123 Main St" },
                { key: "city", label: "City", placeholder: "Austin" },
                { key: "state", label: "State", placeholder: "TX" },
                { key: "zip", label: "ZIP Code", placeholder: "78701" },
                { key: "openHours", label: "Hours (schema.org format)", placeholder: "Mo-Fr 09:00-17:00" },
                { key: "priceRange", label: "Price Range", placeholder: "$$" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-sm font-medium mb-1.5 block">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    value={details[field.key as keyof BusinessDetails] as string}
                    onChange={(e) =>
                      setDetails((d) => ({ ...d, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <textarea
                  value={details.description}
                  onChange={(e) => setDetails((d) => ({ ...d, description: e.target.value }))}
                  placeholder="Brief description of your business..."
                  rows={3}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500 resize-none"
                />
              </div>
            </div>
          ) : (
            /* FAQ mode */
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Page / Business Name</label>
                <input
                  type="text"
                  value={details.name}
                  onChange={(e) => setDetails((d) => ({ ...d, name: e.target.value }))}
                  placeholder="Smith Insurance FAQ"
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
                />
              </div>
              {details.faqItems.map((item, i) => (
                <div key={i} className="bg-[var(--background)] rounded-xl p-4 border border-[var(--border)]">
                  <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-3">
                    FAQ {i + 1}
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) =>
                        setDetails((d) => ({
                          ...d,
                          faqItems: d.faqItems.map((f, j) =>
                            j === i ? { ...f, question: e.target.value } : f
                          ),
                        }))
                      }
                      placeholder="What does your insurance cover?"
                      className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
                    />
                    <textarea
                      value={item.answer}
                      onChange={(e) =>
                        setDetails((d) => ({
                          ...d,
                          faqItems: d.faqItems.map((f, j) =>
                            j === i ? { ...f, answer: e.target.value } : f
                          ),
                        }))
                      }
                      placeholder="Our coverage includes..."
                      rows={2}
                      className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500 resize-none"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setDetails((d) => ({
                    ...d,
                    faqItems: [...d.faqItems, { question: "", answer: "" }],
                  }))
                }
                className="text-sm text-electric-500 hover:text-electric-400 font-medium"
              >
                + Add FAQ Item
              </button>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--muted)] hover:bg-[var(--accent)] rounded-lg text-sm font-medium transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-5 py-2.5 bg-electric-500 hover:bg-electric-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Preview Schema
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3 - Preview & Copy */}
      {step === 3 && schema && (
        <div className="space-y-5">
          {/* Rich result preview */}
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
            <h2 className="font-semibold mb-4">Rich Result Preview</h2>
            <div className="bg-white rounded-xl p-4 text-black max-w-md shadow-sm">
              <div className="text-xs text-green-700 mb-0.5">
                {details.url || "https://yourwebsite.com"} ›
              </div>
              <div className="text-lg text-blue-700 font-medium hover:underline cursor-pointer mb-0.5">
                {details.name || "Your Business Name"}
              </div>
              {details.description && (
                <div className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                  {details.description}
                </div>
              )}
              {!isFaq && details.phone && (
                <div className="text-xs text-gray-500 mt-1">{details.phone}</div>
              )}
              {!isFaq && details.city && (
                <div className="text-xs text-gray-500">
                  {details.address}, {details.city}, {details.state} {details.zip}
                </div>
              )}
            </div>
          </div>

          {/* JSON-LD code */}
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-electric-500" />
                <span className="text-sm font-medium flex items-center gap-1.5">
                  JSON-LD Schema
                  <InfoTooltip
                    content="The format Google prefers for schema markup. You paste this code into your website's HTML."
                    side="top"
                  />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://search.google.com/test/rich-results`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 bg-[var(--muted)] hover:bg-[var(--accent)] rounded-lg text-xs font-medium transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Test in Google
                </a>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    copied
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-electric-500 hover:bg-electric-600 text-white"
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy Script Tag
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="p-4 overflow-x-auto">
              <pre className="text-xs text-emerald-400 font-mono whitespace-pre leading-relaxed">
                {`<script type="application/ld+json">`}
                {"\n"}
                {schemaJson}
                {"\n"}
                {`</script>`}
              </pre>
            </div>
          </div>

          {/* Installation instructions */}
          <div className="bg-gradient-to-r from-electric-500/5 to-emerald-500/5 border border-electric-500/20 rounded-xl p-5">
            <h3 className="font-semibold mb-3">Installation Instructions</h3>
            <ol className="space-y-2 text-sm text-[var(--muted-foreground)]">
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-electric-500/20 text-electric-500 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                Copy the script tag above using the &ldquo;Copy Script Tag&rdquo; button.
              </li>
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-electric-500/20 text-electric-500 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                Paste it in the <code className="bg-[var(--muted)] px-1 py-0.5 rounded text-xs">&lt;head&gt;</code> section of your HTML, or in a{" "}
                <code className="bg-[var(--muted)] px-1 py-0.5 rounded text-xs">Custom HTML</code> block in your CMS.
              </li>
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-electric-500/20 text-electric-500 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                Click &ldquo;Test in Google&rdquo; to validate the schema before publishing.
              </li>
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-electric-500/20 text-electric-500 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                After publishing, request indexing in Google Search Console for faster rich result appearance.
              </li>
            </ol>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--muted)] hover:bg-[var(--accent)] rounded-lg text-sm font-medium transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Edit Details
            </button>
            <button
              onClick={() => { setStep(1); setSelectedType(""); }}
              className="px-5 py-2.5 bg-electric-500 hover:bg-electric-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Generate Another
            </button>
          </div>
        </div>
      )}

      {/* Loading placeholder for step 3 without schema */}
      {step === 3 && !schema && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-electric-500" />
        </div>
      )}
    </div>
  );
}
