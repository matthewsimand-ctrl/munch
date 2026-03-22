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
        "group relative w-full justify-center rounded-2xl border border-violet-200/80 bg-[linear-gradient(135deg,#7C6EE6_0%,#9A88EE_55%,#B399F3_100%)] px-3.5 py-2.5 text-white shadow-[0_14px_28px_rgba(124,110,230,0.20)] transition-all hover:brightness-[1.02] hover:shadow-[0_16px_32px_rgba(124,110,230,0.24)]",
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.16),transparent_34%)]" />
      <span className="relative flex min-w-0 items-center gap-2.5">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-100/50 bg-amber-200/14 text-orange-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] transition-all duration-200 group-hover:bg-amber-200/20 group-hover:text-orange-300 group-hover:drop-shadow-[0_0_8px_rgba(251,146,60,0.4)]">
          <Crown className="h-3.5 w-3.5" />
        </span>
        <span className="truncate text-sm font-bold tracking-[0.01em] text-white transition-colors duration-200 group-hover:text-white">
          {label}
        </span>
      </span>
      {trailing ? <span className="relative ml-2 shrink-0">{trailing}</span> : null}
    </Button>
  );
}
