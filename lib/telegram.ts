export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  button_color?: string;
  button_text_color?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { user?: TelegramUser };
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  ready(): void;
  expand(): void;
  enableClosingConfirmation(): void;
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
  };
}

declare global {
  interface Window { Telegram?: { WebApp?: TelegramWebApp } }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return typeof window === 'undefined' ? null : window.Telegram?.WebApp ?? null;
}

export function initializeTelegram(): TelegramWebApp | null {
  const webApp = getTelegramWebApp();
  if (!webApp) return null;
  webApp.ready();
  webApp.expand();
  webApp.enableClosingConfirmation();
  document.documentElement.classList.toggle('dark', webApp.colorScheme === 'dark');
  return webApp;
}

export function hapticSuccess(): void {
  getTelegramWebApp()?.HapticFeedback?.notificationOccurred('success');
}

export function hapticError(): void {
  getTelegramWebApp()?.HapticFeedback?.notificationOccurred('error');
}
