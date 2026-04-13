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