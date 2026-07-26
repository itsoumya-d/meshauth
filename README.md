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


---

## 📬 Author & Enterprise Support

Created by **Soumya Debnath**.

- 📧 **Email**: [soumyadebnath1661@gmail.com](mailto:soumyadebnath1661@gmail.com)
- 📞 **Phone / WhatsApp**: [+91 7031648617](tel:+917031648617)
- 🐙 **GitHub**: [github.com/itsoumya-d](https://github.com/itsoumya-d)

## 📄 License

AGPL-3.0 (Open Source) | [Commercial License](COMMERCIAL_LICENSE.md) available for proprietary use.

