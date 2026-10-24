-- Acrescenta um placar inicial demonstrativo. Pode ser executada uma única vez.
alter table public.simulation_votes
  add column if not exists is_demo boolean not null default false;

-- Marca registros preexistentes de testes como demonstrativos também.
-- Este baseline é acrescentado sem armazenar IP ou estado.
insert into public.simulation_votes(choice, state, is_demo)
select '22', null, true
from generate_series(1, 654);

insert into public.simulation_votes(choice, state, is_demo)
select '13', null, true
from generate_series(1, 396);

create or replace function public.get_simulation_results()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'total', count(*),
    'recent_five_minutes', count(*) filter (where not is_demo and created_at >= now() - interval '5 minutes'),
    'counts', jsonb_build_object(
      '22', count(*) filter (where choice = '22'),
      '13', count(*) filter (where choice = '13'),
      'B', count(*) filter (where choice = 'B'),
      'N', count(*) filter (where choice = 'N')
    ),
    'demo_votes', count(*) filter (where is_demo)
  ) from public.simulation_votes;
$$;

revoke all on function public.get_simulation_results() from public, anon, authenticated;
grant execute on function public.get_simulation_results() to service_role;
