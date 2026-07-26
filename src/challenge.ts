import { bufferToBase64URL } from './encoding';

export class ChallengeManager {
  static generateChallenge(): ArrayBuffer {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return randomBytes.buffer;
  }
}
