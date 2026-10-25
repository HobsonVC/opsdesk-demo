create or replace function public.dashboard_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with
  bounds as (
    select now() as t_now, now() - interval '30 days' as t_30, now() - interval '60 days' as t_60, now() - interval '84 days' as t_84
  ),
  windows as (
    select
      case when r.created_at >= b.t_30 then 'cur' when r.created_at >= b.t_60 then 'prev' end as win,
      r.*
    from public.requests r, bounds b
    where r.created_at >= b.t_60
  ),
  kpi as (
    select
      count(*) filter (where win = 'cur') as total_cur,
      count(*) filter (where win = 'prev') as total_prev,
      count(*) filter (where win = 'cur' and status = 'approved') as approved_cur,
      count(*) filter (where win = 'cur' and status <> 'pending') as decided_cur,
      count(*) filter (where win = 'prev' and status = 'approved') as approved_prev,
      count(*) filter (where win = 'prev' and status <> 'pending') as decided_prev,
      avg(extract(epoch from decided_at - created_at) / 3600) filter (where win = 'cur' and decided_at is not null) as turnaround_cur,
      avg(extract(epoch from decided_at - created_at) / 3600) filter (where win = 'prev' and decided_at is not null) as turnaround_prev
    from windows
  ),
  pending as (
    select
      count(*) as pending_now,
      count(*) filter (where created_at < now() - interval '24 hours') as pending_over_24h,
      count(*) filter (where created_at >= now() - interval '30 days') as pending_new_cur
    from public.requests
    where status = 'pending'
  ),
  weeks as (
    select
      gs as idx,
      b.t_now - make_interval(days => (12 - gs) * 7) as w_end,
      b.t_now - make_interval(days => (13 - gs) * 7) as w_start
    from bounds b, generate_series(1, 12) gs
  ),
  weekly as (
    select
      w.idx, w.w_start, w.w_end,
      count(r.id) as total,
      count(r.id) filter (where r.status = 'approved') as approved
    from weeks w
    left join public.requests r on r.created_at > w.w_start and r.created_at <= w.w_end
    group by w.idx, w.w_start, w.w_end
  ),
  recent_window as (
    select r.* from public.requests r, bounds b where r.created_at >= b.t_84
  ),
  by_team as (
    select
      team,
      count(*) as total,
      count(*) filter (where status = 'approved') as approved,
      count(*) filter (where status = 'rejected') as rejected,
      count(*) filter (where status = 'pending') as pending
    from recent_window
    group by team
  ),
  status as (
    select
      count(*) filter (where status = 'approved') as approved,
      count(*) filter (where status = 'rejected') as rejected,
      count(*) filter (where status = 'pending') as pending
    from recent_window
  ),
  activity as (
    select e.id, e.action, e.note, e.created_at, p.full_name as actor, r.id as request_id, r.ref, r.title, r.type
    from public.request_events e
    join public.requests r on r.id = e.request_id
    join public.profiles p on p.id = e.actor_id
    order by e.created_at desc
    limit 8
  )
  select jsonb_build_object(
    'generated_at', now(),
    'kpis', (
      select jsonb_build_object(
        'total_cur', k.total_cur,
        'total_prev', k.total_prev,
        'approval_rate_cur', case when k.decided_cur > 0 then k.approved_cur::float / k.decided_cur end,
        'approval_rate_prev', case when k.decided_prev > 0 then k.approved_prev::float / k.decided_prev end,
        'turnaround_cur', k.turnaround_cur,
        'turnaround_prev', k.turnaround_prev,
        'pending_now', p.pending_now,
        'pending_over_24h', p.pending_over_24h
      )
      from kpi k, pending p
    ),
    'weekly', (
      select coalesce(jsonb_agg(jsonb_build_object('start', w_start, 'end', w_end, 'total', total, 'approved', approved) order by idx), '[]'::jsonb)
      from weekly
    ),
    'by_team', (
      select coalesce(jsonb_agg(jsonb_build_object('team', team, 'total', total, 'approved', approved, 'rejected', rejected, 'pending', pending) order by total desc), '[]'::jsonb)
      from by_team
    ),
    'status', (select to_jsonb(s) from status s),
    'recent', (
      select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb)
      from activity a
    )
  );
$$;

grant execute on function public.dashboard_stats() to authenticated;
