export interface Category {
  id: number;
  project_code: string;
  category_code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface CategoryTree {
  project_code: string;
  categories: Category[];
}

export interface TechDocAttachment {
  id: number;
  original_name: string;
  stored_name: string;
  file_extension: string | null;
  reg_date: string | null;
  created_at: string;
}

export interface TechDocListItem {
  id: number;
  record_date: string | null;
  project_code: string | null;
  category_code: string | null;
  author_name: string | null;
  title: string | null;
  doc_type: string | null;
  adapt_version: string | null;
  attachment_count: number;
}

export interface TechDocDetail extends TechDocListItem {
  legacy_seq: number | null;
  author_id: number | null;
  last_edited_by_name: string | null;
  content: string | null;
  summary: string | null;
  detail_summary: string | null;
  service_date: string | null;
  reference: string | null;
  orig_user_id: string | null;
  created_at: string;
  updated_at: string;
  attachments: TechDocAttachment[];
}

export interface TechDocListResponse {
  items: TechDocListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateTechDocInput {
  record_date?: string;
  project_code?: string;
  category_code?: string;
  title: string;
  content?: string;
  summary?: string;
  detail_summary?: string;
  doc_type?: string;
  adapt_version?: string;
  service_date?: string;
  reference?: string;
}

export type UpdateTechDocInput = Partial<CreateTechDocInput>;

/** CSV 가져오기 — 문서(document_*.csv) / 첨부(attachfile_*.csv) */
export type TechDocCsvKind = 'docs' | 'attachments';
