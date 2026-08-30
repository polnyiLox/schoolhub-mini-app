import type { ClassDay, Homework, ScheduleWeek, SchoolClass, SchoolEvent, Subject, User } from '@/lib/types';

export const demoUser: User = { id: 'demo-user', telegram_id: 100, username: 'sasha', first_name: 'Саша', last_name: null, global_role: 'admin', is_active: true };
export const demoClasses: SchoolClass[] = [{ id: 'demo-class', name: '10А', academic_year: '2026/2027', is_archived: false }];
export const demoSubjects: Subject[] = [
  { id: 'math', class_id: 'demo-class', name: 'Алгебра', teacher_name: 'Анна Сергеевна' },
  { id: 'physics', class_id: 'demo-class', name: 'Физика', teacher_name: 'Илья Викторович' },
  { id: 'english', class_id: 'demo-class', name: 'Английский язык', teacher_name: null },
];
const date = new Date().toISOString().slice(0, 10);
export const demoEvents: SchoolEvent[] = [{ id: 'event-1', class_id: 'demo-class', title: 'Собрание класса', description: 'Обсуждаем осеннюю поездку', event_type: 'meeting', starts_at: `${date}T16:30:00+04:00`, ends_at: null, created_by_telegram_id: 100 }];
export const demoHomeworks: Homework[] = [
  { id: 'hw-1', class_id: 'demo-class', subject_id: 'math', assigned_date: date, due_date: date, text: '№ 125–130, повторить формулы', created_by_telegram_id: 100, updated_by_telegram_id: null },
  { id: 'hw-2', class_id: 'demo-class', subject_id: 'english', assigned_date: date, due_date: date, text: 'Workbook, page 42', created_by_telegram_id: 100, updated_by_telegram_id: null },
];
const lessons = [
  { lesson_number: 1, subject: demoSubjects[0], start_time: '08:30:00', end_time: '09:15:00', room: '203', status: 'normal' as const, reason: null, homeworks: [{ id: 'hw-1', text: demoHomeworks[0].text, due_date: date }] },
  { lesson_number: 2, subject: demoSubjects[1], start_time: '09:25:00', end_time: '10:10:00', room: '112', status: 'replaced' as const, reason: 'Замена кабинета', homeworks: [] },
  { lesson_number: 3, subject: demoSubjects[2], start_time: '10:30:00', end_time: '11:15:00', room: '305', status: 'normal' as const, reason: null, homeworks: [{ id: 'hw-2', text: demoHomeworks[1].text, due_date: date }] },
];
export const demoDay: ClassDay = { date, lessons, events: demoEvents };
export const demoWeek: ScheduleWeek = { days: Array.from({ length: 5 }, (_, index) => ({ ...demoDay, date: new Date(Date.now() + index * 86_400_000).toISOString().slice(0, 10) })) };
