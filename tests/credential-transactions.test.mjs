import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { createRequire } from 'node:module';
import { MeshAuth as ESMMeshAuth } from '../dist/index.mjs';

const require = createRequire(import.meta.url);
const { MeshAuth: CJSMeshAuth } = require('../dist/index.js');

function replaceGlobal(t, name, value) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, value });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, name, original);
    else delete globalThis[name];
  });
}

// A controlled IndexedDB event fixture: request success and transaction commit
// are deliberately separate events. No browser, real passkey, or storage is used.
async function beginMutation(t, MeshAuth, operation) {
  const request = { error: null };
  const transaction = { error: null };
  let writeStarted;
  const started = new Promise(resolve => { writeStarted = resolve; });
  const store = {
    put(credential) {
      assert.equal(operation, 'register');
      assert.equal(credential.id, 'synthetic-credential');
      assert.equal(credential.username, 'fixture-user');
      writeStarted();
      return request;
    },
    delete(id) {
      assert.equal(operation, 'removeCredential');
      assert.equal(id, 'synthetic-credential');
      writeStarted();
      return request;
    },
  };
  transaction.objectStore = name => {
    assert.equal(name, 'credentials');
    return store;
  };
  const database = {
    transaction(name, mode) {
      assert.equal(name, 'credentials');
      assert.equal(mode, 'readwrite');
      return transaction;
    },
  };
  replaceGlobal(t, 'indexedDB', {
    open(name, version) {
      assert.equal(name, 'MeshAuthDB');
      assert.equal(version, 1);
      const opening = { result: database };
      queueMicrotask(() => opening.onsuccess());
      return opening;
    },
  });
  const credential = { id: 'synthetic-credential', type: 'public-key' };
  replaceGlobal(t, 'navigator', {
    credentials: { create: async () => credential },
  });
  const auth = new MeshAuth({ rpName: 'Fixture', rpId: 'localhost', allowEval: true });
  const pending = operation === 'register'
    ? auth.register('fixture-user', 'Fixture User')
    : auth.removeCredential(credential.id);
  let outcome = { state: 'pending' };
  pending.then(
    value => { outcome = { state: 'fulfilled', value }; },
    error => { outcome = { state: 'rejected', error }; },
  );
  await started;
  return { pending, request, transaction, credential, outcome: () => outcome };
}

for (const [format, MeshAuth] of [['CommonJS', CJSMeshAuth], ['ESM', ESMMeshAuth]]) {
  for (const operation of ['register', 'removeCredential']) {
    describe(`${format} ${operation} transaction completion`, () => {
      test('waits for commit after the write request succeeds', async t => {
        const fixture = await beginMutation(t, MeshAuth, operation);
        fixture.request.onsuccess?.();
        await setImmediate();
        assert.equal(fixture.outcome().state, 'pending');

        fixture.transaction.oncomplete?.();
        const result = await fixture.pending;
        assert.equal(result, operation === 'register' ? fixture.credential : undefined);
      });

      test('rejects a transaction abort after a successful request', async t => {
        const fixture = await beginMutation(t, MeshAuth, operation);
        fixture.request.onsuccess?.();
        const error = new DOMException('Synthetic commit failure', 'QuotaExceededError');
        fixture.transaction.error = error;
        fixture.transaction.onabort?.();
        await setImmediate();
        assert.deepEqual(fixture.outcome(), { state: 'rejected', error });
      });

      test('rejects an abort that has no transaction error', async t => {
        const fixture = await beginMutation(t, MeshAuth, operation);
        fixture.request.onsuccess?.();
        fixture.transaction.onabort?.();
        await setImmediate();
        const outcome = fixture.outcome();
        assert.equal(outcome.state, 'rejected');
        assert.ok(outcome.error instanceof Error);
        assert.match(outcome.error.message, /transaction.*abort/i);
      });

      test('rejects an abort before a write request succeeds', async t => {
        const fixture = await beginMutation(t, MeshAuth, operation);
        const error = new DOMException('Synthetic abort', 'AbortError');
        fixture.transaction.error = error;
        fixture.transaction.onabort?.();
        await setImmediate();
        assert.deepEqual(fixture.outcome(), { state: 'rejected', error });
      });

      test('preserves a write request failure', async t => {
        const fixture = await beginMutation(t, MeshAuth, operation);
        const error = new DOMException('Synthetic write failure', 'DataError');
        fixture.request.error = error;
        fixture.request.onerror?.();
        fixture.transaction.error = error;
        fixture.transaction.onabort?.();
        await setImmediate();
        assert.deepEqual(fixture.outcome(), { state: 'rejected', error });
      });
    });
  }
}
