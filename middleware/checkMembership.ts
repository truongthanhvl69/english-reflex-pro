import { useMembership } from "@/hooks/useMembership";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Client-side HOC or React helper to restrict pages to PRO/PREMIUM members
 */
export function useRequirePro() {
  const { plan, loading } = useMembership();
  const router = useRouter();

  useEffect(() => {
    if (!loading && plan !== "pro" && plan !== "premium") {
      // Trigger global modal event and redirect to pricing page
      window.dispatchEvent(
        new CustomEvent("open_upgrade_modal", {
          detail: { reason: "Đây là tính năng dành riêng cho thành viên PRO." },
        })
      );
      router.push("/pricing");
    }
  }, [plan, loading, router]);

  return { plan, loading };
}
