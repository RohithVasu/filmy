// src/lib/api.ts
import axios, { AxiosError, AxiosHeaders, AxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/authStore";

const API_BASE_URL =
  import.meta.env.VITE_BASE_API_URL || "http://localhost:8000/filmy-api/v1";

/* -----------------------------------------------------------
   1. CREATE AXIOS INSTANCE
----------------------------------------------------------- */
const api = axios.create({
  baseURL: API_BASE_URL,
});

/* -----------------------------------------------------------
   2. REQUEST INTERCEPTOR (Attach Access Token)
----------------------------------------------------------- */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      // Headers may be Raw or AxiosHeaders — normalize safely
      if (config.headers instanceof AxiosHeaders) {
        config.headers.set("Authorization", `Bearer ${token}`);
      } else {
        config.headers = {
          ...(config.headers || {}),
          Authorization: `Bearer ${token}`,
        } as any;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* -----------------------------------------------------------
   3. REFRESH TOKEN HANDLING (Safe, Single Refresh)
----------------------------------------------------------- */
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) throw new Error("No refresh token");

      const formData = new URLSearchParams();
      formData.append("refresh_token", refreshToken);

      const res = await axios.post(`${API_BASE_URL}/auth/refresh`, formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const data = res.data?.data || res.data;
      const newToken = data?.access_token || data;

      if (!newToken) throw new Error("Invalid refresh response");

      localStorage.setItem("access_token", newToken);
      return newToken;
    } catch (err) {
      // Refresh failed — cleanup & logout
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      useAuthStore.getState().logout();
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/* -----------------------------------------------------------
   4. RESPONSE INTERCEPTOR (Auto Retry with Refresh)
----------------------------------------------------------- */
api.interceptors.response.use(
  (res) => res,
  async (
    error: AxiosError & {
      config?: AxiosRequestConfig & { _retry?: boolean };
    }
  ) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      const newToken = await refreshAccessToken();
      if (!newToken) {
        if (typeof window !== "undefined") window.location.href = "/login";
        return Promise.reject(error);
      }

      // Re-attach header safely
      if (originalRequest.headers instanceof AxiosHeaders) {
        originalRequest.headers.set("Authorization", `Bearer ${newToken}`);
      } else {
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${newToken}`,
        } as any;
      }

      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

/* -----------------------------------------------------------
   5. AUTH API
----------------------------------------------------------- */
export const authAPI = {
  login: async (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const response = await api.post("/auth/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const data = response.data?.data || response.data;
    const access_token = data?.access_token || data;
    const refresh_token = data?.refresh_token;

    if (access_token) localStorage.setItem("access_token", access_token);
    if (refresh_token) localStorage.setItem("refresh_token", refresh_token);

    return response.data;
  },

  signup: async (
    firstname: string,
    lastname: string,
    email: string,
    hashed_password: string
  ) => {
    const response = await api.post("/auth/register", {
      firstname,
      lastname,
      email,
      hashed_password,
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    useAuthStore.getState().logout();
  },

  getCurrentUser: async () => {
    const res = await api.get("/auth/me");
    return res.data;
  },

  updateProfile: async (id: number, data: any) => {
    const response = await api.patch(`/users/${id}`, data);
    return response.data;
  },
  
  changePassword: async (current_password: string, new_password: string) => {
    const response = await api.post("/users/change-password", {
      current_password,
      new_password,
    });
    return response.data;
  },  
};

/* -----------------------------------------------------------
   6. MOVIES API
----------------------------------------------------------- */
export const moviesAPI = {
  search: async (params: {
    search?: string;
    genre?: string[];
    language?: string;
    release_year?: number;
    sort_by?: string;
    order?: string;
    page?: number;
    limit?: number;
  }) => {
    const sp = new URLSearchParams();
  
    if (params.search) sp.append("search", params.search);
    if (params.language) sp.append("language", params.language);
    if (params.release_year) sp.append("release_year", params.release_year.toString());
    if (params.sort_by) sp.append("sort_by", params.sort_by);
    if (params.order) sp.append("order", params.order);
  
    // Genre → comma-separated list
    if (params.genre?.length) {
      sp.append("genre", params.genre.join(","));
    }
  
    sp.append("page", params.page?.toString() || "1");
    sp.append("limit", params.limit?.toString() || "50");
  
    const response = await api.get(`/movies/explore?${sp.toString()}`);
    return response.data;
  },
  

  getById: async (tmdbId: number) => {
    const response = await api.get(`/movies/tmdb/${tmdbId}`);
    return response.data;
  },

  rateMovie: async (
    id: number,
    rating?: number | null,
    review?: string | null,
    status?: "watchlist" | "watched" | null
  ) => {
    const payload: any = {
      movie_id: id,
    };
  
    // only include fields if they are valid
    if (typeof rating === "number" && rating > 0) {
      payload.rating = rating;
    }
  
    if (typeof review === "string" && review.trim().length > 0) {
      payload.review = review.trim();
    }
  
    if (status === "watchlist" || status === "watched") {
      payload.status = status;
      payload.rating = rating;
      payload.review = review;
    }
  
    const response = await api.post("/feedbacks/", payload);
    return response.data;
  },

  getUserRating: async (id: number) => {
    const response = await api.get(`/feedbacks/${id}`);
    // return the raw data object expected by MovieModal
    return response.data.data;
  },

  getUserStats: async () => {
    const response = await api.get("/feedbacks/stats");
    return response.data;
  },

  getPersonalizedRecommendations: async (params?: { limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit)
      searchParams.append("limit", params.limit.toString());
    const response = await api.get(
      `/recommendations/personalized?${searchParams.toString()}`
    );
    return response.data;
  },

  getBecauseYouWatchedRecommendations: async () => {
    const response = await api.get("/recommendations/because-you-watched");
    return response.data;
  },
};

export default api;
