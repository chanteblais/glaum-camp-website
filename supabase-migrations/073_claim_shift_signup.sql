-- Migration 073: Atomic shift-slot claim (security review, 2026-08-27).
--
-- The signup route used to read the current holds, compare against capacity,
-- then insert in a separate statement — two concurrent signups could both see
-- the last slot free and both take it. This function does the count + insert
-- inside one transaction, serialized per (event, night) by an advisory lock,
-- so a shift can no longer be oversubscribed.
--
-- Returns: 'ok' (slot claimed) | 'full' | 'exists' (caller already holds this
-- night — the partial uniques from 064 fire) | 'not_found' (no such event).
--
-- DEPLOY ORDER: apply BEFORE or WITH the code deploy — app/api/shift-signups
-- POST now calls this instead of inserting directly, and 500s without it.
--
-- Not destructive; idempotent (create or replace + re-runnable grants).

create or replace function claim_shift_signup(
  p_clerk_user_id text,
  p_schedule_event_id uuid,
  p_occurrence_date date,
  p_role text default 'member'
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity int;
  v_held int;
  v_rows int;
begin
  -- Serialize claims on this (event, night); the lock releases at commit.
  perform pg_advisory_xact_lock(hashtextextended(
    'claim_shift_signup:' || p_schedule_event_id::text || ':' || coalesce(p_occurrence_date::text, 'single'), 0));

  select capacity into v_capacity
  from schedule_events
  where id = p_schedule_event_id;
  if not found then
    return 'not_found';
  end if;

  -- NULL capacity = unlimited. Counting matches the route's old logic: every
  -- hold on this exact occurrence (leads included), NULL date = the single
  -- occurrence of a non-recurring shift.
  if v_capacity is not null then
    select count(*) into v_held
    from member_shift_signups
    where schedule_event_id = p_schedule_event_id
      and occurrence_date is not distinct from p_occurrence_date;
    if v_held >= v_capacity then
      return 'full';
    end if;
  end if;

  insert into member_shift_signups (clerk_user_id, schedule_event_id, occurrence_date, role)
  values (p_clerk_user_id, p_schedule_event_id, p_occurrence_date, coalesce(p_role, 'member'))
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  return case when v_rows = 0 then 'exists' else 'ok' end;
end;
$$;

-- Service-role only: PostgREST would otherwise expose this rpc to anon/
-- authenticated keys (functions are executable by PUBLIC by default), and the
-- function takes the caller-supplied clerk_user_id on faith — the API route is
-- the auth gate.
revoke execute on function claim_shift_signup(text, uuid, date, text) from public;
revoke execute on function claim_shift_signup(text, uuid, date, text) from anon;
revoke execute on function claim_shift_signup(text, uuid, date, text) from authenticated;
grant execute on function claim_shift_signup(text, uuid, date, text) to service_role;
