"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Globe,
  CheckCircle2,
  Clock,
  Zap,
  Mail,
  MessageCircle,
  ArrowDown,
} from "lucide-react";

interface EmbedData {
  embed_api_key: string | null;
  embed_installed: boolean;
  embed_domain: string | null;
  embed_last_seen: string | null;
}

// ─── Platform mockup data ─────────────────────────────────────────────────────

const PLATFORMS = [
  {
    id: "wordpress",
    name: "WordPress",
    emoji: "🟦",
    tagline: "Most popular website builder",
    steps: [
      {
        title: "Log into your WordPress dashboard",
        detail: 'Go to your website address + "/wp-admin" (example: mysite.com/wp-admin) and sign in.',
      },
      {
        title: 'Install the free "WPCode" plugin',
        detail: 'In the left menu, click Plugins → Add New. Search for "WPCode". Click Install Now, then Activate.',
      },
      {
        title: "Open Code Snippets → Header & Footer",
        detail: 'In the left menu, click Code Snippets → Header & Footer. You\'ll see two big text boxes.',
      },
      {
        title: "Paste your snippet into the Footer box",
        detail: 'Click inside the box labeled "Footer" and paste your snippet. Then click Save Changes.',
      },
      {
        title: "You're done! Visit your website to confirm.",
        detail: 'Open your website in a new tab. Within a minute, Geothority will detect the installation.',
      },
    ],
    mockup: "wordpress",
  },
  {
    id: "squarespace",
    name: "Squarespace",
    emoji: "⬛",
    tagline: "Clean, design-focused websites",
    steps: [
      {
        title: "Log into your Squarespace account",
        detail: "Go to squarespace.com and sign in. Click on your website to open the dashboard.",
      },
      {
        title: "Open Website → Pages → Website Tools",
        detail: 'In the left menu, click "Website", then "Pages". Scroll down and click "Website Tools".',
      },
      {
        title: 'Click "Code Injection"',
        detail: 'You\'ll see a menu option called "Code Injection". Click it to open a page with text boxes.',
      },
      {
        title: "Paste your snippet into the Footer box",
        detail: 'Find the box labeled "Footer" at the bottom. Click inside it and paste your snippet.',
      },
      {
        title: "Click Save — you're done!",
        detail: "Hit the Save button at the top right. Your snippet is now live on every page of your site.",
      },
    ],
    mockup: "squarespace",
  },
  {
    id: "wix",
    name: "Wix",
    emoji: "🔵",
    tagline: "Drag-and-drop website builder",
    steps: [
      {
        title: "Log into Wix and open your site editor",
        detail: "Go to wix.com, sign in, and click Edit Site on your website.",
      },
      {
        title: 'Click the Settings icon in the top bar',
        detail: 'In the Wix Editor, click "Settings" in the top menu bar. A menu will slide out.',
      },
      {
        title: 'Click "Custom Code"',
        detail: 'In the Settings menu, find and click "Custom Code". Then click "+ Add Custom Code".',
      },
      {
        title: "Paste your snippet and set it to load in Body-End",
        detail: 'Paste your snippet in the text box. Under "Place Code in", choose "Body - end". Apply to All Pages.',
      },
      {
        title: "Click Apply and publish your site",
        detail: 'Click Apply to save. Then click the blue Publish button in the top right to make it live.',
      },
    ],
    mockup: "wix",
  },
  {
    id: "shopify",
    name: "Shopify",
    emoji: "🟢",
    tagline: "For online stores and e-commerce",
    steps: [
      {
        title: "Log into your Shopify admin",
        detail: "Go to your-store.myshopify.com/admin and sign in.",
      },
      {
        title: 'Go to Online Store → Themes',
        detail: 'In the left menu, click "Online Store", then click "Themes".',
      },
      {
        title: 'Click "Actions" → "Edit Code"',
        detail: 'Find your active theme and click the "Actions" button next to it. Choose "Edit code".',
      },
      {
        title: 'Open theme.liquid and paste before </body>',
        detail: 'In the file list on the left, click "theme.liquid". Find </body> near the bottom and paste your snippet just above it.',
      },
      {
        title: "Click Save — you're done!",
        detail: "Click the Save button in the top right. Your snippet is now live across your entire store.",
      },
    ],
    mockup: "shopify",
  },
  {
    id: "other",
    name: "Other / HTML",
    emoji: "🌐",
    tagline: "Custom site, HTML, or any other platform",
    steps: [
      {
        title: "Open your website's template or layout file",
        detail: 'Look for a file called "index.html", "layout.html", or "base.html" — this is the master template that controls every page.',
      },
      {
        title: 'Find the </body> tag near the bottom',
        detail: 'Use Ctrl+F (or Cmd+F on Mac) to search for </body>. It\'s usually near the very end of the file.',
      },
      {
        title: "Paste your snippet just above </body>",
        detail: "Click right before the </body> tag and paste your snippet on a new line above it.",
      },
      {
        title: "Save the file and upload/deploy",
        detail: "Save the file. If you use FTP or a hosting panel, upload the updated file. If you use a deploy button, push your changes.",
      },
    ],
    mockup: "other",
  },
];

// ─── Browser Mockup Component ─────────────────────────────────────────────────

function MockupWindow({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl">
      {/* Browser chrome */}
      <div className="bg-[#2a2a3e] px-4 py-2.5 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
        <div className="flex-1 bg-[#1a1a2e] rounded-md px-3 py-1 text-xs text-[#666] font-mono truncate">
          {title}
        </div>
      </div>
      {/* Content */}
      <div className="bg-[#1a1a2e]">{children}</div>
    </div>
  );
}

// ─── Platform mockup screens ──────────────────────────────────────────────────

function WordPressMockup({ snippet }: { snippet: string }) {
  return (
    <MockupWindow title="mysite.com/wp-admin/admin.php?page=wpcode-snippet-manager">
      <div className="flex min-h-[220px]">
        {/* WP Sidebar */}
        <div className="w-36 bg-[#23282d] p-3 shrink-0 hidden sm:block">
          <div className="text-[10px] text-[#aaa] font-bold uppercase tracking-wider mb-3">WPCode</div>
          <div className="space-y-1">
            <div className="text-[11px] text-[#ccc] px-2 py-1 rounded">Snippets</div>
            <div className="text-[11px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-semibold border border-emerald-500/30">
              Header &amp; Footer ←
            </div>
            <div className="text-[11px] text-[#ccc] px-2 py-1 rounded">Settings</div>
          </div>
        </div>
        {/* Main area */}
        <div className="flex-1 p-4">
          <div className="text-sm font-bold text-white mb-3">Header &amp; Footer</div>
          <div className="mb-3">
            <div className="text-[11px] text-[#999] mb-1">Header (before &lt;/head&gt;)</div>
            <div className="bg-[#0d0d1a] border border-white/10 rounded h-10 px-2 flex items-center">
              <span className="text-[10px] text-[#444] italic">empty</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#999] mb-1 flex items-center gap-1">
              Footer (before &lt;/body&gt;)
              <span className="ml-1 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold border border-emerald-500/40">PASTE HERE ↓</span>
            </div>
            <div className="bg-[#0a1a0f] border-2 border-emerald-500/60 rounded p-2 relative">
              <span className="text-[10px] font-mono text-emerald-400 break-all leading-relaxed">
                {snippet.length > 120 ? snippet.slice(0, 120) + "…" : snippet}
              </span>
              <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">✓ pasted</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="inline-flex items-center gap-1 bg-[#0073aa] text-white text-[11px] font-semibold px-3 py-1.5 rounded">
              Save Changes ←
            </div>
          </div>
        </div>
      </div>
    </MockupWindow>
  );
}

function SquarespaceMockup({ snippet }: { snippet: string }) {
  return (
    <MockupWindow title="account.squarespace.com → Website Tools → Code Injection">
      <div className="flex min-h-[220px]">
        <div className="w-36 bg-[#1a1a1a] p-3 shrink-0 hidden sm:block">
          <div className="text-[10px] text-[#888] font-bold uppercase tracking-wider mb-3">Website</div>
          <div className="space-y-1">
            <div className="text-[11px] text-[#ccc] px-2 py-1 rounded">Pages</div>
            <div className="text-[11px] text-[#ccc] px-2 py-1 rounded">Website Tools</div>
            <div className="text-[11px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-semibold border border-emerald-500/30">
              Code Injection ←
            </div>
          </div>
        </div>
        <div className="flex-1 p-4">
          <div className="text-sm font-bold text-white mb-3">Code Injection</div>
          <div className="mb-3">
            <div className="text-[11px] text-[#999] mb-1">Header</div>
            <div className="bg-[#0d0d1a] border border-white/10 rounded h-10 px-2 flex items-center">
              <span className="text-[10px] text-[#444] italic">empty</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#999] mb-1 flex items-center gap-1">
              Footer
              <span className="ml-1 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold border border-emerald-500/40">PASTE HERE ↓</span>
            </div>
            <div className="bg-[#0a1a0f] border-2 border-emerald-500/60 rounded p-2 relative">
              <span className="text-[10px] font-mono text-emerald-400 break-all leading-relaxed">
                {snippet.length > 120 ? snippet.slice(0, 120) + "…" : snippet}
              </span>
              <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">✓ pasted</div>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <div className="inline-flex items-center gap-1 bg-white text-black text-[11px] font-semibold px-3 py-1.5 rounded">
              Save ←
            </div>
          </div>
        </div>
      </div>
    </MockupWindow>
  );
}

function WixMockup({ snippet }: { snippet: string }) {
  return (
    <MockupWindow title="editor.wix.com → Settings → Custom Code">
      <div className="flex min-h-[220px]">
        <div className="w-14 bg-[#1a1a2e] flex flex-col items-center py-3 gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#3b3b5c] flex items-center justify-center text-[9px] text-[#aaa]">🔧</div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[9px] text-emerald-400">⚙️</div>
        </div>
        <div className="flex-1 p-4">
          <div className="text-sm font-bold text-white mb-3">Custom Code</div>
          <div className="bg-[#0d0d1a] border border-white/10 rounded p-3 mb-3">
            <div className="text-[11px] text-[#aaa] mb-1">Name: Geothority Embed</div>
            <div className="text-[11px] text-[#aaa] mb-2">Load in: <span className="text-emerald-400 font-semibold">Body - end</span></div>
            <div className="bg-[#0a1a0f] border-2 border-emerald-500/60 rounded p-2 relative">
              <span className="text-[10px] font-mono text-emerald-400 break-all leading-relaxed">
                {snippet.length > 100 ? snippet.slice(0, 100) + "…" : snippet}
              </span>
              <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">✓ pasted</div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="inline-flex items-center bg-[#116dff] text-white text-[11px] font-semibold px-3 py-1.5 rounded">
              Apply ←
            </div>
            <div className="inline-flex items-center bg-[#116dff] text-white text-[11px] font-semibold px-3 py-1.5 rounded">
              Publish ←
            </div>
          </div>
        </div>
      </div>
    </MockupWindow>
  );
}

function ShopifyMockup({ snippet }: { snippet: string }) {
  return (
    <MockupWindow title="mystore.myshopify.com/admin/themes → Actions → Edit code → theme.liquid">
      <div className="flex min-h-[220px]">
        <div className="w-28 bg-[#1a1a2e] p-3 shrink-0 hidden sm:block">
          <div className="text-[10px] text-[#888] font-bold uppercase tracking-wider mb-2">Layout</div>
          <div className="space-y-1">
            <div className="text-[11px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-semibold border border-emerald-500/30">
              theme.liquid ←
            </div>
            <div className="text-[11px] text-[#ccc] px-2 py-1 rounded">password.liquid</div>
          </div>
        </div>
        <div className="flex-1 p-4 font-mono text-[10px]">
          <div className="text-[#666] mb-2">… rest of your theme code …</div>
          <div className="text-[#aaa]">  &lt;footer&gt;…&lt;/footer&gt;</div>
          <div className="bg-[#0a1a0f] border-l-2 border-emerald-500 pl-2 my-1 relative">
            <span className="text-emerald-400">
              {snippet.length > 90 ? snippet.slice(0, 90) + "…" : snippet}
            </span>
            <span className="ml-2 text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded border border-emerald-500/30">← paste here</span>
          </div>
          <div className="text-[#aaa]">  &lt;/body&gt;</div>
          <div className="text-[#666] mt-2">…</div>
          <div className="mt-3">
            <div className="inline-flex items-center bg-[#008060] text-white text-[11px] font-semibold px-3 py-1.5 rounded">
              Save ←
            </div>
          </div>
        </div>
      </div>
    </MockupWindow>
  );
}

function OtherMockup({ snippet }: { snippet: string }) {
  return (
    <MockupWindow title="your-template-file.html">
      <div className="p-4 font-mono text-[10px]">
        <div className="text-[#666] mb-1">… rest of your HTML …</div>
        <div className="text-[#aaa]">    &lt;footer&gt;…&lt;/footer&gt;</div>
        <div className="bg-[#0a1a0f] border-l-4 border-emerald-500 pl-3 py-1 my-1 relative">
          <span className="text-emerald-400 break-all">
            {snippet.length > 90 ? snippet.slice(0, 90) + "…" : snippet}
          </span>
          <div className="absolute -top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">← paste here</div>
        </div>
        <div className="text-[#aaa]">  &lt;/body&gt;</div>
        <div className="text-[#aaa]">&lt;/html&gt;</div>
        <div className="mt-3 text-[11px] text-[#666]">Then save and deploy your site as normal.</div>
      </div>
    </MockupWindow>
  );
}

function PlatformMockup({ id, snippet }: { id: string; snippet: string }) {
  switch (id) {
    case "wordpress": return <WordPressMockup snippet={snippet} />;
    case "squarespace": return <SquarespaceMockup snippet={snippet} />;
    case "wix": return <WixMockup snippet={snippet} />;
    case "shopify": return <ShopifyMockup snippet={snippet} />;
    default: return <OtherMockup snippet={snippet} />;
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmbedSettingsPage() {
  const [embedData, setEmbedData] = useState<EmbedData>({
    embed_api_key: null,
    embed_installed: false,
    embed_domain: null,
    embed_last_seen: null,
  });
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadEmbedData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("embed_api_key, embed_installed, embed_domain, embed_last_seen")
      .eq("id", user.id)
      .single();
    if (profile) {
      setEmbedData({
        embed_api_key: profile.embed_api_key,
        embed_installed: profile.embed_installed ?? false,
        embed_domain: profile.embed_domain,
        embed_last_seen: profile.embed_last_seen,
      });
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadEmbedData();
  }, [loadEmbedData]);

  async function generateKey() {
    setGenerating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setGenerating(false); return; }
    const key = "geo_" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    await supabase.from("user_profiles").update({ embed_api_key: key }).eq("id", user.id);
    setEmbedData((prev) => ({ ...prev, embed_api_key: key }));
    setGenerating(false);
  }

  async function checkInstallation() {
    setChecking(true);
    await loadEmbedData();
    setTimeout(() => setChecking(false), 1500);
  }

  const snippetCode = `<script src="https://geothority.io/embed.js" data-key="${
    embedData.embed_api_key || "YOUR_API_KEY"
  }"></script>`;

  function copySnippet() {
    navigator.clipboard.writeText(snippetCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  const activePlatform = PLATFORMS.find((p) => p.id === selectedPlatform);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-7 h-7 animate-spin text-electric-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-16">

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold">Install on Your Website</h1>
        <p className="text-[var(--muted-foreground)] mt-2 text-base leading-relaxed">
          Copy one small snippet of code and paste it into your website.
          That&apos;s it. Geothority will automatically add trust signals,
          schema markup, and FAQ content to every page.
        </p>
      </div>

      {/* ── Step 1: Get your snippet ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-electric-500 text-white font-bold text-sm flex items-center justify-center shrink-0">1</div>
            <h2 className="text-xl font-bold">Get your personal snippet</h2>
          </div>
          <p className="text-[var(--muted-foreground)] text-sm ml-11">
            This is your unique code. It only works for your account.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {!embedData.embed_api_key ? (
            /* No key yet — show generate button */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-electric-500/10 flex items-center justify-center mx-auto">
                <Zap className="w-8 h-8 text-electric-500" />
              </div>
              <div>
                <p className="font-semibold text-lg">Create your snippet first</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  One click generates a unique code tied to your account.
                </p>
              </div>
              <button
                onClick={generateKey}
                disabled={generating}
                className="w-full flex items-center justify-center gap-3 py-4 bg-electric-500 hover:bg-electric-600 disabled:opacity-60 text-white rounded-xl text-base font-bold transition-colors"
                style={{ minHeight: 56 }}
              >
                {generating ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Generating your snippet…</>
                ) : (
                  <><Zap className="w-5 h-5" /> Generate My Snippet</>
                )}
              </button>
            </div>
          ) : (
            /* Key exists — show snippet + big copy button */
            <div className="space-y-4">
              {/* Code block */}
              <div>
                <p className="text-sm font-medium text-[var(--muted-foreground)] mb-2">Your personal snippet:</p>
                <div className="bg-[#0d0d1a] border border-emerald-500/20 rounded-xl p-4 overflow-x-auto">
                  <code className="text-emerald-400 font-mono break-all" style={{ fontSize: 16 }}>
                    {snippetCode}
                  </code>
                </div>
              </div>

              {/* BIG copy button */}
              <button
                onClick={copySnippet}
                className={`w-full flex items-center justify-center gap-3 rounded-xl font-bold text-base transition-all ${
                  copied
                    ? "bg-emerald-500 text-white"
                    : "bg-emerald-500 hover:bg-emerald-600 text-white"
                }`}
                style={{ minHeight: 56 }}
              >
                {copied ? (
                  <><Check className="w-6 h-6" /> Copied to clipboard! Now go paste it on your site.</>
                ) : (
                  <><Copy className="w-6 h-6" /> Copy My Snippet</>
                )}
              </button>

              {/* Regenerate link */}
              <div className="text-center">
                <button
                  onClick={generateKey}
                  disabled={generating}
                  className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1.5 mx-auto"
                >
                  <RefreshCw className={`w-3 h-3 ${generating ? "animate-spin" : ""}`} />
                  Generate a new key (old one stops working)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Step 2: Pick your platform ── */}
      {embedData.embed_api_key && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[var(--border)]">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-electric-500 text-white font-bold text-sm flex items-center justify-center shrink-0">2</div>
              <h2 className="text-xl font-bold">What kind of website do you have?</h2>
            </div>
            <p className="text-[var(--muted-foreground)] text-sm ml-11">
              Click your platform and we&apos;ll show you exactly where to paste the snippet.
            </p>
          </div>

          <div className="p-6">
            {/* Platform cards grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlatform(p.id === selectedPlatform ? null : p.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all ${
                    selectedPlatform === p.id
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-[var(--border)] hover:border-electric-500/50 hover:bg-[var(--muted)]/30"
                  }`}
                >
                  <span className="text-3xl">{p.emoji}</span>
                  <span className="font-bold text-sm">{p.name}</span>
                  <span className="text-[10px] text-[var(--muted-foreground)] leading-tight">{p.tagline}</span>
                  {selectedPlatform === p.id && (
                    <span className="text-[10px] text-emerald-400 font-semibold">Selected ✓</span>
                  )}
                </button>
              ))}
            </div>

            {/* Steps for selected platform */}
            {activePlatform && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 pb-4 border-b border-[var(--border)]">
                  <span className="text-2xl">{activePlatform.emoji}</span>
                  <div>
                    <h3 className="font-bold text-lg">{activePlatform.name} Instructions</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">Follow these steps in order — takes about 2 minutes.</p>
                  </div>
                </div>

                {/* Steps */}
                <ol className="space-y-6">
                  {activePlatform.steps.map((step, i) => (
                    <li key={i} className="flex gap-4">
                      <div className="shrink-0 w-10 h-10 rounded-full bg-electric-500/10 border-2 border-electric-500/30 text-electric-500 font-bold flex items-center justify-center" style={{ fontSize: 18 }}>
                        {i + 1}
                      </div>
                      <div className="pt-1">
                        <p className="font-bold text-base text-[var(--foreground)]">{step.title}</p>
                        <p className="text-sm text-[var(--muted-foreground)] mt-1 leading-relaxed">{step.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                {/* Visual mockup */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowDown className="w-4 h-4 text-emerald-400" />
                    <p className="text-sm font-semibold text-emerald-400">Here&apos;s what it looks like when done correctly:</p>
                  </div>
                  <PlatformMockup id={activePlatform.id} snippet={snippetCode} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Step 3: Installation status ── */}
      {embedData.embed_api_key && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[var(--border)]">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-electric-500 text-white font-bold text-sm flex items-center justify-center shrink-0">3</div>
              <h2 className="text-xl font-bold">Confirm it&apos;s working</h2>
            </div>
            <p className="text-[var(--muted-foreground)] text-sm ml-11">
              After you paste the snippet on your site, click the button below to check.
            </p>
          </div>
          <div className="p-6">
            <div className={`rounded-xl p-5 mb-5 flex items-center gap-4 ${
              embedData.embed_installed
                ? "bg-emerald-500/10 border border-emerald-500/20"
                : "bg-amber-500/10 border border-amber-500/20"
            }`}>
              {embedData.embed_installed ? (
                <CheckCircle2 className="w-10 h-10 text-emerald-400 shrink-0" />
              ) : (
                <Clock className="w-10 h-10 text-amber-400 shrink-0" />
              )}
              <div>
                {embedData.embed_installed ? (
                  <>
                    <p className="font-bold text-emerald-400 text-lg">
                      ✅ Installed &amp; working!
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                      Detected on <span className="font-mono font-semibold text-[var(--foreground)]">{embedData.embed_domain}</span>
                      {embedData.embed_last_seen && (
                        <> · Last seen {new Date(embedData.embed_last_seen).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-amber-400 text-lg">
                      ⏳ Not detected yet
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                      Paste the snippet on your site, then come back and click &ldquo;Check Now&rdquo;.
                    </p>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={checkInstallation}
              disabled={checking}
              className="w-full flex items-center justify-center gap-3 py-4 border-2 border-[var(--border)] hover:border-electric-500/50 rounded-xl font-bold text-base transition-colors"
              style={{ minHeight: 56 }}
            >
              {checking ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Checking…</>
              ) : (
                <><Globe className="w-5 h-5" /> Check Now</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Help section ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
        <h2 className="text-lg font-bold mb-1">Need help?</h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-5 leading-relaxed">
          This stuff can be confusing. No judgment — we install it for you for free.
        </p>
        <div className="space-y-3">
          <a
            href="mailto:support@geothority.io?subject=Please install my Geothority snippet&body=Hi! I need help installing my Geothority embed snippet. My website is: "
            className="flex items-center gap-3 p-4 bg-[var(--muted)]/30 hover:bg-[var(--muted)]/60 border border-[var(--border)] rounded-xl transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-electric-500/10 flex items-center justify-center shrink-0 group-hover:bg-electric-500/20 transition-colors">
              <Mail className="w-5 h-5 text-electric-500" />
            </div>
            <div>
              <p className="font-semibold text-sm">Email us — we&apos;ll install it for you</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                support@geothority.io · We install it free, usually within 24 hours
              </p>
            </div>
          </a>

          <div className="flex items-center gap-3 p-4 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-sm">Will can walk you through it</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Use the chat bubble in the bottom right corner — Will is your AI assistant and knows exactly how to help.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
