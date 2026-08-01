import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const dist = require('../dist/index.js');

// ── 1. Module shape ──────────────────────────────────────────────────────────

describe('module exports', () => {
  test('exports MeshAuth class', () => {
    assert.strictEqual(typeof dist.MeshAuth, 'function');
  });

  test('exports EventEmitter class', () => {
    assert.strictEqual(typeof dist.EventEmitter, 'function');
  });

  test('does NOT export a @meshauth/sdk namespace (fabricated package name)', () => {
    // The old llms.txt referenced "@meshauth/sdk" which does not exist.
    // The real import path is the package name "meshauth".
    assert.strictEqual(dist['@meshauth/sdk'], undefined);
  });
});

// ── 2. Static feature detection ──────────────────────────────────────────────

describe('MeshAuth.isSupported()', () => {
  test('returns false when window is absent (Node environment)', () => {
    // In Node there is no window.PublicKeyCredential — isSupported must not throw.
    const result = dist.MeshAuth.isSupported();
    assert.strictEqual(result, false);
  });

  test('returns a boolean, never throws', () => {
    assert.doesNotThrow(() => dist.MeshAuth.isSupported());
    assert.strictEqual(typeof dist.MeshAuth.isSupported(), 'boolean');
  });
});

// ── 3. Constructor ───────────────────────────────────────────────────────────

describe('new MeshAuth(options)', () => {
  test('constructs without throwing when running in Node (no window)', () => {
    // WebAuthn is not available in Node, but the constructor itself must not throw.
    assert.doesNotThrow(() => {
      new dist.MeshAuth({ rpName: 'TestApp', rpId: 'localhost', origin: 'http://localhost' });
    });
  });

  test('constructs with no options (uses defaults)', () => {
    assert.doesNotThrow(() => new dist.MeshAuth());
  });
});

// ── 4. Public method signatures ───────────────────────────────────────────────

describe('instance method existence', () => {
  const auth = new dist.MeshAuth({ rpName: 'TestApp', rpId: 'localhost', origin: 'http://localhost' });

  test('register is a function', () => {
    assert.strictEqual(typeof auth.register, 'function');
  });

  test('authenticate is a function', () => {
    assert.strictEqual(typeof auth.authenticate, 'function');
  });

  test('getCredentials is a function', () => {
    assert.strictEqual(typeof auth.getCredentials, 'function');
  });

  test('removeCredential is a function', () => {
    assert.strictEqual(typeof auth.removeCredential, 'function');
  });
});

// ── 5. Error paths — browser-required APIs reject clearly ────────────────────

describe('browser-dependent methods reject with Error (not hang silently)', () => {
  const auth = new dist.MeshAuth({ rpName: 'TestApp', rpId: 'localhost', origin: 'http://localhost' });

  test('authenticate() rejects with an Error (no navigator.credentials in Node)', async () => {
    const result = await auth.authenticate('user@example.com');
    // authenticate() is designed to catch errors and return { success: false, error }
    // rather than throw — verify it surfaces the failure clearly.
    assert.strictEqual(result.success, false);
    assert.strictEqual(typeof result.error, 'string');
    assert.ok(result.error.length > 0, 'error message must not be empty');
  });

  test('register() rejects with a thrown Error when no navigator.credentials', async () => {
    // register() propagates errors, so we expect a rejection.
    await assert.rejects(
      () => auth.register('user@example.com', 'User Name'),
      (err) => {
        assert.ok(err instanceof Error, 'must be an Error instance');
        return true;
      }
    );
  });
});

// ── 6. Adversarial input ─────────────────────────────────────────────────────

describe('adversarial inputs', () => {
  test('authenticate with empty string username does not throw synchronously', async () => {
    const auth = new dist.MeshAuth({ rpName: 'T', rpId: 'localhost', origin: 'http://localhost' });
    const result = await auth.authenticate('');
    // Must return an AuthResult, not throw
    assert.strictEqual(typeof result, 'object');
    assert.ok('success' in result);
  });
});

// ── 7. EventEmitter ──────────────────────────────────────────────────────────

describe('EventEmitter', () => {
  test('can register and fire a listener', () => {
    const emitter = new dist.EventEmitter();
    let fired = false;
    emitter.on('test', (data) => { fired = data; });
    emitter.emit('test', true);
    assert.strictEqual(fired, true);
  });

  test('multiple listeners all fire', () => {
    const emitter = new dist.EventEmitter();
    let count = 0;
    emitter.on('tick', () => count++);
    emitter.on('tick', () => count++);
    emitter.emit('tick', null);
    assert.strictEqual(count, 2);
  });

  test('emitting with no listeners does not throw', () => {
    const emitter = new dist.EventEmitter();
    assert.doesNotThrow(() => emitter.emit('nobody-listening', {}));
  });
});
