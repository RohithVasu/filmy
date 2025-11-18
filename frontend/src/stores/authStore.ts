import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types";
import api from "@/lib/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  authLoaded: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      authLoaded: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          authLoaded: true,
        }),

      logout: () => {
        try {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        } catch {}

        set({
          user: null,
          isAuthenticated: false,
          authLoaded: true,
        });
      },

      fetchUser: async () => {
        try {
          const token = localStorage.getItem("access_token");
          if (!token) {
            set({ authLoaded: true });
            return;
          }

          const res = await api.get("/auth/me");
          const data = res.data.data;

          const user: User = {
            id: data.id,
            email: data.email,
            first_name: data.firstname,
            last_name: data.lastname,
          };

          set({
            user,
            isAuthenticated: true,
            authLoaded: true,
          });
        } catch (err) {
          // Token invalid → clean state
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          set({
            user: null,
            isAuthenticated: false,
            authLoaded: true,
          });
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
