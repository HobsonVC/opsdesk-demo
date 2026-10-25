alter table public.requests
  add column ref integer generated always as identity (start with 1001);

create unique index requests_ref_idx on public.requests (ref);

create or replace function public.reset_demo_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_manager uuid;
  v_maria uuid;
  v_week int;
  v_weeks constant int := 12;
  v_count int;
  v_i int;
  v_created timestamptz;
  v_age interval;
  v_creator uuid;
  v_creator_name text;
  v_team text;
  v_type text;
  v_title text;
  v_details text;
  v_amount numeric;
  v_status text;
  v_decided timestamptz;
  v_pending_odds float;
  v_request uuid;
  v_peer text;
  v_r float;
  v_total int := 0;
  v_overtime text[] := array[
    'OT request – Saturday coverage', 'OT request – Sunday coverage', 'OT – Monday backlog clear-down',
    'Extra 2h after shift – queue spike', 'OT request – holiday peak cover', 'OT – night shift gap',
    'Extend shift – chat queue overflow', 'OT request – launch week support'
  ];
  v_overtime_details text[] := array[
    'Queue is forecast above SLA for the weekend. Can cover 4 hours.',
    'Two agents out sick on my team; happy to pick up the extra hours.',
    'Backlog of 60+ tickets from the weekend, need extra time to clear it.',
    'Promo goes live and volume is expected to double. Requesting 3h OT.'
  ];
  v_equipment text[] := array[
    'Replacement headset', 'Headset mic not working', 'Second monitor', 'Laptop battery replacement',
    'Ergonomic chair', 'Keyboard – keys sticking', 'Webcam for video support', 'Docking station'
  ];
  v_equipment_details text[] := array[
    'Customers report they can''t hear me clearly. Current headset is 3 years old.',
    'Working across CRM and knowledge base all day, a second screen would help.',
    'Battery drains in under an hour, laptop has to stay plugged in.',
    'Back pain after long shifts, current chair has a broken lever.'
  ];
  v_other text[] := array[
    'Training slot – QA calibration', 'Access request – billing admin view', 'WFH day – internet outage at office',
    'Course budget – de-escalation workshop', 'Access request – refunds dashboard', 'Leave note – medical appointment'
  ];
  v_reject_notes text[] := array[
    'Coverage is already full that day.', 'Please raise this through the IT ticket portal instead.',
    'Over the monthly OT budget for the team, let''s revisit next month.',
    'Refund falls outside the 30-day policy window.', 'Swap would leave the early shift short.',
    'Need a manager note from your team lead first.'
  ];
  v_comments text[] := array[
    'Checked the roster, looks fine.', 'Can you add the order number?', 'Added screenshot of the issue in the ticket.',
    'Team lead is OK with this.', 'Following up on this one.', 'IT confirmed stock is available.'
  ];
begin
  select id into v_manager from public.profiles where role = 'manager' order by created_at limit 1;
  select id into v_maria from public.profiles where full_name = 'Maria Santos' limit 1;
  if v_manager is null then
    raise exception 'No manager profile found. Run scripts/seed-users.ts first.';
  end if;

  truncate public.request_events, public.requests restart identity;

  for v_week in reverse (v_weeks - 1)..0 loop
    v_count := round(18 + (v_weeks - 1 - v_week) * 2.0 + (random() - 0.5) * 5)::int;

    for v_i in 1..v_count loop
      v_created := date_trunc('day', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila'
        - make_interval(days => v_week * 7 + floor(random() * 7)::int)
        + make_interval(mins => (8 * 60 + floor(random() * 12 * 60))::int);
      if v_created > now() - interval '20 minutes' then
        v_created := now() - make_interval(mins => (20 + floor(random() * 300))::int);
      end if;

      if v_maria is not null and v_i = 1 then
        v_creator := v_maria;
      else
        v_r := random();
        v_team := case when v_r < 0.35 then 'Alpha' when v_r < 0.63 then 'Bravo' when v_r < 0.85 then 'Charlie' else 'Delta' end;
        select id into v_creator from public.profiles
          where role = 'agent' and team = v_team and id <> coalesce(v_maria, '00000000-0000-0000-0000-000000000000')
          order by random() limit 1;
      end if;
      select full_name into v_creator_name from public.profiles where id = v_creator;

      v_r := random();
      v_type := case
        when v_r < 0.35 then 'overtime'
        when v_r < 0.60 then 'schedule_swap'
        when v_r < 0.80 then 'equipment'
        when v_r < 0.95 then 'refund_approval'
        else 'other' end;

      v_amount := null;
      case v_type
        when 'overtime' then
          v_title := v_overtime[1 + floor(random() * array_length(v_overtime, 1))::int];
          v_details := v_overtime_details[1 + floor(random() * array_length(v_overtime_details, 1))::int];
        when 'equipment' then
          v_title := v_equipment[1 + floor(random() * array_length(v_equipment, 1))::int];
          v_details := v_equipment_details[1 + floor(random() * array_length(v_equipment_details, 1))::int];
          v_amount := round((25 + random() * 320)::numeric, 0);
        when 'schedule_swap' then
          select left(split_part(full_name, ' ', 1), 1) || '. ' || split_part(full_name, ' ', 2) into v_peer
            from public.profiles where role = 'agent' and id <> v_creator order by random() limit 1;
          v_title := 'Swap shift with ' || v_peer
            || case when random() < 0.5 then '' else ' – ' || to_char(v_created + make_interval(days => 2 + floor(random() * 6)::int), 'Dy DD Mon') end;
          v_details := 'Both agreed. ' || v_peer || ' takes my shift and I cover theirs later in the week.';
        when 'refund_approval' then
          v_title := 'Refund approval – order #' || (40000 + floor(random() * 9999))::int;
          v_details := case floor(random() * 3)::int
            when 0 then 'Item arrived damaged, customer sent photos.'
            when 1 then 'Double charge on the customer''s card, confirmed in billing.'
            else 'Service outage affected the customer for 3 days, goodwill refund.' end;
          v_amount := round((15 + random() * 465)::numeric, 2);
        else
          v_title := v_other[1 + floor(random() * array_length(v_other, 1))::int];
          v_details := 'Details discussed with team lead.';
      end case;

      v_age := now() - v_created;
      v_pending_odds := case
        when v_age < interval '3 days' then 0.9
        when v_age < interval '10 days' then 0.55
        when v_age < interval '21 days' then 0.15
        else 0 end;

      v_decided := v_created + make_interval(secs => (3600 * exp(ln(9.5 - 3.0 * (v_weeks - 1 - v_week)::float / (v_weeks - 1)) + 0.6 * sqrt(-2 * ln(1 - random())) * cos(2 * pi() * random()))));
      if random() < v_pending_odds or v_decided > now() - interval '5 minutes' then
        v_status := 'pending';
        v_decided := null;
      elsif random() < 0.18 then
        v_status := 'rejected';
      else
        v_status := 'approved';
      end if;

      insert into public.requests (created_by, team, type, title, details, amount, needed_on, status, decided_by, decided_at, created_at)
      values (
        v_creator, '', v_type, v_title, v_details, v_amount,
        (v_created + make_interval(days => 1 + floor(random() * 10)::int))::date,
        v_status,
        case when v_status = 'pending' then null else v_manager end,
        v_decided,
        v_created
      )
      returning id into v_request;

      insert into public.request_events (request_id, actor_id, action, created_at)
      values (v_request, v_creator, 'created', v_created);

      if random() < 0.22 then
        insert into public.request_events (request_id, actor_id, action, note, created_at)
        values (
          v_request,
          case when random() < 0.5 then v_manager else v_creator end,
          'commented',
          v_comments[1 + floor(random() * array_length(v_comments, 1))::int],
          v_created + (coalesce(v_decided, now()) - v_created) * (0.2 + random() * 0.6)
        );
      end if;

      if v_status <> 'pending' then
        insert into public.request_events (request_id, actor_id, action, note, created_at)
        values (
          v_request, v_manager, v_status,
          case when v_status = 'rejected' then v_reject_notes[1 + floor(random() * array_length(v_reject_notes, 1))::int] end,
          v_decided
        );
      end if;

      v_total := v_total + 1;
    end loop;
  end loop;

  return jsonb_build_object(
    'requests', v_total,
    'pending', (select count(*) from public.requests where status = 'pending'),
    'approved', (select count(*) from public.requests where status = 'approved'),
    'rejected', (select count(*) from public.requests where status = 'rejected')
  );
end;
$$;

revoke all on function public.reset_demo_data() from public, anon, authenticated;
grant execute on function public.reset_demo_data() to service_role;
