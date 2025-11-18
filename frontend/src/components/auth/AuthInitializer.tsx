import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

export const AuthInitializer = () => {
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      fetchUser();
    } else {
      useAuthStore.persist.onFinishHydration(fetchUser);
    }
  }, [fetchUser]);

  return null;
};
