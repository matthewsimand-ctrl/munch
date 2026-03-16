import { Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function MobileActionButton({
  label,
  onClick,
  compact = false,
}: {
  label: string;
  onClick: () => void;
  compact?: boolean;
}) {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed right-4 z-40 inline-flex items-center justify-center rounded-full border text-sm font-bold shadow-lg transition-transform active:scale-[0.98] ${compact
        ? "bottom-[calc(var(--mobile-nav-offset)+0.65rem)] h-14 w-14 border-orange-200/90 bg-white text-orange-600 shadow-orange-200/50"
        : "bottom-[calc(var(--mobile-nav-offset)+0.75rem)] h-14 items-center gap-2 px-5 border-orange-200/60 text-white shadow-orange-500/30"
        }`}
      style={compact
        ? { boxShadow: "0 12px 30px rgba(251,146,60,0.18), inset 0 0 0 3px rgba(255,237,213,0.9)" }
        : { background: "linear-gradient(135deg,#FDBA74 0%,#F97316 45%,#EA580C 100%)" }}
      aria-label={label}
    >
      <span className={`inline-flex items-center justify-center rounded-full ${compact ? "h-10 w-10 bg-gradient-to-br from-orange-300 via-orange-500 to-orange-600 text-white shadow-[0_6px_16px_rgba(249,115,22,0.32)]" : "h-8 w-8 bg-white/20"}`}>
        <Plus size={18} />
      </span>
      {!compact ? label : null}
    </button>
  );
}
