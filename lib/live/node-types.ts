// Upstream oracle-node UI payload shapes, as verified against the live API
// (2026-08: /api/realtime/*, /api/analysts, /api/classifications, /api/posts).
// Decimal fields arrive as strings by upstream design; they are parsed ONCE
// at the mapping boundary, for display precision only.

export interface NodeAnalyst {
  id: number;
  handle: string;
  display_name: string;
  source: string;
}

export interface NodeSignal {
  symbol: string;
  action_type: string; // observed: "buy" | "sell_exit" | "ambiguous"
  confidence: string; // decimal string, e.g. "0.86"
  rationale?: string;
  ambiguity_note?: string;
}

export interface NodeClassificationRow {
  interpretation_id: number;
  logical_post_id: number;
  provider_post_ids: string[];
  analyst_id: number;
  interpreted_at: string; // ISO
  rule_version: string; // "prompt:model:effort"
  model_id: string;
  prompt_version: string;
  status: string; // observed: "actionable" | "ignored" | "review"
  signals: NodeSignal[];
}

export interface NodeClassificationsResponse {
  limit: number;
  /** Exact row count for the optional `since` filter on hardened nodes. */
  total?: number;
  since?: string | null;
  classifications: NodeClassificationRow[];
}

export interface NodeAnalystsResponse {
  analysts: NodeAnalyst[];
}

export interface NodePost {
  id: number;
  logical_post_id: number;
  analyst_handle: string;
  provider_post_id: string;
  created_at: string;
  url: string;
  text: string;
}

export interface NodeBasketEntry {
  symbol: string;
  weight: string; // decimal string
}

export interface NodeBasketPreview {
  computed_at: string;
  entries: NodeBasketEntry[];
  allocation_coverage: {
    eligible_analysts: number;
    initialized_analysts: number;
    dirty_analysts: number;
  };
  generation: number;
}

export interface NodeSnapshot {
  schema_version: number;
  cursor: number;
  replay_floor: number;
  variant: { slug: string; identity_hash: string };
  basket_preview: NodeBasketPreview | null;
}

// SSE payloads ------------------------------------------------------------

export interface StreamClassification {
  tweet_ids: string[];
  classified_at: string;
  status: string;
  signals: Pick<NodeSignal, "symbol" | "action_type" | "confidence">[];
  basket_update: string;
}

export interface StreamReset {
  newest_cursor: number;
  snapshot_path: string;
}
