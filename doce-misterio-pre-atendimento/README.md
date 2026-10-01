# Doce Mistério — Pré-atendimento para WhatsApp

Formulário universal, mobile-first, feito para campanhas de Meta Ads que hoje enviam o cliente direto ao WhatsApp.

## O que ele faz

- Pergunta tamanho, intenção, forma de recebimento e cidade.
- Identifica automaticamente a peça/anúncio pela URL.
- Se a peça não vier identificada pela URL, pede uma descrição curta ao cliente.
- Classifica o contato como `LEAD QUENTE`, `LEAD MORNO` ou `ATENDIMENTO / DÚVIDA`.
- Mostra o botão do WhatsApp somente depois que a última pergunta estiver respondida.
- Abre o WhatsApp com a mensagem organizada para a vendedora.
- Envia eventos para Meta Pixel quando um Pixel ID é configurado.
- Também envia eventos para `dataLayer`, permitindo integração posterior com Google Tag Manager/GA4.

## WhatsApp

O WhatsApp oficial está configurado em `config.js`:

```js
whatsappNumber: "5527992275963"
```

## Como identificar cada peça

Use sempre a mesma página do formulário, mudando apenas os parâmetros da URL do anúncio.

Parâmetros aceitos para a peça:

- `peca`
- `produto`
- `product`
- `item`
- `anuncio`

Parâmetros aceitos para código/referência:

- `codigo`
- `sku`
- `ref`
- `referencia`
- `produto_id`

Exemplo para um anúncio de Short Doll:

```text
?peca=Short%20Doll%20Alca&codigo=SD042
```

Exemplo para um vestido:

```text
?peca=Vestido%20Coqueiro&codigo=VT118
```

A cliente vê no topo do formulário qual peça foi identificada e a vendedora recebe essa informação destacada no WhatsApp.

Se nenhum parâmetro de peça for enviado, o sistema usa `criativo`/`utm_content` como fallback. Se ainda assim não houver identificação, aparece no formulário o campo `Qual peça chamou sua atenção?` e o cliente precisa preenchê-lo para continuar.

## Parâmetros de campanha

O formulário também aceita:

- `campanha`
- `conjunto`
- `criativo`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `fbclid`

Exemplo completo:

```text
?peca=Short%20Doll%20Alca&codigo=SD042&campanha=Short%20Doll%20Outubro&conjunto=Mulheres%2025-44&criativo=Video%2003&utm_source=meta
```

## Mensagem que chega à vendedora

```text
DOCE MISTÉRIO | LEAD QUENTE

PEÇA: Short Doll Alça
REFERÊNCIA: SD042
Tamanho: G
Intenção: Quero comprar agora
Recebimento: Quero receber por entrega
Cidade: Vila Velha

Identificação do anúncio
Campanha: Short Doll Outubro
Conjunto: Mulheres 25-44
Criativo/anúncio: Video 03
Origem: meta

Pode me atender?
```

## Meta Pixel

Em `config.js`, informe o ID:

```js
metaPixelId: "123456789012345"
```

Se deixar vazio, o formulário funciona normalmente, apenas sem enviar eventos ao Meta Pixel.

## Eventos de rastreamento

- `PageView`
- `FormStepComplete`
- `FormComplete`
- `WhatsAppClick`

## Estrutura

```text
index.html
styles.css
app.js
config.js
README.md
```
