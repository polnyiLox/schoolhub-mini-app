import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ApiError,
  clearTokens,
  readTokens,
  saveTokens,
  SchoolHubApi,
} from '@/lib/api';
import type { TokenPair } from '@/lib/types';

const tokens: TokenPair = {
  access_token: 'access',
  refresh_token: 'refresh',
  token_type: 'bearer',
  expires_in: 900,
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const requestBody = (index = 0): unknown => {
  const body = vi.mocked(fetch).mock.calls[index][1]?.body;
  if (typeof body !== 'string')
    throw new TypeError('Expected a JSON request body');
  return JSON.parse(body) as unknown;
};

describe('API client', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));

  it('stores and reads token pair', () => {
    saveTokens(tokens);
    expect(readTokens()).toEqual({
      access_token: 'access',
      refresh_token: 'refresh',
    });
  });
  it('returns null for incomplete tokens', () => {
    sessionStorage.setItem('schoolhub.access', 'access');
    expect(readTokens()).toBeNull();
  });
  it('clears token pair', () => {
    saveTokens(tokens);
    clearTokens();
    expect(readTokens()).toBeNull();
  });
  it('authenticates with Telegram initData', async () => {
    vi.mocked(fetch).mockResolvedValue(json({ user: { id: 'u' }, tokens }));
    const result = await new SchoolHubApi('https://api.test').login('signed');
    expect(result.tokens.access_token).toBe('access');
    expect(requestBody()).toEqual({ init_data: 'signed' });
  });
  it('persists tokens after login', async () => {
    vi.mocked(fetch).mockResolvedValue(json({ user: {}, tokens }));
    await new SchoolHubApi('https://api.test').login('signed');
    expect(readTokens()?.refresh_token).toBe('refresh');
  });
  it('adds bearer token to protected request', async () => {
    saveTokens(tokens);
    vi.mocked(fetch).mockResolvedValue(json([]));
    await new SchoolHubApi('https://api.test').classes();
    const headers = new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers);
    expect(headers.get('Authorization')).toBe('Bearer access');
  });
  it('uses classes route', async () => {
    vi.mocked(fetch).mockResolvedValue(json([]));
    await new SchoolHubApi('https://api.test').classes();
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      'https://api.test/v1/classes',
    );
  });
  it('uses date day route', async () => {
    vi.mocked(fetch).mockResolvedValue(
      json({ date: '2026-01-01', lessons: [], events: [] }),
    );
    await new SchoolHubApi('https://api.test').classDay(
      'class-id',
      '2026-01-01',
    );
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain(
      '/v1/classes/class-id/days/2026-01-01',
    );
  });
  it('sends homework payload', async () => {
    saveTokens(tokens);
    vi.mocked(fetch).mockResolvedValue(json({ id: 'hw' }));
    const payload = {
      subject_id: 's',
      assigned_date: '2026-01-01',
      due_date: '2026-01-02',
      text: 'Read',
    };
    await new SchoolHubApi('https://api.test').createHomework('c', payload);
    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe('POST');
    expect(requestBody()).toEqual(payload);
  });
  it('accepts a no-content delete', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));
    await expect(
      new SchoolHubApi('https://api.test').deleteEvent('c', 'e'),
    ).resolves.toBeUndefined();
  });
  it('maps gateway error body', async () => {
    vi.mocked(fetch).mockResolvedValue(
      json({ error: { code: 'denied', message: 'Нет доступа' } }, 403),
    );
    await expect(
      new SchoolHubApi('https://api.test').classes(),
    ).rejects.toMatchObject({
      status: 403,
      code: 'denied',
      message: 'Нет доступа',
    });
  });
  it('maps FastAPI validation details', async () => {
    vi.mocked(fetch).mockResolvedValue(
      json({ detail: [{ msg: 'Bad date' }] }, 422),
    );
    await expect(
      new SchoolHubApi('https://api.test').classes(),
    ).rejects.toThrow('Bad date');
  });
  it('falls back for a non-JSON error', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('offline', { status: 503 }),
    );
    await expect(
      new SchoolHubApi('https://api.test').classes(),
    ).rejects.toThrow('Ошибка запроса (503)');
  });
  it('refreshes once and retries a 401 request', async () => {
    saveTokens(tokens);
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({ ...tokens, access_token: 'new-access' }))
      .mockResolvedValueOnce(json([{ id: 'class' }]));
    const result = await new SchoolHubApi('https://api.test').classes();
    expect(result[0].id).toBe('class');
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it('uses refreshed bearer on retry', async () => {
    saveTokens(tokens);
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({ ...tokens, access_token: 'new-access' }))
      .mockResolvedValueOnce(json([]));
    await new SchoolHubApi('https://api.test').classes();
    const headers = new Headers(vi.mocked(fetch).mock.calls[2][1]?.headers);
    expect(headers.get('Authorization')).toBe('Bearer new-access');
  });
  it('clears tokens when refresh fails', async () => {
    saveTokens(tokens);
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({}, 401));
    await expect(
      new SchoolHubApi('https://api.test').classes(),
    ).rejects.toBeInstanceOf(ApiError);
    expect(readTokens()).toBeNull();
  });
  it('logs out remotely and clears local session', async () => {
    saveTokens(tokens);
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));
    await new SchoolHubApi('https://api.test').logout();
    expect(readTokens()).toBeNull();
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/v1/auth/logout');
  });
});
