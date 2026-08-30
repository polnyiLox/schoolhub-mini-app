import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Clock3,
  Home,
  MapPin,
  NotebookPen,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const lessons = [
  {
    number: 1,
    time: '08:30–09:15',
    subject: 'Алгебра',
    room: '203',
    accent: 'bg-[#dce7ff] text-[#1946aa]',
    homework: '№ 125–130, повторить формулы',
  },
  {
    number: 2,
    time: '09:25–10:10',
    subject: 'Физика',
    room: '112',
    accent: 'bg-[#ffe7de] text-[#a84021]',
    homework: null,
  },
  {
    number: 3,
    time: '10:30–11:15',
    subject: 'Английский язык',
    room: '305',
    accent: 'bg-[#e2f5e9] text-[#1d7042]',
    homework: 'Workbook, page 42',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-background pb-28 text-foreground">
      <div className="mx-auto w-full max-w-2xl px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-7">
        <header className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">SchoolHub</p>
            <h1 className="mt-1 text-[1.65rem] font-extrabold tracking-[-0.04em]">Доброе утро, Саша</h1>
          </div>
          <Button aria-label="Уведомления" className="relative rounded-2xl" size="icon-lg" variant="outline">
            <Bell />
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#ff6b4a] ring-2 ring-background" />
          </Button>
        </header>

        <button className="mt-4 flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm">
          <span>
            <span className="block text-xs font-semibold text-muted-foreground">Текущий класс</span>
            <span className="mt-0.5 block font-bold">10А · 2026/2027</span>
          </span>
          <ChevronDown className="size-5 text-muted-foreground" />
        </button>

        <section className="relative mt-5 overflow-hidden rounded-[1.75rem] bg-[#1946aa] p-5 text-white shadow-[0_18px_50px_-25px_rgba(25,70,170,.8)]">
          <div className="absolute -right-8 -top-10 size-36 rounded-full border-[22px] border-white/10" />
          <div className="absolute bottom-[-45px] right-20 size-24 rotate-12 rounded-[2rem] bg-[#ff8062]/80" />
          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white/70">Понедельник</p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight">14 сентября</h2>
              </div>
              <div className="rounded-2xl bg-white/12 px-3 py-2 text-center backdrop-blur">
                <span className="block text-2xl font-extrabold">5</span>
                <span className="text-[11px] font-semibold text-white/70">уроков</span>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-white/80">
              <Sparkles className="size-4 text-[#ffd27d]" />
              Следующий урок через 18 минут
            </div>
          </div>
        </section>

        <section className="mt-7">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Расписание</p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight">Сегодня</h2>
            </div>
            <Button variant="ghost">Вся неделя</Button>
          </div>

          <div className="space-y-3">
            {lessons.map((lesson) => (
              <article key={lesson.number} className="rounded-[1.35rem] border border-border bg-card p-4 shadow-sm">
                <div className="flex gap-3.5">
                  <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-base font-extrabold ${lesson.accent}`}>
                    {lesson.number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-extrabold tracking-tight">{lesson.subject}</h3>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock3 className="size-3.5" />{lesson.time}</span>
                          <span className="flex items-center gap-1"><MapPin className="size-3.5" />{lesson.room}</span>
                        </div>
                      </div>
                      {lesson.number === 2 ? <Badge className="bg-[#fff0c9] text-[#855600]">сейчас</Badge> : null}
                    </div>
                    {lesson.homework ? (
                      <div className="mt-3 flex gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm leading-snug">
                        <NotebookPen className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{lesson.homework}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-7 rounded-[1.35rem] border border-[#ffdcb1] bg-[#fff7e9] p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#ffdfae] text-[#8a5100]">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#9b6417]">Событие дня</p>
              <h3 className="mt-1 font-extrabold">Собрание класса</h3>
              <p className="mt-1 text-sm text-[#765b36]">16:30 · кабинет 203</p>
            </div>
          </div>
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 pb-[max(.65rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        <div className="mx-auto grid max-w-2xl grid-cols-4 px-4">
          {[
            [Home, 'Сегодня', true],
            [CalendarDays, 'Расписание', false],
            [BookOpen, 'Задания', false],
            [UserRound, 'Профиль', false],
          ].map(([Icon, label, active]) => (
            <button key={String(label)} className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-bold ${active ? 'text-primary' : 'text-muted-foreground'}`}>
              <Icon className="size-5" strokeWidth={active ? 2.6 : 2} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
