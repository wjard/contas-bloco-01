# Prestacao de Contas (Site Estatico)

Projeto estatico para visualizacao de extratos e resumos financeiros, com geracao automatica de dados a partir de CSV e publicacao no GitHub Pages.

## Rotas e Paginas

### Menu principal

- `/index.html`: home com links para as telas principais.

### Paginas de acesso do usuario

- `/resumo-anual.html`: matriz anual por TAG (entradas e saidas).
- `/resumo-por-mes-saldo.html`: resumo mensal com saldo e saldo geral.
- `/details.html`: detalhamento consolidado por Ano -> Mes (sem separar por arquivo CSV).

### Paginas auxiliares

- `/extrato-index.html`: seletor de cargas (detalhamento por arquivo).
- `/extrato-*.html`: detalhamento individual por arquivo CSV.

## Mapeamento de Scripts

- `app-extrato-index.js` -> `resumo-anual.html`
- `app-extrato-resumo-mes-saldo.js` -> `resumo-por-mes-saldo.html`
- `app-extrato-detalhado.js` -> `details.html`
- `app-extrato.js` -> `extrato-*.html`
- `ui-utils.js` -> util compartilhado de escape/moeda/datas
- `extrato-privacy-utils.js` -> util compartilhado de classificacao/anonimizacao de descricao

## Privacidade de Descricao

A regra de anonimização foi centralizada em `extrato-privacy-utils.js` e aplicada nas telas de detalhamento.

Para categoria `Boleto Condo. Bloco`:

- Se descricao contiver `Pix Recebido` -> `Boleto Recebido Via Pix`
- Se descricao contiver `Boleto de cobran` -> `Boleto de Cobranca Recebido`

## Geracao de Dados do Extrato Bancário (Node)

Script: `scripts/gerar-dados-bancario.js`

Modos:

- Navegador: atua como loader de `dados-extrato/todas-cargas.js`.
- Node: processa CSVs em `extrato_bancario/` e atualiza os artefatos.

Comandos:

1. Atualizacao incremental:
   - `node scripts/gerar-dados-bancario.js`
2. Regeracao completa:
   - `node scripts/gerar-dados-bancario.js --force`
3. Log detalhado:
   - `node scripts/gerar-dados-bancario.js --verbose`
4. Regeracao completa com log detalhado:
   - `node scripts/gerar-dados-bancario.js --force --verbose`

Artefatos atualizados:

- `dados-extrato/manifest.js`
- `dados-extrato/todas-cargas.js`
- `dados-extrato/extrato-*.js`
- `extrato-*.html`
- `dados-extrato/.cache-extrato-csv.json`

Quando um CSV e removido de `extrato_bancario/`, os artefatos obsoletos correspondentes tambem sao removidos automaticamente.

## Publicacao no GitHub Pages (HTML-Only)

Saida publicada: pasta `docs/` contendo somente HTML + `.nojekyll`.

Builder:

- `scripts/build-pages-html-only.js`

Comando local:

- `node scripts/build-pages-html-only.js`

O builder:

- processa todos os `.html` da raiz;
- embute CSS e JS locais no proprio HTML;
- remove scripts locais de geracao (`scripts/gerar-dados.js` e `scripts/gerar-dados-bancario.js`) da versao publicada;
- grava a saida final em `docs/`.

## Automacao de Publicacao

Workflow:

- `.github/workflows/update-docs-html-only.yml`

Comportamento:

- roda em push na `main` (ignorando `docs/**`);
- gera `docs/` automaticamente;
- commita e envia alteracoes em `docs/` quando houver diferenca.

Configuracao recomendada no GitHub:

1. Settings -> Pages
2. Source: `Deploy from a branch`
3. Branch: `main` / folder: `/docs`
