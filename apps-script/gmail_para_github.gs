/**
 * Envia o XLSX diário de pedidos pendentes (anexo no Gmail) para o repositório do GitHub Pages.
 *
 * Configuração (Projeto > Configurações do projeto > Propriedades do script):
 *   GITHUB_TOKEN  = token do GitHub com permissão "Contents: Read and write" no repositório
 *
 * Depois, crie um acionador diário (Acionadores > Adicionar acionador > enviarPedidosPendentes > Baseado no tempo).
 */
const CFG = {
  owner:  'SEU_USUARIO_OU_ORGANIZACAO',
  repo:   'NOME_DO_REPOSITORIO',
  branch: 'main',
  path:   'data/PEDIDOS_PENDENTES.xlsx',              // nome fixo lido pelo painel
  busca:  'has:attachment filename:PEDIDOS_PENDENTES newer_than:2d',
  padraoAnexo: /PEDIDOS_PENDENTES\.xlsx$/i              // o Sankhya prefixa o nome com um número
};

function enviarPedidosPendentes() {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('Defina a propriedade GITHUB_TOKEN.');

  const threads = GmailApp.search(CFG.busca, 0, 10);
  let anexo = null, msgData = null;
  threads.forEach(t => t.getMessages().forEach(m => {
    m.getAttachments().forEach(a => {
      if (CFG.padraoAnexo.test(a.getName()) && (!msgData || m.getDate() > msgData)) {
        anexo = a; msgData = m.getDate();
      }
    });
  }));
  if (!anexo) { console.log('Nenhum anexo encontrado.'); return; }

  const api = `https://api.github.com/repos/${CFG.owner}/${CFG.repo}/contents/${CFG.path}`;
  const headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' };

  // SHA do arquivo atual (necessário para sobrescrever)
  let sha = null;
  const atual = UrlFetchApp.fetch(api + '?ref=' + CFG.branch, { headers, muteHttpExceptions: true });
  if (atual.getResponseCode() === 200) sha = JSON.parse(atual.getContentText()).sha;

  const body = {
    message: 'Atualiza pedidos pendentes ' + Utilities.formatDate(msgData, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'),
    content: Utilities.base64Encode(anexo.copyBlob().getBytes()),
    branch: CFG.branch
  };
  if (sha) body.sha = sha;

  const res = UrlFetchApp.fetch(api, {
    method: 'put', headers, contentType: 'application/json',
    payload: JSON.stringify(body), muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 300) throw new Error('GitHub ' + res.getResponseCode() + ': ' + res.getContentText());
  console.log('Arquivo enviado: ' + anexo.getName());
}
