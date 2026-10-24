/* Aggregated results only: no individual votes or browser identifiers. */
(() => {
  const definitions = [
    ['AC','Acre',1,3], ['AL','Alagoas',7,4], ['AP','Amapá',5,1],
    ['AM','Amazonas',2,2], ['BA','Bahia',5,4], ['CE','Ceará',6,2],
    ['DF','Distrito Federal',4,4], ['ES','Espírito Santo',5,5],
    ['GO','Goiás',3,4], ['MA','Maranhão',5,2], ['MT','Mato Grosso',3,3],
    ['MS','Mato Grosso do Sul',2,5], ['MG','Minas Gerais',4,5],
    ['PA','Pará',4,2], ['PB','Paraíba',7,3], ['PR','Paraná',3,6],
    ['PE','Pernambuco',6,3], ['PI','Piauí',5,3], ['RJ','Rio de Janeiro',4,6],
    ['RN','Rio Grande do Norte',7,2], ['RS','Rio Grande do Sul',3,8],
    ['RO','Rondônia',2,3], ['RR','Roraima',3,1], ['SC','Santa Catarina',3,7],
    ['SP','São Paulo',3,5], ['SE','Sergipe',6,4], ['TO','Tocantins',4,3]
  ];
  const select = id => document.getElementById(id);
  const format = n => n.toLocaleString('pt-BR');
  const percent = n => n.toLocaleString('pt-BR', {minimumFractionDigits:1, maximumFractionDigits:1}) + '%';
  let lastUpdate = 0;
  let hasData = false;

  function render(rows, available) {
    // Match only known names/UFs; never interpolate server-supplied strings.
    const totals = new Map(definitions.map(([uf]) => [uf, {votes22:0, votes13:0}]));
    for (const row of rows) {
      const state = definitions.find(([uf, name]) => row.state === uf || row.state === name);
      if (!state || !Number.isSafeInteger(row.votes22) || row.votes22 < 0 ||
          !Number.isSafeInteger(row.votes13) || row.votes13 < 0) {
        throw new Error('invalid_state_results');
      }
      const total = totals.get(state[0]);
      total.votes22 += row.votes22;
      total.votes13 += row.votes13;
    }
    const results = definitions.map(([uf, name, column, row]) => {
      const {votes22, votes13} = totals.get(uf);
      const total = votes22 + votes13;
      const p22 = total ? votes22 / total * 100 : 0;
      const p13 = total ? votes13 / total * 100 : 0;
      const tie = votes22 === votes13;
      const leader = votes22 > votes13 ? '22' : '13';
      const color = leader === '22' ? 'blue' : 'red';
      const close = Math.abs(votes22 - votes13) / total * 100 < 5;
      const tone = !total || tie ? 'neutral' : total < 20 ? 'small' : color + (close ? '-close' : '');
      const label = !available ? 'Aguardando' : !total ? 'Sem votos' : tie ? 'Empate' : leader + ' · ' + percent(Math.max(p22,p13));
      return {uf, name, column, row, votes22, votes13, total, p22, p13, tone, label};
    });
    const focusedUF = document.activeElement?.dataset.uf;
    select('statesMap').innerHTML = results.map(s =>
      '<a class="uf-tile uf-' + s.tone + '" href="#state-row-' + s.uf + '" data-uf="' + s.uf +
      '" style="grid-column:' + s.column + ';grid-row:' + s.row + '" aria-label="' +
      s.name + ': ' + s.label + (available ? ', ' + format(s.total) + ' votos válidos' : '') +
      '"><strong>' + s.uf + '</strong><span>' + s.label + '</span></a>'
    ).join('');
    if (focusedUF) select('statesMap').querySelector('[data-uf="' + focusedUF + '"]')?.focus({preventScroll:true});
    select('statesTableBody').innerHTML = [...results]
      .sort((a,b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR'))
      .map(s => '<tr id="state-row-' + s.uf + '" tabindex="-1"><th scope="row"><span class="state-code">' +
        s.uf + '</span>' + s.name + '</th><td class="' + (s.votes22 > s.votes13 ? 'state-winner-22' : '') +
        '">' + (available && s.total ? percent(s.p22) : '—') + '</td><td class="' +
        (s.votes13 > s.votes22 ? 'state-winner-13' : '') + '">' +
        (available && s.total ? percent(s.p13) : '—') + '</td><td>' +
        (available ? format(s.total) : '—') + '</td></tr>').join('');
    select('statesVoteTotal').textContent = available ? format(results.reduce((n,s) => n + s.total,0)) : '—';
    select('statesCoverage').textContent = available ? results.filter(s => s.total > 0).length + ' / 27' : '—';
  }

  window.VotoStates = {
    update(rows) {
      if (lastUpdate && Date.now() - lastUpdate < 60000) return;
      if (!Array.isArray(rows)) {
        select('statesUpdated').textContent = 'Aguardando configuração dos dados por estado';
        return;
      }
      try {
        render(rows, true);
        lastUpdate = Date.now();
        hasData = true;
        select('statesUpdated').textContent = 'Atualizado às ' + new Date().toLocaleTimeString('pt-BR', {
          timeZone:'America/Sao_Paulo', hour:'2-digit', minute:'2-digit'
        }) + ' · Brasília';
      } catch {
        this.unavailable();
      }
    },
    unavailable() {
      select('statesUpdated').textContent = hasData
        ? 'Sem conexão · exibindo a última atualização'
        : 'Dados por estado indisponíveis · tentando novamente';
    }
  };
  render([], false);
  if (!window.VOTO_BACKEND?.supabaseUrl || !window.VOTO_BACKEND?.publishableKey) {
    select('statesUpdated').textContent = 'Conecte o banco para visualizar os dados por estado';
  }
})();
