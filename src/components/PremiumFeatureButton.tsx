import type { ReactNode } from "react";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PremiumFeatureButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  trailing?: ReactNode;
  variant?: "default" | "soft";
}

export default function PremiumFeatureButton({
  label,
  onClick,
  className,
  disabled = false,
  trailing,
  variant = "default",
}: PremiumFeatureButtonProps) {
  const isSoft = variant === "soft";

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative w-full justify-center rounded-2xl px-3.5 py-2.5 transition-all",
        isSoft
          ? "border border-orange-200/90 bg-white/95 text-stone-700 shadow-[0_10px_24px_rgba(120,53,15,0.08)] hover:border-orange-300 hover:bg-orange-50/60 hover:text-orange-600"
          : "border border-violet-200/80 bg-[linear-gradient(135deg,#7C6EE6_0%,#9A88EE_55%,#B399F3_100%)] text-white shadow-[0_14px_28px_rgba(124,110,230,0.20)] hover:brightness-[1.02] hover:shadow-[0_16px_32px_rgba(124,110,230,0.24)]",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-0",
          isSoft
            ? "bg-[radial-gradient(circle_at_top_left,rgba(255,247,237,0.9),transparent_44%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.08),transparent_34%)]"
            : "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.16),transparent_34%)]",
        )}
      />
      <span className="relative flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-200",
            isSoft
              ? "border border-orange-200 bg-orange-50 text-orange-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] group-hover:border-orange-300 group-hover:bg-orange-100"
              : "border border-amber-100/50 bg-amber-200/14 text-orange-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] group-hover:bg-amber-200/20 group-hover:text-orange-300 group-hover:drop-shadow-[0_0_8px_rgba(251,146,60,0.4)]",
          )}
        >
          <Crown className="h-3.5 w-3.5" />
        </span>
        <span
          className={cn(
            "truncate text-sm font-bold tracking-[0.01em] transition-colors duration-200",
            isSoft ? "text-stone-700 group-hover:text-orange-600" : "text-white group-hover:text-white",
          )}
        >
          {label}
        </span>
      </span>
      {trailing ? <span className="relative ml-2 shrink-0">{trailing}</span> : null}
    </Button>
  );
}
