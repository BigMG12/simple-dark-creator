-- =============================================================================
-- 010_progress_analytics.sql
-- Progress analytics RPCs, analyses-trigger extensions, and pg_cron schedule.
--
-- This file is STAGED (not in supabase/migrations/) because Cloud is not
-- enabled yet. Apply manually once schema below exists. See
-- supabase/functions/_shared/ANALYTICS_README.md for full schema assumptions.
-- =============================================================================

-- Required extensions (idempotent)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- =============================================================================
-- 1. get_progress_overview(p_user_id, p_time_range)
-- =============================================================================
-- Returns radar (current + previous period), per-metric trend with sparkline,
-- and high-level counts. Periods: '7d' | '30d' | '90d' | 'all'.
--
-- Normalization assumptions (all returned 0-100):
--   wpm           : 100 - (abs(avg_wpm - mentor_ideal_wpm_mid) / 60) * 100, clamped
--   clarity       : avg(clarity_score) [already 0-100]
--   energy        : avg(energy_variance_score)
--   pause         : avg(pause_mastery_score)
--   vocab         : avg(vocabulary_depth_score)
--   filler_control: 100 - min(100, filler_density_per_min * 10)

create or replace function public.get_progress_overview(
  p_user_id uuid,
  p_time_range text default '30d'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days        int;
  v_now         timestamptz := now();
  v_curr_start  timestamptz;
  v_prev_start  timestamptz;
  v_mentor_wpm  numeric := 130;  -- fallback midpoint
  v_curr        record;
  v_prev        record;
  v_metrics     jsonb := '{}'::jsonb;
  v_best        record;
  v_drills      int;
  v_sparks      jsonb := '{}'::jsonb;
  v_metric      text;
  v_spark       jsonb;
begin
  -- 1. Resolve window
  v_days := case p_time_range
    when '7d'  then 7
    when '30d' then 30
    when '90d' then 90
    when 'all' then 3650
    else 30
  end;

  v_curr_start := v_now - make_interval(days => v_days);
  v_prev_start := v_now - make_interval(days => v_days * 2);

  -- 2. Mentor ideal WPM midpoint (best matched mentor for this user)
  select coalesce((s.ideal_wpm_min + s.ideal_wpm_max) / 2.0, 130)
  into v_mentor_wpm
  from public.profiles p
  left join public.speakers s on s.id = p.preferred_mentor_id
  where p.id = p_user_id;

  -- 3. Aggregate current period
  select
    avg(a.wpm)                            as avg_wpm,
    avg(a.clarity_score)                  as avg_clarity,
    avg(a.energy_variance_score)          as avg_energy,
    avg(a.pause_mastery_score)            as avg_pause,
    avg(a.vocabulary_depth_score)         as avg_vocab,
    avg(a.filler_density_per_min)         as avg_filler,
    avg(a.overall_score)                  as avg_overall,
    count(*)                              as n,
    coalesce(sum(r.duration_seconds), 0)  as total_seconds
  into v_curr
  from public.analyses a
  join public.recordings r on r.id = a.recording_id
  where r.user_id = p_user_id
    and a.created_at >= v_curr_start;

  -- 4. Aggregate previous period
  select
    avg(a.wpm)                    as avg_wpm,
    avg(a.clarity_score)          as avg_clarity,
    avg(a.energy_variance_score)  as avg_energy,
    avg(a.pause_mastery_score)    as avg_pause,
    avg(a.vocabulary_depth_score) as avg_vocab,
    avg(a.filler_density_per_min) as avg_filler
  into v_prev
  from public.analyses a
  join public.recordings r on r.id = a.recording_id
  where r.user_id = p_user_id
    and a.created_at >= v_prev_start
    and a.created_at <  v_curr_start;

  -- 5. Per-metric trend with sparkline (daily averages, oldest -> newest)
  for v_metric in select unnest(array['wpm','clarity','energy','pause','vocab','filler'])
  loop
    select coalesce(jsonb_agg(daily.avg_val order by daily.day), '[]'::jsonb)
    into v_spark
    from (
      select
        date_trunc('day', a.created_at) as day,
        round(avg(
          case v_metric
            when 'wpm'     then a.wpm
            when 'clarity' then a.clarity_score
            when 'energy'  then a.energy_variance_score
            when 'pause'   then a.pause_mastery_score
            when 'vocab'   then a.vocabulary_depth_score
            when 'filler'  then a.filler_density_per_min
          end
        )::numeric, 2) as avg_val
      from public.analyses a
      join public.recordings r on r.id = a.recording_id
      where r.user_id = p_user_id
        and a.created_at >= v_curr_start
      group by 1
    ) daily;
    v_sparks := v_sparks || jsonb_build_object(v_metric, v_spark);
  end loop;

  -- 6. Best score in period
  select a.overall_score as value, a.created_at::date as date, a.recording_id
  into v_best
  from public.analyses a
  join public.recordings r on r.id = a.recording_id
  where r.user_id = p_user_id
    and a.created_at >= v_curr_start
  order by a.overall_score desc nulls last
  limit 1;

  -- 7. Drills completed in period
  select count(*) into v_drills
  from public.drill_completions dc
  where dc.user_id = p_user_id
    and dc.completed_at >= v_curr_start;

  -- 8. Build metrics_trend object
  v_metrics := jsonb_build_object(
    'wpm', jsonb_build_object(
      'current_avg',    round(coalesce(v_curr.avg_wpm, 0)::numeric, 1),
      'previous_avg',   round(coalesce(v_prev.avg_wpm, 0)::numeric, 1),
      'delta_percent',  pct_delta(v_curr.avg_wpm, v_prev.avg_wpm),
      'sparkline',      v_sparks->'wpm'
    ),
    'clarity', jsonb_build_object(
      'current_avg',    round(coalesce(v_curr.avg_clarity, 0)::numeric, 1),
      'previous_avg',   round(coalesce(v_prev.avg_clarity, 0)::numeric, 1),
      'delta_percent',  pct_delta(v_curr.avg_clarity, v_prev.avg_clarity),
      'sparkline',      v_sparks->'clarity'
    ),
    'energy', jsonb_build_object(
      'current_avg',    round(coalesce(v_curr.avg_energy, 0)::numeric, 1),
      'previous_avg',   round(coalesce(v_prev.avg_energy, 0)::numeric, 1),
      'delta_percent',  pct_delta(v_curr.avg_energy, v_prev.avg_energy),
      'sparkline',      v_sparks->'energy'
    ),
    'pause', jsonb_build_object(
      'current_avg',    round(coalesce(v_curr.avg_pause, 0)::numeric, 1),
      'previous_avg',   round(coalesce(v_prev.avg_pause, 0)::numeric, 1),
      'delta_percent',  pct_delta(v_curr.avg_pause, v_prev.avg_pause),
      'sparkline',      v_sparks->'pause'
    ),
    'vocab', jsonb_build_object(
      'current_avg',    round(coalesce(v_curr.avg_vocab, 0)::numeric, 1),
      'previous_avg',   round(coalesce(v_prev.avg_vocab, 0)::numeric, 1),
      'delta_percent',  pct_delta(v_curr.avg_vocab, v_prev.avg_vocab),
      'sparkline',      v_sparks->'vocab'
    ),
    'filler_density', jsonb_build_object(
      'current_avg',    round(coalesce(v_curr.avg_filler, 0)::numeric, 2),
      'previous_avg',   round(coalesce(v_prev.avg_filler, 0)::numeric, 2),
      'delta_percent',  pct_delta(v_curr.avg_filler, v_prev.avg_filler),
      'sparkline',      v_sparks->'filler'
    )
  );

  return jsonb_build_object(
    'skill_radar_current', jsonb_build_object(
      'wpm',            normalize_wpm(v_curr.avg_wpm, v_mentor_wpm),
      'clarity',        round(coalesce(v_curr.avg_clarity, 0)::numeric, 1),
      'energy',         round(coalesce(v_curr.avg_energy, 0)::numeric, 1),
      'pause',          round(coalesce(v_curr.avg_pause, 0)::numeric, 1),
      'vocab',          round(coalesce(v_curr.avg_vocab, 0)::numeric, 1),
      'filler_control', greatest(0, 100 - least(100, coalesce(v_curr.avg_filler, 0) * 10))
    ),
    'skill_radar_previous', jsonb_build_object(
      'wpm',            normalize_wpm(v_prev.avg_wpm, v_mentor_wpm),
      'clarity',        round(coalesce(v_prev.avg_clarity, 0)::numeric, 1),
      'energy',         round(coalesce(v_prev.avg_energy, 0)::numeric, 1),
      'pause',          round(coalesce(v_prev.avg_pause, 0)::numeric, 1),
      'vocab',          round(coalesce(v_prev.avg_vocab, 0)::numeric, 1),
      'filler_control', greatest(0, 100 - least(100, coalesce(v_prev.avg_filler, 0) * 10))
    ),
    'metrics_trend',         v_metrics,
    'session_count',         coalesce(v_curr.n, 0),
    'minutes_spoken',        round((coalesce(v_curr.total_seconds, 0) / 60.0)::numeric, 1),
    'drills_completed',      coalesce(v_drills, 0),
    'avg_overall_score',     round(coalesce(v_curr.avg_overall, 0)::numeric, 1),
    'best_score_in_period',  case
      when v_best.value is null then null
      else jsonb_build_object(
        'value',        v_best.value,
        'date',         v_best.date,
        'recording_id', v_best.recording_id
      )
    end
  );
end;
$$;

-- Helper: percentage delta (curr vs prev), guarded against null/zero
create or replace function public.pct_delta(curr numeric, prev numeric)
returns numeric language sql immutable as $$
  select case
    when prev is null or prev = 0 then 0
    else round(((curr - prev) / prev * 100.0)::numeric, 1)
  end;
$$;

-- Helper: WPM normalized to 0-100 against mentor midpoint (60 wpm = 0)
create or replace function public.normalize_wpm(avg_wpm numeric, mentor_mid numeric)
returns numeric language sql immutable as $$
  select case
    when avg_wpm is null then 0
    else greatest(0, round((100 - (abs(avg_wpm - mentor_mid) / 60.0) * 100)::numeric, 1))
  end;
$$;

-- =============================================================================
-- 2. get_activity_heatmap(p_user_id, p_days)
-- =============================================================================

create or replace function public.get_activity_heatmap(
  p_user_id uuid,
  p_days int default 90
)
returns table (
  date          date,
  sessions_count int,
  avg_score     numeric,
  drills_count  int
)
language sql
stable
security definer
set search_path = public
as $$
  with days as (
    select generate_series(
      (current_date - make_interval(days => p_days - 1))::date,
      current_date,
      '1 day'::interval
    )::date as d
  ),
  sessions as (
    select
      r.created_at::date as d,
      count(*)::int      as n,
      avg(a.overall_score)::numeric as avg_s
    from public.recordings r
    left join public.analyses a on a.recording_id = r.id
    where r.user_id = p_user_id
      and r.created_at >= current_date - make_interval(days => p_days - 1)
    group by 1
  ),
  drills as (
    select
      dc.completed_at::date as d,
      count(*)::int         as n
    from public.drill_completions dc
    where dc.user_id = p_user_id
      and dc.completed_at >= current_date - make_interval(days => p_days - 1)
    group by 1
  )
  select
    days.d                                     as date,
    coalesce(sessions.n, 0)                    as sessions_count,
    round(coalesce(sessions.avg_s, 0), 1)      as avg_score,
    coalesce(drills.n, 0)                      as drills_count
  from days
  left join sessions on sessions.d = days.d
  left join drills   on drills.d   = days.d
  order by days.d;
$$;

-- =============================================================================
-- 3. get_before_after_comparison(p_recording_a_id, p_recording_b_id, p_user_id)
-- =============================================================================

create or replace function public.get_before_after_comparison(
  p_recording_a_id uuid,
  p_recording_b_id uuid,
  p_user_id        uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_a record;
  v_b record;
begin
  select r.id, r.created_at, r.duration_seconds, a.*
  into v_a
  from public.recordings r
  join public.analyses a on a.recording_id = r.id
  where r.id = p_recording_a_id and r.user_id = p_user_id;

  if v_a.id is null then
    raise exception 'Recording A not found or not owned by user';
  end if;

  select r.id, r.created_at, r.duration_seconds, a.*
  into v_b
  from public.recordings r
  join public.analyses a on a.recording_id = r.id
  where r.id = p_recording_b_id and r.user_id = p_user_id;

  if v_b.id is null then
    raise exception 'Recording B not found or not owned by user';
  end if;

  return jsonb_build_object(
    'before', jsonb_build_object(
      'recording_id', v_a.id,
      'date',         v_a.created_at,
      'duration_seconds', v_a.duration_seconds,
      'overall_score',     v_a.overall_score,
      'wpm',               v_a.wpm,
      'clarity_score',     v_a.clarity_score,
      'energy_variance_score', v_a.energy_variance_score,
      'pause_mastery_score',   v_a.pause_mastery_score,
      'vocabulary_depth_score', v_a.vocabulary_depth_score,
      'filler_density_per_min', v_a.filler_density_per_min
    ),
    'after', jsonb_build_object(
      'recording_id', v_b.id,
      'date',         v_b.created_at,
      'duration_seconds', v_b.duration_seconds,
      'overall_score',     v_b.overall_score,
      'wpm',               v_b.wpm,
      'clarity_score',     v_b.clarity_score,
      'energy_variance_score', v_b.energy_variance_score,
      'pause_mastery_score',   v_b.pause_mastery_score,
      'vocabulary_depth_score', v_b.vocabulary_depth_score,
      'filler_density_per_min', v_b.filler_density_per_min
    ),
    'deltas', jsonb_build_object(
      'overall_score',           v_b.overall_score - v_a.overall_score,
      'wpm',                     v_b.wpm - v_a.wpm,
      'clarity_score',           v_b.clarity_score - v_a.clarity_score,
      'energy_variance_score',   v_b.energy_variance_score - v_a.energy_variance_score,
      'pause_mastery_score',     v_b.pause_mastery_score - v_a.pause_mastery_score,
      'vocabulary_depth_score',  v_b.vocabulary_depth_score - v_a.vocabulary_depth_score,
      'filler_density_per_min',  v_b.filler_density_per_min - v_a.filler_density_per_min
    )
  );
end;
$$;

-- =============================================================================
-- 4. Extended analyses INSERT trigger
-- =============================================================================
-- Assumes existing v1 trigger handles XP/streaks. This adds:
--   - upsert progress_snapshots for today
--   - personal_records: replace if broken, log to achievements_log
--   - user_goals: bump current_value, mark achieved if threshold met

create or replace function public.handle_analysis_insert_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid;
  v_today     date := current_date;
  v_record    record;
  v_metric    text;
  v_value     numeric;
  v_prev_best numeric;
  v_goal      record;
begin
  -- Resolve user
  select r.user_id into v_user_id
  from public.recordings r
  where r.id = new.recording_id;

  if v_user_id is null then
    return new;
  end if;

  -- 1. Upsert progress_snapshots for today
  insert into public.progress_snapshots (
    user_id, snapshot_date,
    sessions_count, total_seconds,
    avg_overall_score, avg_wpm, avg_clarity_score,
    avg_energy_variance_score, avg_pause_mastery_score,
    avg_vocabulary_depth_score, avg_filler_density_per_min
  )
  select
    v_user_id, v_today,
    count(*),
    coalesce(sum(r.duration_seconds), 0),
    avg(a.overall_score),
    avg(a.wpm),
    avg(a.clarity_score),
    avg(a.energy_variance_score),
    avg(a.pause_mastery_score),
    avg(a.vocabulary_depth_score),
    avg(a.filler_density_per_min)
  from public.analyses a
  join public.recordings r on r.id = a.recording_id
  where r.user_id = v_user_id
    and a.created_at::date = v_today
  on conflict (user_id, snapshot_date) do update
  set sessions_count                = excluded.sessions_count,
      total_seconds                 = excluded.total_seconds,
      avg_overall_score             = excluded.avg_overall_score,
      avg_wpm                       = excluded.avg_wpm,
      avg_clarity_score             = excluded.avg_clarity_score,
      avg_energy_variance_score     = excluded.avg_energy_variance_score,
      avg_pause_mastery_score       = excluded.avg_pause_mastery_score,
      avg_vocabulary_depth_score    = excluded.avg_vocabulary_depth_score,
      avg_filler_density_per_min    = excluded.avg_filler_density_per_min,
      updated_at                    = now();

  -- 2. Personal records — iterate metrics
  for v_metric, v_value in
    select * from (values
      ('overall_score',        new.overall_score),
      ('wpm',                  new.wpm),
      ('clarity_score',        new.clarity_score),
      ('energy_variance_score',new.energy_variance_score),
      ('pause_mastery_score',  new.pause_mastery_score),
      ('vocabulary_depth_score', new.vocabulary_depth_score)
    ) as t(m, v)
  loop
    if v_value is null then continue; end if;

    select value into v_prev_best
    from public.personal_records
    where user_id = v_user_id and metric = v_metric;

    if v_prev_best is null or v_value > v_prev_best then
      insert into public.personal_records (user_id, metric, value, recording_id, achieved_at)
      values (v_user_id, v_metric, v_value, new.recording_id, now())
      on conflict (user_id, metric) do update
      set value        = excluded.value,
          recording_id = excluded.recording_id,
          achieved_at  = excluded.achieved_at;

      insert into public.achievements_log (user_id, kind, ref_id, payload, created_at)
      values (
        v_user_id, 'personal_record', new.recording_id,
        jsonb_build_object('metric', v_metric, 'value', v_value, 'previous', v_prev_best),
        now()
      );
    end if;
  end loop;

  -- Lower-is-better: filler density
  if new.filler_density_per_min is not null then
    select value into v_prev_best
    from public.personal_records
    where user_id = v_user_id and metric = 'filler_density_per_min';

    if v_prev_best is null or new.filler_density_per_min < v_prev_best then
      insert into public.personal_records (user_id, metric, value, recording_id, achieved_at)
      values (v_user_id, 'filler_density_per_min', new.filler_density_per_min, new.recording_id, now())
      on conflict (user_id, metric) do update
      set value        = excluded.value,
          recording_id = excluded.recording_id,
          achieved_at  = excluded.achieved_at;

      insert into public.achievements_log (user_id, kind, ref_id, payload, created_at)
      values (
        v_user_id, 'personal_record', new.recording_id,
        jsonb_build_object('metric', 'filler_density_per_min', 'value', new.filler_density_per_min, 'previous', v_prev_best),
        now()
      );
    end if;
  end if;

  -- 3. User goals — bump current_value, mark achieved
  for v_goal in
    select id, target_metric, target_value, current_value, status, title
    from public.user_goals
    where user_id = v_user_id and status = 'active'
  loop
    -- Resolve current value for this goal's metric
    declare v_new_val numeric;
    begin
      v_new_val := case v_goal.target_metric
        when 'overall_score'           then new.overall_score
        when 'wpm'                     then new.wpm
        when 'clarity_score'           then new.clarity_score
        when 'energy_variance_score'   then new.energy_variance_score
        when 'pause_mastery_score'     then new.pause_mastery_score
        when 'vocabulary_depth_score'  then new.vocabulary_depth_score
        when 'filler_density_per_min'  then new.filler_density_per_min
        when 'session_count'           then v_goal.current_value + 1
        else null
      end;

      if v_new_val is null then continue; end if;

      -- For score-style metrics goals track the best; for session_count it accumulates
      if v_goal.target_metric = 'session_count' then
        update public.user_goals
        set current_value = v_new_val, updated_at = now()
        where id = v_goal.id;
      else
        update public.user_goals
        set current_value = greatest(coalesce(current_value, 0), v_new_val), updated_at = now()
        where id = v_goal.id;
      end if;

      -- Achieved?
      if v_new_val >= v_goal.target_value then
        update public.user_goals
        set status = 'achieved', achieved_at = now(), updated_at = now()
        where id = v_goal.id and status = 'active';

        insert into public.achievements_log (user_id, kind, ref_id, payload, created_at)
        values (
          v_user_id, 'goal_achieved', v_goal.id,
          jsonb_build_object('title', v_goal.title, 'metric', v_goal.target_metric, 'value', v_new_val),
          now()
        );

        insert into public.notifications (user_id, kind, title, body, payload, created_at)
        values (
          v_user_id, 'goal_achieved',
          'Goal achieved',
          v_goal.title,
          jsonb_build_object('goal_id', v_goal.id),
          now()
        );
      end if;
    end;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_analyses_progress on public.analyses;
create trigger trg_analyses_progress
after insert on public.analyses
for each row execute function public.handle_analysis_insert_progress();

-- =============================================================================
-- 5. pg_cron schedule
-- =============================================================================
-- Replace <PROJECT_REF> and <SERVICE_ROLE_KEY> via Vault before applying.
-- Stored once: `select vault.create_secret('<key>', 'service_role_key')`.

-- detect-stagnation : daily at 06:00 UTC
select cron.schedule(
  'detect-stagnation-daily',
  '0 6 * * *',
  $cron$
  select net.http_post(
    url     := current_setting('app.functions_base_url') || '/detect-stagnation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $cron$
);

-- generate-weekly-review : Sundays at 23:00 UTC
select cron.schedule(
  'generate-weekly-review',
  '0 23 * * 0',
  $cron$
  select net.http_post(
    url     := current_setting('app.functions_base_url') || '/generate-weekly-review',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $cron$
);

-- generate-daily-insight : daily at 05:00 UTC
select cron.schedule(
  'generate-daily-insight',
  '0 5 * * *',
  $cron$
  select net.http_post(
    url     := current_setting('app.functions_base_url') || '/generate-daily-insight',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $cron$
);

-- Set these once per environment (run as superuser):
-- alter database postgres set app.functions_base_url = 'https://<PROJECT_REF>.supabase.co/functions/v1';
-- alter database postgres set app.service_role_key   = '<SERVICE_ROLE_KEY>';
