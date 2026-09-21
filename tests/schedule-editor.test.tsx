import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScheduleEntryDialog } from '@/components/schedule-entry-dialog';
import { ScheduleOverrideEditor } from '@/components/schedule-override-editor';
import { api } from '@/lib/api';
import type { Lesson, ScheduleEntry, Subject } from '@/lib/types';

const subject: Subject = {
  id: 'subject-id',
  class_id: 'class-id',
  name: 'Математика',
  teacher_name: null,
};
const entry: ScheduleEntry = {
  id: 'entry-id',
  class_id: 'class-id',
  subject_id: subject.id,
  weekday: 0,
  lesson_number: 1,
  start_time: '08:00:00',
  end_time: '08:45:00',
  room: '12',
};
const lesson: Lesson = {
  lesson_number: 1,
  subject,
  start_time: '08:00:00',
  end_time: '08:45:00',
  room: '12',
  status: 'normal',
  reason: null,
};

function renderWithQuery(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('schedule editors', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(cleanup);

  it('creates a recurring lesson for the selected weekday', async () => {
    const create = vi
      .spyOn(api, 'createScheduleEntry')
      .mockResolvedValue(entry);
    const changed = vi.fn();
    renderWithQuery(
      <ScheduleEntryDialog
        classId="class-id"
        subjects={[subject]}
        initialWeekday={2}
        initialLessonNumber={3}
        close={vi.fn()}
        onChanged={changed}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith('class-id', {
        subject_id: subject.id,
        weekday: 2,
        lesson_number: 3,
        start_time: '08:00',
        end_time: '08:45',
        room: null,
      }),
    );
    expect(changed).toHaveBeenCalledOnce();
  });

  it('updates an existing recurring lesson', async () => {
    const update = vi
      .spyOn(api, 'updateScheduleEntry')
      .mockResolvedValue(entry);
    renderWithQuery(
      <ScheduleEntryDialog
        classId="class-id"
        subjects={[subject]}
        entry={entry}
        initialWeekday={0}
        initialLessonNumber={1}
        close={vi.fn()}
        onChanged={vi.fn()}
      />,
    );
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Кабинет (необязательно)' }),
      {
        target: { value: '24' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        'class-id',
        'entry-id',
        expect.objectContaining({ room: '24' }),
      ),
    );
  });

  it('creates a one-day cancellation without changing the weekly lesson', async () => {
    vi.spyOn(api, 'scheduleOverrides').mockResolvedValue([]);
    const create = vi.spyOn(api, 'createScheduleOverride').mockResolvedValue({
      id: 'override-id',
      class_id: 'class-id',
      date: '2026-09-21',
      lesson_number: 1,
      override_type: 'cancelled',
      subject_id: null,
      start_time: null,
      end_time: null,
      room: null,
      reason: null,
    });
    renderWithQuery(
      <ScheduleOverrideEditor
        classId="class-id"
        date="2026-09-21"
        lessons={[lesson]}
        subjects={[subject]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Добавить изменение' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith('class-id', {
        date: '2026-09-21',
        lesson_number: 1,
        override_type: 'cancelled',
        subject_id: null,
        start_time: null,
        end_time: null,
        room: null,
        reason: null,
      }),
    );
  });

  it('defaults an extra lesson to the next free number', async () => {
    vi.spyOn(api, 'scheduleOverrides').mockResolvedValue([]);
    const create = vi.spyOn(api, 'createScheduleOverride').mockResolvedValue({
      id: 'override-id',
      class_id: 'class-id',
      date: '2026-09-21',
      lesson_number: 2,
      override_type: 'added',
      subject_id: subject.id,
      start_time: '08:00:00',
      end_time: '08:45:00',
      room: null,
      reason: null,
    });
    renderWithQuery(
      <ScheduleOverrideEditor
        classId="class-id"
        date="2026-09-21"
        lessons={[lesson]}
        subjects={[subject]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Добавить изменение' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Тип изменения' }), {
      target: { value: 'added' },
    });
    expect(screen.getByRole('spinbutton', { name: 'Номер урока' })).toHaveValue(
      2,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        'class-id',
        expect.objectContaining({
          override_type: 'added',
          lesson_number: 2,
          subject_id: subject.id,
        }),
      ),
    );
  });

  it('edits an existing one-day change', async () => {
    const override = {
      id: 'override-id',
      class_id: 'class-id',
      date: '2026-09-21',
      lesson_number: 1,
      override_type: 'cancelled' as const,
      subject_id: null,
      start_time: null,
      end_time: null,
      room: null,
      reason: 'Праздник',
    };
    vi.spyOn(api, 'scheduleOverrides').mockResolvedValue([override]);
    const update = vi
      .spyOn(api, 'updateScheduleOverride')
      .mockResolvedValue(override);
    renderWithQuery(
      <ScheduleOverrideEditor
        classId="class-id"
        date="2026-09-21"
        lessons={[lesson]}
        subjects={[subject]}
      />,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Редактировать' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        'class-id',
        'override-id',
        expect.objectContaining({ reason: 'Праздник' }),
      ),
    );
  });
});
