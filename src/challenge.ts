// Copyright (c) 2024-2026 Soumya Debnath. All Rights Reserved.
// Licensed under the Business Source License 1.1 (BSL 1.1).
// See LICENSE file for details. Production use requires a paid license.
// Contact: soumyadebnath1619@gmail.com | +91 7031648617

import { bufferToBase64URL } from './encoding';

export class ChallengeManager {
  static generateChallenge(): ArrayBuffer {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return randomBytes.buffer;
  }
}
