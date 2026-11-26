// 문의사항 관리대장 타입 정의
export type InquiryStatus = 'completed' | 'in_progress' | 'pr_registered' | 'pr_duplicate' | 'tracking';

export interface Inquiry {
  id: number;
  inquiry_no: string;
  occurred_date: string;           // 'YYYY-MM-DD'
  occurred_time: string | null;
  controller_sector: string | null;
  sw_version: string | null;
  received_by: number | null;
  received_by_name: string | null;
  received_by_raw: string | null;
  category: string | null;
  keyword: string | null;
  content: string | null;
  status: InquiryStatus;
  completed_date: string | null;
  pr_no: string | null;
  note: string | null;
  card_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface InquiryCreate {
  occurred_date: string;
  occurred_time?: string;
  controller_sector?: string;
  sw_version?: string;
  received_by?: number;
  category?: string;
  keyword?: string;
  content?: string;
  status?: InquiryStatus;
  completed_date?: string;
  pr_no?: string;
  note?: string;
  card_id?: number;
}

// null 전달 시 해당 필드를 비움
export type InquiryUpdate = { [K in keyof InquiryCreate]?: InquiryCreate[K] | null };

export interface InquiryListParams {
  year?: number | null;
  month?: number | null;
  date_from?: string;
  date_to?: string;
  category?: string;
  status?: string;
  q?: string;
  page?: number;
  per_page?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface InquiryListResponse {
  items: Inquiry[];
  total: number;
  page: number;
  per_page: number;
}
