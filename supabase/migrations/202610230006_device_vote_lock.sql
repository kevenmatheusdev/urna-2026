-- Um envio por identificador aleatório persistido no navegador.
-- O fingerprint HMAC é mantido separado da tabela de votos e não expira.
create table if not exists public.vote_device_limits (
  device_fingerprint text primary key check (device_fingerprint ~ '^[a-f0-9]{64}$'),
  first_vote_at timestamptz not null default now()
);

alter table public.vote_device_limits enable row level security;
revoke all on public.vote_device_limits from public, anon, authenticated;

create or replace function public.submit_simulation_vote_by_device(
  p_device_fingerprint text,
  p_choice text,
  p_state text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted text;
begin
  if p_choice not in ('22', '13', 'B', 'N') then
    raise exception 'invalid_choice' using errcode = '22023';
  end if;
  if p_device_fingerprint is null or p_device_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_device_fingerprint' using errcode = '22023';
  end if;
  if p_state is not null and length(p_state) > 80 then
    raise exception 'invalid_state' using errcode = '22023';
  end if;

  insert into public.vote_device_limits(device_fingerprint)
  values (p_device_fingerprint)
  on conflict (device_fingerprint) do nothing
  returning device_fingerprint into v_inserted;

  if v_inserted is null then
    return jsonb_build_object('accepted', false);
  end if;

  insert into public.simulation_votes(choice, state)
  values (p_choice, nullif(p_state, ''));
  return jsonb_build_object('accepted', true);
end;
$$;

revoke all on function public.submit_simulation_vote_by_device(text, text, text) from public, anon, authenticated;
grant execute on function public.submit_simulation_vote_by_device(text, text, text) to service_role;
