"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Waypoints, Wand2, Radar, Brain, FileText, CheckCircle2, AlertTriangle, ArrowUp, Building2, MapPinned, Sparkles, Star } from "lucide-react";

/**
 * AnimatedHero — Cycles through longer story scenes showcasing Geothority's core value.
 * Uses Framer Motion for smooth, controlled animations.
 * No narration, no video — pure React, our actual UI language.
 */

const SCENE_DURATION = 11500; // cinematic pacing, enough time to absorb each beat

// ─── Shared animation variants ────────────────────────────────

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.15 } },
};

// ─── Score bar component ──────────────────────────────────────

function ScoreBar({ label, score, delay, color }: { label: string; score: number; delay: number; color: string }) {
  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className="w-20 text-[10px] uppercase tracking-[0.14em] text-white/45">{label}</div>
      <div className="flex-1 h-2 rounded-full bg-white/8 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ delay: delay + 0.2, duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <div className="w-8 text-right text-xs font-semibold text-white/80">{score}</div>
    </motion.div>
  );
}

// ─── Scene 1: Scan + Trust Stack ──────────────────────────────

function SceneScan() {
  return (
    <div className="space-y-5">
      {/* URL bar */}
      <motion.div {...fadeUp} transition={{ delay: 0, duration: 0.5 }} className="flex items-center gap-3">
        <div className="flex-1 h-9 rounded-xl bg-white/5 border border-white/8 px-3 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-white/20" />
          <motion.span
            className="text-sm text-white/70 font-mono"
            initial={{ width: 0 }}
            animate={{ width: "auto" }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            smithinsurance.com
          </motion.span>
        </div>
        <motion.div
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-xs font-semibold text-[#071019]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.3 }}
        >
          Scan
        </motion.div>
      </motion.div>

      {/* Scanning indicator */}
      <motion.div
        className="flex items-center gap-2 text-xs text-emerald-400/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <motion.div
          className="w-2 h-2 rounded-full bg-emerald-400"
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        />
        Scanning 68+ authority signals...
      </motion.div>

      {/* Trust Stack scores */}
      <motion.div
        className="space-y-3 rounded-xl border border-white/8 bg-white/[0.02] p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.2, duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Waypoints className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/45">Trust Stack</span>
          </div>
          <motion.div
            className="text-lg font-bold text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5 }}
          >
            73<span className="text-sm text-white/40">/100</span>
          </motion.div>
        </div>

        <ScoreBar label="Foundation" score={61} delay={2.6} color="bg-gradient-to-r from-red-400 to-amber-400" />
        <ScoreBar label="Trust" score={74} delay={2.8} color="bg-gradient-to-r from-amber-400 to-emerald-400" />
        <ScoreBar label="Geo" score={82} delay={3.0} color="bg-gradient-to-r from-emerald-400 to-emerald-300" />
        <ScoreBar label="Reviews" score={79} delay={3.2} color="bg-gradient-to-r from-emerald-400 to-emerald-300" />
        <ScoreBar label="AI" score={88} delay={3.4} color="bg-gradient-to-r from-emerald-300 to-teal-300" />
      </motion.div>
    </div>
  );
}

// ─── Scene 2: Quick Win + Auto-Fix ────────────────────────────

function SceneFix() {
  return (
    <div className="space-y-4">
      {/* Quick Win card */}
      <motion.div
        className="rounded-xl border border-red-400/25 bg-red-400/5 p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-red-400/80">Quick Win — High Priority</span>
        </div>
        <div className="text-sm font-semibold text-white mb-1">Missing LocalBusiness schema markup</div>
        <div className="text-xs text-white/50">Your site has no structured data. Google can&apos;t understand your business.</div>
      </motion.div>

      {/* Fix button */}
      <motion.button
        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-semibold text-[#071019] flex items-center justify-center gap-2"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, duration: 0.4 }}
        whileTap={{ scale: 0.98 }}
      >
        <Wand2 className="w-4 h-4" />
        Fix Automatically
      </motion.button>

      {/* Fixing progress */}
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.5 }}
      >
        <div className="flex items-center gap-2 text-xs">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </motion.div>
          <span className="text-white/70">Schema markup generated</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.9 }}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </motion.div>
          <span className="text-white/70">NAP inconsistencies resolved</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.3 }}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </motion.div>
          <span className="text-white/70">Schema deployed to site</span>
        </div>
      </motion.div>

      {/* Score improvement */}
      <motion.div
        className="flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.6, duration: 0.4 }}
      >
        <span className="text-xs text-white/60">Trust Stack Score</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/40">73</span>
          <ArrowUp className="w-3 h-3 text-emerald-400" />
          <span className="text-lg font-bold text-emerald-400">81</span>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Scene 3: Competitor Alert + Counter-move ─────────────────

function SceneMonitor() {
  return (
    <div className="space-y-4">
      {/* Alert notification */}
      <motion.div
        className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-4 flex items-start gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <Radar className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-amber-400/80 mb-1">Competitor Alert</div>
          <div className="text-sm font-medium text-white">City Insurance added a new service page for Tampa</div>
        </div>
      </motion.div>

      {/* Counter-move card */}
      <motion.div
        className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-400/80">Counter-move ready</span>
        </div>
        <div className="text-sm font-medium text-white mb-1">Generate Tampa service page</div>
        <div className="text-xs text-white/50 mb-3">Better optimized, with local landmarks and entity markup</div>
        <motion.div
          className="px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-xs font-semibold text-emerald-300 inline-flex items-center gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
        >
          <CheckCircle2 className="w-3 h-3" /> Approve &amp; Deploy
        </motion.div>
      </motion.div>

      {/* Weekly status */}
      <motion.div
        className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] p-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.2 }}
      >
        <span className="text-xs text-white/50">Weekly monitoring</span>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs text-emerald-400">Active</span>
        </div>
      </motion.div>

      {/* Trend */}
      <motion.div
        className="flex items-center justify-between text-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.5 }}
      >
        <span className="text-white/40">30-day visibility</span>
        <span className="text-emerald-400 font-semibold flex items-center gap-1">
          <ArrowUp className="w-3 h-3" /> +12%
        </span>
      </motion.div>
    </div>
  );
}

// ─── Scene 4: AI Visibility ───────────────────────────────────

function SceneAIVisibility() {
  const engines = [
    { name: "ChatGPT", color: "bg-emerald-400", delay: 0.5 },
    { name: "Perplexity", color: "bg-blue-400", delay: 1.2 },
    { name: "Google AI", color: "bg-purple-400", delay: 1.9 },
  ];

  return (
    <div className="space-y-4">
      {/* Query */}
      <motion.div
        className="rounded-xl border border-white/8 bg-white/[0.03] p-3"
        {...fadeUp}
        transition={{ delay: 0.2 }}
      >
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/35 mb-1.5">AI Search Query</div>
        <div className="text-sm text-white/80 font-medium">&ldquo;Best insurance agent in Tampa&rdquo;</div>
      </motion.div>

      {/* Engine results */}
      <div className="space-y-2">
        {engines.map((engine) => (
          <motion.div
            key={engine.name}
            className="rounded-xl border border-white/8 bg-white/[0.02] p-3 flex items-center justify-between"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: engine.delay, duration: 0.4 }}
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-2 h-2 rounded-full ${engine.color}`} />
              <span className="text-sm text-white/80">{engine.name}</span>
            </div>
            <motion.div
              className="flex items-center gap-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: engine.delay + 0.5 }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">Recommends you</span>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Score */}
      <motion.div
        className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 3.0 }}
      >
        <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400/70 mb-1">AI Visibility Score</div>
        <div className="text-3xl font-bold text-emerald-400">10/10</div>
        <div className="text-xs text-white/40 mt-1">All platforms recommend your business</div>
      </motion.div>
    </div>
  );
}

// ─── Scene 5: Content Engine ──────────────────────────────────

function SceneContent() {
  return (
    <div className="space-y-4">
      {/* Visibility gap */}
      <motion.div
        className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-amber-400/80">Visibility Gap</span>
        </div>
        <div className="text-sm font-medium text-white">Missing: Tampa homeowners insurance coverage</div>
        <div className="text-xs text-white/50 mt-1">Competitors rank for this — you don&apos;t have a page for it</div>
      </motion.div>

      {/* Generate button */}
      <motion.div
        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-semibold text-[#071019] flex items-center justify-center gap-2"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5 }}
      >
        <FileText className="w-4 h-4" />
        Generate Targeted Page
      </motion.div>

      {/* Generated content preview */}
      <motion.div
        className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.5, duration: 0.5 }}
      >
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/35 mb-1">Generated Content</div>
        <div className="text-sm font-semibold text-white">Tampa Homeowners Insurance Guide</div>
        <div className="text-xs text-white/50 leading-relaxed">
          Protect your Tampa home with comprehensive coverage. From Bayshore Boulevard to Hyde Park, local
          homeowners trust Smith Insurance for...
        </div>
        <div className="flex items-center gap-3 text-[10px] text-white/40 mt-2">
          <span>1,247 words</span>
          <span>•</span>
          <span>3 local entities</span>
          <span>•</span>
          <span className="text-emerald-400">SEO optimized</span>
        </div>
      </motion.div>

      {/* Gap closed */}
      <motion.div
        className="flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.5 }}
      >
        <span className="text-xs text-white/60">Tampa homeowners gap</span>
        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Closed
        </span>
      </motion.div>
    </div>
  );
}

// ─── Scene 6: Citation Sync ───────────────────────────────────

function SceneCitations() {
  return (
    <div className="space-y-4">
      <motion.div
        className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <MapPinned className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-amber-400/80">Citation Drift Found</span>
        </div>
        <div className="text-sm font-medium text-white">3 listings show the wrong phone number</div>
        <div className="text-xs text-white/50 mt-1">Apple Maps, Bing Places, and Yelp are out of sync with Google</div>
      </motion.div>

      <motion.div
        className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
      >
        {[
          "Apple Maps updated",
          "Bing Places corrected",
          "Yelp submitted for refresh",
          "Foursquare network push queued",
        ].map((item, index) => (
          <motion.div
            key={item}
            className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 2.1 + index * 0.5 }}
          >
            <span className="text-xs text-white/75">{item}</span>
            <span className="text-[10px] font-semibold text-emerald-400">SYNCED</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 4.4 }}
      >
        <span className="text-xs text-white/60">Citation consistency</span>
        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
          <ArrowUp className="w-3 h-3" /> 84% → 97%
        </span>
      </motion.div>
    </div>
  );
}

// ─── Scene 7: GBP Automation ─────────────────────────────────

function SceneGBP() {
  return (
    <div className="space-y-4">
      <motion.div
        className="rounded-xl border border-white/8 bg-white/[0.03] p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-400/80">Google Business Profile</span>
        </div>
        <div className="text-sm font-medium text-white">Hours, category, and post cadence need attention</div>
        <div className="text-xs text-white/50 mt-1">We prepare the corrections and publish the update automatically</div>
      </motion.div>

      <motion.div
        className="grid grid-cols-2 gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
      >
        <motion.div className="rounded-xl border border-white/8 bg-white/[0.02] p-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.7 }}>
          <div className="text-[10px] uppercase tracking-[0.16em] text-white/40 mb-2">Auto-correct</div>
          <div className="space-y-2 text-xs text-white/70">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Primary category fixed</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Holiday hours updated</div>
          </div>
        </motion.div>
        <motion.div className="rounded-xl border border-white/8 bg-white/[0.02] p-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2 }}>
          <div className="text-[10px] uppercase tracking-[0.16em] text-white/40 mb-2">Publish</div>
          <div className="space-y-2 text-xs text-white/70">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Spring savings post queued</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Offer CTA linked</div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 3.2 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-400/80">Outcome</span>
        </div>
        <div className="text-sm font-semibold text-white">Your profile stays fresh without manual weekly busywork</div>
        <div className="text-xs text-white/55 mt-1">That means better local trust signals and more map conversions.</div>
      </motion.div>
    </div>
  );
}

// ─── Scene 8: Review Momentum ────────────────────────────────

function SceneReviews() {
  return (
    <div className="space-y-4">
      <motion.div
        className="rounded-xl border border-white/8 bg-white/[0.03] p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="mb-2 flex items-center gap-2">
          <Star className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-amber-400/80">Review Momentum</span>
        </div>
        <div className="text-sm font-medium text-white">A 5-star review arrives and the follow-up engine stays active</div>
        <div className="mt-1 text-xs text-white/50">We help generate more trust signals instead of waiting for reviews to happen randomly.</div>
      </motion.div>

      <motion.div
        className="grid grid-cols-2 gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
      >
        <motion.div className="rounded-xl border border-white/8 bg-white/[0.02] p-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}>
          <div className="text-[10px] uppercase tracking-[0.16em] text-white/40 mb-2">New review</div>
          <div className="flex items-center gap-1 text-amber-400 mb-2">
            {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
          </div>
          <div className="text-xs text-white/70">“Fast, clear, and actually helpful. Best insurance team in Tampa.”</div>
        </motion.div>
        <motion.div className="rounded-xl border border-white/8 bg-white/[0.02] p-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.0 }}>
          <div className="text-[10px] uppercase tracking-[0.16em] text-white/40 mb-2">Automation</div>
          <div className="space-y-2 text-xs text-white/70">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Response drafted</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Review request sequence active</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Reputation trend improving</div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.0 }}
      >
        <span className="text-xs text-white/60">Review velocity</span>
        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1"><ArrowUp className="h-3 w-3" /> +28% this month</span>
      </motion.div>
    </div>
  );
}

type SceneDefinition = {
  act: "Diagnose" | "Defend" | "Grow";
  label: string;
  title: string;
  benefit: string;
  metric: string;
  component: () => JSX.Element;
};

const SCENES: SceneDefinition[] = [
  {
    act: "Diagnose",
    label: "Scan",
    title: "See the whole trust stack in one scan",
    benefit: "We surface what is broken, what matters most, and where growth is leaking.",
    metric: "68+ signals scanned",
    component: SceneScan,
  },
  {
    act: "Diagnose",
    label: "Fix",
    title: "Turn issues into one-click fixes",
    benefit: "Instead of handing you a report, Geothority does the work and improves the score.",
    metric: "73 → 81 trust score",
    component: SceneFix,
  },
  {
    act: "Defend",
    label: "Citations",
    title: "Keep listings consistent everywhere",
    benefit: "Wrong NAP data quietly kills trust. We find drift and push corrections across the ecosystem.",
    metric: "84% → 97% consistency",
    component: SceneCitations,
  },
  {
    act: "Defend",
    label: "GBP",
    title: "Keep your Google Business Profile fresh automatically",
    benefit: "Hours, categories, and posts stay current without becoming another weekly task for your team.",
    metric: "Weekly GBP freshness active",
    component: SceneGBP,
  },
  {
    act: "Defend",
    label: "Monitor",
    title: "Counter competitor moves automatically",
    benefit: "Every alert turns into a suggested response, not just another notification.",
    metric: "+12% visibility lift",
    component: SceneMonitor,
  },
  {
    act: "Grow",
    label: "AI",
    title: "Win the new AI recommendation layer",
    benefit: "We track whether AI assistants mention you, then generate what improves those answers.",
    metric: "10/10 AI engines recommending you",
    component: SceneAIVisibility,
  },
  {
    act: "Grow",
    label: "Content",
    title: "Build the exact pages your market is missing",
    benefit: "Content comes from visibility gaps, not random blogging, so every page has a reason to exist.",
    metric: "1,247 words generated with local entities",
    component: SceneContent,
  },
  {
    act: "Grow",
    label: "Reviews",
    title: "Keep reputation momentum compounding",
    benefit: "New reviews become more trust, more social proof, and more signals for Maps and conversions.",
    metric: "+28% review velocity",
    component: SceneReviews,
  },
];

const ACTS: SceneDefinition["act"][] = ["Diagnose", "Defend", "Grow"];

function SceneIndicator({ current }: { current: number }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
      {SCENES.map((scene, i) => (
        <div
          key={scene.label}
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] transition-all duration-500 ${
            i === current
              ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-300"
              : "border-white/8 bg-white/[0.02] text-white/38"
          }`}
          title={scene.title}
        >
          {scene.label}
        </div>
      ))}
    </div>
  );
}

// ─── Main Animated Hero Component ─────────────────────────────

export function AnimatedHero() {
  const [scene, setScene] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setScene((prev) => (prev + 1) % SCENES.length);
    }, SCENE_DURATION);
    return () => clearInterval(timer);
  }, []);

  const CurrentScene = SCENES[scene].component;
  const currentMeta = SCENES[scene];

  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute inset-x-10 top-6 h-24 rounded-full bg-emerald-400/8 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-20 top-24 h-40 rounded-full bg-cyan-400/6 blur-3xl" />

      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1322]/92 backdrop-blur-sm shadow-[0_30px_120px_rgba(6,12,24,0.55)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_26%)]" />

        <div className="relative flex items-center gap-1.5 border-b border-white/6 bg-white/[0.015] px-4 py-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-rose-400/50" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-300/50" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-300/50" />
          <div className="ml-3 h-4.5 flex-1 rounded-full bg-white/[0.04]" />
          <div className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-300 sm:inline-flex">Autonomous local growth</div>
        </div>

        <div className="relative min-h-[174px] border-b border-white/6 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(16,185,129,0.01))] px-6 py-4 sm:min-h-[160px]">
          <div className="mb-3 flex flex-wrap gap-2">
            {ACTS.map((act) => {
              const active = currentMeta.act === act;
              return (
                <div
                  key={act}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] transition-all ${
                    active
                      ? "border-emerald-400/35 bg-emerald-400/12 text-emerald-300"
                      : "border-white/8 bg-white/[0.02] text-white/38"
                  }`}
                >
                  {act}
                </div>
              );
            })}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMeta.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
            >
              <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-400/80">{currentMeta.act} • {currentMeta.label}</div>
              <div className="mt-1 text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">{currentMeta.title}</div>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-white/60">{currentMeta.benefit}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative flex min-h-[620px] flex-col p-6 sm:min-h-[640px]">
          <div className="relative h-[320px] sm:h-[340px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={scene}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <CurrentScene />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-6 min-h-[152px] border-t border-white/6 pt-5 sm:min-h-[116px]">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Current step</div>
                <div className="mt-1 text-sm font-semibold text-white">{currentMeta.metric}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Why it matters</div>
                <div className="mt-1 text-sm font-semibold text-white">Less manual SEO busywork</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">What changes</div>
                <div className="mt-1 text-sm font-semibold text-white">Trust, visibility, and conversion signals improve</div>
              </div>
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-400/70">Geothority difference</div>
                <div className="mt-1 text-sm font-semibold text-white">We automate the response, not just the diagnosis</div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <SceneIndicator current={scene} />
          </div>
        </div>
      </div>
    </div>
  );
}
