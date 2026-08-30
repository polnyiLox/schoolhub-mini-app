import type {
  AuthResult,
  ClassDay,
  ClassMember,
  EventInput,
  GatewayErrorBody,
  Homework,
  HomeworkInput,
  ScheduleWeek,
  SchoolClass,
  SchoolEvent,
  Subject,
  TokenPair,
  User,
} from '@/lib/types';

const ACCESS_KEY = 'schoolhub.access';
const REFRESH_KEY = 'schoolhub.refresh';
const DEFAULT_API_URL = 'http://localhost:8080/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function storage(): Storage | null {
  return typeof window === 'undefined' ? null : window.sessionStorage;
}

export function readTokens(): Pick<
  TokenPair,
  'access_token' | 'refresh_token'
> | null {
  const store = storage();
  const access_token = store?.getItem(ACCESS_KEY);
  const refresh_token = store?.getItem(REFRESH_KEY);
  return access_token && refresh_token ? { access_token, refresh_token } : null;
}

export function saveTokens(tokens: TokenPair): void {
  storage()?.setItem(ACCESS_KEY, tokens.access_token);
  storage()?.setItem(REFRESH_KEY, tokens.refresh_token);
}

export function clearTokens(): void {
  storage()?.removeItem(ACCESS_KEY);
  storage()?.removeItem(REFRESH_KEY);
}

async function errorFrom(response: Response): Promise<ApiError> {
  let body: GatewayErrorBody = {};
  try {
    body = (await response.json()) as GatewayErrorBody;
  } catch {
    /* non-JSON upstream */
  }
  const detail = Array.isArray(body.detail)
    ? body.detail
        .map((item) => item.msg)
        .filter(Boolean)
        .join(', ')
    : body.detail;
  return new ApiError(
    response.status,
    body.error?.code ?? 'request_failed',
    body.error?.message ?? detail ?? `Ошибка запроса (${response.status})`,
  );
}

export class SchoolHubApi {
  private refreshing: Promise<string> | null = null;

  constructor(
    private readonly baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ??
      DEFAULT_API_URL,
  ) {}

  private async request<T>(
    path: string,
    options: RequestInit = {},
    retry = true,
  ): Promise<T> {
    const access = readTokens()?.access_token;
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData))
      headers.set('Content-Type', 'application/json');
    if (access) headers.set('Authorization', `Bearer ${access}`);
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });
    if (response.status === 401 && retry && readTokens()?.refresh_token) {
      await this.refreshAccessToken();
      return this.request<T>(path, options, false);
    }
    if (!response.ok) throw await errorFrom(response);
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  private refreshAccessToken(): Promise<string> {
    if (!this.refreshing) {
      const refreshToken = readTokens()?.refresh_token;
      if (!refreshToken)
        return Promise.reject(
          new ApiError(401, 'session_expired', 'Сессия завершена'),
        );
      this.refreshing = fetch(`${this.baseUrl}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
        .then(async (response) => {
          if (!response.ok) {
            clearTokens();
            throw await errorFrom(response);
          }
          const tokens = (await response.json()) as TokenPair;
          saveTokens(tokens);
          return tokens.access_token;
        })
        .finally(() => {
          this.refreshing = null;
        });
    }
    return this.refreshing;
  }

  async login(initData: string): Promise<AuthResult> {
    const result = await this.request<AuthResult>(
      '/v1/auth/telegram',
      {
        method: 'POST',
        body: JSON.stringify({ init_data: initData }),
      },
      false,
    );
    saveTokens(result.tokens);
    return result;
  }

  me = () => this.request<User>('/v1/users/me');
  classes = () => this.request<SchoolClass[]>('/v1/classes');
  classDay = (classId: string, date: string) =>
    this.request<ClassDay>(`/v1/classes/${classId}/days/${date}`);
  scheduleWeek = (classId: string) =>
    this.request<ScheduleWeek>(`/v1/classes/${classId}/schedule/week`);
  homeworks = (classId: string) =>
    this.request<Homework[]>(`/v1/classes/${classId}/homeworks`);
  events = (classId: string) =>
    this.request<SchoolEvent[]>(`/v1/classes/${classId}/events`);
  subjects = (classId: string) =>
    this.request<Subject[]>(`/v1/classes/${classId}/subjects`);
  members = (classId: string) =>
    this.request<ClassMember[]>(`/v1/classes/${classId}/members`);

  createHomework = (classId: string, payload: HomeworkInput) =>
    this.request<Homework>(`/v1/classes/${classId}/homeworks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  updateHomework = (
    classId: string,
    id: string,
    payload: Partial<HomeworkInput>,
  ) =>
    this.request<Homework>(`/v1/classes/${classId}/homeworks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  deleteHomework = (classId: string, id: string) =>
    this.request<void>(`/v1/classes/${classId}/homeworks/${id}`, {
      method: 'DELETE',
    });
  createEvent = (classId: string, payload: EventInput) =>
    this.request<SchoolEvent>(`/v1/classes/${classId}/events`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  deleteEvent = (classId: string, id: string) =>
    this.request<void>(`/v1/classes/${classId}/events/${id}`, {
      method: 'DELETE',
    });
  createClass = (payload: { name: string; academic_year: string }) =>
    this.request<SchoolClass>('/v1/classes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  addMember = (
    classId: string,
    payload: { telegram_id: number; role: 'student' | 'editor' },
  ) =>
    this.request<ClassMember>(`/v1/classes/${classId}/members`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  deleteMember = (classId: string, telegramId: number) =>
    this.request<void>(`/v1/classes/${classId}/members/${telegramId}`, {
      method: 'DELETE',
    });
  createSubject = (
    classId: string,
    payload: { name: string; teacher_name?: string | null },
  ) =>
    this.request<Subject>(`/v1/classes/${classId}/subjects`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  deleteSubject = (classId: string, id: string) =>
    this.request<void>(`/v1/classes/${classId}/subjects/${id}`, {
      method: 'DELETE',
    });

  async logout(): Promise<void> {
    const refresh_token = readTokens()?.refresh_token;
    try {
      if (refresh_token)
        await this.request<void>(
          '/v1/auth/logout',
          { method: 'POST', body: JSON.stringify({ refresh_token }) },
          false,
        );
    } finally {
      clearTokens();
    }
  }
}

export const api = new SchoolHubApi();
