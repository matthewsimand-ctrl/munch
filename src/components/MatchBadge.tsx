import { Info } from "lucide-react";

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
      <span className="relative group inline-flex">
        <Info size={11} className="opacity-90" />
        <span className="pointer-events-none absolute z-20 hidden group-hover:block left-1/2 -translate-x-1/2 bottom-full mb-1 w-52 max-w-[calc(100vw-2rem)] rounded-md bg-gray-900 px-2 py-1.5 text-[10px] font-medium text-white leading-tight shadow-lg">
          Match % compares this recipe against your pantry. 100% means you already have every ingredient.
        </span>
      </span>
    </span>
  );
}
