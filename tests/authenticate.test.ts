import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, api, clearTokens, saveTokens } from '@/lib/api';
import { authenticate } from '@/lib/authenticate';
import type { TelegramWebApp } from '@/lib/telegram';
import type { TokenPair, User } from '@/lib/types';

const user = { id: 'user-id', telegram_id: 123, first_name: 'Sasha' } as User;
const webApp = { initData: 'signed-launch-data' } as TelegramWebApp;
const tokens: TokenPair = {
  access_token: 'access',
  refresh_token: 'refresh',
  token_type: 'bearer',
  expires_in: 900,
};

describe('Telegram authentication', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearTokens();
  });

  it('uses a valid existing session', async () => {
    saveTokens(tokens);
    vi.spyOn(api, 'me').mockResolvedValue(user);
    const login = vi.spyOn(api, 'login');
    expect(await authenticate(webApp)).toEqual(user);
    expect(login).not.toHaveBeenCalled();
  });

  it('falls back to fresh Telegram data after an expired session', async () => {
    saveTokens(tokens);
    vi.spyOn(api, 'me').mockRejectedValue(
      new ApiError(401, 'invalid_refresh_token', 'Expired'),
    );
    const login = vi.spyOn(api, 'login').mockResolvedValue({
      user,
      tokens: {
        ...tokens,
        access_token: 'new-access',
        refresh_token: 'new-refresh',
      },
    });
    expect(await authenticate(webApp)).toEqual(user);
    expect(login).toHaveBeenCalledWith('signed-launch-data');
  });

  it('does not hide server failures behind another login attempt', async () => {
    saveTokens(tokens);
    const failure = new ApiError(503, 'unavailable', 'Unavailable');
    vi.spyOn(api, 'me').mockRejectedValue(failure);
    const login = vi.spyOn(api, 'login');
    await expect(authenticate(webApp)).rejects.toBe(failure);
    expect(login).not.toHaveBeenCalled();
  });

  it('requires Telegram launch data when no session exists', async () => {
    expect(await authenticate(null)).toBeNull();
  });
});
