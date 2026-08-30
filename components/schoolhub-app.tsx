'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Home,
  LogOut,
  MapPin,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { api, ApiError, readTokens } from '@/lib/api';
import {
  addDays,
  formatDateTime,
  formatDay,
  formatWeekday,
  greeting,
  shortTime,
  toIsoDate,
} from '@/lib/dates';
import {
  demoClasses,
  demoDay,
  demoEvents,
  demoHomeworks,
  demoSubjects,
  demoUser,
  demoWeek,
} from '@/lib/demo';
import { hapticError, hapticSuccess, initializeTelegram } from '@/lib/telegram';
import type {
  ClassMember,
  EventInput,
  HomeworkInput,
  SchoolClass,
  Subject,
  User,
} from '@/lib/types';

type Tab = 'today' | 'schedule' | 'homework' | 'events' | 'profile';
type Composer = 'homework' | 'event' | 'member' | 'subject' | 'class' | null;
const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

function message(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Не удалось выполнить действие. Попробуйте ещё раз.';
}

function LoadingScreen() {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl space-y-4 px-4 pt-8">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-24 rounded-3xl" />
      <Skeleton className="h-36 rounded-3xl" />
      <Skeleton className="h-28 rounded-3xl" />
    </main>
  );
}

function Gate({
  kind,
  retry,
}: {
  kind: 'telegram' | 'error';
  retry: () => void;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6">
      <section className="w-full max-w-sm rounded-[2rem] border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
          {kind === 'telegram' ? <Sparkles /> : <CircleAlert />}
        </div>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight">
          {kind === 'telegram'
            ? 'Откройте SchoolHub в Telegram'
            : 'Не удалось войти'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {kind === 'telegram'
            ? 'Авторизация использует защищённые данные запуска Mini App. Откройте приложение кнопкой в профиле бота.'
            : 'Проверьте соединение и перезапустите Mini App.'}
        </p>
        <Button className="mt-5 h-11 w-full rounded-xl" onClick={retry}>
          <RefreshCw />
          Попробовать снова
        </Button>
      </section>
    </main>
  );
}

export function SchoolHubApp() {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<
    'loading' | 'telegram' | 'error' | 'ready'
  >(demoMode ? 'ready' : 'loading');
  const [user, setUser] = useState<User | null>(demoMode ? demoUser : null);
  const [tab, setTab] = useState<Tab>('today');
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(() => new Date());
  const [composer, setComposer] = useState<Composer>(null);
  const [loginKey, setLoginKey] = useState(0);

  useEffect(() => {
    if (demoMode) return;
    let active = true;
    const start = async () => {
      try {
        const webApp = initializeTelegram();
        if (!webApp?.initData && !readTokens()) {
          if (active) setPhase('telegram');
          return;
        }
        const authenticated = readTokens()
          ? await api.me()
          : (await api.login(webApp!.initData)).user;
        if (active) {
          setUser(authenticated);
          setPhase('ready');
        }
      } catch {
        if (active) setPhase('error');
      }
    };
    void start();
    return () => {
      active = false;
    };
  }, [loginKey]);

  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: () => (demoMode ? demoClasses : api.classes()),
    enabled: phase === 'ready',
  });
  const classes = classesQuery.data ?? [];
  const activeClassId = classId || classes[0]?.id || '';
  const chooseClass = (value: string) => {
    setClassId(value);
    localStorage.setItem('schoolhub.class', value);
  };
  const selectedClass = classes.find((item) => item.id === activeClassId);
  const isoDate = toIsoDate(date);

  const day = useQuery({
    queryKey: ['day', activeClassId, isoDate],
    queryFn: () =>
      demoMode
        ? { ...demoDay, date: isoDate }
        : api.classDay(activeClassId, isoDate),
    enabled: Boolean(activeClassId),
  });
  const week = useQuery({
    queryKey: ['week', activeClassId],
    queryFn: () => (demoMode ? demoWeek : api.scheduleWeek(activeClassId)),
    enabled: Boolean(activeClassId) && tab === 'schedule',
  });
  const homeworks = useQuery({
    queryKey: ['homeworks', activeClassId],
    queryFn: () => (demoMode ? demoHomeworks : api.homeworks(activeClassId)),
    enabled:
      Boolean(activeClassId) && (tab === 'homework' || composer === 'homework'),
  });
  const events = useQuery({
    queryKey: ['events', activeClassId],
    queryFn: () => (demoMode ? demoEvents : api.events(activeClassId)),
    enabled: Boolean(activeClassId) && tab === 'events',
  });
  const subjects = useQuery({
    queryKey: ['subjects', activeClassId],
    queryFn: () => (demoMode ? demoSubjects : api.subjects(activeClassId)),
    enabled:
      Boolean(activeClassId) &&
      (tab === 'homework' ||
        tab === 'profile' ||
        composer === 'homework' ||
        composer === 'subject'),
  });
  const members = useQuery({
    queryKey: ['members', activeClassId],
    queryFn: () =>
      demoMode
        ? [
            {
              id: 'member',
              class_id: activeClassId,
              telegram_id: user?.telegram_id ?? 0,
              role: 'editor' as const,
            },
          ]
        : api.members(activeClassId),
    enabled: Boolean(activeClassId),
  });
  const classRole = members.data?.find(
    (item) => item.telegram_id === user?.telegram_id,
  )?.role;
  const canEdit = user?.global_role === 'admin' || classRole === 'editor';

  const refresh = () => void queryClient.invalidateQueries();
  if (phase === 'loading') return <LoadingScreen />;
  if (phase !== 'ready' || !user)
    return (
      <Gate
        kind={phase === 'telegram' ? 'telegram' : 'error'}
        retry={() => {
          setPhase('loading');
          setLoginKey((key) => key + 1);
        }}
      />
    );

  return (
    <main className="min-h-dvh bg-background pb-28 text-foreground">
      <div className="mx-auto w-full max-w-2xl px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-7">
        <header className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">
              SchoolHub
            </p>
            <h1 className="mt-1 text-[1.55rem] font-extrabold tracking-[-.04em]">
              {greeting()}, {user.first_name}
            </h1>
          </div>
          {canEdit && (tab === 'homework' || tab === 'events') ? (
            <Button
              aria-label="Добавить"
              className="rounded-2xl"
              size="icon-lg"
              onClick={() =>
                setComposer(tab === 'events' ? 'event' : 'homework')
              }
            >
              <Plus />
            </Button>
          ) : null}
        </header>

        {classesQuery.isLoading ? (
          <Skeleton className="mt-4 h-14 rounded-2xl" />
        ) : classes.length ? (
          <label className="relative mt-4 block">
            <span className="sr-only">Текущий класс</span>
            <select
              className="h-14 w-full appearance-none rounded-2xl border bg-card px-4 pr-10 font-bold shadow-sm outline-none focus:ring-2 focus:ring-ring"
              value={activeClassId}
              onChange={(event) => chooseClass(event.target.value)}
            >
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.academic_year}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-5 size-5 text-muted-foreground" />
          </label>
        ) : (
          <Empty
            title="У вас пока нет класса"
            text={
              user.global_role === 'admin'
                ? 'Создайте первый класс в разделе «Профиль».'
                : 'Попросите администратора добавить ваш Telegram ID.'
            }
          />
        )}

        {selectedClass ? (
          <>
            {tab === 'today' && (
              <Today
                date={date}
                setDate={setDate}
                data={day.data}
                loading={day.isLoading}
                error={day.isError}
                retry={() => void day.refetch()}
              />
            )}
            {tab === 'schedule' && (
              <Schedule data={week.data} loading={week.isLoading} />
            )}
            {tab === 'homework' && (
              <HomeworkList
                items={homeworks.data ?? []}
                subjects={subjects.data ?? []}
                loading={homeworks.isLoading}
                canEdit={canEdit}
                onDelete={(id) => void mutateDelete('homework', id)}
              />
            )}
            {tab === 'events' && (
              <EventList
                items={events.data ?? []}
                loading={events.isLoading}
                canEdit={canEdit}
                onDelete={(id) => void mutateDelete('event', id)}
              />
            )}
            {tab === 'profile' && (
              <Profile
                user={user}
                selectedClass={selectedClass}
                role={classRole}
                members={members.data ?? []}
                subjects={subjects.data ?? []}
                onCompose={setComposer}
                onDeleteMember={(id) => void mutateDelete('member', id)}
                onDeleteSubject={(id) => void mutateDelete('subject', id)}
                onLogout={() => void logout()}
              />
            )}
          </>
        ) : null}
      </div>
      <BottomNav tab={tab} setTab={setTab} />
      <Composer
        kind={composer}
        close={() => setComposer(null)}
        classId={activeClassId}
        subjects={subjects.data ?? []}
        submit={submitComposer}
      />
    </main>
  );

  async function submitComposer(payload: unknown) {
    if (demoMode) {
      toast.add({
        title: 'Демо-режим',
        description: 'Подключите backend для сохранения.',
        type: 'info',
      });
      setComposer(null);
      return;
    }
    try {
      if (composer === 'homework')
        await api.createHomework(activeClassId, payload as HomeworkInput);
      if (composer === 'event')
        await api.createEvent(activeClassId, payload as EventInput);
      if (composer === 'member')
        await api.addMember(
          activeClassId,
          payload as { telegram_id: number; role: 'student' | 'editor' },
        );
      if (composer === 'subject')
        await api.createSubject(
          activeClassId,
          payload as { name: string; teacher_name?: string },
        );
      if (composer === 'class') {
        const created = await api.createClass(
          payload as { name: string; academic_year: string },
        );
        chooseClass(created.id);
      }
      hapticSuccess();
      toast.add({
        title: 'Готово',
        description: 'Изменения сохранены.',
        type: 'success',
      });
      setComposer(null);
      refresh();
    } catch (error) {
      hapticError();
      toast.add({
        title: 'Ошибка',
        description: message(error),
        type: 'error',
      });
    }
  }
  async function mutateDelete(
    kind: 'homework' | 'event' | 'member' | 'subject',
    id: string | number,
  ) {
    if (demoMode) return;
    try {
      if (kind === 'homework')
        await api.deleteHomework(activeClassId, String(id));
      if (kind === 'event') await api.deleteEvent(activeClassId, String(id));
      if (kind === 'member') await api.deleteMember(activeClassId, Number(id));
      if (kind === 'subject')
        await api.deleteSubject(activeClassId, String(id));
      hapticSuccess();
      refresh();
    } catch (error) {
      hapticError();
      toast.add({
        title: 'Не удалось удалить',
        description: message(error),
        type: 'error',
      });
    }
  }
  async function logout() {
    await api.logout();
    setPhase('telegram');
    setUser(null);
    queryClient.clear();
  }
}

function Today({
  date,
  setDate,
  data,
  loading,
  error,
  retry,
}: {
  date: Date;
  setDate: (date: Date) => void;
  data?: Awaited<ReturnType<typeof api.classDay>>;
  loading: boolean;
  error: boolean;
  retry: () => void;
}) {
  return (
    <section className="mt-5">
      <div className="flex items-center justify-between rounded-[1.7rem] bg-[#1946aa] p-4 text-white shadow-lg">
        <Button
          aria-label="Предыдущий день"
          className="text-white hover:bg-white/10"
          variant="ghost"
          size="icon"
          onClick={() => setDate(addDays(date, -1))}
        >
          <ChevronLeft />
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold text-white/65">
            {data ? formatWeekday(data.date) : 'День'}
          </p>
          <h2 className="text-xl font-extrabold">
            {data ? formatDay(data.date) : '—'}
          </h2>
        </div>
        <Button
          aria-label="Следующий день"
          className="text-white hover:bg-white/10"
          variant="ghost"
          size="icon"
          onClick={() => setDate(addDays(date, 1))}
        >
          <ChevronRight />
        </Button>
      </div>
      {loading ? (
        <CardsLoading />
      ) : error ? (
        <Empty
          title="День не загрузился"
          text="Проверьте соединение с сервером."
          action={retry}
        />
      ) : (
        <div className="mt-5 space-y-3">
          {data?.lessons.length ? (
            data.lessons.map((lesson) => (
              <LessonCard key={lesson.lesson_number} lesson={lesson} />
            ))
          ) : (
            <Empty
              title="Уроков нет"
              text="На этот день расписание свободно."
            />
          )}
          {data?.events.map((event) => (
            <article
              key={event.id}
              className="rounded-2xl border border-[#ffdcb1] bg-[#fff7e9] p-4 text-[#332717]"
            >
              <Badge className="bg-[#ffdfae] text-[#805000]">Событие</Badge>
              <h3 className="mt-2 font-extrabold">{event.title}</h3>
              <p className="mt-1 text-sm text-[#765b36]">
                {formatDateTime(event.starts_at)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function LessonCard({
  lesson,
}: {
  lesson: Awaited<ReturnType<typeof api.classDay>>['lessons'][number];
}) {
  const cancelled = lesson.status === 'cancelled';
  return (
    <article
      className={`rounded-[1.35rem] border bg-card p-4 shadow-sm ${cancelled ? 'opacity-60' : ''}`}
    >
      <div className="flex gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary font-extrabold text-primary">
          {lesson.lesson_number}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex justify-between gap-2">
            <h3 className={`font-extrabold ${cancelled ? 'line-through' : ''}`}>
              {lesson.subject?.name ?? 'Урок отменён'}
            </h3>
            {lesson.status !== 'normal' && (
              <Badge variant="outline">{lesson.status}</Badge>
            )}
          </div>
          <div className="mt-1 flex gap-3 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock3 className="size-3.5" />
              {shortTime(lesson.start_time)}–{shortTime(lesson.end_time)}
            </span>
            {lesson.room && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {lesson.room}
              </span>
            )}
          </div>
          {lesson.homeworks?.map((homework) => (
            <div
              key={homework.id}
              className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm"
            >
              <BookOpen className="mr-2 inline size-4 text-primary" />
              {homework.text}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function Schedule({
  data,
  loading,
}: {
  data?: Awaited<ReturnType<typeof api.scheduleWeek>>;
  loading: boolean;
}) {
  return (
    <section className="mt-6">
      <Title eyebrow="Расписание" title="Учебная неделя" />
      {loading ? (
        <CardsLoading />
      ) : (
        <div className="space-y-5">
          {data?.days.map((day) => (
            <div key={day.date}>
              <h3 className="mb-2 font-extrabold">
                {formatWeekday(day.date)}, {formatDay(day.date)}
              </h3>
              <div className="space-y-2">
                {day.lessons.length ? (
                  day.lessons.map((lesson) => (
                    <LessonCard key={lesson.lesson_number} lesson={lesson} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Уроков нет</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function HomeworkList({
  items,
  subjects,
  loading,
  canEdit,
  onDelete,
}: {
  items: Awaited<ReturnType<typeof api.homeworks>>;
  subjects: Subject[];
  loading: boolean;
  canEdit: boolean;
  onDelete: (id: string) => void;
}) {
  const names = new Map(subjects.map((item) => [item.id, item.name]));
  return (
    <section className="mt-6">
      <Title eyebrow="Задания" title="Домашняя работа" />
      {loading ? (
        <CardsLoading />
      ) : (
        <div className="space-y-3">
          {items.length ? (
            [...items]
              .sort((a, b) => a.due_date.localeCompare(b.due_date))
              .map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant="secondary">
                        {names.get(item.subject_id) ?? 'Предмет'}
                      </Badge>
                      <p className="mt-2 font-semibold leading-relaxed">
                        {item.text}
                      </p>
                      <p className="mt-2 text-xs font-bold text-muted-foreground">
                        Сдать {formatDay(item.due_date)}
                      </p>
                    </div>
                    {canEdit && (
                      <Button
                        aria-label="Удалить задание"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(item.id)}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </article>
              ))
          ) : (
            <Empty title="Заданий нет" text="Можно немного отдохнуть." />
          )}
        </div>
      )}
    </section>
  );
}

function EventList({
  items,
  loading,
  canEdit,
  onDelete,
}: {
  items: Awaited<ReturnType<typeof api.events>>;
  loading: boolean;
  canEdit: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="mt-6">
      <Title eyebrow="Календарь" title="События класса" />
      {loading ? (
        <CardsLoading />
      ) : (
        <div className="space-y-3">
          {items.length ? (
            [...items]
              .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
              .map((event) => (
                <article
                  key={event.id}
                  className="rounded-2xl border bg-card p-4"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <Badge variant="outline">{event.event_type}</Badge>
                      <h3 className="mt-2 font-extrabold">{event.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDateTime(event.starts_at)}
                      </p>
                      {event.description && (
                        <p className="mt-3 text-sm">{event.description}</p>
                      )}
                    </div>
                    {canEdit && (
                      <Button
                        aria-label="Удалить событие"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(event.id)}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </article>
              ))
          ) : (
            <Empty title="Событий нет" text="Новые события появятся здесь." />
          )}
        </div>
      )}
    </section>
  );
}

function Profile({
  user,
  selectedClass,
  role,
  members,
  subjects,
  onCompose,
  onDeleteMember,
  onDeleteSubject,
  onLogout,
}: {
  user: User;
  selectedClass: SchoolClass;
  role?: string;
  members: ClassMember[];
  subjects: Subject[];
  onCompose: (kind: Composer) => void;
  onDeleteMember: (id: number) => void;
  onDeleteSubject: (id: string) => void;
  onLogout: () => void;
}) {
  const admin = user.global_role === 'admin';
  return (
    <section className="mt-6 space-y-5">
      <div className="rounded-[1.7rem] bg-[#1946aa] p-5 text-white">
        <div className="grid size-14 place-items-center rounded-2xl bg-white/15 text-xl font-extrabold">
          {user.first_name[0]}
        </div>
        <h2 className="mt-3 text-xl font-extrabold">
          {user.first_name} {user.last_name}
        </h2>
        <p className="text-sm text-white/65">
          @{user.username ?? 'без username'} ·{' '}
          {admin ? 'Администратор' : role === 'editor' ? 'Редактор' : 'Ученик'}
        </p>
      </div>
      {admin && (
        <div className="rounded-2xl border bg-card p-4">
          <Title eyebrow="Администрирование" title={selectedClass.name} />
          <div className="grid grid-cols-3 gap-2">
            <Quick
              icon={<UsersRound />}
              label="Участник"
              onClick={() => onCompose('member')}
            />
            <Quick
              icon={<BookOpen />}
              label="Предмет"
              onClick={() => onCompose('subject')}
            />
            <Quick
              icon={<Plus />}
              label="Класс"
              onClick={() => onCompose('class')}
            />
          </div>
          <h3 className="mt-5 text-sm font-extrabold">Участники</h3>
          {members.map((item) => (
            <Row
              key={item.id}
              title={String(item.telegram_id)}
              meta={item.role}
              remove={() => onDeleteMember(item.telegram_id)}
            />
          ))}
          <h3 className="mt-5 text-sm font-extrabold">Предметы</h3>
          {subjects.map((item) => (
            <Row
              key={item.id}
              title={item.name}
              meta={item.teacher_name ?? 'Преподаватель не указан'}
              remove={() => onDeleteSubject(item.id)}
            />
          ))}
        </div>
      )}
      <Button
        className="h-11 w-full rounded-xl"
        variant="outline"
        onClick={onLogout}
      >
        <LogOut />
        Выйти
      </Button>
    </section>
  );
}

function Composer({
  kind,
  close,
  classId,
  subjects,
  submit,
}: {
  kind: Composer;
  close: () => void;
  classId: string;
  subjects: Subject[];
  submit: (payload: unknown) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  if (!kind) return null;
  const send = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const value = (name: string) => {
      const item = data.get(name);
      return typeof item === 'string' ? item : '';
    };
    let payload: unknown = Object.fromEntries(data);
    if (kind === 'homework')
      payload = {
        subject_id: value('subject_id'),
        assigned_date: value('assigned_date'),
        due_date: value('due_date'),
        text: value('text'),
      };
    if (kind === 'event')
      payload = {
        title: value('title'),
        description: value('description') || null,
        event_type: value('event_type'),
        starts_at: new Date(value('starts_at')).toISOString(),
        ends_at: value('ends_at')
          ? new Date(value('ends_at')).toISOString()
          : null,
      };
    if (kind === 'member')
      payload = {
        telegram_id: Number(value('telegram_id')),
        role: value('role'),
      };
    await submit(payload);
    setBusy(false);
  };
  const titles = {
    homework: 'Новое задание',
    event: 'Новое событие',
    member: 'Добавить участника',
    subject: 'Новый предмет',
    class: 'Новый класс',
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="max-h-[88dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titles[kind]}</DialogTitle>
          <DialogDescription>
            Заполните обязательные поля и сохраните.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={send}>
          {kind === 'homework' && (
            <>
              <Field label="Предмет">
                <select name="subject_id" required className="field">
                  {subjects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Дата выдачи">
                <Input
                  name="assigned_date"
                  type="date"
                  required
                  defaultValue={toIsoDate(new Date())}
                />
              </Field>
              <Field label="Срок сдачи">
                <Input
                  name="due_date"
                  type="date"
                  required
                  defaultValue={toIsoDate(new Date())}
                />
              </Field>
              <Field label="Задание">
                <Textarea name="text" required minLength={1} />
              </Field>
            </>
          )}
          {kind === 'event' && (
            <>
              <Field label="Название">
                <Input name="title" required />
              </Field>
              <Field label="Тип">
                <select className="field" name="event_type">
                  <option value="exam">Экзамен</option>
                  <option value="meeting">Собрание</option>
                  <option value="trip">Поездка</option>
                  <option value="reminder">Напоминание</option>
                  <option value="other">Другое</option>
                </select>
              </Field>
              <Field label="Начало">
                <Input name="starts_at" type="datetime-local" required />
              </Field>
              <Field label="Окончание">
                <Input name="ends_at" type="datetime-local" />
              </Field>
              <Field label="Описание">
                <Textarea name="description" />
              </Field>
            </>
          )}
          {kind === 'member' && (
            <>
              <Field label="Telegram ID">
                <Input name="telegram_id" type="number" required />
              </Field>
              <Field label="Роль">
                <select className="field" name="role">
                  <option value="student">Ученик</option>
                  <option value="editor">Редактор</option>
                </select>
              </Field>
            </>
          )}
          {kind === 'subject' && (
            <>
              <Field label="Название">
                <Input name="name" required />
              </Field>
              <Field label="Преподаватель">
                <Input name="teacher_name" />
              </Field>
            </>
          )}
          {kind === 'class' && (
            <>
              <Field label="Название">
                <Input name="name" placeholder="10А" required />
              </Field>
              <Field label="Учебный год">
                <Input
                  name="academic_year"
                  placeholder="2026/2027"
                  pattern="\d{4}/\d{4}"
                  required
                />
              </Field>
            </>
          )}
          <Button
            className="h-11 w-full"
            disabled={busy || (!classId && kind !== 'class')}
            type="submit"
          >
            {busy ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  const items = [
    { id: 'today' as const, icon: Home, label: 'Сегодня' },
    { id: 'schedule' as const, icon: CalendarDays, label: 'Неделя' },
    { id: 'homework' as const, icon: BookOpen, label: 'Задания' },
    { id: 'events' as const, icon: Sparkles, label: 'События' },
    { id: 'profile' as const, icon: UserRound, label: 'Профиль' },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[max(.65rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
      <div className="mx-auto grid max-w-2xl grid-cols-5 px-2">
        {items.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`flex flex-col items-center gap-1 py-1.5 text-[10px] font-bold ${tab === id ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={() => setTab(id)}
          >
            <Icon className="size-5" strokeWidth={tab === id ? 2.7 : 2} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
function Title({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-extrabold tracking-tight">{title}</h2>
    </div>
  );
}
function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: () => void;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed bg-card p-6 text-center">
      <h3 className="font-extrabold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      {action && (
        <Button className="mt-4" variant="outline" onClick={action}>
          Повторить
        </Button>
      )}
    </div>
  );
}
function CardsLoading() {
  return (
    <div className="mt-5 space-y-3">
      {[1, 2, 3].map((item) => (
        <Skeleton key={item} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
function Quick({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex flex-col items-center gap-2 rounded-xl bg-muted p-3 text-xs font-bold text-primary"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
function Row({
  title,
  meta,
  remove,
}: {
  title: string;
  meta: string;
  remove: () => void;
}) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2">
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
      <Button
        aria-label={`Удалить ${title}`}
        variant="ghost"
        size="icon-sm"
        onClick={remove}
      >
        <Trash2 />
      </Button>
    </div>
  );
}
