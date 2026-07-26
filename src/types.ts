// Copyright (c) 2024-2026 Soumya Debnath. All Rights Reserved.
// Licensed under the Business Source License 1.1 (BSL 1.1).
// See LICENSE file for details. Production use requires a paid license.
// Contact: soumyadebnath1661@gmail.com | +91 7031648617

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
