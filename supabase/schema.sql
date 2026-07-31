-- Base de datos IESO: ejecutar en el SQL Editor de Supabase antes de activar la integración.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  role text not null default 'student' check (role in ('admin','student')),
  created_at timestamptz not null default now()
);
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(), title text not null, description text,
  duration text, published boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.enrollments (
  user_id uuid references public.profiles(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, program_id)
);
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(), program_id uuid not null references public.programs(id) on delete cascade,
  position integer not null, title text not null, content text, material_path text, video_url text
);
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(), program_id uuid not null references public.programs(id) on delete cascade,
  module_id uuid references public.modules(id) on delete cascade, question text not null,
  options jsonb not null, correct_index integer not null, feedback text
);
create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade, module_id uuid references public.modules(id),
  is_final boolean not null default false, score numeric not null, passed boolean not null, created_at timestamptz not null default now()
);
create table if not exists public.module_completions (
  user_id uuid references public.profiles(id) on delete cascade, module_id uuid references public.modules(id) on delete cascade,
  completed_at timestamptz not null default now(), primary key (user_id,module_id)
);
alter table public.profiles enable row level security;
alter table public.programs enable row level security;
alter table public.enrollments enable row level security;
alter table public.modules enable row level security;
alter table public.questions enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.module_completions enable row level security;
-- Las políticas RLS deben otorgar al estudiante acceso solamente a sus enrollments y al admin gestión completa.
