import { Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function MobileActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-[calc(var(--mobile-nav-offset)+0.75rem)] right-4 z-40 inline-flex h-14 items-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition-transform active:scale-[0.98]"
      style={{ background: "linear-gradient(135deg,#FDBA74 0%,#F97316 45%,#EA580C 100%)" }}
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
        <Plus size={18} />
      </span>
      {label}
    </button>
  );
}
