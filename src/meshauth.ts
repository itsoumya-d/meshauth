import { WebAuthnClient } from './webauthn-client';
import { CredentialStore } from './credential-store';
import { TokenManager } from './token-manager';
import { MeshAuthOptions, AuthResult, StoredCredential } from './types';
import { ChallengeManager } from './challenge';

export class MeshAuth {
  private client: WebAuthnClient;
  private store: CredentialStore;

  constructor(private options: MeshAuthOptions) {
    this.client = new WebAuthnClient(options);
    this.store = new CredentialStore();
  }

  async register(username: string, displayName: string): Promise<Credential> {
    const credential = await this.client.createCredential(username, displayName);
    
    // Simulate server response or actual call
    // If serverUrl is provided, would fetch it here.
    
    await this.store.saveCredential({
      id: credential.id,
      username,
      createdAt: Date.now()
    });

    return credential;
  }

  async authenticate(username?: string): Promise<AuthResult> {
    try {
      const challenge = ChallengeManager.generateChallenge();
      const credential = await this.client.getCredential(challenge);
      
      // Simulate token generation upon success
      const token = 'simulated_jwt_token_' + Date.now();
      TokenManager.saveToken(token);
      
      return { success: true, token };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  static isSupported(): boolean {
    return typeof window !== 'undefined' && 
           window.PublicKeyCredential !== undefined;
  }

  async getCredentials(): Promise<StoredCredential[]> {
    return this.store.getCredentials();
  }

  async removeCredential(credentialId: string): Promise<void> {
    return this.store.removeCredential(credentialId);
  }
}
