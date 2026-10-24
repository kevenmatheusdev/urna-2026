# Voto 2026

Protótipo funcional de uma simulação independente de votação, em português do Brasil.

## Interface de votação

A urna e a apuração utilizam `voting.css` para o layout adaptativo: duas colunas em telas amplas, painéis empilhados até 1100px e visor acima do teclado até 600px. As fotos são locais (`assets/flavio.jpeg` e `assets/lula.jpg`).

O placar começa com dados demonstrativos. Testar a urna atualiza apenas os valores em memória nesta página; recarregar restaura os exemplos. Percentuais no destaque usam votos válidos e a lista usa o total de votos. Não há garantia de um voto por pessoa nem sincronização com servidor.

O Pix permite copiar a chave informada. O antigo QR que codificava somente texto foi retirado; para exibir um QR de pagamento, utilizar um código Pix válido fornecido pelo responsável.

## Ativar banco compartilhado e limite por navegador

O repositório contém a migração SQL e duas Supabase Edge Functions (`submit-vote` e `results`). Para ativá-las:

1. Aplique as migrações anteriores na ordem necessária para sua base e, depois, `supabase/migrations/202610230006_device_vote_lock.sql` pelo SQL Editor. A migração nova não apaga nem altera os registros antigos de bloqueio por IP.
2. Defina `DEVICE_TOKEN_HASH_SECRET` com pelo menos 32 bytes aleatórios nas secrets das Edge Functions. O valor nunca deve ir para o navegador.
3. Publique a Edge Function `submit-vote` atualizada e a função `results`. O navegador cria um identificador aleatório persistido em `localStorage`; a função calcula HMAC no servidor e a RPC grava atomicamente o primeiro uso e o voto. O HMAC fica em tabela separada dos votos e não expira automaticamente. O endpoint não usa IP para bloquear participações; a chave administrativa Supabase fica apenas no ambiente da função.
4. Preencha `backend-config.js` com a URL do projeto e sua publishable key. Essa chave pública não substitui validações e permissões no servidor.

Com o backend sem configurar, a página segue em modo de demonstração e não compartilha votos. O limite implementado é por navegador/perfil, não identifica o aparelho físico: limpar os dados do site ou usar outro navegador/perfil pode contorná-lo. O HMAC é dado pseudonimizado; a política informa sua finalidade e retenção sem prazo automático. A tabela de bloqueios antiga por IP permanece no banco, mas deixa de ser consultada pela nova função após a atualização.

Para começar o placar compartilhado com 654 votos demonstrativos para Flavio Bolsonaro e 396 para Lula, execute uma única vez a migração `supabase/migrations/202610230002_demo_vote_baseline.sql` no SQL Editor. Essa migração cria 1.050 registros marcados como demonstração; a contagem de votos dos últimos cinco minutos ignora esses registros.

## Estado atual

- Interface responsiva, acessível e sem dependências de build.
- Urna com teclado numérico, suporte ao teclado físico, candidato válido, branco, nulo, corrige e confirma.
- Resultados, gráfico de evolução e distribuição por estado com dados demonstrativos identificados na interface.
- Nenhum dado pessoal é solicitado ou armazenado nesta versão.

## Para colocar em produção

Conectar o fluxo de confirmação a um backend (por exemplo, Supabase) com tabelas `events`, `candidates`, `votes` e `settings`. A validação do candidato, idempotência da requisição, rate limiting e atualização dos resultados devem ocorrer no servidor. A identificação anônima persistente ajuda a reduzir reenvios, mas não garante uma pessoa por voto sem autenticação.

Também é necessário configurar as credenciais apenas no ambiente do servidor, revisar candidatos e datas no fuso `America/Sao_Paulo`, desativar o módulo Pix até que a chave e os contatos do responsável sejam fornecidos, e publicar uma política de privacidade própria.

## Execução local

Abra `index.html` em um navegador ou sirva a pasta com qualquer servidor estático.

## Linha do tempo de atividade

A seção abaixo da urna mostra os totais das últimas 12 faixas horárias, incluindo a hora em andamento, no horário de Brasília. Inclui participações reais para candidatos, brancos e nulos; exclui os registros marcados como demonstrativos. Não divulga escolhas individuais, estados ou identificadores.

No banco já configurado, execute `supabase/migrations/202610230007_activity_timeline.sql` no SQL Editor. Ela acrescenta `activity` à resposta de `get_simulation_results`, preservando os campos anteriores. Não é necessário republicar a Edge Function `results`, que já repassa essa resposta. Depois publique os arquivos do frontend na Vercel. A atualização usa a consulta existente a cada 10 segundos; se o banco ainda não tiver sido atualizado, a seção informa que aguarda dados.

### Participações publicadas individualmente

A interface atual apresenta até 20 participações autorizadas nas últimas 24 horas, com opção, UF reconhecida e horário arredondado ao minuto. O participante autoriza em uma caixa desmarcada antes de confirmar. Sem autorização, o voto continua contando normalmente, mas fica fora desta lista. Registros antigos, demonstrativos e identificadores não são expostos. Estados fora da lista de UFs são tratados como não informados.

Ativação: execute `supabase/migrations/202610230008_public_vote_timeline.sql`, publique a Edge Function `submit-vote` atualizada e só então publique o frontend. A função `results` não precisa ser republicada. A migração mantém a função antiga de envio para clientes anteriores e acrescenta a nova RPC `submit_simulation_vote_with_public_timeline`. O controle de duplicidade continua usando a mesma tabela e operação atômica. A política de privacidade descreve a exibição opcional. A publicação em produção depende dessas três etapas; os dados antigos não serão convertidos em autorizações.

## Seção por estado

Execute `supabase/migrations/202610230004_state_results.sql` no SQL Editor do projeto já configurado, após as migrações anteriores. A função `results` existente repassa o novo campo `states`, sem exigir novo deploy da Edge Function.

O mapa e a tabela mostram as 27 UFs. A seção aproveita a consulta do placar e atualiza a interface a cada 60 segundos. São incluídos somente votos reais para 22/13 com estado reconhecido, informado como nome ou sigla. Brancos, nulos, votos demonstrativos e votos sem estado não entram nessa distribuição; portanto o total estadual pode ser menor que o placar geral.

Uma diferença abaixo de 5 pontos percentuais recebe a cor clara do candidato; menos de 20 votos recebe cinza hachurado. Empates não escolhem um líder e estados sem votos não recebem percentuais inventados. Se a migração ainda não foi aplicada, a seção mostra que aguarda configuração. O mapa leva à linha correspondente na tabela, que tem rolagem horizontal em telas pequenas.
