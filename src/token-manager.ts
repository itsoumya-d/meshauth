// Copyright (c) 2024-2026 Soumya Debnath. All Rights Reserved.
// Licensed under the Business Source License 1.1 (BSL 1.1).
// See LICENSE file for details. Production use requires a paid license.
// Contact: soumyadebnath1661@gmail.com | +91 7031648617

export class TokenManager {
  static saveToken(token: string) {
    sessionStorage.setItem('meshauth_token', token);
  }

  static getToken(): string | null {
    return sessionStorage.getItem('meshauth_token');
  }

  static clearToken() {
    sessionStorage.removeItem('meshauth_token');
  }

  static getPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (e) {
      return null;
    }
  }

  static isExpired(token: string): boolean {
    const payload = this.getPayload(token);
    if (!payload || !payload.exp) return true;
    return payload.exp * 1000 < Date.now();
  }
}
