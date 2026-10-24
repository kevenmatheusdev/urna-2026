-- Adiciona as últimas 24 horas de votos reais ao placar compartilhado.
create or replace function public.get_simulation_results()
returns jsonb language sql stable security definer set search_path = '' as $$
  with hourly as (
    select date_trunc('hour', created_at) as hour,
      count(*) filter (where choice = '22') as votes22,
      count(*) filter (where choice = '13') as votes13
    from public.simulation_votes
    where not is_demo and created_at >= now() - interval '24 hours'
    group by 1
  ), timeline as (
    select jsonb_agg(jsonb_build_object(
      'hour', buckets.hour,
      'votes22', coalesce(hourly.votes22, 0),
      'votes13', coalesce(hourly.votes13, 0)
    ) order by buckets.hour) as points
    from (select date_trunc('hour', now()) - make_interval(hours => n) as hour
          from generate_series(23, 0, -1) as n) buckets
    left join hourly on hourly.hour = buckets.hour
  )
  select jsonb_build_object(
    'total', count(*),
    'recent_five_minutes', count(*) filter (where not is_demo and created_at >= now() - interval '5 minutes'),
    'counts', jsonb_build_object(
      '22', count(*) filter (where choice = '22'),
      '13', count(*) filter (where choice = '13'),
      'B', count(*) filter (where choice = 'B'),
      'N', count(*) filter (where choice = 'N')
    ),
    'demo_votes', count(*) filter (where is_demo),
    'timeline', (select points from timeline)
  ) from public.simulation_votes;
$$;

revoke all on function public.get_simulation_results() from public, anon, authenticated;
grant execute on function public.get_simulation_results() to service_role;
