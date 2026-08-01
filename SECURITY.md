# Security Policy

## ⛔ Known critical issue: the bundled Go server does not authenticate

**Status: unresolved. Do not deploy `server/`.**

An independent audit found that the Go server in `server/` implements none of the mandatory
[W3C WebAuthn §7.2](https://www.w3.org/TR/webauthn-2/#sctn-verifying-assertion) verification steps.

`CompleteAuth` in `server/auth.go` fetches the stored public key and discards it with Go's blank
identifier:

```go
_, err := h.store.GetPublicKey(req.Username, req.CredID)
```

It then returns `"jwt_token_for_" + username`. Because the assertion signature is never verified,
**any HTTP POST carrying a known `{username, credId}` pair is issued a valid session token** — the
signature does not need to be correct, or even present.

Not implemented: signature verification, challenge comparison, challenge single-use/expiry, origin
validation, RP ID hash validation, ceremony `type` check, signature-counter regression check, and
UP/UV flag enforcement.

Additionally, the JS client and the Go handler do not agree on a request shape — the client sends
`{id, rawId, type, response}`, the server expects `{username, credId, pubKey}` — so every field
deserializes empty and registration persists `SaveCredential("", "", "")`.

### What to use instead

[`@simplewebauthn/server`](https://simplewebauthn.dev/) implements the full ceremony and is actively
maintained. Do not use this repository's server as a reference implementation.

### Scope of the browser SDK

The client code in `src/` demonstrates the `navigator.credentials` API and is not affected by the
above. It has not been audited against a hardware authenticator; the browser ceremony was not
executable in the audit environment (no virtual authenticator available).

## Reporting a vulnerability

Open an issue at https://github.com/itsoumya-d/meshauth/issues.
