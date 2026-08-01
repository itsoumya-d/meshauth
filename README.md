<!--
// Copyright (c) 2024-2026 Soumya Debnath. All Rights Reserved.
// Dual-licensed: AGPL-3.0-or-later (free, see LICENSE) OR a commercial licence
// (see COMMERCIAL_LICENSE.md) if you cannot meet the AGPL's source-disclosure terms.
// Contact: soumyadebnath1661@gmail.com
-->

# MeshAuth

<div align="center">
  <h3>Zero-Cost, Passwordless Authentication Infrastructure</h3>
  <p><b>MeshAuth adds passkey sign-in to a web app without running an auth server or paying per user — the WebAuthn ceremony happens between the browser and the user's own device.</b></p>

  [![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
  [![Status](https://img.shields.io/badge/status-pre--release-orange.svg)]()
</div>

---

> **Pre-release software. Not published to npm. No production adopters yet. See [Known Limitations](#known-limitations).**

---

> # ⛔ SECURITY WARNING — DO NOT USE THE GO SERVER FOR AUTHENTICATION
>
> **The bundled Go server (`server/`) performs no WebAuthn verification whatsoever.** An independent
> audit found that `CompleteAuth` in `server/auth.go` retrieves the stored public key and immediately
> discards it (`_, err := store.GetPublicKey(...)`), then returns a token. None of the mandatory
> W3C WebAuthn §7.2 verification steps are performed:
>
> | Required step | Implemented |
> |---|---|
> | Verify the assertion signature against the stored public key | ❌ **No** |
> | Compare the returned challenge to the issued one | ❌ No |
> | Verify `origin` in clientDataJSON | ❌ No |
> | Verify the RP ID hash | ❌ No |
> | Verify `type` is `webauthn.get` | ❌ No |
> | Check the signature counter for cloned authenticators | ❌ No |
> | Check the User Present / User Verified flags | ❌ No |
>
> **Consequence: any HTTP POST carrying a known `{username, credId}` pair is issued a valid session
> token.** The signature is never checked, so it does not need to be correct. This is a complete
> authentication bypass. It is not a hardening gap — the verification code does not exist.
>
> Separately, the client and server do not agree on a wire format: the JS client sends
> `{id, rawId, type, response}` while the Go handler expects `{username, credId, pubKey}`, so every
> field deserializes empty and registration stores `SaveCredential("", "", "")`.
>
> **Do not deploy this server. Do not use it as a reference implementation.** If you need passkey
> authentication today, use [`@simplewebauthn/server`](https://simplewebauthn.dev/), which implements
> the full verification ceremony and is actively maintained. The browser-side ceremony code in
> `src/` is a reasonable demonstration of the `navigator.credentials` API; the server is not.

---

---

## What is MeshAuth?

MeshAuth is a TypeScript library and Go server suite that provides end-to-end passkey (WebAuthn) infrastructure. It lets you add passwordless biometric authentication to any web application using the browser's built-in `navigator.credentials` API — no cloud identity provider required.

Real exported symbols: `MeshAuth`, `EventEmitter`. Nothing is published under `@meshauth/sdk`.

### Key Features
- Biometric authentication via WebAuthn/FIDO2 (FaceID, TouchID, Windows Hello, hardware keys)
- Serverless mode using browser WebCrypto HMAC-SHA256 for local session tokens
- ~~Full challenge/response server mode with the included Go backend~~ — **withdrawn: the Go server performs no verification and must not be used (see the security warning above)**
- Conditional UI (passkey autofill) support via `mediation: 'conditional'`
- Zero third-party dependencies in the core SDK

---

## Installation

MeshAuth is **not published on npm**. Install from source:

**Option 1 — jsDelivr CDN (no build step):**
```html
<script type="module">
  import { MeshAuth } from 'https://cdn.jsdelivr.net/gh/itsoumya-d/meshauth@main/dist/index.mjs';
</script>
```

**Option 2 — Clone and build:**
```bash
git clone https://github.com/itsoumya-d/meshauth.git
cd meshauth
npm install
npm run build
```
Then import from `./dist/index.mjs` or `./dist/index.js`.

---

## Quick Start

```typescript
import { MeshAuth } from './dist/index.mjs';

// 1. Check platform support before attempting any WebAuthn flow
if (!MeshAuth.isSupported()) {
  // window.PublicKeyCredential is absent — WebAuthn is unavailable.
  // Show a fallback UI (magic link, password, etc.).
  showFallbackLogin();
  return;
}

const auth = new MeshAuth({
  rpName: 'My App',
  rpId: window.location.hostname,
  origin: window.location.origin,
});

// 2. Register a new passkey
try {
  await auth.register('user@example.com', 'Jane Doe');
} catch (err) {
  // navigator.credentials.create() throws if the user cancels,
  // the device has no authenticator, or the site is not on HTTPS.
  console.error('Registration failed:', err.message);
}

// 3. Authenticate
const result = await auth.authenticate('user@example.com');
if (result.success) {
  console.log('Token:', result.token);
} else {
  console.warn('Auth failed:', result.error);
}
```

---

## API Reference

### `MeshAuth` Class

#### `constructor(options?: MeshAuthOptions)`
Options: `rpName` (string), `rpId` (string), `origin` (string), `serverUrl?` (string), `authenticatorAttachment?` (`'platform' | 'cross-platform'`), `conditionalMediation?` (boolean).

#### `static isSupported(): boolean`
Returns `true` if `window.PublicKeyCredential` exists. Call this before any WebAuthn flow. Returns `false` in Node.js and non-supporting browsers.

#### `static async isConditionalMediationAvailable(): Promise<boolean>`
Returns `true` if the browser supports passkey autofill (`mediation: 'conditional'`).

#### `async register(username: string, displayName: string): Promise<Credential>`
Triggers the WebAuthn registration ceremony. Requires a browser with `navigator.credentials`. Throws on failure (user cancelled, no authenticator, non-HTTPS origin, etc.).

#### `async authenticate(username?: string): Promise<AuthResult>`
Triggers the WebAuthn authentication ceremony. Returns `{ success: true, token }` or `{ success: false, error }`.

#### `async getCredentials(): Promise<StoredCredential[]>`
Returns locally cached credentials from IndexedDB.

#### `async removeCredential(credentialId: string): Promise<void>`
Removes a credential from local IndexedDB cache.

---

## Known Limitations

- **Pre-release, no npm package.** `npm install meshauth` will not install this library (the name may be taken by an unrelated package). Use jsDelivr or clone from source.
- **Requires a real browser.** `navigator.credentials`, `window.PublicKeyCredential`, and IndexedDB are browser-only. None of these exist in Node.js. `MeshAuth.isSupported()` returns `false` in Node.
- **Requires HTTPS.** WebAuthn is disabled on non-HTTPS origins, except `localhost`. The library will throw if `navigator.credentials.create()` or `.get()` is called on HTTP.
- **No platform authenticator = no passkeys.** If the device has no biometric sensor and no hardware security key, `register()` and `authenticate()` will throw with a user-facing error from the browser. The library propagates this error — there is no silent fallback. Callers must implement their own fallback (magic link, password, etc.).
- **Serverless mode token security.** In serverless mode (no `serverUrl`), JWT tokens are signed with an HMAC key stored in IndexedDB. These tokens are not verifiable by any server. They are suitable for local session state only.
- **IndexedDB not available in all contexts.** Private browsing mode in some browsers disables IndexedDB. `getCredentials()` and `saveCredential()` will throw in those contexts.
- **⛔ The Go server does not authenticate anything.** It performs none of the W3C WebAuthn §7.2
  verification steps — no signature check, no challenge comparison, no origin or RP ID validation,
  no counter check. Any POST with a known `{username, credId}` receives a token. It also does not
  share a wire format with the JS client. See the security warning at the top of this file. Use
  [`@simplewebauthn/server`](https://simplewebauthn.dev/) instead.
- **No production adopters yet.** This is a proof-of-concept SDK. APIs may change without notice.

---

## WebAuthn Degradation Behavior

| Environment | `isSupported()` | `register()` / `authenticate()` |
|---|---|---|
| Chrome/Safari/Firefox on HTTPS with authenticator | `true` | Works normally |
| Non-HTTPS origin (except localhost) | `true` (API exists) | Browser throws `NotAllowedError` |
| No biometric sensor / no security key | `true` | Browser throws `NotAllowedError` or `InvalidStateError` |
| Node.js | `false` | `authenticate()` returns `{success:false,error:...}` |
| Browser without WebAuthn support | `false` | Call blocked — check `isSupported()` first |

The library surfaces all browser errors through its catch blocks. `authenticate()` always returns an `AuthResult` rather than throwing. `register()` propagates errors.

---

## Comparison: MeshAuth vs. Competitors

| Feature | MeshAuth | Auth0 | Okta | Clerk |
|---|---|---|---|---|
| Cost for 100k MAUs | $0 (self-hosted) | ~$1,000/mo | Enterprise | ~$2,000/mo |
| Authentication Model | Passkey-First | Password-First | Password-First | Password/OTP |
| Phishing Resistance | 100% (WebAuthn) | Optional MFA | Optional MFA | Optional |
| Data Ownership | Yours | Vendor | Vendor | Vendor |
| npm availability | Not published | Published | N/A | Published |
| Production-ready | Pre-release | Yes | Yes | Yes |

---

## Go Server (Optional)

An included Go backend handles challenge/response for production deployments:

```bash
cd server
go run main.go auth.go store.go types.go
# Runs on http://localhost:8080
```

Pass `serverUrl: 'http://localhost:8080'` to `MeshAuth` options to use it.

**CRITICAL:** WebAuthn requires HTTPS in production. The Go server must be deployed behind a TLS-terminating proxy (Nginx, Caddy, etc.).

---

## 📄 License

**Dual-licensed — choose either:**

1. **[AGPL-3.0-or-later](LICENSE)** — free for any purpose, including commercial and production
   use. No payment, no permission, no key required. The obligation it carries: if you modify this
   software and let users interact with it over a network, you must offer those users your modified
   source under the same licence.

2. **[Commercial licence](COMMERCIAL_LICENSE.md)** — for organisations that cannot or prefer not to
   meet the AGPL's source-disclosure obligation. This buys an exception, not access.

Contributions are accepted under AGPL-3.0-or-later. Full terms: [LICENSING.md](LICENSING.md).

