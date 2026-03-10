import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MatchBadgeProps {
  percentage: number;
  className?: string;
}

export default function MatchBadge({ percentage, className = "" }: MatchBadgeProps) {
  const tone = percentage >= 80
    ? "bg-green-500"
    : percentage >= 50
      ? "bg-yellow-500"
      : "bg-orange-500";

  return (
    <span className={`inline-flex items-center gap-1.5 text-white text-xs font-bold px-2 py-0.5 rounded-full ${tone} ${className}`}>
      {percentage}% match
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger type="button" className="inline-flex" aria-label="Match percentage info">
            <Info size={11} className="opacity-90" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-52 text-[10px] leading-tight">
            Match % compares this recipe against your pantry. 100% means you already have every ingredient.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}
