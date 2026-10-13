/**
 * Envia o XLSX diário de pedidos pendentes (anexo no Gmail) para o repositório do GitHub Pages.
 *
 * CONFIGURAÇÃO (uma única vez)
 * 1. Preencha owner e repo abaixo.
 * 2. Projeto > Configurações do projeto > Propriedades do script:
 *      GITHUB_TOKEN = token do GitHub com permissão "Contents: Read and write" no repositório
 * 3. Execute a função criarAcionadorDiario e autorize o acesso.
 *    Isso agenda a execução automática todos os dias:
 *      - entre 23h e 0h (o e-mail chega por volta das 22h)
 *      - entre 6h e 7h (repescagem, caso o e-mail atrase)
 *    O mesmo e-mail nunca é enviado duas vezes ao GitHub.
 */
const CFG = {
  owner:  'SEU_USUARIO_OU_ORGANIZACAO',
  repo:   'NOME_DO_REPOSITORIO',
  branch: 'main',
  path:   'data/PEDIDOS_PENDENTES.xlsx',                 // nome fixo lido pelo painel
  busca:  'has:attachment filename:PEDIDOS_PENDENTES newer_than:2d',
  padraoAnexo: /PEDIDOS_PENDENTES\.xlsx$/i,               // o Sankhya prefixa o nome com um número
  horarios: [23, 6],                                      // horas de execução (fuso de São Paulo)
  fuso: 'America/Sao_Paulo'
};

/** Cria (ou recria) os acionadores diários. Execute uma vez. */
function criarAcionadorDiario() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'enviarPedidosPendentes')
    .forEach(t => ScriptApp.deleteTrigger(t));
  CFG.horarios.forEach(h =>
    ScriptApp.newTrigger('enviarPedidosPendentes')
      .timeBased().everyDays(1).atHour(h).inTimezone(CFG.fuso).create());
  console.log('Acionadores criados para ' + CFG.horarios.map(h => h + 'h').join(' e ') + '.');
}

function enviarPedidosPendentes() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('Defina a propriedade GITHUB_TOKEN.');

  // Localiza o e-mail mais recente com o anexo
  let anexo = null, msg = null;
  GmailApp.search(CFG.busca, 0, 10).forEach(t => t.getMessages().forEach(m => {
    m.getAttachments().forEach(a => {
      if (CFG.padraoAnexo.test(a.getName()) && (!msg || m.getDate() > msg.getDate())) { anexo = a; msg = m; }
    });
  }));
  if (!anexo) { console.log('Nenhum e-mail com o relatório nos últimos 2 dias.'); return; }

  // Evita reenviar o mesmo e-mail
  if (props.getProperty('ULTIMA_MSG') === msg.getId()) { console.log('Relatório mais recente já enviado.'); return; }

  const api = `https://api.github.com/repos/${CFG.owner}/${CFG.repo}/contents/${CFG.path}`;
  const headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' };

  // SHA do arquivo atual (necessário para sobrescrever)
  let sha = null;
  const atual = UrlFetchApp.fetch(api + '?ref=' + CFG.branch, { headers, muteHttpExceptions: true });
  if (atual.getResponseCode() === 200) sha = JSON.parse(atual.getContentText()).sha;

  const body = {
    message: 'Atualiza pedidos pendentes ' + Utilities.formatDate(msg.getDate(), CFG.fuso, 'dd/MM/yyyy HH:mm'),
    content: Utilities.base64Encode(anexo.copyBlob().getBytes()),
    branch: CFG.branch
  };
  if (sha) body.sha = sha;

  const res = UrlFetchApp.fetch(api, {
    method: 'put', headers, contentType: 'application/json',
    payload: JSON.stringify(body), muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 300) throw new Error('GitHub ' + res.getResponseCode() + ': ' + res.getContentText());

  props.setProperty('ULTIMA_MSG', msg.getId());
  console.log('Arquivo enviado: ' + anexo.getName() + ' (e-mail de ' + Utilities.formatDate(msg.getDate(), CFG.fuso, 'dd/MM HH:mm') + ')');
}
