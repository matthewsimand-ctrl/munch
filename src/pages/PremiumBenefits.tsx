import { ArrowLeft, Check, Crown, Lock, Sparkles, Star } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

const MEMBER_BENEFITS = [
  "AI imports from URLs, PDFs, and photos",
  "Discovery swiping with richer premium recipe discovery",
  "Nutritional Facts across your recipes",
  "Recipe remixing, Fridge Cleanup, and AI planning tools",
  "Premium cooking insights and savings estimates",
];

const PLAN_COLUMNS = [
  { name: "Free", price: "$0", note: "Save recipes and cook with the essentials" },
  { name: "Member", price: "$7.99", note: "Unlock every premium Munch tool" },
];

const PLAN_FEATURES = [
  { label: "Browse and save recipes", free: true, member: true },
  { label: "Discovery swiping", free: true, member: true },
  { label: "Manual recipe creation", free: true, member: true },
  { label: "Cook Mode and grocery lists", free: true, member: true },
  { label: "Meal planning", free: false, member: true },
  { label: "URL recipe imports", free: false, member: true },
  { label: "PDF and photo recipe imports", free: false, member: true },
  { label: "Nutritional Facts", free: false, member: true },
  { label: "Recipe remix and AI tweaks", free: false, member: true },
  { label: "Fridge Cleanup and smart pantry tools", free: false, member: true },
  { label: "AI savings estimates", free: false, member: true },
  { label: "Surprise Me AI autofill", free: false, member: true },
];

function PlanMarker({ enabled, tone }: { enabled: boolean; tone: "free" | "member" }) {
  if (!enabled) {
    return <span className="text-lg font-semibold text-stone-300">-</span>;
  }

  const classes = tone === "member"
    ? "bg-orange-100 text-orange-600"
    : "bg-emerald-100 text-emerald-700";

  return (
    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${classes}`}>
      <Check className="h-4 w-4" />
    </span>
  );
}

export default function PremiumBenefits() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const requestedFeature = searchParams.get("feature");
  const backTarget = (location.state as { from?: string } | null)?.from || "/dashboard";

  const intro = requestedFeature && requestedFeature !== "Munch Membership"
    ? `${requestedFeature} is a member feature. Upgrade to unlock it, along with the rest of the premium Munch toolkit.`
    : "Upgrade to Munch Membership to unlock every premium recipe, planning, and AI cooking tool in one place.";

  return (
    <div className="min-h-full px-4 py-5 md:px-8 md:py-8" style={{ background: "#FFFAF5" }}>
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => navigate(backTarget)}
          className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-stone-600 transition-colors hover:border-orange-300 hover:text-orange-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <section
          className="mt-4 overflow-hidden rounded-[2rem] border p-6 md:p-8"
          style={{
            background: "linear-gradient(135deg,#FFF7ED 0%,#FFFFFF 48%,#F5F3FF 100%)",
            borderColor: "rgba(249,115,22,0.14)",
            boxShadow: "0 18px 60px rgba(28,25,23,0.08)",
          }}
        >
          <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-500 shadow-sm">
                <Crown className="h-3.5 w-3.5" />
                Membership
              </div>
              <h1 className="mt-4 text-3xl font-bold text-stone-900 md:text-5xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                Unlock the full Munch kitchen
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 md:text-base">
                {intro}
              </p>
          </div>

          <div
            className="mt-6 w-full rounded-[1.75rem] border p-5 shadow-[0_18px_44px_rgba(249,115,22,0.10)]"
            style={{ background: "rgba(255,255,255,0.5)", borderColor: "rgba(249,115,22,0.28)" }}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">Munch Member</p>
                  <p className="mt-2 text-4xl font-bold text-stone-900">$7.99</p>
                  <p className="mt-1 text-sm text-stone-500">per month</p>
                </div>
                <div className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600 border border-orange-200">
                  Cancel anytime
                </div>
              </div>

              <div className="space-y-2.5">
                {MEMBER_BENEFITS.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-white/70 px-3 py-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-sm leading-6 text-stone-700">{benefit}</p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => navigate("/#pricing")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-white">
                  <Crown className="h-3.5 w-3.5" />
                </span>
                Become a Member
              </button>
            </div>
          </div>

          <div className="mt-8 rounded-[1.75rem] border border-stone-200 bg-white/92 p-4 shadow-[0_10px_30px_rgba(28,25,23,0.05)] md:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-500">Plan Comparison</p>
                <h2 className="mt-1 text-2xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  Compare plans at a glance
                </h2>
              </div>
              <p className="text-sm text-stone-500">Checks mean the feature is included. A dash means it is not.</p>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200">
              <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(120px,0.7fr)_minmax(120px,0.7fr)] bg-stone-50">
                <div className="px-4 py-4 text-sm font-semibold text-stone-500">Features</div>
                {PLAN_COLUMNS.map((plan) => (
                  <div key={plan.name} className="border-l border-stone-200 px-4 py-4 text-center">
                    <p className="text-sm font-bold text-stone-900">{plan.name}</p>
                    <p className={`mt-1 text-xl font-bold ${plan.name === "Member" ? "text-orange-600" : "text-stone-700"}`}>{plan.price}</p>
                    <p className="mt-1 text-[11px] leading-4 text-stone-500">{plan.note}</p>
                  </div>
                ))}
              </div>

              {PLAN_FEATURES.map((feature, index) => (
                <div
                  key={feature.label}
                  className="grid grid-cols-[minmax(0,1.6fr)_minmax(120px,0.7fr)_minmax(120px,0.7fr)]"
                  style={{ background: index % 2 === 0 ? "rgba(255,255,255,0.98)" : "rgba(250,250,249,0.9)" }}
                >
                  <div className="px-4 py-3 text-sm font-medium text-stone-700">{feature.label}</div>
                  <div className="flex items-center justify-center border-l border-stone-200 px-4 py-3">
                    <PlanMarker enabled={feature.free} tone="free" />
                  </div>
                  <div className="flex items-center justify-center border-l border-stone-200 px-4 py-3">
                    <PlanMarker enabled={feature.member} tone="member" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-3 md:grid-cols-2">
              {MEMBER_BENEFITS.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white/85 px-4 py-4"
                >
                  <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-500">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-medium leading-6 text-stone-700">{benefit}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[1.5rem] border border-stone-200 bg-white px-5 py-5">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                  <Star className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900">Every premium touchpoint lands here</p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    If you tap a locked feature, Munch brings you to this page instead of letting you drift into a broken half-flow.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-500">
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  Premium features stay clearly gated
                </span>
                <span className="rounded-full bg-stone-100 px-3 py-1.5">Orange crown accents</span>
                <span className="rounded-full bg-stone-100 px-3 py-1.5">Purple upgrade CTA</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
