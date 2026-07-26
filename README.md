# MeshAuth

Passwordless authentication SDK using WebAuthn/Passkeys.

## Usage

```typescript
import { MeshAuth } from 'meshauth';

const auth = new MeshAuth({
  rpName: 'My App',
  rpId: 'example.com',
  origin: 'https://example.com'
});

// Register
await auth.register('user@example.com', 'User');

// Authenticate
await auth.authenticate('user@example.com');
```
