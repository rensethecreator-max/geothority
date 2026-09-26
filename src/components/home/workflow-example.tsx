"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, FileSearch, FileText, Pause, Play, ShieldCheck, Sparkles } from "lucide-react";

const steps = [
  {
    label: "Scan", icon: FileSearch, title: "Start with your website.",
    description: "The scan reviews your public website for gaps in your business information and content.",
    heading: "Example finding", body: "The scan did not detect a link to a service-area page. Confirm whether that information is missing or needs a clearer link.",
    detail: "Website scan → an understandable finding", action: "Automatic website analysis",
  },
  {
    label: "Prioritize", icon: Sparkles, title: "See what to improve next.",
    description: "The report turns the finding into a practical next step, so you can choose where to focus.",
    heading: "Suggested improvement", body: "Add accurate service-area details and a clear way for nearby customers to contact you.",
    detail: "A finding → a practical action", action: "A clear next step",
  },
  {
    label: "Prepare", icon: FileText, title: "Give the first draft a head start.",
    description: "With Authority’s content tools, request a draft using the services and business details you provide.",
    heading: "Draft outline", body: "Where we work · Services available · What customers can expect · How to get in touch",
    detail: "Your business details → a draft to review", action: "Generated when you request it",
  },
  {
    label: "Review", icon: ShieldCheck, title: "Your business. Your approval.",
    description: "Check the facts and wording. Publishing depends on your website and supported connections.",
    heading: "Ready for your review", body: "Confirm the service areas. Check the claims. Publish approved changes with your website provider or a supported connection.",
    detail: "Approved changes → follow up with another scan", action: "You decide what goes live",
  },
];

export function WorkflowExample() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reducedMotion = useReducedMotion();
  const step = steps[active];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (active === steps.length - 1) setPlaying(false);
      else setActive(active + 1);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [active, playing]);

  function togglePlayback() {
    if (!playing && active === steps.length - 1) setActive(0);
    setPlaying(!playing);
  }

  return (
    <div className="relative min-w-0 lg:pl-2">
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_70px_-20px_rgba(15,23,42,0.20)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div><p className="text-sm font-semibold text-slate-950">From a gap to a next step</p><p className="mt-1 text-xs text-slate-500">Illustrative workflow • not a live scan</p></div>
          <button type="button" onClick={togglePlayback} aria-label={playing ? "Pause workflow example" : "Play workflow example"} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
            {playing ? <Pause className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}{playing ? "Pause" : "Play example"}
          </button>
        </div>
        <div className="px-5 pb-6 pt-6 sm:px-7">
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Example workflow steps">
            {steps.map((item, index) => <button type="button" key={item.label} aria-pressed={active === index} aria-controls="workflow-example-content" onClick={() => { setActive(index); setPlaying(false); }} className="group flex min-w-0 flex-col items-center gap-2 rounded-lg py-2 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl border transition duration-300 ${index === active ? "border-emerald-700 bg-emerald-700 !text-white shadow-md shadow-emerald-900/10" : index < active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-400 group-hover:border-emerald-300"}`}>{index < active ? <Check className="h-5 w-5" aria-hidden="true" /> : <item.icon className="h-5 w-5" aria-hidden="true" />}</span>
              <span className={active === index ? "text-emerald-800" : "text-slate-500"}>{item.label}</span>
            </button>)}
          </div>
          <div className="mb-6 mt-4 h-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className={`h-full rounded-full bg-emerald-600 ${reducedMotion ? "" : "transition-all duration-500"}`} style={{ width: `${((active + 1) / steps.length) * 100}%` }} /></div>
          <div id="workflow-example-content" className="min-h-[315px] sm:min-h-[295px]" aria-live={playing ? "off" : "polite"} aria-atomic="true">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={active} initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: reducedMotion ? 1 : 0 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">{step.action}</p>
                <h2 className="mt-3 text-2xl font-semibold leading-8 tracking-tight text-slate-950">{step.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{step.heading}</p><p className="mt-2 text-sm leading-6 text-slate-800">{step.body}</p></div>
                <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-emerald-800"><ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{step.detail}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">Free scans start the process. Additional tools depend on your plan and connections.</p>
        </div>
      </div>
    </div>
  );
}
