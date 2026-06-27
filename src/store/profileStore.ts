import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ProfileData {
  username: string;
  avatarDataUrl: string | null;
}

interface ProfileState {
  profiles: Record<string, ProfileData>;
  getProfile: (addr: string) => ProfileData;
  setProfile: (addr: string, data: Partial<ProfileData>) => void;
}

const DEFAULT: ProfileData = { username: "", avatarDataUrl: null };

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profiles: {},

      getProfile: (addr) =>
        get().profiles[addr.toLowerCase()] ?? DEFAULT,

      setProfile: (addr, data) =>
        set((s) => ({
          profiles: {
            ...s.profiles,
            [addr.toLowerCase()]: {
              ...(s.profiles[addr.toLowerCase()] ?? DEFAULT),
              ...data,
            },
          },
        })),
    }),
    { name: "proofhold.profiles.v1" }
  )
);
