# Painel de Pedidos Pendentes · Gestão de Compras

Painel em HTML (GitHub Pages) da carteira de pedidos pendentes do Sankhya, com foco nos itens em solicitação de compra (SC).

## Estrutura

```
index.html                     painel
data/PEDIDOS_PENDENTES.xlsx    pedidos de venda pendentes (diário)
data/COMPRAS_PENDENTES.xlsx    compras em andamento com previsão de entrega
apps-script/gmail_para_github.gs   script do Google Apps Script (referência; roda no Google, não no site)
.nojekyll                      publica os arquivos sem processamento do Jekyll
```

## Publicação

1. Envie todos os arquivos para a raiz do repositório.
2. Em **Settings > Pages**, selecione *Deploy from a branch*, branch `main`, pasta `/ (root)`.
3. O painel ficará disponível em `https://<usuario>.github.io/<repositorio>/`.

## Atualização diária

1. Crie um projeto em https://script.google.com com a conta Gmail que recebe os relatórios e cole o conteúdo de `apps-script/gmail_para_github.gs`.
2. Preencha `owner` e `repo` no início do script.
3. Gere um token no GitHub (*Settings > Developer settings > Fine-grained tokens*) com acesso ao repositório e permissão **Contents: Read and write**.
4. No Apps Script, em *Configurações do projeto > Propriedades do script*, crie `GITHUB_TOKEN` com o token.
5. Execute a função `criarAcionadorDiario` uma vez e autorize o acesso. Ela agenda a execução automática todos os dias entre 23h e 0h (os e-mails chegam por volta das 22h) e uma repescagem entre 6h e 7h, caso algum e-mail atrase. Cada relatório só é enviado quando chega um e-mail novo, então o de compras pode ser diário ou semanal.

O script grava os anexos sempre com nomes fixos (`data/PEDIDOS_PENDENTES.xlsx` e `data/COMPRAS_PENDENTES.xlsx`), independentemente do prefixo numérico que o Sankhya coloca no nome. O assunto ou corpo do e-mail não importa; o script localiza os anexos pelo nome do arquivo.

## Observações

- O painel lê as colunas pela posição (ordem do relatório JRXML). Se a ordem das colunas mudar no relatório, o painel precisa ser ajustado.
- O GitHub Pages pode levar de 1 a 2 minutos para refletir um novo arquivo após o envio.
- Se o arquivo de pedidos não for encontrado, o painel permite carregar os XLSX manualmente (os dois de uma vez, se quiser).
- O arquivo de compras é opcional: sem ele, o painel funciona normalmente, apenas sem abatimento das compras em andamento e sem a aba Chegando.
- O relatório de compras não traz valores de custo; o painel trabalha somente com valores de venda.
