(() => {
  const list = document.getElementById('activityList');
  const status = document.getElementById('activityStatus');
  const empty = document.getElementById('activityEmpty');
  const time = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });
  let rendered = false;
  let previous = '';
  const choices = { '22': 'Flávio Bolsonaro · 22', '13': 'Lula · 13', B: 'Voto em branco', N: 'Voto nulo' };
  const states = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));
  window.VotoActivity = {
    update(points) {
      if (!Array.isArray(points)) {
        this.unavailable('Atividade ainda indisponível.');
        return;
      }
      const rows = points.filter(p => p && Number.isFinite(Date.parse(p.recorded_at)) && Object.hasOwn(choices, p.choice) && (p.state === null || states.has(p.state)))
        .sort((a, b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at)).slice(0, 20);
      if (rows.length !== Math.min(points.length, 20)) {
        this.unavailable();
        return;
      }
      const signature = JSON.stringify(rows);
      if (signature !== previous || !rendered) {
        const fragment = document.createDocumentFragment();
        for (const row of rows) {
          const start = new Date(row.recorded_at);
          const item = document.createElement('li');
          item.className = 'activity-item';
          const dot = document.createElement('span');
          dot.className = 'activity-dot';
          dot.setAttribute('aria-hidden', 'true');
          const body = document.createElement('div');
          body.className = 'activity-item-body';
          const interval = document.createElement('time');
          interval.className = 'activity-when';
          interval.dateTime = start.toISOString();
          interval.textContent = `${date.format(start)} · ${time.format(start)} (Brasília)`;
          const candidate = document.createElement('strong');
          candidate.className = 'activity-candidate';
          candidate.textContent = choices[row.choice];
          const state = document.createElement('span');
          state.className = 'activity-state';
          state.textContent = row.state || 'Estado não informado';
          body.append(candidate, interval);
          item.append(dot, body, state);
          fragment.append(item);
        }
        list.replaceChildren(fragment);
        previous = signature;
      }
      rendered = true;
      empty.hidden = rows.length > 0;
      empty.textContent = 'Ainda não há participações autorizadas para exibição nas últimas 24 horas.';
      status.textContent = 'Atualizado às ' + time.format(new Date());
    },
    unavailable(message = 'Atualização indisponível. Tentaremos novamente em 10 segundos.') {
      status.textContent = rendered ? 'Dados anteriores · atualização pendente' : 'Aguardando dados';
      if (!rendered) { empty.hidden = false; empty.textContent = message; }
    }
  };
  if (!window.VOTO_BACKEND?.supabaseUrl || !window.VOTO_BACKEND?.publishableKey) {
    window.VotoActivity.unavailable('A linha do tempo estará disponível quando o placar compartilhado estiver conectado.');
  }
})();
