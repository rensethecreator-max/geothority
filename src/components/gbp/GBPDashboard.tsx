"use client";

import { useState } from "react";
import {
  Star,
  MapPin,
  Phone,
  Globe,
  Clock,
  MessageSquare,
  FileText,
  HelpCircle,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GBPProfile, GBPReview, GBPPost, GBPQA, GBPAuditResult, AuditRecommendation } from "@/lib/google-business/types";

// ---------- Score Ring Component ----------
function ScoreRing({
  score,
  size = 80,
  label,
}: {
  score: number;
  size?: number;
  label: string;
}) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 75
      ? "text-green-500"
      : score >= 50
      ? "text-amber-500"
      : "text-red-500";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-[var(--muted)]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={color}
        />
      </svg>
      <span className="text-xl font-bold">{score}</span>
      {label && (
        <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
      )}
    </div>
  );
}

// ---------- Star Rating Display ----------
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i <= rating
              ? "text-amber-400 fill-amber-400"
              : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

// ---------- Completeness Check Item ----------
function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {checked ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
      )}
      <span
        className={`text-sm ${
          checked ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

// ---------- Priority Badge ----------
function PriorityBadge({ priority }: { priority: string }) {
  const variants: Record<string, string> = {
    high: "bg-red-500/10 text-red-400 border-red-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded border ${
        variants[priority] || variants.low
      }`}
    >
      {priority}
    </span>
  );
}

// ---------- Main Dashboard ----------
interface GBPDashboardProps {
  profile: GBPProfile;
  audit: GBPAuditResult | null;
  recentReviews: GBPReview[];
  recentPosts: GBPPost[];
  unansweredQuestions: GBPQA[];
  allQuestions: GBPQA[];
  onSync: () => void;
  syncing: boolean;
  lastSyncedAt: string | null;
}

export default function GBPDashboard({
  profile,
  audit,
  recentReviews,
  recentPosts,
  unansweredQuestions,
  allQuestions,
  onSync,
  syncing,
  lastSyncedAt,
}: GBPDashboardProps) {
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);

  const recommendations = audit?.recommendations || [];
  const displayedRecs = showAllRecommendations
    ? recommendations
    : recommendations.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{profile.business_name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-[var(--muted-foreground)]">
            {profile.city && profile.state && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {profile.city}, {profile.state}
              </span>
            )}
            {profile.primary_category && (
              <Badge variant="secondary" className="text-xs">
                {profile.primary_category}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastSyncedAt && (
            <span className="text-xs text-[var(--muted-foreground)]">
              Last synced: {new Date(lastSyncedAt).toLocaleString()}
            </span>
          )}
          <button
            onClick={onSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-electric-500 hover:bg-electric-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Re-Sync"}
          </button>
        </div>
      </div>

      {/* Score Cards */}
      {audit && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)] flex flex-col items-center">
            <ScoreRing score={audit.overall_score} size={72} label="Overall" />
          </div>
          <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)] flex flex-col items-center">
            <ScoreRing score={audit.completeness_score} size={72} label="Completeness" />
          </div>
          <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)] flex flex-col items-center">
            <ScoreRing score={audit.review_health_score} size={72} label="Review Health" />
          </div>
          <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)] flex flex-col items-center">
            <ScoreRing score={audit.engagement_score} size={72} label="Engagement" />
          </div>
        </div>
      )}

      {/* Profile Info + Completeness Checklist */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-electric-500" />
            Profile Details
          </h2>
          <div className="space-y-3">
            <InfoRow icon={MapPin} label="Address">
              {[profile.address_line1, profile.address_line2, profile.city, profile.state, profile.postal_code]
                .filter(Boolean)
                .join(", ") || "Not set"}
            </InfoRow>
            <InfoRow icon={Phone} label="Phone">
              {profile.primary_phone || "Not set"}
            </InfoRow>
            <InfoRow icon={Globe} label="Website">
              {profile.website_url ? (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-electric-500 hover:underline flex items-center gap-1"
                >
                  {profile.website_url}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                "Not set"
              )}
            </InfoRow>
            <InfoRow icon={Clock} label="Hours">
              {profile.regular_hours
                ? `${profile.regular_hours.periods?.length || 0} periods set`
                : "Not set"}
            </InfoRow>
            {profile.description && (
              <div className="pt-2 border-t border-[var(--border)]">
                <span className="text-xs text-[var(--muted-foreground)] block mb-1">Description</span>
                <p className="text-sm text-[var(--foreground)] line-clamp-3">{profile.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Completeness Checklist */}
        {audit && (
          <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Completeness Checklist
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CheckItem label="Business Description" checked={audit.has_description} />
              <CheckItem label="Phone Number" checked={audit.has_phone} />
              <CheckItem label="Website URL" checked={audit.has_website} />
              <CheckItem label="Business Hours" checked={audit.has_hours} />
              <CheckItem label="Primary Category" checked={audit.has_categories} />
              <CheckItem label="Photos Uploaded" checked={audit.has_photos} />
              <CheckItem label="Attributes Set" checked={audit.has_attributes} />
              <CheckItem label="Services Listed" checked={audit.has_services} />
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border)]">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Photos</span>
                <span className="font-medium">{profile.photo_count} uploaded</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Review Summary + Engagement Stats */}
      {audit && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              Review Summary
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <StatBox label="Total Reviews" value={audit.total_reviews.toString()} />
              <StatBox label="Average Rating" value={audit.average_rating.toFixed(1)} />
              <StatBox label="Last 30 Days" value={audit.reviews_last_30_days.toString()} />
              <StatBox
                label="Response Rate"
                value={`${Math.round(audit.review_response_rate * 100)}%`}
              />
            </div>
            {audit.negative_review_count > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-sm text-red-400">
                  {audit.negative_review_count} negative review{audit.negative_review_count > 1 ? "s" : ""} (1-2 stars)
                </span>
              </div>
            )}
          </div>

          <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-electric-500" />
              Engagement Metrics
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <StatBox label="Posts (30d)" value={audit.posts_last_30_days.toString()} />
              <StatBox label="Unanswered Q&A" value={audit.questions_unanswered.toString()} />
              <StatBox label="Photo Count" value={(profile.photo_count || 0).toString()} />
              <StatBox label="Services" value={(profile.service_items?.length || 0).toString()} />
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Recommendations
          </h2>
          <div className="space-y-3">
            {displayedRecs.map((rec: AuditRecommendation, i: number) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-[var(--muted)]/50 border border-[var(--border)]"
              >
                <PriorityBadge priority={rec.priority} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{rec.title}</div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {rec.description}
                  </p>
                  <span className="text-xs text-electric-500 mt-1 inline-block">
                    {rec.impact_label}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {recommendations.length > 3 && (
            <button
              onClick={() => setShowAllRecommendations(!showAllRecommendations)}
              className="mt-3 flex items-center gap-1 text-sm text-electric-500 hover:text-electric-400 transition-colors"
            >
              {showAllRecommendations ? (
                <>
                  Show fewer <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  Show all {recommendations.length} recommendations{" "}
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Recent Reviews */}
      {recentReviews.length > 0 && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)]">
          <div className="p-6 border-b border-[var(--border)]">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-electric-500" />
              Recent Reviews
            </h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {recentReviews.map((review: any) => (
              <div key={review.id || review.google_review_id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{review.reviewer_name}</span>
                    <StarRating rating={review.star_rating} />
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {new Date(review.create_time).toLocaleDateString()}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-sm text-[var(--foreground)] mb-2 line-clamp-3">
                    {review.comment}
                  </p>
                )}
                {review.reply_comment && (
                  <div className="ml-4 pl-3 border-l-2 border-electric-500/30">
                    <span className="text-xs text-electric-500 font-medium">Your reply</span>
                    <p className="text-sm text-[var(--muted-foreground)] mt-0.5 line-clamp-2">
                      {review.reply_comment}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Posts */}
      {recentPosts.length > 0 && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)]">
          <div className="p-6 border-b border-[var(--border)]">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-electric-500" />
              Recent Posts
            </h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {recentPosts.map((post: any) => (
              <div key={post.id || post.google_post_id} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-xs">
                    {post.topic_type}
                  </Badge>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {new Date(post.create_time).toLocaleDateString()}
                  </span>
                </div>
                {post.summary && (
                  <p className="text-sm text-[var(--foreground)] mt-1 line-clamp-2">
                    {post.summary}
                  </p>
                )}
                {post.action_url && (
                  <a
                    href={post.action_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-electric-500 hover:underline flex items-center gap-1 mt-1"
                  >
                    {post.action_type || "Learn more"}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Q&A */}
      {allQuestions.length > 0 && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)]">
          <div className="p-6 border-b border-[var(--border)]">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-electric-500" />
              Questions & Answers
              {unansweredQuestions.length > 0 && (
                <Badge variant="destructive" className="text-xs ml-2">
                  {unansweredQuestions.length} unanswered
                </Badge>
              )}
            </h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {allQuestions.map((q: any) => (
              <div key={q.id || q.google_question_id} className="p-4">
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    Q: {q.question_text}
                  </span>
                </div>
                <span className="text-xs text-[var(--muted-foreground)]">
                  Asked by {q.author_name} · {new Date(q.create_time).toLocaleDateString()}
                </span>
                {q.answer_text ? (
                  <div className="ml-4 mt-2 pl-3 border-l-2 border-green-500/30">
                    <span className="text-xs text-green-500 font-medium">
                      {q.answer_author_name || "Business"}
                    </span>
                    <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                      {q.answer_text}
                    </p>
                  </div>
                ) : (
                  <div className="ml-4 mt-2 pl-3 border-l-2 border-amber-500/30">
                    <span className="text-xs text-amber-500 font-medium">
                      No answer yet
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Helper Components ----------

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: any;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-[var(--muted-foreground)] mt-0.5 shrink-0" />
      <div className="min-w-0">
        <span className="text-xs text-[var(--muted-foreground)] block">{label}</span>
        <div className="text-sm text-[var(--foreground)]">{children}</div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--muted)]/30 rounded-lg p-3 text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-[var(--muted-foreground)]">{label}</div>
    </div>
  );
}
