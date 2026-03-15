import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePremiumAccess } from "@/hooks/usePremiumAccess";

export function usePremiumGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isPremium, loading } = usePremiumAccess();

  const openPremiumPage = useCallback(
    (feature?: string) => {
      const params = new URLSearchParams();
      if (feature) params.set("feature", feature);
      navigate(
        {
          pathname: "/premium",
          search: params.toString() ? `?${params.toString()}` : "",
        },
        {
          state: {
            from: `${location.pathname}${location.search}${location.hash}`,
          },
        },
      );
    },
    [location.hash, location.pathname, location.search, navigate],
  );

  const requirePremium = useCallback(
    (feature?: string) => {
      if (isPremium) return true;
      openPremiumPage(feature);
      return false;
    },
    [isPremium, openPremiumPage],
  );

  return {
    isPremium,
    loading,
    openPremiumPage,
    requirePremium,
  };
}
