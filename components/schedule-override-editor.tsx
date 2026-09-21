'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus } from 'lucide-react';

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
import type {
  Lesson,
  ScheduleOverride,
  ScheduleOverrideInput,
  ScheduleOverrideType,
  Subject,
} from '@/lib/types';

const labels: Record<ScheduleOverrideType, string> = {
  cancelled: 'Отмена',
  replaced: 'Замена',
  added: 'Дополнительный урок',
};

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Проверьте соединение.';
}

export function ScheduleOverrideEditor({
  classId,
  date,
  lessons,
  subjects,
}: {
  classId: string;
  date: string;
  lessons: Lesson[];
  subjects: Subject[];
}) {
  const client = useQueryClient();
  const overrides = useQuery({
    queryKey: ['schedule-overrides', classId, date],
    queryFn: () => api.scheduleOverrides(classId, date),
  });
  const [editing, setEditing] = useState<ScheduleOverride | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<ScheduleOverrideType>('cancelled');

  function open(value: ScheduleOverride | 'new') {
    setKind(
      value === 'new'
        ? lessons.length
          ? 'cancelled'
          : 'added'
        : value.override_type,
    );
    setEditing(value);
  }

  function changed() {
    void client.invalidateQueries({
      queryKey: ['schedule-overrides', classId, date],
    });
    void client.invalidateQueries({ queryKey: ['day', classId] });
    void client.invalidateQueries({ queryKey: ['week', classId] });
  }

  async function save(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => {
      const item = data.get(name);
      return typeof item === 'string' ? item : '';
    };
    const payload: ScheduleOverrideInput = {
      date,
      lesson_number: Number(value('lesson_number')),
      override_type: kind,
      subject_id: kind === 'cancelled' ? null : value('subject_id'),
      start_time: kind === 'cancelled' ? null : value('start_time'),
      end_time: kind === 'cancelled' ? null : value('end_time'),
      room: kind === 'cancelled' ? null : value('room').trim() || null,
      reason: value('reason').trim() || null,
    };
    if (
      kind !== 'cancelled' &&
      (!payload.subject_id || !payload.start_time || !payload.end_time)
    ) {
      toast.add({ title: 'Укажите предмет и время урока', type: 'error' });
      return;
    }
    if (
      payload.start_time &&
      payload.end_time &&
      payload.start_time >= payload.end_time
    ) {
      toast.add({
        title: 'Время окончания должно быть позже начала',
        type: 'error',
      });
      return;
    }
    setBusy(true);
    try {
      if (editing && editing !== 'new') {
        await api.updateScheduleOverride(classId, editing.id, payload);
      } else {
        await api.createScheduleOverride(classId, payload);
      }
      toast.add({ title: 'Изменение расписания сохранено', type: 'success' });
      changed();
      setEditing(null);
    } catch (error) {
      toast.add({
        title: 'Не удалось сохранить изменение',
        description: errorMessage(error),
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  async function remove(value: ScheduleOverride) {
    if (!window.confirm('Удалить изменение расписания на этот день?')) return;
    setBusy(true);
    try {
      await api.deleteScheduleOverride(classId, value.id);
      toast.add({ title: 'Изменение удалено', type: 'success' });
      changed();
      setEditing(null);
    } catch (error) {
      toast.add({
        title: 'Не удалось удалить изменение',
        description: errorMessage(error),
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  const current = editing === 'new' ? undefined : (editing ?? undefined);
  const defaultLessonNumber =
    kind === 'added'
      ? Math.max(0, ...lessons.map((lesson) => lesson.lesson_number)) + 1
      : (lessons[0]?.lesson_number ?? 1);

  return (
    <section className="mt-6 rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold">Изменения на день</h3>
          <p className="text-sm text-muted-foreground">
            Отмена, замена или дополнительный урок только на выбранную дату.
          </p>
        </div>
        <Button size="sm" onClick={() => open('new')}>
          <Plus /> Добавить изменение
        </Button>
      </div>
      {overrides.isLoading && (
        <p className="mt-3 text-sm text-muted-foreground">
          Загружаем изменения…
        </p>
      )}
      {overrides.isError && (
        <Button
          className="mt-3"
          variant="outline"
          onClick={() => void overrides.refetch()}
        >
          Не удалось загрузить изменения. Повторить
        </Button>
      )}
      {overrides.data?.map((override) => (
        <div className="mt-3 rounded-xl bg-muted p-3" key={override.id}>
          <p className="font-semibold">
            {override.lesson_number}-й урок · {labels[override.override_type]}
          </p>
          {override.reason && (
            <p className="text-sm text-muted-foreground">{override.reason}</p>
          )}
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => open(override)}>
              Редактировать
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void remove(override)}
            >
              Удалить
            </Button>
          </div>
        </div>
      ))}
      {editing && (
        <Dialog open onOpenChange={(visible) => !visible && setEditing(null)}>
          <DialogContent className="max-h-[88dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {current ? 'Редактировать изменение' : 'Изменение на день'}
              </DialogTitle>
              <DialogDescription>
                Постоянное расписание останется без изменений.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-3" onSubmit={(event) => void save(event)}>
              <label
                className="block text-sm font-bold"
                htmlFor="override-lesson-number"
              >
                Номер урока
                <Input
                  id="override-lesson-number"
                  key={`${current?.id ?? 'new'}-${kind}`}
                  className="mt-1"
                  name="lesson_number"
                  type="number"
                  min={1}
                  required
                  defaultValue={current?.lesson_number ?? defaultLessonNumber}
                />
              </label>
              <label className="block text-sm font-bold">
                Тип изменения
                <select
                  className="field mt-1"
                  name="override_type"
                  value={kind}
                  onChange={(event) =>
                    setKind(event.target.value as ScheduleOverrideType)
                  }
                >
                  {Object.entries(labels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {kind !== 'cancelled' && (
                <>
                  <label className="block text-sm font-bold">
                    Предмет
                    <select
                      className="field mt-1"
                      name="subject_id"
                      defaultValue={
                        current?.subject_id ?? subjects[0]?.id ?? ''
                      }
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
                      htmlFor="override-start-time"
                    >
                      Начало
                      <Input
                        id="override-start-time"
                        className="mt-1"
                        name="start_time"
                        type="time"
                        required
                        defaultValue={
                          current?.start_time?.slice(0, 5) ?? '08:00'
                        }
                      />
                    </label>
                    <label
                      className="block text-sm font-bold"
                      htmlFor="override-end-time"
                    >
                      Конец
                      <Input
                        id="override-end-time"
                        className="mt-1"
                        name="end_time"
                        type="time"
                        required
                        defaultValue={current?.end_time?.slice(0, 5) ?? '08:45'}
                      />
                    </label>
                  </div>
                  <label
                    className="block text-sm font-bold"
                    htmlFor="override-room"
                  >
                    Кабинет (необязательно)
                    <Input
                      id="override-room"
                      className="mt-1"
                      name="room"
                      maxLength={100}
                      defaultValue={current?.room ?? ''}
                    />
                  </label>
                </>
              )}
              <label
                className="block text-sm font-bold"
                htmlFor="override-reason"
              >
                Причина (необязательно)
                <Input
                  id="override-reason"
                  className="mt-1"
                  name="reason"
                  maxLength={500}
                  defaultValue={current?.reason ?? ''}
                />
              </label>
              <Button
                className="h-11 w-full"
                type="submit"
                disabled={
                  busy || (kind !== 'cancelled' && subjects.length === 0)
                }
              >
                {busy ? 'Сохраняем…' : 'Сохранить'}
              </Button>
              {kind !== 'cancelled' && subjects.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Для замены или добавления урока нужен предмет. Попросите
                  администратора создать его.
                </p>
              )}
            </form>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
