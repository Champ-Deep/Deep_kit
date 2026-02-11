export interface Vault {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  created_at: string;
}

export interface Password {
  id: number;
  vault_id: number | null;
  title: string;
  username: string | null;
  password_encrypted: string;
  url: string | null;
  notes_encrypted: string | null;
  tags: string | null;
  favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface PasswordDecrypted {
  id: number;
  vault_id: number | null;
  title: string;
  username: string | null;
  password: string;
  url: string | null;
  notes: string | null;
  tags: string | null;
  favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateVaultRequest {
  name: string;
  description?: string;
  icon?: string;
}

export interface CreatePasswordRequest {
  vault_id?: number;
  title: string;
  username?: string;
  password: string;
  url?: string;
  notes?: string;
  tags?: string;
  favorite?: boolean;
}

export interface UpdatePasswordRequest {
  vault_id?: number;
  title?: string;
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
  tags?: string;
  favorite?: boolean;
}
