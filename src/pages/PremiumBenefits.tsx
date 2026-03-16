import { ArrowLeft, Check, Crown, Lock, Sparkles, Star } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "@/lib/store";

const MEMBER_BENEFITS = [
  "AI imports from URLs, PDFs, and photos",
  "Discovery swiping with richer premium recipe discovery",
  "Nutritional Facts across your recipes",
  "Recipe remixing, Fridge Cleanup, and AI planning tools",
  "Premium cooking insights and savings estimates",
];

const MEMBERSHIP_BASE_PRICE_USD = 7.99;

const CURRENCY_MULTIPLIERS: Record<string, number> = {
  USD: 1,
  CAD: 1.35,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.52,
  JPY: 149,
  INR: 83,
};

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

function formatMembershipPrice(currency: string) {
  const normalizedCurrency = CURRENCY_MULTIPLIERS[currency] ? currency : "USD";
  const amount = MEMBERSHIP_BASE_PRICE_USD * (CURRENCY_MULTIPLIERS[normalizedCurrency] || 1);
  const roundedAmount = normalizedCurrency === "JPY" ? Math.round(amount) : Math.round(amount * 100) / 100;

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: normalizedCurrency,
    maximumFractionDigits: normalizedCurrency === "JPY" ? 0 : 2,
  }).format(roundedAmount);
}

function formatCurrencyAmount(amount: number, currency: string) {
  const normalizedCurrency = CURRENCY_MULTIPLIERS[currency] ? currency : "USD";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: normalizedCurrency,
    maximumFractionDigits: normalizedCurrency === "JPY" ? 0 : 2,
  }).format(amount);
}

export default function PremiumBenefits() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { userProfile } = useStore();
  const requestedFeature = searchParams.get("feature");
  const backTarget = (location.state as { from?: string } | null)?.from || "/dashboard";
  const preferredCurrency = userProfile.groceryCurrency || "USD";
  const formattedMemberPrice = formatMembershipPrice(preferredCurrency);
  const planColumns = [
    { name: "Free", price: formatCurrencyAmount(0, preferredCurrency), note: "Save recipes and cook with the essentials" },
    { name: "Member", price: formattedMemberPrice, note: "Unlock every premium Munch tool" },
  ];

  const intro = requestedFeature && requestedFeature !== "Munch Membership"
    ? `${requestedFeature} is a member feature. Upgrade to unlock it, along with the rest of the premium Munch toolkit.`
    : null;

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
          <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-500 shadow-sm">
                <Crown className="h-3.5 w-3.5" />
                Membership
              </div>
              <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-[1.05] text-stone-900 md:text-5xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                Unlock the full Munch kitchen
              </h1>
              {intro ? (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600 md:text-base">
                  {intro}
                </p>
              ) : (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600 md:text-base">
                  Upgrade to Munch Membership to unlock every premium recipe, planning, and{" "}
                  <span className="whitespace-nowrap">AI cooking tool in one place.</span>
                </p>
              )}
          </div>

          <div className="mt-6 flex justify-center">
            <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-[0_28px_70px_rgba(249,115,22,0.16)]">
              <div
                className="relative px-6 pb-24 pt-7 text-white"
                style={{ background: "linear-gradient(135deg,#FB923C 0%,#F97316 52%,#EA580C 100%)" }}
              >
                <div className="absolute inset-x-0 bottom-0 h-36">
                  <div className="absolute -left-10 bottom-3 h-32 w-72 rounded-[999px] bg-white/14" />
                  <div className="absolute right-[-3rem] bottom-[-1.5rem] h-44 w-80 rounded-[999px] bg-white/20" />
                  <div className="absolute left-1/2 bottom-[-6.5rem] h-52 w-[128%] -translate-x-1/2 rounded-[50%] bg-white" />
                </div>
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="rounded-full bg-white/16 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-50">
                    Munch Member
                  </div>
                  <div className="rounded-full border border-white/35 bg-white/15 px-3 py-1 text-xs font-semibold text-orange-50">
                    Cancel anytime
                  </div>
                </div>
              </div>

              <div className="relative px-6 pb-7 pt-0">
                <div className="absolute left-1/2 top-0 z-10 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-8 border-white bg-white shadow-[0_16px_34px_rgba(28,25,23,0.12)]">
                  <div className="text-center">
                    <p className="text-3xl font-bold leading-none text-orange-500">{formattedMemberPrice}</p>
                  </div>
                </div>

                <div className="pt-16 text-center">
                  <h2 className="text-3xl font-bold uppercase tracking-[0.08em] text-orange-500">Member</h2>
                  <p className="mt-1 text-sm font-medium uppercase tracking-[0.18em] text-stone-400">Per Month</p>
                </div>

                <div className="mt-6 space-y-3">
                  {MEMBER_BENEFITS.map((benefit) => (
                    <div key={benefit} className="flex items-start gap-3 px-1">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <p className="text-sm leading-6 text-stone-600">{benefit}</p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/#pricing")}
                  className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-orange-300 bg-transparent px-5 py-3 text-sm font-semibold text-orange-600 transition-colors hover:border-orange-400 hover:bg-orange-50"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                    <Crown className="h-3.5 w-3.5" />
                  </span>
                  Become a Member
                </button>
              </div>
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
                {planColumns.map((plan) => (
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
                <span className="rounded-full bg-stone-100 px-3 py-1.5">Orange premium accents</span>
                <span className="rounded-full bg-stone-100 px-3 py-1.5">Dedicated upgrade destination</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
