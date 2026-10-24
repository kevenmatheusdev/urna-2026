-- Redistribui somente a base demonstrativa entre os estados informados.
-- Resultado final: 1.051 votos demonstrativos, 654 para 22 e 397 para 13.
-- Votos reais (is_demo = false) não são alterados.
begin;

delete from public.simulation_votes
where is_demo = true and choice in ('22','13');

with state_groups(state, primary_candidate) as (
  values
    ('Mato Grosso','22'),('Mato Grosso do Sul','22'),('Goiás','22'),
    ('São Paulo','22'),('Rio de Janeiro','22'),('Espírito Santo','22'),
    ('Minas Gerais','22'),('Paraná','22'),('Rio Grande do Sul','22'),
    ('Santa Catarina','22'),('Roraima','22'),('Amapá','22'),
    ('Tocantins','22'),('Rondônia','22'),('Acre','22'),
    ('Maranhão','13'),('Piauí','13'),('Ceará','13'),
    ('Rio Grande do Norte','13'),('Pernambuco','13'),('Paraíba','13'),
    ('Sergipe','13'),('Alagoas','13'),('Bahia','13'),('Amazonas','13'),('Pará','13')
), weighted as (
  select s.state, c.candidate,
    case when s.primary_candidate = c.candidate
      then 3 + mod((hashtext(s.state) & 2147483647), 31)
      else 1 + mod((hashtext(s.state) & 2147483647), 8)
    end as weight
  from state_groups s cross join (values ('22'),('13')) as c(candidate)
), shares as (
  select w.*,
    case when candidate = '22' then 654 else 397 end as target,
    sum(weight) over (partition by candidate) as total_weight
  from weighted w
), bases as (
  select *, floor(target::numeric * weight / total_weight)::int as base_count,
    (target::numeric * weight / total_weight) - floor(target::numeric * weight / total_weight) as remainder
  from shares
), allocations as (
  select candidate, state,
    base_count + case when row_number() over (partition by candidate order by remainder desc, state) <=
      target - sum(base_count) over (partition by candidate) then 1 else 0 end as allocation
  from bases
), seeds as (
  select candidate, state, generate_series(1, allocation) as n
  from allocations
)
insert into public.simulation_votes(choice, state, is_demo)
select candidate, state, true from seeds;

commit;
