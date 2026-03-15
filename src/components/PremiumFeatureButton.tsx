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
}

export default function PremiumFeatureButton({
  label,
  onClick,
  className,
  disabled = false,
  trailing,
}: PremiumFeatureButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative w-full justify-between rounded-2xl border border-violet-300/60 bg-[linear-gradient(135deg,#5B21B6_0%,#7C3AED_55%,#9333EA_100%)] px-3.5 py-2.5 text-white shadow-[0_14px_32px_rgba(91,33,182,0.28)] transition-all hover:brightness-[1.03] hover:shadow-[0_18px_36px_rgba(91,33,182,0.34)]",
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.22),transparent_34%)]" />
      <span className="relative flex min-w-0 items-center gap-2.5">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-orange-200/45 bg-orange-400/18 text-orange-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
          <Crown className="h-3.5 w-3.5" />
        </span>
        <span className="truncate text-sm font-semibold tracking-[0.01em]">{label}</span>
      </span>
      {trailing ? <span className="relative ml-2 shrink-0">{trailing}</span> : null}
    </Button>
  );
}
