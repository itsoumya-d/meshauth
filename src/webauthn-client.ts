import { bufferToBase64URL, base64URLToBuffer } from './encoding';
import { ChallengeManager } from './challenge';
import { MeshAuthOptions } from './types';

export class WebAuthnClient {
  constructor(private options: MeshAuthOptions) {}

  async createCredential(username: string, displayName: string): Promise<Credential> {
    const challenge = ChallengeManager.generateChallenge();
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const createOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: this.options.rpName,
        id: this.options.rpId,
      },
      user: {
        id: userId,
        name: username,
        displayName: displayName,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
      ],
      authenticatorSelection: {
        userVerification: 'preferred',
      },
      timeout: 60000,
      attestation: 'none'
    };

    return await navigator.credentials.create({
      publicKey: createOptions
    }) as Credential;
  }

  async getCredential(challenge: ArrayBuffer): Promise<Credential> {
    const getOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: this.options.rpId,
      userVerification: 'preferred',
      timeout: 60000,
    };

    return await navigator.credentials.get({
      publicKey: getOptions
    }) as Credential;
  }
}
