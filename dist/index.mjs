// src/license-validator.ts
var LicenseValidator = class {
  static AUTHOR = "Soumya Debnath";
  static CONTACT = "soumyadebnath1619@gmail.com";
  static validate(options) {
    const key = options?.licenseKey || (typeof process !== "undefined" ? process.env.COMMERCIAL_LICENSE_KEY : void 0);
    const isDev = typeof window !== "undefined" ? window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" : typeof process !== "undefined" && process.env.NODE_ENV !== "production";
    if (isDev || options?.allowEval) {
      return true;
    }
    if (!key || !key.startsWith("BSL11-")) {
      console.warn(`
================================================================================
\u{1F512} COMMERCIAL USE WARNING \u2014 BUSINESS SOURCE LICENSE 1.1 REQUIRED
Product: MESHAUTH | Copyright (c) 2024-2026 Soumya Debnath

Production use of this software requires a valid paid commercial license key.
Unlicensed commercial deployment constitutes copyright infringement under DMCA \xA7 1201.

Purchase a commercial license key:
\u{1F4E7} Email: soumyadebnath1619@gmail.com | \u{1F4DE} Phone: +91 7031648617
================================================================================
      `);
      return false;
    }
    return true;
  }
};

// src/challenge.ts
var ChallengeManager = class {
  static generateChallenge() {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return randomBytes.buffer;
  }
};

// src/webauthn-client.ts
var WebAuthnClient = class {
  constructor(options) {
    this.options = options;
  }
  options;
  async createCredential(username, displayName, serverOptions) {
    const challenge = ChallengeManager.generateChallenge();
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const createOptions = serverOptions || {
      challenge,
      rp: {
        name: this.options.rpName,
        id: this.options.rpId
      },
      user: {
        id: userId,
        name: username,
        displayName
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }
        // ES256
      ],
      authenticatorSelection: {
        userVerification: "preferred",
        authenticatorAttachment: this.options.authenticatorAttachment
      },
      timeout: 6e4,
      attestation: "none"
    };
    return await navigator.credentials.create({
      publicKey: createOptions
    });
  }
  async getCredential(challenge, allowCredentials) {
    const getOptions = {
      challenge,
      rpId: this.options.rpId,
      userVerification: "preferred",
      timeout: 6e4,
      allowCredentials
    };
    return await navigator.credentials.get({
      publicKey: getOptions,
      mediation: this.options.conditionalMediation ? "conditional" : "optional"
    });
  }
};

// src/credential-store.ts
var CredentialStore = class {
  dbName = "MeshAuthDB";
  storeName = "credentials";
  async getDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async saveCredential(credential) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error("Credential transaction aborted"));
      const store = tx.objectStore(this.storeName);
      const request = store.put(credential);
      request.onerror = () => reject(request.error);
    });
  }
  async getCredentials() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readonly");
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async removeCredential(id) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error("Credential transaction aborted"));
      const store = tx.objectStore(this.storeName);
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
    });
  }
};

// src/token-manager.ts
var TokenManager = class {
  static saveToken(token) {
    sessionStorage.setItem("meshauth_token", token);
  }
  static getToken() {
    return sessionStorage.getItem("meshauth_token");
  }
  static clearToken() {
    sessionStorage.removeItem("meshauth_token");
  }
  static getPayload(token) {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(decoded);
    } catch (e) {
      return null;
    }
  }
  static isExpired(token) {
    const payload = this.getPayload(token);
    if (!payload || !payload.exp) return true;
    return payload.exp * 1e3 < Date.now();
  }
};

// src/encoding.ts
function bufferToBase64URL(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function base64URLToBuffer(base64URL) {
  const base64 = base64URL.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - base64.length % 4) % 4;
  const padded = base64 + "=".repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// src/meshauth.ts
var MeshAuth = class {
  client;
  store;
  options;
  constructor(options) {
    LicenseValidator.validate(options);
    this.options = options || {};
    this.client = new WebAuthnClient(this.options);
    this.store = new CredentialStore();
  }
  async register(username, displayName) {
    let credential;
    if (this.options.serverUrl) {
      const beginRes = await fetch(`${this.options.serverUrl}/api/register/begin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, displayName })
      });
      if (!beginRes.ok) throw new Error(`Registration begin failed: ${beginRes.status} ${beginRes.statusText}`);
      const beginData = await beginRes.json();
      const serverOptions = beginData.publicKey;
      if (serverOptions && typeof serverOptions.challenge === "string") {
        serverOptions.challenge = base64URLToBuffer(serverOptions.challenge);
      }
      if (serverOptions && serverOptions.user && typeof serverOptions.user.id === "string") {
        serverOptions.user.id = base64URLToBuffer(serverOptions.user.id);
      }
      if (serverOptions && serverOptions.excludeCredentials) {
        serverOptions.excludeCredentials.forEach((c) => {
          if (typeof c.id === "string") c.id = base64URLToBuffer(c.id);
        });
      }
      credential = await this.client.createCredential(username, displayName, serverOptions);
      const completeRes = await fetch(`${this.options.serverUrl}/api/register/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: credential.id,
          rawId: bufferToBase64URL(credential.rawId),
          type: credential.type,
          response: {
            attestationObject: bufferToBase64URL(credential.response.attestationObject),
            clientDataJSON: bufferToBase64URL(credential.response.clientDataJSON)
          }
        })
      });
      if (!completeRes.ok) throw new Error(`Registration complete failed: ${completeRes.status} ${completeRes.statusText}`);
      const completeData = await completeRes.json();
      if (!completeData.success) throw new Error("Registration failed on server");
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
  async authenticate(username) {
    try {
      if (this.options.serverUrl) {
        const beginRes = await fetch(`${this.options.serverUrl}/api/auth/begin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username })
        });
        if (!beginRes.ok) throw new Error(`Auth begin failed: ${beginRes.status} ${beginRes.statusText}`);
        const beginData = await beginRes.json();
        const serverOptions = beginData.publicKey;
        if (serverOptions && typeof serverOptions.challenge === "string") {
          serverOptions.challenge = base64URLToBuffer(serverOptions.challenge);
        }
        if (serverOptions && serverOptions.allowCredentials) {
          serverOptions.allowCredentials.forEach((c) => {
            if (typeof c.id === "string") c.id = base64URLToBuffer(c.id);
          });
        }
        const challenge = serverOptions ? serverOptions.challenge : ChallengeManager.generateChallenge();
        const allowCredentials = serverOptions ? serverOptions.allowCredentials : void 0;
        const credential = await this.client.getCredential(challenge, allowCredentials);
        const completeRes = await fetch(`${this.options.serverUrl}/api/auth/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: credential.id,
            rawId: bufferToBase64URL(credential.rawId),
            type: credential.type,
            response: {
              authenticatorData: bufferToBase64URL(credential.response.authenticatorData),
              clientDataJSON: bufferToBase64URL(credential.response.clientDataJSON),
              signature: bufferToBase64URL(credential.response.signature),
              userHandle: credential.response.userHandle ? bufferToBase64URL(credential.response.userHandle) : null
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
        const found = stored.find((c) => c.id === credential.id);
        if (!found) {
          return { success: false, error: "Credential not found locally" };
        }
        const key = await this.getOrCreateSigningKey();
        const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
        const payload = btoa(JSON.stringify({ sub: found.username, iat: Math.floor(Date.now() / 1e3), exp: Math.floor(Date.now() / 1e3) + 3600 })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
        const signatureBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${header}.${payload}`));
        const signature = bufferToBase64URL(signatureBuffer);
        const token = `${header}.${payload}.${signature}`;
        TokenManager.saveToken(token);
        return { success: true, token };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  static isSupported() {
    return typeof window !== "undefined" && window.PublicKeyCredential !== void 0;
  }
  static async isConditionalMediationAvailable() {
    if (typeof window !== "undefined" && window.PublicKeyCredential && PublicKeyCredential.isConditionalMediationAvailable) {
      return await PublicKeyCredential.isConditionalMediationAvailable();
    }
    return false;
  }
  async getCredentials() {
    return this.store.getCredentials();
  }
  async removeCredential(credentialId) {
    return this.store.removeCredential(credentialId);
  }
  /**
   * Get or create a persistent HMAC signing key stored in IndexedDB.
   * This ensures JWT tokens signed locally can be verified across sessions.
   */
  async getOrCreateSigningKey() {
    const DB_NAME = "MeshAuthKeyDB";
    const STORE_NAME = "signing_keys";
    const KEY_ID = "primary_hmac";
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db2 = req.result;
        if (!db2.objectStoreNames.contains(STORE_NAME)) {
          db2.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const existing = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_ID);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (existing && existing.keyMaterial) {
      return crypto.subtle.importKey(
        "raw",
        existing.keyMaterial,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
      );
    }
    const keyMaterial = crypto.getRandomValues(new Uint8Array(32));
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put({ id: KEY_ID, keyMaterial: keyMaterial.buffer });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return crypto.subtle.importKey(
      "raw",
      keyMaterial,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  }
};

// src/events.ts
var EventEmitter = class {
  listeners = {};
  on(event, listener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }
  emit(event, data) {
    const eventListeners = this.listeners[event];
    if (eventListeners) {
      eventListeners.forEach((listener) => listener(data));
    }
  }
};
export {
  EventEmitter,
  MeshAuth
};
//# sourceMappingURL=index.mjs.map