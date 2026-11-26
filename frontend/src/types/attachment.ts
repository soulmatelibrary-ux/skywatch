export interface Attachment {
  id: number;
  owner_type: string;
  owner_id: number;
  original_name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: number;
  created_at: string;
}

export interface AttachmentSearchResult {
  attachment_id: number;
  original_name: string;
  file_size: number;
  file_name: string;
  card_id: number;
  card_title: string | null;
  log_id: number;
  log_date: string | null;
}

export interface UploadItem {
  file: File;
  progress: number;  // 0~100
  error?: string;
  done?: boolean;
  serverId?: number; // assigned after upload completes
}
