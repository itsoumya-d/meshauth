export class EventEmitter<T extends Record<string, any>> {
  private listeners: { [K in keyof T]?: Array<(event: T[K]) => void> } = {};

  on<K extends keyof T>(event: K, listener: (event: T[K]) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    const eventListeners = this.listeners[event];
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }
}
