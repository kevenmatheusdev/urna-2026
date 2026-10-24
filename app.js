const $ = s => document.querySelector(s);
const candidates = {22:{name:'Flávio Bolsonaro',party:'PL',image:'assets/flavio.jpeg'},13:{name:'Lula',party:'PT',image:'assets/lula.jpg'}};
const connected=Boolean(window.VOTO_BACKEND?.supabaseUrl && window.VOTO_BACKEND?.publishableKey);
const counts=connected?{22:0,13:0,B:0,N:0}:{22:7156,13:5140,B:2,N:549};
const recentVotes=[];
let confirmationSoundPlayed=false;
function playConfirmationSound(){
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass)return;
  try{
    const audio=new AudioContextClass();
    const start=audio.currentTime;
    [523.25,659.25,783.99].forEach((frequency,index)=>{
      const oscillator=audio.createOscillator();
      const gain=audio.createGain();
      const at=start+index*.13;
      oscillator.type='sine';
      oscillator.frequency.setValueAtTime(frequency,at);
      gain.gain.setValueAtTime(.0001,at);
      gain.gain.exponentialRampToValueAtTime(.13,at+.012);
      gain.gain.exponentialRampToValueAtTime(.0001,at+.11);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(at);
      oscillator.stop(at+.12);
    });
    setTimeout(()=>audio.close(),650);
  }catch{/* áudio indisponível: a confirmação visual continua funcionando */}
}
function updateRecentVotes(){
const cutoff=Date.now()-5*60*1000;
while(recentVotes.length && recentVotes[0]<=cutoff)recentVotes.shift();
$('#recentVotes').textContent=recentVotes.length.toLocaleString('pt-BR');
$('#recentVoteLabel').textContent=recentVotes.length===1?'voto nos últimos 5 minutos':'votos nos últimos 5 minutos';
}
const notice='Simulação independente para entretenimento. A participação é voluntária e não representa o eleitorado. Não é pesquisa eleitoral e não possui vínculo com o TSE.';
let typed='',white=false,finished=false;
$('.hero-banner').after($('.pix-section'));
$('.dashboard').innerHTML=`
<div class="ballot-panel">
<div class="region-field"><label for="state">Qual é o seu estado? <small>(opcional)</small></label><select id="state"><option value="">Escolha seu estado</option>${['Acre','Alagoas','Amapá','Amazonas','Bahia','Ceará','Distrito Federal','Espírito Santo','Goiás','Maranhão','Mato Grosso','Mato Grosso do Sul','Minas Gerais','Pará','Paraíba','Paraná','Pernambuco','Piauí','Rio de Janeiro','Rio Grande do Norte','Rio Grande do Sul','Rondônia','Roraima','Santa Catarina','São Paulo','Sergipe','Tocantins'].map(s=>'<option>'+s+'</option>').join('')}</select></div>
<label class="public-vote-choice"><input type="checkbox" id="publicTimeline"><span>Autorizo publicar minha opção de voto, estado informado e horário aproximado na linha do tempo por até 24 horas. <small>Opcional. Você pode votar sem publicar sua participação.</small></span></label>
<div class="machine"><div class="machine-heading"><span class="machine-logo">V</span><strong>VOTO 2026 <small>SIMULADOR INDEPENDENTE</small></strong><i></i></div>
<div class="machine-body"><div class="screen-frame"><div id="ballotScreen" class="ballot-screen" aria-live="polite" aria-atomic="true"></div><span class="screen-caption">Sem vínculo com a Justiça Eleitoral</span></div>
<div class="machine-controls"><span class="controls-title">TECLADO DE VOTAÇÃO</span><div class="number-pad">${[1,2,3,4,5,6,7,8,9,0].map(n=>'<button type="button" data-key="'+n+'" aria-label="Número '+n+'">'+n+'</button>').join('')}</div><div class="action-pad"><button type="button" data-action="white">BRANCO</button><button type="button" data-action="correct">CORRIGE</button><button type="button" id="confirm">CONFIRMA</button></div></div></div></div>
<p id="voteMessage" role="status" class="vote-message">Escolha 22 ou 13. Você também pode votar em branco ou nulo.</p>
<section class="donation-card" aria-labelledby="donationTitle">
<h3 id="donationTitle">Obrigado por participar!</h3>
<p class="donation-description">Ajude a manter o servidor no ar.<br>Contribua com um Pix de qualquer valor.</p>
<div class="donation-key-row"><code id="donationKey"></code><button type="button" id="supportCopy">Copiar chave</button></div>
<p class="donation-instructions">No app do seu banco: <strong>Pix → Pagar com chave</strong></p>
<small class="donation-optional">A contribuição é opcional. A simulação continua gratuita.</small>
<span id="donationStatus" class="donation-status" role="status"></span>
</section>
<p class="independent-note">${notice}</p></div>
<aside class="tally-panel" id="resultados" aria-labelledby="tallyTitle"><header class="tally-heading"><div><span>SIMULAÇÃO INDEPENDENTE</span><h2 id="tallyTitle">Apuração <em><i aria-hidden="true"></i> AO VIVO</em></h2></div><div class="tally-total"><strong id="totalVotes"></strong><span>votos</span></div></header>
<div class="tally-status"><i aria-hidden="true"></i><p><strong id="recentVotes">0</strong> <span id="recentVoteLabel">votos nos últimos 5 minutos</span></p><small>${connected?'Participações recebidas':'Testes nesta página'}</small></div>
<div id="comparison"></div><div class="all-results"><h3>Todos os votos <span>% sobre o total</span></h3><div id="bars"></div><p id="baselineNotice" class="independent-note" hidden></p><p class="tally-updated" id="updatedAt"></p><div class="tally-information"><p>${connected?'Placar ao vivo, atualizado a cada 10 segundos. <strong>Uma participação por navegador.</strong> O identificador aleatório fica armazenado neste navegador e é usado apenas para impedir um novo envio por este perfil.':'Placar demonstrativo neste navegador. Os testes locais não são compartilhados entre visitantes.'}</p></div></div></aside>`;
function renderScreen(){
if(finished&&!confirmationSoundPlayed){confirmationSoundPlayed=true;playConfirmationSound();}
const c=candidates[typed];
$('#ballotScreen').innerHTML=finished?
'<div class="end-screen"><span class="success-check">✓</span><h3>FIM</h3><strong>Participação concluída</strong><p>Obrigado por participar desta simulação.</p></div>':
`<span class="screen-overline">SEU VOTO PARA</span><h3>Presidente</h3><div class="digit-slots" aria-label="Número digitado: ${typed||'nenhum'}">${[0,1].map(i=>'<span>'+(white?'–':typed[i]||'')+'</span>').join('')}</div><div class="screen-choice">${c&&!white?'<img src="'+c.image+'" alt="'+c.name+'"><div><strong>'+c.name+'</strong><span>'+c.party+' · '+typed+'</span><small>Confira antes de confirmar.</small></div>':'<div class="choice-placeholder">'+(white?'B':typed.length===2?'!':'→')+'</div><div><strong>'+(white?'Voto em branco':typed.length===2?'Voto nulo':'Digite sua escolha')+'</strong><small>'+(white?'Confirme para votar em branco.':typed.length===2?'Número não cadastrado. Confirmar resulta em voto nulo.':'Use o teclado da urna ou do seu dispositivo.')+'</small></div>'}</div><div class="screen-bottom">${white||typed.length===2?'CONFIRMA para concluir · CORRIGE para alterar':'Simulação de votação · 2º turno'}</div>`;
$('#confirm').disabled=finished||(!white&&typed.length!==2);
$('#publicTimeline').disabled=finished;
document.querySelectorAll('.machine-controls button').forEach(b=>{if(b.id!=='confirm')b.disabled=finished;});
if(finished){$('#voteMessage').textContent='Participação já registrada neste navegador. Uma nova participação não está disponível.';}
}
function renderResults(){
const total=Object.values(counts).reduce((a,b)=>a+b,0),valid=counts[22]+counts[13];
const pct=n=>(Number.isFinite(n)?n:0).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
$('#totalVotes').textContent=total.toLocaleString('pt-BR');
$('#comparison').innerHTML=`<div class="contenders">${[22,13].map(n=>'<article class="contender candidate-'+n+'"><div class="portrait-wrap"><img src="'+candidates[n].image+'" alt="'+candidates[n].name+'"><b>'+n+'</b></div><h3>'+candidates[n].name+'</h3><span class="party">'+candidates[n].party+'</span><strong class="candidate-percent">'+pct(counts[n]/valid*100)+'</strong><small>dos votos válidos</small></article>').join('')}</div><div class="comparison-track" aria-label="Comparação de votos válidos"><span style="width:${valid?counts[22]/valid*100:0}%"></span><span style="width:${valid?counts[13]/valid*100:0}%"></span></div><p class="comparison-caption">Votos válidos: apenas os candidatos.<br>Brancos e nulos não entram nesse percentual.</p>`;
$('#bars').innerHTML=[22,13,'B','N'].map(n=>`<div class="result-row candidate-${n}"><b class="result-number">${n}</b><div class="result-data"><div class="result-label"><strong>${candidates[n]?.name||(n==='B'?'Brancos':'Nulos')} <small>${candidates[n]?.party||''}</small></strong><b>${pct(counts[n]/total*100)}</b></div><div class="result-track"><span style="width:${total?counts[n]/total*100:0}%"></span></div><span class="result-count">${counts[n].toLocaleString('pt-BR')} votos</span></div></div>`).join('');
$('#updatedAt').textContent='Atualização da prévia: '+new Date().toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo'});
}
document.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>{if(finished)return;if(white){white=false;typed='';}if(typed.length<2)typed+=b.dataset.key;renderScreen();});
$('[data-action="correct"]').onclick=()=>{typed='';white=false;renderScreen();};
$('[data-action="white"]').onclick=()=>{typed='';white=true;renderScreen();};
function getDeviceToken(){
  const key='voto2026_device_token';
  try{
    let token=localStorage.getItem(key);
    if(!/^[a-f0-9]{64}$/.test(token||'')){
      const bytes=crypto.getRandomValues(new Uint8Array(32));
      token=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
      localStorage.setItem(key,token);
    }
    return token;
  }catch{throw new Error('device_storage_unavailable');}
}
$('#confirm').onclick=async()=>{if(finished||(!white&&typed.length!==2))return;const choice=white?'B':candidates[typed]?typed:'N';const cfg=window.VOTO_BACKEND||{};if(cfg.supabaseUrl&&cfg.publishableKey){const button=$('#confirm');button.disabled=true;$('#voteMessage').textContent='Enviando sua participação…';try{const deviceToken=getDeviceToken();const response=await fetch(cfg.supabaseUrl.replace(/\/$/,'')+'/functions/v1/submit-vote',{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.publishableKey},body:JSON.stringify({choice,state:$('#state').value||null,deviceToken,publicTimeline:$('#publicTimeline').checked})});const result=await response.json();if(response.status===409){$('#voteMessage').textContent='Este navegador já registrou uma participação. O limite é por navegador/perfil; apagar os dados do navegador ou usar outro perfil pode permitir uma nova participação.';button.disabled=true;return;}if(!response.ok||!result.accepted)throw new Error('backend');finished=true;renderScreen();$('#voteMessage').textContent='Participação registrada. Obrigado por participar!';await refreshRemoteResults();return;}catch(error){if(error?.message==='device_storage_unavailable'){$('#voteMessage').textContent='Não foi possível salvar o identificador neste navegador. Verifique as permissões de armazenamento e tente novamente.';}else{$('#voteMessage').textContent='Falha de conexão. Sua participação não foi registrada; tente novamente.';}button.disabled=false;return;}}counts[choice]++;recentVotes.push(Date.now());updateRecentVotes();finished=true;renderScreen();renderResults();$('#voteMessage').textContent='Participação demonstrativa concluída. Para contagem compartilhada, configure o backend Supabase.';};
let refreshingResults=false;
async function refreshRemoteResults(){
  if(!connected||refreshingResults)return;
  refreshingResults=true;
  try{
    const cfg=window.VOTO_BACKEND;
    const res=await fetch(cfg.supabaseUrl.replace(/\/$/,'')+'/functions/v1/results',{
      headers:{apikey:cfg.publishableKey},cache:'no-store',signal:AbortSignal.timeout(8000)
    });
    if(!res.ok)throw new Error('results_unavailable');
    const data=await res.json();
    for(const key of ['22','13','B','N']){
      if(!Number.isSafeInteger(data.counts?.[key])||data.counts[key]<0)throw new Error('invalid_results');
    }
    Object.assign(counts,data.counts);
    renderResults();
    $('#updatedAt').textContent='Última atualização: '+new Date().toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo'})+' (Brasília)';
    const recent=Number(data.recent_five_minutes||0);
    $('#recentVotes').textContent=recent.toLocaleString('pt-BR');
    $('#recentVoteLabel').textContent=recent===1?'voto nos últimos 5 minutos':'votos nos últimos 5 minutos';
    window.VotoStates.update(data.states);
    window.VotoActivity.update(data.recent_votes);
  }catch{
    window.VotoStates.unavailable();
    window.VotoActivity.unavailable();
    $('#updatedAt').textContent='Não foi possível atualizar o placar. Nova tentativa automática em 10 segundos.';
  }finally{refreshingResults=false;}
}
document.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea')||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;if(e.key==='Enter'&&e.target.closest('button,a'))return;const b=/^\d$/.test(e.key)?$('[data-key="'+e.key+'"]'):e.key==='Enter'?$('#confirm'):e.key==='Backspace'?$('[data-action="correct"]'):e.key.toLowerCase()==='b'?$('[data-action="white"]'):null;if(b){e.preventDefault();b.click();}});
$('#donationKey').textContent=$('#pixKey').textContent.trim();
async function copyPix(b){try{await navigator.clipboard.writeText($('#pixKey').textContent.trim());b.textContent='Chave copiada ✓';if(b.id==='supportCopy')$('#donationStatus').textContent='Chave copiada. Cole no aplicativo do seu banco.';}catch{b.textContent='Copie a chave acima';if(b.id==='supportCopy')$('#donationStatus').textContent='Não foi possível copiar automaticamente. Selecione a chave acima e copie manualmente.';}setTimeout(()=>b.textContent='Copiar chave',2500);}
$('#copyPix').onclick=e=>copyPix(e.currentTarget);$('#supportCopy').onclick=e=>copyPix(e.currentTarget);
$('#supportPixCopy').onclick=async e=>{const button=e.currentTarget;try{await navigator.clipboard.writeText($('#supportPixKey').textContent.trim());$('#supportPixStatus').textContent='Chave Pix copiada.';button.textContent='Copiada ✓';}catch{$('#supportPixStatus').textContent='Não foi possível copiar. Selecione a chave e copie manualmente.';button.textContent='Copie a chave acima';}setTimeout(()=>button.textContent='Copiar chave Pix',2500);};
$('.menu').setAttribute('aria-expanded','false');
$('.menu').onclick=()=>{const open=$('.nav nav').classList.toggle('nav-open');$('.menu').setAttribute('aria-expanded',String(open));};
const targets=['2026-10-25T08:00:00-03:00','2026-10-23T21:20:00-03:00'];
function countdowns(){document.querySelectorAll('.countdown').forEach((el,i)=>{const s=Math.max(0,Math.ceil((Date.parse(targets[i])-Date.now())/1000));if(!s){el.textContent=i===0?'Horário de abertura atingido':'Horário do debate atingido';return;}el.innerHTML=[Math.floor(s/86400),Math.floor(s/3600)%24,Math.floor(s/60)%60,s%60].map((v,j)=>'<b>'+String(v).padStart(2,'0')+'<small>'+['dias','h','min','s'][j]+'</small></b>').join('');});}
renderScreen();renderResults();countdowns();updateRecentVotes();if(connected)$('#updatedAt').textContent='Carregando placar compartilhado…';refreshRemoteResults();setInterval(countdowns,1000);setInterval(()=>{if(!(window.VOTO_BACKEND||{}).supabaseUrl)updateRecentVotes();},1000);setInterval(refreshRemoteResults,10000);setInterval(refreshRemoteResults,300000);
