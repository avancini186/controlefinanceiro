export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

type ToastListener = (toasts: ToastMessage[]) => void;

class NotificationServiceClass {
  private toasts: ToastMessage[] = [];
  private listeners: Set<ToastListener> = new Set();

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  show(type: ToastType, title: string, message?: string, duration = 4000) {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    const toast: ToastMessage = { id, type, title, message, duration };
    this.toasts.push(toast);
    this.notify();

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
  }

  success(title: string, message?: string) {
    this.show('success', title, message);
  }

  error(title: string, message?: string) {
    this.show('error', title, message);
  }

  warning(title: string, message?: string) {
    this.show('warning', title, message);
  }

  info(title: string, message?: string) {
    this.show('info', title, message);
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }
}

export const NotificationService = new NotificationServiceClass();
