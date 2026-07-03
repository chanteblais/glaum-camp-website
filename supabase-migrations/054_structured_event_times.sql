-- Migration 054: structured event times everywhere
--
-- Every event now carries real "HH:MM" 24-hour start/end times (the format
-- <input type="time"> speaks and lib/shift-hours parses) — not just shifts:
--
--  · schedule_events: start_time/end_time (added in 047, shift-only until now)
--    are backfilled from the free-text display `time` ("4:00 PM – 7:00 PM").
--    Only fills NULLs; the display `time` column is untouched (it keeps being
--    derived from start/end on every save).
--  · lead_up_events: start_time/end_time held display strings ("6:00 PM");
--    they are converted in place to "HH:MM" ("18:00"). Display formatting
--    happens in code (clockLabel), which also tolerates any unconverted value.
--
-- Not destructive to data meaning: lead_up values are normalised in place
-- (recoverable by formatting back); unparseable values are left untouched.
-- Idempotent — "HH:MM" parses to itself, and the backfill only fills NULLs.

-- Parse one display token ("7:00 PM", "7pm", "noon", "19:00") → "HH:MM" or NULL.
CREATE OR REPLACE FUNCTION pg_temp._to24(t TEXT) RETURNS TEXT AS $$
DECLARE
  m TEXT[];
  h INT;
  mi TEXT;
  mer TEXT;
BEGIN
  IF t IS NULL OR trim(t) = '' THEN RETURN NULL; END IF;
  t := trim(t);
  IF t ~* '^noon$' THEN RETURN '12:00'; END IF;
  IF t ~* '^midnight$' THEN RETURN '00:00'; END IF;
  m := regexp_match(t, '^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$', 'i');
  IF m IS NULL THEN RETURN NULL; END IF;
  h := m[1]::INT;
  mi := COALESCE(m[2], '00');
  mer := lower(m[3]);
  IF h > 23 OR mi::INT > 59 THEN RETURN NULL; END IF;
  IF mer = 'pm' AND h < 12 THEN h := h + 12; END IF;
  IF mer = 'am' AND h = 12 THEN h := 0; END IF;
  RETURN lpad(h::TEXT, 2, '0') || ':' || mi;
END
$$ LANGUAGE plpgsql;

-- schedule_events: fill missing start/end from the display string. A range
-- splits on en/em dash or hyphen; a single time becomes start-only.
UPDATE schedule_events SET
  start_time = COALESCE(start_time, pg_temp._to24((regexp_split_to_array(time, '\s*[–—-]\s*'))[1])),
  end_time   = COALESCE(end_time,   pg_temp._to24((regexp_split_to_array(time, '\s*[–—-]\s*'))[2]))
WHERE (start_time IS NULL OR end_time IS NULL)
  AND time IS NOT NULL AND time <> '';

-- lead_up_events: normalise display strings to "HH:MM" in place; anything
-- unparseable keeps its current value (code renders it as-is).
UPDATE lead_up_events SET
  start_time = COALESCE(pg_temp._to24(start_time), start_time),
  end_time   = COALESCE(pg_temp._to24(end_time), end_time);
