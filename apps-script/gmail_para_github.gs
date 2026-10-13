/**
 * Envia os relatórios do Sankhya (anexos no Gmail) para o repositório do GitHub Pages.
 *   - Pedidos pendentes  -> data/PEDIDOS_PENDENTES.xlsx
 *   - Compras pendentes  -> data/COMPRAS_PENDENTES.xlsx
 *
 * CONFIGURAÇÃO (uma única vez)
 * 1. Preencha owner e repo abaixo.
 * 2. Projeto > Configurações do projeto > Propriedades do script:
 *      GITHUB_TOKEN = token do GitHub com permissão "Contents: Read and write" no repositório
 * 3. Execute a função criarAcionadorDiario e autorize o acesso.
 *    Isso agenda a execução automática todos os dias:
 *      - entre 23h e 0h (os e-mails chegam por volta das 22h)
 *      - entre 6h e 7h (repescagem, caso algum e-mail atrase)
 *    Cada arquivo só é enviado quando chega um e-mail novo; o mesmo e-mail nunca é reenviado.
 *    Se o relatório de compras for semanal, nos outros dias o script simplesmente não faz nada com ele.
 */
const CFG = {
  owner:  'SEU_USUARIO_OU_ORGANIZACAO',
  repo:   'NOME_DO_REPOSITORIO',
  branch: 'main',
  horarios: [23, 6],                   // horas de execução (fuso de São Paulo)
  fuso: 'America/Sao_Paulo',
  arquivos: [
    { nome: 'Pedidos pendentes',
      busca: 'has:attachment filename:PEDIDOS_PENDENTES newer_than:2d',
      padraoAnexo: /PEDIDOS_PENDENTES\.xlsx$/i,     // o Sankhya prefixa o nome com um número
      path: 'data/PEDIDOS_PENDENTES.xlsx' },
    { nome: 'Compras pendentes',
      busca: 'has:attachment filename:COMPRAS_PENDENTES newer_than:8d',
      padraoAnexo: /COMPRAS_PENDENTES\.xlsx$/i,
      path: 'data/COMPRAS_PENDENTES.xlsx' }
  ]
};

/** Cria (ou recria) os acionadores diários. Execute uma vez. */
function criarAcionadorDiario() {
  ScriptApp.getProjectTriggers()
    .filter(t => ['atualizarRepositorio', 'enviarPedidosPendentes'].includes(t.getHandlerFunction()))
    .forEach(t => ScriptApp.deleteTrigger(t));
  CFG.horarios.forEach(h =>
    ScriptApp.newTrigger('atualizarRepositorio')
      .timeBased().everyDays(1).atHour(h).inTimezone(CFG.fuso).create());
  console.log('Acionadores criados para ' + CFG.horarios.map(h => h + 'h').join(' e ') + '.');
}

/** Executado pelos acionadores: envia cada relatório que tiver um e-mail novo. */
function atualizarRepositorio() {
  const erros = [];
  CFG.arquivos.forEach(a => {
    try { enviarArquivo_(a); }
    catch (e) { erros.push(a.nome + ': ' + e.message); console.error(a.nome + ': ' + e.message); }
  });
  if (erros.length) throw new Error(erros.join(' | '));   // gera aviso de falha por e-mail do Apps Script
}

function enviarArquivo_(arq) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('Defina a propriedade GITHUB_TOKEN.');

  // E-mail mais recente com o anexo
  let anexo = null, msg = null;
  GmailApp.search(arq.busca, 0, 10).forEach(t => t.getMessages().forEach(m => {
    m.getAttachments().forEach(a => {
      if (arq.padraoAnexo.test(a.getName()) && (!msg || m.getDate() > msg.getDate())) { anexo = a; msg = m; }
    });
  }));
  if (!anexo) { console.log(arq.nome + ': nenhum e-mail recente com o relatório.'); return; }

  const chave = 'ULTIMA_MSG_' + arq.path;
  if (props.getProperty(chave) === msg.getId()) { console.log(arq.nome + ': relatório mais recente já enviado.'); return; }

  const api = `https://api.github.com/repos/${CFG.owner}/${CFG.repo}/contents/${arq.path}`;
  const headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' };

  // SHA do arquivo atual (necessário para sobrescrever)
  let sha = null;
  const atual = UrlFetchApp.fetch(api + '?ref=' + CFG.branch, { headers, muteHttpExceptions: true });
  if (atual.getResponseCode() === 200) sha = JSON.parse(atual.getContentText()).sha;

  const body = {
    message: 'Atualiza ' + arq.nome.toLowerCase() + ' ' + Utilities.formatDate(msg.getDate(), CFG.fuso, 'dd/MM/yyyy HH:mm'),
    content: Utilities.base64Encode(anexo.copyBlob().getBytes()),
    branch: CFG.branch
  };
  if (sha) body.sha = sha;

  const res = UrlFetchApp.fetch(api, {
    method: 'put', headers, contentType: 'application/json',
    payload: JSON.stringify(body), muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 300) throw new Error('GitHub ' + res.getResponseCode() + ': ' + res.getContentText());

  props.setProperty(chave, msg.getId());
  console.log(arq.nome + ': enviado ' + anexo.getName() + ' (e-mail de ' + Utilities.formatDate(msg.getDate(), CFG.fuso, 'dd/MM HH:mm') + ')');
}
