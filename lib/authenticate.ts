import { api, ApiError, clearTokens, readTokens } from '@/lib/api';
import type { TelegramWebApp } from '@/lib/telegram';
import type { User } from '@/lib/types';

export async function authenticate(
  webApp: TelegramWebApp | null,
): Promise<User | null> {
  if (readTokens()) {
    try {
      return await api.me();
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      clearTokens();
    }
  }

  if (!webApp?.initData) return null;
  return (await api.login(webApp.initData)).user;
}
