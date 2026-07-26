export interface MeshAuthOptions {
  rpName: string;
  rpId: string;
  origin: string;
  serverUrl?: string;
}

export interface StoredCredential {
  id: string;
  username: string;
  createdAt: number;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  error?: string;
}
