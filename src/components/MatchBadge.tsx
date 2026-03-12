import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MatchBadgeProps {
  percentage: number;
  className?: string;
  dataTutorial?: string;
}

export default function MatchBadge({ percentage, className = "", dataTutorial }: MatchBadgeProps) {
  const tone = percentage >= 80
    ? "bg-green-500"
    : percentage >= 50
      ? "bg-yellow-500"
      : "bg-orange-500";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          data-tutorial={dataTutorial}
          className={`inline-flex items-center gap-1.5 text-white text-xs font-bold px-2 py-0.5 rounded-full cursor-help ${tone} ${className}`}
        >
          {percentage}% match
          <Info size={11} className="opacity-90" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-52 text-[10px] leading-tight">
        Match % compares this recipe against your pantry. 100% means you already have every ingredient.
      </TooltipContent>
    </Tooltip>
  );
}
