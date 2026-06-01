-- New fields for the application wizard (v2)
alter table applications
  add column if not exists find_at_camp        text,
  add column if not exists department_interests text[];
