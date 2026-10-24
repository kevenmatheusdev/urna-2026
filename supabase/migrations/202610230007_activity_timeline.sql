-- Totais públicos por hora, sem escolha, estado ou identificador individual.
create or replace function public.get_simulation_results()
returns jsonb language sql stable security definer set search_path = '' as $$
  with ufs(uf, name) as (
    values ('AC','Acre'),('AL','Alagoas'),('AP','Amapá'),('AM','Amazonas'),
      ('BA','Bahia'),('CE','Ceará'),('DF','Distrito Federal'),('ES','Espírito Santo'),
      ('GO','Goiás'),('MA','Maranhão'),('MT','Mato Grosso'),('MS','Mato Grosso do Sul'),
      ('MG','Minas Gerais'),('PA','Pará'),('PB','Paraíba'),('PR','Paraná'),
      ('PE','Pernambuco'),('PI','Piauí'),('RJ','Rio de Janeiro'),
      ('RN','Rio Grande do Norte'),('RS','Rio Grande do Sul'),('RO','Rondônia'),
      ('RR','Roraima'),('SC','Santa Catarina'),('SP','São Paulo'),
      ('SE','Sergipe'),('TO','Tocantins')
  ), state_totals as (
    select ufs.uf,
      count(*) filter (where v.choice = '22') as votes22,
      count(*) filter (where v.choice = '13') as votes13
    from ufs
    left join public.simulation_votes v
      on (lower(btrim(v.state)) = lower(ufs.name) or upper(btrim(v.state)) = ufs.uf)
      and v.choice in ('22','13')
    group by ufs.uf
  ), hourly as (
    select date_trunc('hour', created_at) as hour,
      count(*) filter (where choice = '22') as votes22,
      count(*) filter (where choice = '13') as votes13
    from public.simulation_votes
    where not is_demo and created_at >= now() - interval '24 hours'
    group by 1
  ), activity_hours as (
    select date_trunc('hour', created_at at time zone 'America/Sao_Paulo') as hour,
      count(*) as total
    from public.simulation_votes
    where not is_demo
      and created_at >= (date_trunc('hour', now() at time zone 'America/Sao_Paulo') - interval '11 hours') at time zone 'America/Sao_Paulo'
      and created_at <= now()
    group by 1
  ), activity as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'hour', buckets.hour at time zone 'America/Sao_Paulo',
      'total', coalesce(activity_hours.total, 0)
    ) order by buckets.hour desc), '[]'::jsonb) as points
    from (
      select date_trunc('hour', now() at time zone 'America/Sao_Paulo') - make_interval(hours => n) as hour
      from generate_series(0, 11) as n
    ) buckets
    left join activity_hours on activity_hours.hour = buckets.hour
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
    'timeline', (select points from timeline),
    'activity', (select points from activity),
    'states', (select jsonb_agg(jsonb_build_object(
      'state', uf, 'votes22', votes22, 'votes13', votes13
    ) order by uf) from state_totals)
  ) from public.simulation_votes;
$$;

revoke all on function public.get_simulation_results() from public, anon, authenticated;
grant execute on function public.get_simulation_results() to service_role;
