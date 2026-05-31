create table role_suggestions (
  id               uuid primary key default gen_random_uuid(),
  clerk_user_id    text not null,
  applicant_name   text,
  dept_name        text not null check (char_length(dept_name) <= 40),
  dept_description text,
  role_name        text not null check (char_length(role_name) <= 28),
  role_description text,
  notes            text,
  status           text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at       timestamptz not null default now()
);
