import { describe, expect, it, vi } from 'vitest';

import { getTelegramWebApp, hapticError, hapticSuccess, initializeTelegram, type TelegramWebApp } from '@/lib/telegram';

function telegram(colorScheme: 'light'|'dark' = 'light') {
  const webApp = { initData: 'signed', initDataUnsafe: {}, colorScheme, themeParams: {}, ready: vi.fn(), expand: vi.fn(), enableClosingConfirmation: vi.fn(), HapticFeedback: { impactOccurred: vi.fn(), notificationOccurred: vi.fn() } } satisfies TelegramWebApp;
  window.Telegram = { WebApp: webApp };
  return webApp;
}

describe('Telegram bridge', () => {
  it('returns null outside Telegram', () => expect(getTelegramWebApp()).toBeNull());
  it('returns Telegram WebApp', () => { const app = telegram(); expect(getTelegramWebApp()).toBe(app); });
  it('announces readiness and expands', () => { const app = telegram(); initializeTelegram(); expect(app.ready).toHaveBeenCalledOnce(); expect(app.expand).toHaveBeenCalledOnce(); });
  it('enables closing confirmation', () => { const app = telegram(); initializeTelegram(); expect(app.enableClosingConfirmation).toHaveBeenCalledOnce(); });
  it('applies dark theme', () => { telegram('dark'); initializeTelegram(); expect(document.documentElement).toHaveClass('dark'); });
  it('removes dark theme for light Telegram', () => { document.documentElement.classList.add('dark'); telegram('light'); initializeTelegram(); expect(document.documentElement).not.toHaveClass('dark'); });
  it('sends success haptic', () => { const app = telegram(); hapticSuccess(); expect(app.HapticFeedback?.notificationOccurred).toHaveBeenCalledWith('success'); });
  it('sends error haptic', () => { const app = telegram(); hapticError(); expect(app.HapticFeedback?.notificationOccurred).toHaveBeenCalledWith('error'); });
});
