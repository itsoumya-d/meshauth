export class TokenManager {
  static saveToken(token: string) {
    sessionStorage.setItem('meshauth_token', token);
  }

  static getToken(): string | null {
    return sessionStorage.getItem('meshauth_token');
  }

  static clearToken() {
    sessionStorage.removeItem('meshauth_token');
  }
}
