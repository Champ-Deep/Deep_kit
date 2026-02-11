export interface FileRecord {
  id: number;
  filename: string;
  original_filename: string | null;
  path: string;
  mime_type: string | null;
  size_bytes: number | null;
  source_service: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  hash: string | null;
}

export interface StorageAnalytics {
  id: number;
  service_name: string;
  total_files: number;
  total_size_bytes: number;
  last_synced_at: string;
}

export interface CreateFileRequest {
  filename: string;
  original_filename?: string;
  path: string;
  mime_type?: string;
  size_bytes?: number;
  source_service?: string;
  uploaded_by?: string;
  hash?: string;
}

export interface FileStats {
  totalFiles: number;
  totalStorage: string;
  duplicates: number;
  byService: {
    service: string;
    files: number;
    size: string;
  }[];
}
