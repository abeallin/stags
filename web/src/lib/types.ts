export interface Stag {
  id: string;
  slug: "bcn" | "sthlm";
  name: string;
  start_date: string;       // "YYYY-MM-DD"
  end_date: string;
  accent_color: string;
  eyebrow_text: string;
  header_meta_html: string;
}

export type TagKind =
  | "walk" | "metro" | "train" | "taxi" | "must" | "book" | "info";

export interface Tag {
  label: string;
  kind: TagKind;
}

export interface Day {
  id: string;
  stag: string;             // stag.id
  date: string;             // "YYYY-MM-DD"
  title: string;
  subtitle: string;
  sort_order: number;
}

export interface Slot {
  id: string;
  day: string;              // day.id
  start_time: string;       // ISO datetime "YYYY-MM-DDTHH:mm"
  time_label: string;       // "7:30pm · cocktails"
  title: string;
  note: string;
  tags: Tag[];
  is_featured: boolean;
  sort_order: number;
  map_url?: string;
  website_url?: string;
}

export interface Edit {
  id: string;
  stag: string;
  kind: string;             // "slot.update" | "slot.create" | etc.
  target_id: string;
  before: unknown;
  after: unknown;
  who: string;
  created: string;          // PocketBase autodate
}

export interface PresenceRow {
  id: string;
  stag: string;
  session_id: string;
  display_name: string;
  last_seen: string;        // ISO datetime
}

export type TripState = "pre" | "in" | "post";
