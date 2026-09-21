'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api';
import type { ScheduleEntry, ScheduleEntryInput, Subject } from '@/lib/types';

const weekdays = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];

export function ScheduleEntryDialog({
  classId,
  subjects,
  entry,
  initialWeekday,
  initialLessonNumber,
  close,
  onChanged,
}: {
  classId: string;
  subjects: Subject[];
  entry?: ScheduleEntry;
  initialWeekday: number;
  initialLessonNumber: number;
  close: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function save(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => {
      const item = data.get(name);
      return typeof item === 'string' ? item : '';
    };
    const payload: ScheduleEntryInput = {
      subject_id: value('subject_id'),
      weekday: Number(value('weekday')),
      lesson_number: Number(value('lesson_number')),
      start_time: value('start_time'),
      end_time: value('end_time'),
      room: value('room').trim() || null,
    };
    if (payload.start_time >= payload.end_time) {
      toast.add({
        title: 'Время окончания должно быть позже начала',
        type: 'error',
      });
      return;
    }
    setBusy(true);
    try {
      if (entry) await api.updateScheduleEntry(classId, entry.id, payload);
      else await api.createScheduleEntry(classId, payload);
      toast.add({
        title: entry ? 'Урок обновлён' : 'Урок добавлен',
        type: 'success',
      });
      onChanged();
      close();
    } catch (error) {
      toast.add({
        title: 'Не удалось сохранить урок',
        description:
          error instanceof ApiError ? error.message : 'Проверьте соединение.',
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !entry ||
      !window.confirm('Удалить этот урок из еженедельного расписания?')
    )
      return;
    setBusy(true);
    try {
      await api.deleteScheduleEntry(classId, entry.id);
      toast.add({ title: 'Урок удалён', type: 'success' });
      onChanged();
      close();
    } catch (error) {
      toast.add({
        title: 'Не удалось удалить урок',
        description:
          error instanceof ApiError ? error.message : 'Проверьте соединение.',
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry ? 'Изменить урок' : 'Добавить урок'}</DialogTitle>
          <DialogDescription>
            Изменение повторяется каждую неделю.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(event) => void save(event)}>
          <label className="block text-sm font-bold">
            День недели
            <select
              name="weekday"
              className="field mt-1"
              defaultValue={entry?.weekday ?? initialWeekday}
              required
            >
              {weekdays.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <label
            className="block text-sm font-bold"
            htmlFor="schedule-lesson-number"
          >
            Номер урока
            <Input
              id="schedule-lesson-number"
              className="mt-1"
              name="lesson_number"
              type="number"
              min={1}
              defaultValue={entry?.lesson_number ?? initialLessonNumber}
              required
            />
          </label>
          <label className="block text-sm font-bold">
            Предмет
            <select
              name="subject_id"
              className="field mt-1"
              defaultValue={entry?.subject_id ?? subjects[0]?.id}
              required
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label
              className="block text-sm font-bold"
              htmlFor="schedule-start-time"
            >
              Начало
              <Input
                id="schedule-start-time"
                className="mt-1"
                name="start_time"
                type="time"
                defaultValue={entry?.start_time.slice(0, 5) ?? '08:00'}
                required
              />
            </label>
            <label
              className="block text-sm font-bold"
              htmlFor="schedule-end-time"
            >
              Конец
              <Input
                id="schedule-end-time"
                className="mt-1"
                name="end_time"
                type="time"
                defaultValue={entry?.end_time.slice(0, 5) ?? '08:45'}
                required
              />
            </label>
          </div>
          <label className="block text-sm font-bold" htmlFor="schedule-room">
            Кабинет (необязательно)
            <Input
              id="schedule-room"
              className="mt-1"
              name="room"
              maxLength={100}
              defaultValue={entry?.room ?? ''}
            />
          </label>
          <Button className="h-11 w-full" type="submit" disabled={busy}>
            {busy ? 'Сохраняем…' : 'Сохранить'}
          </Button>
          {entry && (
            <Button
              className="h-11 w-full"
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => void remove()}
            >
              Удалить урок
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
