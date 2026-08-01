interface MeshAuthOptions {
    rpName: string;
    rpId: string;
    origin: string;
    serverUrl?: string;
    conditionalMediation?: boolean;
    authenticatorAttachment?: 'platform' | 'cross-platform';
}
interface StoredCredential {
    id: string;
    username: string;
    createdAt: number;
}
interface AuthResult {
    success: boolean;
    token?: string;
    error?: string;
}
interface RegistrationResponse {
    success: boolean;
    [key: string]: any;
}
interface AuthenticationResponse {
    success: boolean;
    token?: string;
    [key: string]: any;
}

declare class MeshAuth {
    private client;
    private store;
    private options;
    constructor(options?: any);
    register(username: string, displayName: string): Promise<Credential>;
    authenticate(username?: string): Promise<AuthResult>;
    static isSupported(): boolean;
    static isConditionalMediationAvailable(): Promise<boolean>;
    getCredentials(): Promise<StoredCredential[]>;
    removeCredential(credentialId: string): Promise<void>;
    /**
     * Get or create a persistent HMAC signing key stored in IndexedDB.
     * This ensures JWT tokens signed locally can be verified across sessions.
     */
    private getOrCreateSigningKey;
}

declare class EventEmitter<T extends Record<string, any>> {
    private listeners;
    on<K extends keyof T>(event: K, listener: (event: T[K]) => void): void;
    emit<K extends keyof T>(event: K, data: T[K]): void;
}

export { type AuthResult, type AuthenticationResponse, EventEmitter, MeshAuth, type MeshAuthOptions, type RegistrationResponse, type StoredCredential };
