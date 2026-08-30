export type GlobalRole = 'admin' | 'user';
export type ClassRole = 'student' | 'editor';
export type LessonStatus = 'normal' | 'replaced' | 'cancelled' | 'added';
export type EventType = 'exam' | 'meeting' | 'trip' | 'reminder' | 'other';

export interface User {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string;
  last_name: string | null;
  global_role: GlobalRole;
  is_active: boolean;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
}

export interface AuthResult {
  user: User;
  tokens: TokenPair;
}

export interface SchoolClass {
  id: string;
  name: string;
  academic_year: string;
  is_archived: boolean;
}

export interface ClassMember {
  id: string;
  class_id: string;
  telegram_id: number;
  role: ClassRole;
}

export interface Subject {
  id: string;
  class_id: string;
  name: string;
  teacher_name: string | null;
}

export interface DayHomework {
  id: string;
  text: string;
  due_date: string;
}

export interface Lesson {
  lesson_number: number;
  subject: Subject | null;
  start_time: string | null;
  end_time: string | null;
  room: string | null;
  status: LessonStatus;
  reason: string | null;
  homeworks?: DayHomework[];
}

export interface ScheduleDay {
  date: string;
  lessons: Lesson[];
}
export interface ScheduleWeek {
  days: ScheduleDay[];
}

export interface Homework {
  id: string;
  class_id: string;
  subject_id: string;
  assigned_date: string;
  due_date: string;
  text: string;
  created_by_telegram_id: number;
  updated_by_telegram_id: number | null;
}

export interface SchoolEvent {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  starts_at: string;
  ends_at: string | null;
  created_by_telegram_id: number;
}

export interface ClassDay {
  date: string;
  lessons: Lesson[];
  events: SchoolEvent[];
}

export interface HomeworkInput {
  subject_id: string;
  assigned_date: string;
  due_date: string;
  text: string;
}

export interface EventInput {
  title: string;
  description?: string | null;
  event_type: EventType;
  starts_at: string;
  ends_at?: string | null;
}

export interface GatewayErrorBody {
  error?: { code?: string; message?: string };
  detail?: string | Array<{ msg?: string }>;
}
