import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SchoolHubApp } from '@/components/schoolhub-app';
import { api } from '@/lib/api';
import { authenticate } from '@/lib/authenticate';
import type { User } from '@/lib/types';

vi.mock('@/lib/authenticate', () => ({ authenticate: vi.fn() }));

const admin: User = {
  id: 'user-id',
  telegram_id: 123,
  username: 'sasha',
  first_name: 'Саша',
  last_name: null,
  global_role: 'admin',
  is_active: true,
};

function renderApp() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SchoolHubApp />
    </QueryClientProvider>,
  );
}

describe('first class onboarding', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(authenticate).mockResolvedValue(admin);
    vi.spyOn(api, 'classes').mockResolvedValue([]);
  });

  it('lets an admin create the first class from the home screen', async () => {
    const createClass = vi.spyOn(api, 'createClass').mockResolvedValue({
      id: 'class-id',
      name: '10А',
      academic_year: '2026/2027',
      is_archived: false,
    });
    renderApp();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Создать класс' }),
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Название' }), {
      target: { value: '10А' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Учебный год' }), {
      target: { value: '2026/2027' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(createClass).toHaveBeenCalledWith({
      name: '10А',
      academic_year: '2026/2027',
    });
  });

  it('shows the admin profile and creation action before any class exists', async () => {
    renderApp();
    fireEvent.click(await screen.findByRole('button', { name: 'Профиль' }));
    expect(await screen.findByText('Первый класс')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Создать класс' }),
    ).toBeInTheDocument();
  });

  it('does not offer class creation to a non-admin', async () => {
    vi.mocked(authenticate).mockResolvedValue({
      ...admin,
      global_role: 'user',
    });
    renderApp();
    expect(
      await screen.findByText('У вас пока нет класса'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Создать класс' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Профиль' }));
    expect(await screen.findByText('Саша')).toBeInTheDocument();
  });

  it('distinguishes a failed class request from an empty class list', async () => {
    vi.spyOn(api, 'classes').mockRejectedValue(new Error('Unavailable'));
    renderApp();
    expect(
      await screen.findByText('Не удалось загрузить классы'),
    ).toBeInTheDocument();
    expect(screen.queryByText('У вас пока нет класса')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Повторить' }),
    ).toBeInTheDocument();
  });
});

describe('schedule editing permissions', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, 'classes').mockResolvedValue([
      {
        id: 'class-id',
        name: '10А',
        academic_year: '2026/2027',
        is_archived: false,
      },
    ]);
    vi.spyOn(api, 'classDay').mockResolvedValue({
      date: '2026-09-21',
      lessons: [],
      events: [],
    });
    vi.spyOn(api, 'scheduleWeek').mockResolvedValue({
      days: [{ date: '2026-09-21', lessons: [] }],
    });
    vi.spyOn(api, 'subjects').mockResolvedValue([
      {
        id: 'subject-id',
        class_id: 'class-id',
        name: 'Математика',
        teacher_name: null,
      },
    ]);
    vi.spyOn(api, 'scheduleEntries').mockResolvedValue([]);
    vi.spyOn(api, 'scheduleOverrides').mockResolvedValue([]);
    vi.spyOn(api, 'homeworkCompletions').mockResolvedValue([]);
  });

  it.each([
    { role: 'admin' as const, memberRole: 'student' as const, allowed: true },
    { role: 'user' as const, memberRole: 'editor' as const, allowed: true },
    { role: 'user' as const, memberRole: 'student' as const, allowed: false },
  ])(
    'shows schedule editing to role=$role member=$memberRole only when allowed',
    async ({ role, memberRole, allowed }) => {
      vi.mocked(authenticate).mockResolvedValue({
        ...admin,
        global_role: role,
      });
      vi.spyOn(api, 'members').mockResolvedValue([
        {
          id: 'member-id',
          class_id: 'class-id',
          telegram_id: admin.telegram_id,
          role: memberRole,
        },
      ]);
      renderApp();
      fireEvent.click(await screen.findByRole('button', { name: 'Неделя' }));
      expect(await screen.findByText('Уроков нет')).toBeInTheDocument();
      if (allowed) {
        expect(
          await screen.findAllByRole('button', { name: 'Добавить урок' }),
        ).not.toHaveLength(0);
      } else {
        expect(
          screen.queryByRole('button', { name: 'Добавить урок' }),
        ).not.toBeInTheDocument();
      }
    },
  );

  it('links the empty home schedule to the weekly editor', async () => {
    vi.mocked(authenticate).mockResolvedValue(admin);
    vi.spyOn(api, 'members').mockResolvedValue([]);
    renderApp();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Составить расписание' }),
    );
    expect(
      await screen.findAllByRole('button', { name: 'Добавить урок' }),
    ).not.toHaveLength(0);
  });

  it('shows Sunday as a day off', async () => {
    vi.mocked(authenticate).mockResolvedValue(admin);
    vi.spyOn(api, 'members').mockResolvedValue([]);
    vi.spyOn(api, 'classDay').mockResolvedValue({
      date: '2026-09-20',
      lessons: [],
      events: [],
    });

    renderApp();

    expect(
      await screen.findByText('Воскресенье — выходной'),
    ).toBeInTheDocument();
  });

  it('highlights an important daily reminder', async () => {
    vi.mocked(authenticate).mockResolvedValue(admin);
    vi.spyOn(api, 'members').mockResolvedValue([]);
    vi.spyOn(api, 'classDay').mockResolvedValue({
      date: '2026-09-21',
      lessons: [],
      events: [
        {
          id: 'reminder-id',
          class_id: 'class-id',
          title: 'Принести тетрадь',
          description: 'Без тетради будет двойка',
          event_type: 'reminder',
          starts_at: '2026-09-21T08:00:00+04:00',
          ends_at: null,
          created_by_telegram_id: 123,
        },
      ],
    });

    renderApp();

    expect(await screen.findByText('Важное на день')).toBeInTheDocument();
    expect(screen.getByText('Принести тетрадь')).toBeInTheDocument();
    expect(screen.getByText('Без тетради будет двойка')).toBeInTheDocument();
  });

  it('adds a class member by Telegram username', async () => {
    vi.mocked(authenticate).mockResolvedValue(admin);
    vi.spyOn(api, 'members').mockResolvedValue([]);
    const resolveUser = vi.spyOn(api, 'resolveUser').mockResolvedValue({
      ...admin,
      telegram_id: 777,
      username: 'student_name',
    });
    const addMember = vi.spyOn(api, 'addMember').mockResolvedValue({
      id: 'member-id',
      class_id: 'class-id',
      telegram_id: 777,
      role: 'student',
    });

    renderApp();
    fireEvent.click(await screen.findByRole('button', { name: 'Профиль' }));
    fireEvent.click(screen.getByRole('button', { name: 'Участник' }));
    fireEvent.change(
      screen.getByRole('textbox', { name: /Telegram username или ID/ }),
      { target: { value: '@student_name' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => expect(resolveUser).toHaveBeenCalledWith('@student_name'));
    expect(addMember).toHaveBeenCalledWith('class-id', {
      telegram_id: 777,
      role: 'student',
    });
  });

  it('lets a student mark personal homework as completed', async () => {
    vi.mocked(authenticate).mockResolvedValue({ ...admin, global_role: 'user' });
    vi.spyOn(api, 'members').mockResolvedValue([
      {
        id: 'member-id',
        class_id: 'class-id',
        telegram_id: 123,
        role: 'student',
      },
    ]);
    vi.spyOn(api, 'homeworks').mockResolvedValue([
      {
        id: 'homework-id',
        class_id: 'class-id',
        subject_id: 'subject-id',
        assigned_date: '2026-09-20',
        due_date: '2026-09-21',
        text: 'Решить задачу 10',
        created_by_telegram_id: 123,
        updated_by_telegram_id: null,
      },
    ]);
    const markCompleted = vi
      .spyOn(api, 'markHomeworkCompleted')
      .mockResolvedValue({
        id: 'completion-id',
        homework_id: 'homework-id',
        completed_at: '2026-09-21T08:00:00Z',
      });

    renderApp();
    fireEvent.click(await screen.findByRole('button', { name: 'Задания' }));
    fireEvent.click(await screen.findByText('Решить задачу 10'));

    await waitFor(() =>
      expect(markCompleted).toHaveBeenCalledWith('class-id', 'homework-id'),
    );
  });
});
