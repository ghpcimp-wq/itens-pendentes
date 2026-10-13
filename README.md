# Painel de Pedidos Pendentes · Gestão de Compras

Painel em HTML (GitHub Pages) da carteira de pedidos pendentes do Sankhya, com foco nos itens em solicitação de compra (SC).

## Estrutura

```
index.html                     painel
data/PEDIDOS_PENDENTES.xlsx    dados (substituído diariamente)
apps-script/gmail_para_github.gs   script do Google Apps Script (referência; roda no Google, não no site)
.nojekyll                      publica os arquivos sem processamento do Jekyll
```

## Publicação

1. Envie todos os arquivos para a raiz do repositório.
2. Em **Settings > Pages**, selecione *Deploy from a branch*, branch `main`, pasta `/ (root)`.
3. O painel ficará disponível em `https://<usuario>.github.io/<repositorio>/`.

## Atualização diária

1. Crie um projeto em https://script.google.com com a conta Gmail que recebe o relatório e cole o conteúdo de `apps-script/gmail_para_github.gs`.
2. Preencha `owner` e `repo` no início do script.
3. Gere um token no GitHub (*Settings > Developer settings > Fine-grained tokens*) com acesso ao repositório e permissão **Contents: Read and write**.
4. No Apps Script, em *Configurações do projeto > Propriedades do script*, crie `GITHUB_TOKEN` com o token.
5. Execute a função `criarAcionadorDiario` uma vez e autorize o acesso. Ela agenda a execução automática todos os dias entre 23h e 0h (o e-mail chega por volta das 22h) e uma repescagem entre 6h e 7h, caso o e-mail atrase. O mesmo e-mail nunca é enviado duas vezes.

O script sempre grava o anexo como `data/PEDIDOS_PENDENTES.xlsx`, independentemente do prefixo numérico que o Sankhya coloca no nome.

## Observações

- O painel lê as colunas pela posição (ordem do relatório JRXML). Se a ordem das colunas mudar no relatório, o painel precisa ser ajustado.
- O GitHub Pages pode levar de 1 a 2 minutos para refletir um novo arquivo após o envio.
- Se o arquivo não for encontrado, o painel permite carregar um XLSX manualmente.
