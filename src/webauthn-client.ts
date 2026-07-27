// Copyright (c) 2024-2026 Soumya Debnath. All Rights Reserved.
// Licensed under the Business Source License 1.1 (BSL 1.1).
// See LICENSE file for details. Production use requires a paid license.
// Contact: soumyadebnath1661@gmail.com | +91 7031648617

import { bufferToBase64URL, base64URLToBuffer } from './encoding';
import { ChallengeManager } from './challenge';
import { MeshAuthOptions } from './types';

export class WebAuthnClient {
  constructor(private options: MeshAuthOptions) {}

  async createCredential(username: string, displayName: string, serverOptions?: PublicKeyCredentialCreationOptions): Promise<Credential> {
    const challenge = ChallengeManager.generateChallenge();
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const createOptions: PublicKeyCredentialCreationOptions = serverOptions || {
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
        authenticatorAttachment: this.options.authenticatorAttachment,
      },
      timeout: 60000,
      attestation: 'none'
    };

    return await navigator.credentials.create({
      publicKey: createOptions
    }) as Credential;
  }

  async getCredential(challenge: ArrayBuffer, allowCredentials?: PublicKeyCredentialDescriptor[]): Promise<Credential> {
    const getOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: this.options.rpId,
      userVerification: 'preferred',
      timeout: 60000,
      allowCredentials: allowCredentials,
    };

    return await navigator.credentials.get({
      publicKey: getOptions,
      mediation: this.options.conditionalMediation ? 'conditional' : 'optional'
    }) as Credential;
  }
}
