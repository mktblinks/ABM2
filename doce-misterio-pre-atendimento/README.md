# Doce Mistério — Pré-atendimento para WhatsApp

Formulário universal, mobile-first, feito para campanhas de Meta Ads que hoje enviam o cliente direto ao WhatsApp.

## O que ele faz

- Pergunta tamanho, intenção, forma de recebimento e cidade.
- Lê automaticamente parâmetros do anúncio pela URL.
- Classifica o contato como `LEAD QUENTE`, `LEAD MORNO` ou `ATENDIMENTO / DÚVIDA`.
- Abre o WhatsApp com uma mensagem organizada para a vendedora.
- Envia eventos para Meta Pixel quando um Pixel ID é configurado.
- Também envia eventos para `dataLayer`, permitindo integração posterior com Google Tag Manager/GA4.
- Não exige banco de dados, servidor ou mensalidade para a V1.

## 1. Configuração obrigatória

O WhatsApp oficial já está configurado em `config.js`:

```js
whatsappNumber: "5527992275963"
```

## 2. Meta Pixel

No mesmo `config.js`, informe o ID:

```js
metaPixelId: "123456789012345"
```

Se deixar vazio, o formulário funciona normalmente, apenas sem enviar eventos ao Meta Pixel.

## 3. URL universal para os anúncios

O formulário aceita os parâmetros abaixo:

- `produto`
- `campanha`
- `conjunto`
- `criativo`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `fbclid`

Exemplo:

```text
?produto=Short%20Doll&campanha=Short%20Doll%20Outubro&conjunto=Mulheres%2025-44&criativo=Video%2003&utm_source=meta
```

Você pode usar a mesma página em todos os anúncios. Só mudam os parâmetros.

## 4. Mensagem que chega à vendedora

Exemplo:

```text
DOCE MISTÉRIO | LEAD QUENTE

Produto/anúncio: Short Doll
Tamanho: G
Intenção: Quero comprar agora
Recebimento: Quero receber por entrega
Cidade: Vila Velha

Origem do anúncio
Campanha: Short Doll Outubro
Conjunto: Mulheres 25-44
Criativo: Video 03
Origem: meta

Pode me atender?
```

## 5. Eventos de rastreamento

- `PageView`
- `FormStepComplete`
- `FormComplete`
- `WhatsAppClick`

Os três últimos são enviados como eventos personalizados do Meta Pixel.

## Estrutura

```text
index.html
styles.css
app.js
config.js
README.md
```

## Evolução recomendada

A V2 pode adicionar Supabase para armazenar cada lead e um painel com visita → formulário iniciado → formulário concluído → clique no WhatsApp → qualidade do lead por campanha/criativo.
