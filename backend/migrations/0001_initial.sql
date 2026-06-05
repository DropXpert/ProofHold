-- ProofHold initial schema.
--
-- Naming convention:
--   - snake_case columns to match SQL convention
--   - ISO-8601 strings for all timestamps (matches the frontend Deal type)
--   - amounts stored as TEXT to avoid float precision (same as frontend)
--   - status values mirror DealStatus from src/types/deal.ts exactly

CREATE TABLE deals (
  id                          TEXT PRIMARY KEY,             -- PH-XXXX-XXXX
  title                       TEXT NOT NULL,
  description                 TEXT NOT NULL DEFAULT '',
  price_amount                TEXT NOT NULL,                -- "20.5"
  price_currency              TEXT NOT NULL,                -- "NIM" | "USDT"

  seller_wallet_address       TEXT NOT NULL,
  buyer_wallet_address        TEXT,

  delivery_deadline_hours     INTEGER NOT NULL,
  confirmation_window_hours   INTEGER NOT NULL,
  required_delivery_proof     TEXT NOT NULL DEFAULT '',
  refund_terms                TEXT NOT NULL DEFAULT '',

  status                      TEXT NOT NULL DEFAULT 'awaiting_payment',

  payment_tx_hash             TEXT,
  escrow_tx_hash              TEXT,
  release_tx_hash             TEXT,
  refund_tx_hash              TEXT,

  delivery_note               TEXT,

  payment_deadline_at         TEXT,
  proof_deadline_at           TEXT,
  paid_at                     TEXT,
  delivered_at                TEXT,
  received_at                 TEXT,
  released_at                 TEXT,
  refunded_at                 TEXT,

  buyer_proof_status          TEXT NOT NULL DEFAULT 'not_submitted',
  seller_proof_status         TEXT NOT NULL DEFAULT 'not_submitted',

  created_at                  TEXT NOT NULL,
  updated_at                  TEXT NOT NULL
);

CREATE INDEX idx_deals_seller   ON deals(seller_wallet_address);
CREATE INDEX idx_deals_buyer    ON deals(buyer_wallet_address);
CREATE INDEX idx_deals_status   ON deals(status);
CREATE INDEX idx_deals_updated  ON deals(updated_at);

CREATE TABLE proofs (
  id                TEXT PRIMARY KEY,
  deal_id           TEXT NOT NULL REFERENCES deals(id),
  submitted_by      TEXT NOT NULL,                          -- "buyer" | "seller"
  explanation       TEXT NOT NULL DEFAULT '',
  tx_hash           TEXT,
  attachment_urls   TEXT NOT NULL DEFAULT '[]',             -- JSON array
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_proofs_deal ON proofs(deal_id);

CREATE TABLE queries (
  id                TEXT PRIMARY KEY,
  deal_id           TEXT NOT NULL REFERENCES deals(id),
  raised_by         TEXT NOT NULL,                          -- "buyer" | "seller"
  reason            TEXT NOT NULL,
  details           TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_queries_deal ON queries(deal_id);

CREATE TABLE decisions (
  id              TEXT PRIMARY KEY,
  deal_id         TEXT NOT NULL REFERENCES deals(id),
  decision        TEXT NOT NULL,                            -- "release_to_seller" | "refund_to_buyer" | "partial_refund"
  buyer_amount    TEXT,
  seller_amount   TEXT,
  reason          TEXT NOT NULL,
  decided_by      TEXT NOT NULL,                            -- admin wallet addr
  created_at      TEXT NOT NULL
);
CREATE INDEX idx_decisions_deal ON decisions(deal_id);

CREATE TABLE timeline (
  id          TEXT PRIMARY KEY,
  deal_id     TEXT NOT NULL REFERENCES deals(id),
  at          TEXT NOT NULL,
  label       TEXT NOT NULL,
  detail      TEXT,
  kind        TEXT NOT NULL
);
CREATE INDEX idx_timeline_deal ON timeline(deal_id, at);

-- Custody transactions. One row per signed payout we broadcast.
CREATE TABLE transactions (
  id            TEXT PRIMARY KEY,
  deal_id       TEXT NOT NULL REFERENCES deals(id),
  direction     TEXT NOT NULL,                              -- "in" (buyer→custody) | "out" (custody→seller or buyer)
  network       TEXT NOT NULL,                              -- "nimiq" | "evm"
  amount        TEXT NOT NULL,
  currency      TEXT NOT NULL,
  from_addr     TEXT NOT NULL,
  to_addr       TEXT NOT NULL,
  tx_hash       TEXT NOT NULL,
  block_height  INTEGER,
  status        TEXT NOT NULL DEFAULT 'broadcast',          -- "broadcast" | "confirmed" | "failed"
  created_at    TEXT NOT NULL
);
CREATE INDEX idx_tx_deal     ON transactions(deal_id);
CREATE INDEX idx_tx_hash     ON transactions(tx_hash);
CREATE INDEX idx_tx_status   ON transactions(status);

-- Watcher cursor: where the on-chain poller is up to on each network.
CREATE TABLE watcher_cursors (
  network          TEXT PRIMARY KEY,
  last_block       INTEGER NOT NULL DEFAULT 0,
  last_checked_at  TEXT NOT NULL
);
