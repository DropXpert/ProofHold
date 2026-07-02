import { create } from "zustand";
import { getSupabaseClient, isSupabaseConfiguredForClient } from "@/lib/supabase";
import type { Currency, DealCategory } from "@/types/deal";

export interface Listing {
  id: string;
  sellerAddr: string;
  title: string;
  description: string;
  priceAmount: string;
  priceCurrency: Currency;
  category: DealCategory;
  deliveryHours: number;
  confirmationHours: number;
  requiredDeliveryProof: string;
  refundTerms: string;
  tags: string[];
  status: "active" | "paused" | "deleted";
  ordersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateListingInput {
  sellerAddr: string;
  title: string;
  description: string;
  priceAmount: string;
  priceCurrency: Currency;
  category: DealCategory;
  deliveryHours: number;
  confirmationHours: number;
  requiredDeliveryProof: string;
  refundTerms: string;
  tags: string[];
}

function mapRow(row: any): Listing {
  return {
    id: row.id,
    sellerAddr: row.seller_addr,
    title: row.title,
    description: row.description ?? "",
    priceAmount: String(row.price_amount),
    priceCurrency: row.price_currency,
    category: row.category ?? "other",
    deliveryHours: row.delivery_hours,
    confirmationHours: row.confirmation_hours,
    requiredDeliveryProof: row.required_delivery_proof ?? "",
    refundTerms: row.refund_terms ?? "",
    tags: row.tags ?? [],
    status: row.status,
    ordersCount: row.orders_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface ListingState {
  listings: Listing[];
  myListings: Listing[];
  popular: Listing[];
  loading: boolean;
  popularLoading: boolean;

  fetchAll: (filters?: { category?: string; search?: string }) => Promise<void>;
  fetchPopular: () => Promise<void>;
  fetchMine: (sellerAddr: string) => Promise<void>;
  getListing: (id: string) => Listing | undefined;
  createListing: (input: CreateListingInput) => Promise<Listing>;
  toggleStatus: (id: string, status: "active" | "paused") => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  incrementOrders: (id: string) => Promise<void>;
}

export const useListingStore = create<ListingState>((set, get) => ({
  listings: [],
  myListings: [],
  popular: [],
  loading: false,
  popularLoading: false,

  getListing: (id) =>
    [...get().listings, ...get().popular, ...get().myListings].find((l) => l.id === id),

  fetchAll: async (filters) => {
    set({ loading: true });
    if (!isSupabaseConfiguredForClient()) {
      set({ loading: false });
      return;
    }
    try {
      const sb = getSupabaseClient();
      let q = sb
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("orders_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);

      if (filters?.category && filters.category !== "all") {
        q = q.eq("category", filters.category);
      }
      if (filters?.search) {
        q = q.ilike("title", `%${filters.search}%`);
      }

      const { data } = await q;
      set({ listings: (data ?? []).map(mapRow), loading: false });
    } catch {
      set({ loading: false });
    }
  },

  // Home's "popular" rail keeps its own slice so the marketplace page's
  // filtered fetchAll() can never clobber it (they share no array).
  fetchPopular: async () => {
    if (!isSupabaseConfiguredForClient()) return;
    set({ popularLoading: true });
    try {
      const sb = getSupabaseClient();
      const { data } = await sb
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("orders_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(12);
      set({ popular: (data ?? []).map(mapRow), popularLoading: false });
    } catch {
      set({ popularLoading: false });
    }
  },

  fetchMine: async (sellerAddr) => {
    if (!isSupabaseConfiguredForClient()) return;
    const sb = getSupabaseClient();
    const { data } = await sb
      .from("listings")
      .select("*")
      .eq("seller_addr", sellerAddr)
      .neq("status", "deleted")
      .order("created_at", { ascending: false });
    set({ myListings: (data ?? []).map(mapRow) });
  },

  createListing: async (input) => {
    if (!isSupabaseConfiguredForClient()) {
      const local: Listing = {
        id: `LS-${Math.random().toString(36).slice(2,6).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,
        ...input,
        status: "active",
        ordersCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set((s) => ({ myListings: [local, ...s.myListings] }));
      return local;
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from("listings")
      .insert({
        seller_addr: input.sellerAddr,
        title: input.title,
        description: input.description,
        price_amount: Number(input.priceAmount),
        price_currency: input.priceCurrency,
        category: input.category,
        delivery_hours: input.deliveryHours,
        confirmation_hours: input.confirmationHours,
        required_delivery_proof: input.requiredDeliveryProof,
        refund_terms: input.refundTerms,
        tags: input.tags,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    const listing = mapRow(data);
    set((s) => ({ myListings: [listing, ...s.myListings] }));
    return listing;
  },

  toggleStatus: async (id, status) => {
    set((s) => ({
      myListings: s.myListings.map((l) =>
        l.id === id ? { ...l, status } : l
      ),
    }));
    if (!isSupabaseConfiguredForClient()) return;
    const sb = getSupabaseClient();
    await sb.from("listings").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  },

  deleteListing: async (id) => {
    set((s) => ({ myListings: s.myListings.filter((l) => l.id !== id) }));
    if (!isSupabaseConfiguredForClient()) return;
    const sb = getSupabaseClient();
    await sb.from("listings").update({ status: "deleted" }).eq("id", id);
  },

  incrementOrders: async (id) => {
    // Optimistic local bump so the count reflects immediately in both modes.
    const bump = (l: Listing) => (l.id === id ? { ...l, ordersCount: l.ordersCount + 1 } : l);
    set((s) => ({ listings: s.listings.map(bump), myListings: s.myListings.map(bump) }));

    if (!isSupabaseConfiguredForClient()) return;
    const sb = getSupabaseClient();
    await sb.rpc("increment_listing_orders", { p_listing_id: id }).then(() => {}, () => {});
  },
}));
