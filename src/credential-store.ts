// Copyright (c) 2024-2026 Soumya Debnath. All Rights Reserved.
// Licensed under the Business Source License 1.1 (BSL 1.1).
// See LICENSE file for details. Production use requires a paid license.
// Contact: soumyadebnath1619@gmail.com | +91 7031648617

import { StoredCredential } from './types';

export class CredentialStore {
  private dbName = 'MeshAuthDB';
  private storeName = 'credentials';

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveCredential(credential: StoredCredential): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      // A successful request can still be rolled back before the transaction commits.
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error('Credential transaction aborted'));
      const store = tx.objectStore(this.storeName);
      const request = store.put(credential);
      request.onerror = () => reject(request.error);
    });
  }

  async getCredentials(): Promise<StoredCredential[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeCredential(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error('Credential transaction aborted'));
      const store = tx.objectStore(this.storeName);
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
    });
  }
}
