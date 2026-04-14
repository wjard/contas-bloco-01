# Site Estatico (sem Node em runtime)

Este projeto pode rodar de forma 100% estatica, sem servidor Node para uso normal.
Os dados ja estao embutidos em arquivos JavaScript locais e sao carregados direto no navegador.

## Pagina inicial

- `/inicio.html` (menu simples com links para as paginas)

## Paginas principais

- `/index.html`
- `/resumo-anual.html`
- `/resumo-por-mes-saldo.html`

## Como abrir

1. Abra a pasta do projeto.
2. Clique duas vezes em qualquer uma das paginas HTML acima.
3. O navegador vai carregar os dados automaticamente a partir de `dados-inter/todas-cargas.js`.

## Estrutura de dados usada pelas paginas

- `dados-inter/todas-cargas.js`: base de dados consolidada usada pelas 3 paginas.
- `app-inter-detalhado.js`: logica da pagina `index.html`.
- `app-inter-index.js`: logica da pagina `resumo-anual.html`.
- `app-inter-resumo-mes-saldo.js`: logica da pagina `resumo-por-mes-saldo.html`.

## Node

Nao e necessario para visualizar o site.
Os arquivos de build Node foram removidos para manter o projeto focado em uso estatico.

## Atualizacao automatica dos CSVs do Inter

O script `scripts/gerar-dados-inter.js` agora tem dois modos:

- Navegador: continua funcionando como loader de `dados-inter/todas-cargas.js`.
- Node: processa os CSVs de `extrato_banco_inter/` e atualiza `dados-inter/`.

Comandos:

1. Atualizacao incremental (somente arquivos CSV novos/modificados):
	- `node scripts/gerar-dados-inter.js`
2. Regeracao completa forçada:
	- `node scripts/gerar-dados-inter.js --force`
3. Log detalhado arquivo a arquivo:
	- `node scripts/gerar-dados-inter.js --verbose`
4. Regeracao completa com log detalhado:
	- `node scripts/gerar-dados-inter.js --force --verbose`

Arquivos atualizados pelo script:

- `dados-inter/manifest.js`
- `dados-inter/todas-cargas.js`
- `dados-inter/extrato-*.js`
- `extrato-*.html` (paginas detalhadas por carga)
- `dados-inter/.cache-inter-csv.json` (cache de hash para controle incremental)

Quando um CSV e removido de `extrato_banco_inter/`, o script limpa automaticamente os artefatos obsoletos correspondentes:

- `dados-inter/extrato-*-csv.js`
- `extrato-*-csv.html`