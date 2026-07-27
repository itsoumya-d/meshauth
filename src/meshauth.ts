// Copyright (c) 2024-2026 Soumya Debnath. All Rights Reserved.
import { LicenseValidator } from "./license-validator";
// Licensed under the Business Source License 1.1 (BSL 1.1).
// See LICENSE file for details. Production use requires a paid license.
// Contact: soumyadebnath1661@gmail.com | +91 7031648617

import { WebAuthnClient } from './webauthn-client';
import { CredentialStore } from './credential-store';
import { TokenManager } from './token-manager';
import { MeshAuthOptions, AuthResult, StoredCredential } from './types';
import { ChallengeManager } from './challenge';
import { bufferToBase64URL, base64URLToBuffer } from './encoding';

export class MeshAuth {
  private client: WebAuthnClient;
  private store: CredentialStore;
  private options: MeshAuthOptions;

  constructor(options?: any) {
    LicenseValidator.validate(options);
    this.options = options || {};
    this.client = new WebAuthnClient(this.options);
    this.store = new CredentialStore();
  }

  async register(username: string, displayName: string): Promise<Credential> {
    let credential;
    if (this.options.serverUrl) {
      const beginRes = await fetch(`${this.options.serverUrl}/api/register/begin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, displayName })
      });
      if (!beginRes.ok) throw new Error(`Registration begin failed: ${beginRes.status} ${beginRes.statusText}`);
      const beginData = await beginRes.json();
      
      const serverOptions = beginData.publicKey;
      if (serverOptions && typeof serverOptions.challenge === 'string') {
        serverOptions.challenge = base64URLToBuffer(serverOptions.challenge);
      }
      if (serverOptions && serverOptions.user && typeof serverOptions.user.id === 'string') {
        serverOptions.user.id = base64URLToBuffer(serverOptions.user.id);
      }
      if (serverOptions && serverOptions.excludeCredentials) {
        serverOptions.excludeCredentials.forEach((c: any) => {
          if (typeof c.id === 'string') c.id = base64URLToBuffer(c.id);
        });
      }
      
      credential = await this.client.createCredential(username, displayName, serverOptions);
      
      const completeRes = await fetch(`${this.options.serverUrl}/api/register/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: credential.id,
          rawId: bufferToBase64URL((credential as PublicKeyCredential).rawId),
          type: credential.type,
          response: {
            attestationObject: bufferToBase64URL((credential as any).response.attestationObject),
            clientDataJSON: bufferToBase64URL((credential as any).response.clientDataJSON),
          }
        })
      });
      if (!completeRes.ok) throw new Error(`Registration complete failed: ${completeRes.status} ${completeRes.statusText}`);
      const completeData = await completeRes.json();
      if (!completeData.success) throw new Error('Registration failed on server');
    } else {
      credential = await this.client.createCredential(username, displayName);
      await this.store.saveCredential({
        id: credential.id,
        username,
        createdAt: Date.now()
      });
    }

    return credential;
  }

  async authenticate(username?: string): Promise<AuthResult> {
    try {
      if (this.options.serverUrl) {
        const beginRes = await fetch(`${this.options.serverUrl}/api/auth/begin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });
        if (!beginRes.ok) throw new Error(`Auth begin failed: ${beginRes.status} ${beginRes.statusText}`);
        const beginData = await beginRes.json();
        
        const serverOptions = beginData.publicKey;
        if (serverOptions && typeof serverOptions.challenge === 'string') {
          serverOptions.challenge = base64URLToBuffer(serverOptions.challenge);
        }
        if (serverOptions && serverOptions.allowCredentials) {
          serverOptions.allowCredentials.forEach((c: any) => {
            if (typeof c.id === 'string') c.id = base64URLToBuffer(c.id);
          });
        }
        
        const challenge = serverOptions ? serverOptions.challenge : ChallengeManager.generateChallenge();
        const allowCredentials = serverOptions ? serverOptions.allowCredentials : undefined;
        const credential = await this.client.getCredential(challenge, allowCredentials);
        
        const completeRes = await fetch(`${this.options.serverUrl}/api/auth/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: credential.id,
            rawId: bufferToBase64URL((credential as PublicKeyCredential).rawId),
            type: credential.type,
            response: {
              authenticatorData: bufferToBase64URL((credential as any).response.authenticatorData),
              clientDataJSON: bufferToBase64URL((credential as any).response.clientDataJSON),
              signature: bufferToBase64URL((credential as any).response.signature),
              userHandle: (credential as any).response.userHandle ? bufferToBase64URL((credential as any).response.userHandle) : null
            }
          })
        });
        if (!completeRes.ok) throw new Error(`Auth complete failed: ${completeRes.status} ${completeRes.statusText}`);
        const completeData = await completeRes.json();
        if (completeData.success && completeData.token) {
          TokenManager.saveToken(completeData.token);
          return { success: true, token: completeData.token };
        }
        return { success: false, error: completeData.error || "Server authentication failed" };
      } else {
        const challenge = ChallengeManager.generateChallenge();
        const credential = await this.client.getCredential(challenge);
        
        const stored = await this.store.getCredentials();
        const found = stored.find(c => c.id === credential.id);
        if (!found) {
          return { success: false, error: "Credential not found locally" };
        }
        
        // Generate a per-device random signing key (stored in memory for this session)
        // In production, this should be persisted in IndexedDB for cross-session consistency
        const keyMaterial = crypto.getRandomValues(new Uint8Array(32));
        const key = await crypto.subtle.importKey(
          'raw',
          keyMaterial,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        const payload = btoa(JSON.stringify({ sub: found.username, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${payload}`));
        const signature = bufferToBase64URL(signatureBuffer);
        const token = `${header}.${payload}.${signature}`;
        
        TokenManager.saveToken(token);
        return { success: true, token };
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  static isSupported(): boolean {
    return typeof window !== 'undefined' && 
           window.PublicKeyCredential !== undefined;
  }
  
  static async isConditionalMediationAvailable(): Promise<boolean> {
    if (typeof window !== 'undefined' && window.PublicKeyCredential && PublicKeyCredential.isConditionalMediationAvailable) {
      return await PublicKeyCredential.isConditionalMediationAvailable();
    }
    return false;
  }

  async getCredentials(): Promise<StoredCredential[]> {
    return this.store.getCredentials();
  }

  async removeCredential(credentialId: string): Promise<void> {
    return this.store.removeCredential(credentialId);
  }
}
