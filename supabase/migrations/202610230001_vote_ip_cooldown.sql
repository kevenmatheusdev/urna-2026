-- Voto demonstrativo: um registro por IP protegido em uma janela móvel de 2h.
create table if not exists public.vote_ip_limits (
  ip_fingerprint text primary key,
  last_vote_at timestamptz not null
);

create table if not exists public.simulation_votes (
  id bigint generated always as identity primary key,
  choice text not null check (choice in ('22', '13', 'B', 'N')),
  state text,
  created_at timestamptz not null default now()
);

alter table public.vote_ip_limits enable row level security;
alter table public.simulation_votes enable row level security;
revoke all on public.vote_ip_limits from anon, authenticated;
revoke all on public.simulation_votes from anon, authenticated;
revoke all on sequence public.simulation_votes_id_seq from anon, authenticated;

-- Chamado somente pela Edge Function com a credencial administrativa.
create or replace function public.submit_simulation_vote(
  p_ip_fingerprint text,
  p_choice text,
  p_state text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last timestamptz;
  v_wait integer;
begin
  if p_choice not in ('22', '13', 'B', 'N') then
    raise exception 'invalid_choice' using errcode = '22023';
  end if;
  if p_ip_fingerprint is null or length(p_ip_fingerprint) < 32 then
    raise exception 'invalid_fingerprint' using errcode = '22023';
  end if;

  insert into public.vote_ip_limits(ip_fingerprint, last_vote_at)
  values (p_ip_fingerprint, now())
  on conflict (ip_fingerprint) do update
    set last_vote_at = now()
    where public.vote_ip_limits.last_vote_at <= now() - interval '2 hours'
  returning last_vote_at into v_last;

  if v_last is null then
    select ceil(extract(epoch from (last_vote_at + interval '2 hours' - now())))::integer
      into v_wait from public.vote_ip_limits where ip_fingerprint = p_ip_fingerprint;
    return jsonb_build_object('accepted', false, 'retry_after_seconds', greatest(v_wait, 1));
  end if;

  insert into public.simulation_votes(choice, state) values (p_choice, nullif(p_state, ''));
  return jsonb_build_object('accepted', true);
end;
$$;

revoke all on function public.submit_simulation_vote(text, text, text) from public, anon, authenticated;
grant execute on function public.submit_simulation_vote(text, text, text) to service_role;

create or replace function public.get_simulation_results()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'total', count(*),
    'recent_five_minutes', count(*) filter (where created_at >= now() - interval '5 minutes'),
    'counts', jsonb_build_object(
      '22', count(*) filter (where choice = '22'),
      '13', count(*) filter (where choice = '13'),
      'B', count(*) filter (where choice = 'B'),
      'N', count(*) filter (where choice = 'N')
    )
  ) from public.simulation_votes;
$$;
revoke all on function public.get_simulation_results() from public, anon, authenticated;
grant execute on function public.get_simulation_results() to service_role;
