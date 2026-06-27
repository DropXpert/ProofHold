import { create } from "zustand";
import {
  loginWithWallet,
  applyStoredSession,
  clearSession,
  type AuthSession,
} from "@/lib/auth";
import { clearSupabaseAccessToken } from "@/lib/supabase";
import { applyPendingReferral } from "@/lib/referral";
import type { Currency } from "@/types/deal";

interface AuthState {
  session: AuthSession | null;
  loading: boolean;
  error: string | null;

  connect: (currency?: Currency) => Promise<void>;
  disconnect: () => void;
  restoreSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: false,
  error: null,

  connect: async (currency = "NIM") => {
    set({ loading: true, error: null });
    try {
      const session = await loginWithWallet(currency);
      set({ session, loading: false });
      // Bind a pending referral now that the wallet JWT is active.
      if (session?.token) void applyPendingReferral();
    } catch (err: any) {
      set({ loading: false, error: err.message || "Connection failed" });
    }
  },

  disconnect: () => {
    clearSession();
    clearSupabaseAccessToken();
    set({ session: null, error: null });
  },

  restoreSession: async () => {
    const session = await applyStoredSession();
    if (session) {
      set({ session });
      // Retry binding a pending referral on a restored session.
      if (session.token) void applyPendingReferral();
    }
  },
}));
