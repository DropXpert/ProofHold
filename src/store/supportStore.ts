import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getSupabaseClient, isSupabaseConfiguredForClient } from "@/lib/supabase";

export interface SupportTicket {
  id: string;
  dealId: string;
  subject: string;
  status: "open" | "resolved";
  openerAddr: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string | null;
  dealId: string;
  sender: "user" | "admin";
  senderAddr: string;
  body: string;
  createdAt: string;
}

interface SupportThread {
  dealId: string;
  messages: SupportMessage[];
  loading: boolean;
}

interface SupportState {
  // Ticket list (persisted so user sees their history)
  myTickets: SupportTicket[];
  // In-memory message cache keyed by ticketId
  threads: Record<string, SupportThread>;

  // Ticket actions
  createTicket: (dealId: string, subject: string, openerAddr: string) => Promise<SupportTicket>;
  loadMyTickets: (openerAddr: string) => Promise<void>;
  loadAllTickets: () => Promise<SupportTicket[]>;
  resolveTicket: (ticketId: string, resolvedBy: string) => Promise<void>;
  reopenTicket: (ticketId: string) => Promise<void>;

  // Message actions
  loadThread: (ticketId: string, dealId: string) => Promise<void>;
  sendMessage: (ticketId: string, dealId: string, body: string, sender: "user" | "admin", senderAddr?: string) => Promise<void>;
  subscribeThread: (ticketId: string, dealId: string, onMessage: (msg: SupportMessage) => void) => () => void;
}

function mapTicket(row: any): SupportTicket {
  return {
    id: row.id,
    dealId: row.deal_id,
    subject: row.subject ?? "",
    status: row.status,
    openerAddr: row.opener_addr ?? "",
    resolvedAt: row.resolved_at ?? null,
    resolvedBy: row.resolved_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: any): SupportMessage {
  return {
    id: row.id,
    ticketId: row.ticket_id ?? null,
    dealId: row.deal_id,
    sender: row.sender,
    senderAddr: row.sender_addr ?? "",
    body: row.body,
    createdAt: row.created_at,
  };
}

export const useSupportStore = create<SupportState>()(
  persist(
    (set) => ({
      myTickets: [],
      threads: {},

      createTicket: async (dealId, subject, openerAddr) => {
        if (!isSupabaseConfiguredForClient()) {
          const local: SupportTicket = {
            id: crypto.randomUUID(),
            dealId,
            subject,
            status: "open",
            openerAddr,
            resolvedAt: null,
            resolvedBy: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          set((s) => ({ myTickets: [local, ...s.myTickets] }));
          return local;
        }

        const sb = getSupabaseClient();
        const { data, error } = await sb
          .from("support_tickets")
          .insert({ deal_id: dealId, subject, opener_addr: openerAddr, status: "open" })
          .select()
          .single();
        if (error) throw new Error(error.message);
        const ticket = mapTicket(data);
        set((s) => ({ myTickets: [ticket, ...s.myTickets] }));
        return ticket;
      },

      loadMyTickets: async (openerAddr) => {
        if (!isSupabaseConfiguredForClient()) return;
        const sb = getSupabaseClient();
        const { data } = await sb
          .from("support_tickets")
          .select("*")
          .eq("opener_addr", openerAddr)
          .order("created_at", { ascending: false });
        if (data) set({ myTickets: data.map(mapTicket) });
      },

      loadAllTickets: async () => {
        if (!isSupabaseConfiguredForClient()) return [];
        const sb = getSupabaseClient();
        const { data } = await sb
          .from("support_tickets")
          .select("*")
          .order("updated_at", { ascending: false });
        return (data ?? []).map(mapTicket);
      },

      resolveTicket: async (ticketId, resolvedBy) => {
        const now = new Date().toISOString();
        set((s) => ({
          myTickets: s.myTickets.map((t) =>
            t.id === ticketId
              ? { ...t, status: "resolved", resolvedAt: now, resolvedBy, updatedAt: now }
              : t
          ),
        }));
        if (!isSupabaseConfiguredForClient()) return;
        const sb = getSupabaseClient();
        await sb
          .from("support_tickets")
          .update({ status: "resolved", resolved_at: now, resolved_by: resolvedBy, updated_at: now })
          .eq("id", ticketId);
      },

      reopenTicket: async (ticketId) => {
        const now = new Date().toISOString();
        set((s) => ({
          myTickets: s.myTickets.map((t) =>
            t.id === ticketId
              ? { ...t, status: "open", resolvedAt: null, resolvedBy: null, updatedAt: now }
              : t
          ),
        }));
        if (!isSupabaseConfiguredForClient()) return;
        const sb = getSupabaseClient();
        await sb
          .from("support_tickets")
          .update({ status: "open", resolved_at: null, resolved_by: null, updated_at: now })
          .eq("id", ticketId);
      },

      loadThread: async (ticketId, dealId) => {
        set((s) => ({
          threads: {
            ...s.threads,
            [ticketId]: { dealId, messages: s.threads[ticketId]?.messages ?? [], loading: true },
          },
        }));

        if (!isSupabaseConfiguredForClient()) {
          set((s) => ({
            threads: { ...s.threads, [ticketId]: { ...s.threads[ticketId], loading: false } },
          }));
          return;
        }

        try {
          const sb = getSupabaseClient();
          const { data } = await sb
            .from("support_messages")
            .select("*")
            .eq("ticket_id", ticketId)
            .order("created_at", { ascending: true });

          set((s) => ({
            threads: {
              ...s.threads,
              [ticketId]: { dealId, messages: (data ?? []).map(mapMessage), loading: false },
            },
          }));
        } catch {
          set((s) => ({
            threads: { ...s.threads, [ticketId]: { ...s.threads[ticketId], loading: false } },
          }));
        }
      },

      sendMessage: async (ticketId, dealId, body, sender, senderAddr = "") => {
        if (!isSupabaseConfiguredForClient()) {
          const local: SupportMessage = {
            id: crypto.randomUUID(),
            ticketId,
            dealId,
            sender,
            senderAddr,
            body,
            createdAt: new Date().toISOString(),
          };
          set((s) => ({
            threads: {
              ...s.threads,
              [ticketId]: {
                dealId,
                messages: [...(s.threads[ticketId]?.messages ?? []), local],
                loading: false,
              },
            },
          }));
          return;
        }

        const sb = getSupabaseClient();
        const { data, error } = await sb
          .from("support_messages")
          .insert({ ticket_id: ticketId, deal_id: dealId, sender, sender_addr: senderAddr, body })
          .select()
          .single();

        if (error) throw new Error(error.message);

        // Also bump ticket updated_at
        await sb
          .from("support_tickets")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", ticketId);

        const msg = mapMessage(data);
        set((s) => ({
          threads: {
            ...s.threads,
            [ticketId]: {
              dealId,
              messages: [...(s.threads[ticketId]?.messages ?? []), msg],
              loading: false,
            },
          },
        }));
      },

      subscribeThread: (ticketId, dealId, onMessage) => {
        if (!isSupabaseConfiguredForClient()) return () => {};

        const sb = getSupabaseClient();
        const channel = sb
          .channel(`support-ticket:${ticketId}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${ticketId}` },
            (payload) => {
              const msg = mapMessage(payload.new);
              set((s) => {
                const existing = s.threads[ticketId]?.messages ?? [];
                if (existing.some((m) => m.id === msg.id)) return s;
                return {
                  threads: {
                    ...s.threads,
                    [ticketId]: { dealId, messages: [...existing, msg], loading: false },
                  },
                };
              });
              onMessage(msg);
            }
          )
          .subscribe();

        return () => { sb.removeChannel(channel); };
      },
    }),
    {
      name: "proofhold.support.v1",
      partialize: (s) => ({ myTickets: s.myTickets }),
    }
  )
);
