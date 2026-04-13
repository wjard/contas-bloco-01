(function () {
    const cargas = globalThis.INTER_TODAS_CARGAS || [];
    const alvo = document.getElementById('tabelasTodasCargas');
    if (!alvo) return;

    const moeda = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });

    const escapeHtml = (texto) =>
        String(texto)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');

    const normalizar = (texto) =>
        String(texto || '')
            .normalize('NFD')
            .replaceAll(/[\u0300-\u036f]/g, '')
            .toLowerCase();

    const limitarTag = (texto) => String(texto).slice(0, 20);

    const temTodos = (texto, termos) =>
        termos.every((termo) => texto.includes(termo));

    const ORDEM_MESES = [
        'JANEIRO',
        'FEVEREIRO',
        'MARCO',
        'ABRIL',
        'MAIO',
        'JUNHO',
        'JULHO',
        'AGOSTO',
        'SETEMBRO',
        'OUTUBRO',
        'NOVEMBRO',
        'DEZEMBRO',
    ];

    const REGRAS_CATEGORIA = [
        {
            tag: 'Boleto Condo. Bloco',
            test: (d) =>
                d.includes('boleto de cobranca recebido') ||
                d.includes('pix recebido: "') ||
                temTodos(d, ['pix recebido', 'cp']),
        },
        {
            tag: 'Gratificação Subsind',
            test: (d) =>
                temTodos(d, ['pix enviado', 'glayce kelly calisto pena']) ||
                temTodos(d, ['pix enviado', 'mariana']),
        },
        {
            tag: 'Gratificação Limpeza',
            test: (d) => temTodos(d, ['pix enviado', 'maria edina ferreira']),
        },
        {
            tag: 'Conta Consumo',
            test: (d) =>
                d.includes('pagamento copasa') ||
                d.includes('companhia de saneamento') ||
                d.includes('pagamento cemig') ||
                d.includes('pix enviado cemig') ||
                d.includes('pix enviado copasa') ||
                d.includes('cemig distribuicao') ||
                d.includes('copasa minas gerais') ||
                d.includes('copasa mg'),
        },
        {
            tag: 'Rateio Agua',
            test: (d) =>
                temTodos(d, ['pix enviado', '60701190-seu consumo']) ||
                d.includes('seu consumo') ||
                d.includes('seu cosumo') ||
                temTodos(d, ['leitura', 'hidrometro']),
        },
        {
            tag: 'Repasse Condo. Geral',
            test: (d) =>
                temTodos(d, [
                    'pagamento de titulo',
                    'residencial village da fonte',
                ]) ||
                temTodos(d, ['pix enviado', 'residencial village da fonte']) ||
                temTodos(d, ['pix', 'sandro']) ||
                d.includes('sandro souza'),
        },
        {
            tag: 'Seguro/Manut.',
            test: (d) => {
                return (
                    d.includes('tokio marine seguradora') ||
                    d.includes('seguradora') ||
                    d.includes('seguradoras') ||
                    d.includes('desinsetizadora') ||
                    d.includes('desentupidora') ||
                    temTodos(d, ['pix enviado', 'incendio']) ||
                    d.includes('nitro')
                );
            },
        },
        {
            tag: 'Devolução',
            test: (d) => temTodos(d, ['pix enviado', 'gleidstone']),
        },
        {
            tag: 'Material Limpeza',
            test: (d) =>
                temTodos(d, ['pix enviado', 'supermercados bh']) ||
                temTodos(d, ['pix enviado', 'comercio de alimentos']),
        },
        {
            tag: 'Terceiros',
            test: (d) =>
                d.includes('pagamento efetuado') ||
                temTodos(d, ['pix enviado', 'cp']),
        },
    ];

    const LEGENDA_CATEGORIAS = [
        { nome: 'Boleto Condo. Bloco', classe: 'cat-boleto' },
        { nome: 'Gratificação Subsind', classe: 'cat-subsindico' },
        { nome: 'Gratificação Limpeza', classe: 'cat-limpeza' },
        { nome: 'Conta Consumo', classe: 'cat-consumo' },
        { nome: 'Rateio Agua', classe: 'cat-rateio' },
        { nome: 'Repasse Condo. Geral', classe: 'cat-repasse' },
        { nome: 'Seguro/Manut.', classe: 'cat-seguro' },
        { nome: 'Devolução', classe: 'cat-devolucao' },
        { nome: 'Material Limpeza', classe: 'cat-materiais' },
        { nome: 'Terceiros', classe: 'cat-terceiros' },
    ];

    const categoriasAtivas = new Set();

    const classificarCategoria = (descricao) => {
        const desc = normalizar(descricao);
        const regra = REGRAS_CATEGORIA.find((item) => item.test(desc));
        return regra ? regra.tag : 'Outros';
    };

    const getCategoriaLancamento = (item) =>
        limitarTag(classificarCategoria(item.descricao));

    const filtrarLancamentos = (lancamentos) => {
        if (!categoriasAtivas.size) return lancamentos || [];
        return (lancamentos || []).filter((item) =>
            categoriasAtivas.has(getCategoriaLancamento(item)),
        );
    };

    const renderLegendaCategorias = () => {
        const classeFiltro = categoriasAtivas.size
            ? `Filtros ativos: ${escapeHtml(Array.from(categoriasAtivas).join(', '))}`
            : 'Filtros ativos: Todas as categorias';

        const tagTodasClass = categoriasAtivas.size
            ? 'tag tag-category legend-filter-tag cat-outros'
            : 'tag tag-category legend-filter-tag cat-outros legend-tag-active';

        const tags = LEGENDA_CATEGORIAS.map((item) => {
            const ativa = categoriasAtivas.has(item.nome);
            const ativaClass = ativa ? ' legend-tag-active' : '';

            return `<button type="button" class="tag tag-category legend-filter-tag ${item.classe}${ativaClass}" data-filter-category="${escapeHtml(item.nome)}">${escapeHtml(item.nome)}</button>`;
        }).join('');

        const tagTodas = `<button type="button" class="${tagTodasClass}" data-filter-category="ALL">Todas</button>`;

        return `
            <section class="category-legend reveal delay-1">
                <h3>Dicionario de Cores</h3>
                <p>Clique para marcar varias TAGs e combinar filtros. Clique novamente para desmarcar.</p>
                <p class="category-legend-status">${classeFiltro}</p>
                <div class="category-legend-tags">${tagTodas}${tags}</div>
            </section>
        `;
    };

    const extrairMesAno = (mesTexto) => {
        const [mesNome, anoTexto] = String(mesTexto || '').split('-');
        const ano = Number.parseInt(anoTexto, 10);
        const ordemMes = ORDEM_MESES.indexOf(mesNome);

        if (!Number.isFinite(ano) || ordemMes < 0) {
            return null;
        }

        return { ano, mesNome, ordemMes };
    };

    const categoriasVisiveis = () => {
        const todas = LEGENDA_CATEGORIAS.map((item) => item.nome);
        if (!categoriasAtivas.size) return todas;
        return todas.filter((cat) => categoriasAtivas.has(cat));
    };

    const valoresDaCategoria = (lancamentos, categoria) =>
        (lancamentos || []).filter(
            (item) => getCategoriaLancamento(item) === categoria,
        );

    const somaValores = (lancamentos) =>
        (lancamentos || []).reduce(
            (acc, item) => acc + Number(item.valor || 0),
            0,
        );

    const renderCelulaCategoria = (lancamentosMes, categoria) => {
        const itens = valoresDaCategoria(lancamentosMes, categoria);
        if (!itens.length) return '<span class="cell-empty">-</span>';

        const soma = somaValores(itens);
        const somaClass = soma >= 0 ? 'positive' : 'negative';

        return `<strong class="${somaClass}">${moeda.format(soma)}</strong>`;
    };

    const construirAnos = () => {
        const anosMap = new Map();

        for (const carga of cargas) {
            for (const mes of carga.porMes || []) {
                const info = extrairMesAno(mes.mes);
                if (!info) continue;

                const lancamentosMes = filtrarLancamentos(
                    mes.lancamentos || [],
                );
                if (!lancamentosMes.length) continue;

                if (!anosMap.has(info.ano)) {
                    anosMap.set(info.ano, new Map());
                }

                const mesesMap = anosMap.get(info.ano);
                const chaveMes = `${info.ordemMes}-${info.mesNome}`;

                if (!mesesMap.has(chaveMes)) {
                    mesesMap.set(chaveMes, {
                        mesNome: info.mesNome,
                        ordemMes: info.ordemMes,
                        lancamentos: [],
                    });
                }

                mesesMap.get(chaveMes).lancamentos.push(...lancamentosMes);
            }
        }

        return Array.from(anosMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([ano, mesesMap]) => ({
                ano,
                meses: Array.from(mesesMap.values()).sort(
                    (a, b) => a.ordemMes - b.ordemMes,
                ),
            }));
    };

    const renderTabelaAno = (anoData) => {
        const tags = categoriasVisiveis();
        const totalLancamentosAno = anoData.meses.reduce(
            (acc, mes) => acc + mes.lancamentos.length,
            0,
        );

        const cabecalhoTags = tags
            .map((tag) => `<th>${escapeHtml(tag)}</th>`)
            .join('');

        const linhasMeses = anoData.meses
            .map((mes) => {
                const celulas = tags
                    .map(
                        (tag) =>
                            `<td>${renderCelulaCategoria(mes.lancamentos, tag)}</td>`,
                    )
                    .join('');

                return `
                    <tr>
                        <th class="month-row-title" scope="row">${escapeHtml(mes.mesNome)}</th>
                        ${celulas}
                    </tr>
                `;
            })
            .join('');

        const linhaTotal = tags
            .map((tag) => {
                const totalTag = anoData.meses.reduce(
                    (acc, mes) =>
                        acc +
                        somaValores(valoresDaCategoria(mes.lancamentos, tag)),
                    0,
                );
                const totalItens = anoData.meses.reduce(
                    (acc, mes) =>
                        acc + valoresDaCategoria(mes.lancamentos, tag).length,
                    0,
                );
                const classe = totalTag >= 0 ? 'positive' : 'negative';

                return `<td class="year-total-cell"><strong class="${classe}">${moeda.format(totalTag)}</strong><small>${totalItens} lanc.</small></td>`;
            })
            .join('');

        return `
            <section class="table-panel reveal delay-2">
                <div class="panel-head">
                    <h3>${anoData.ano}</h3>
                    <p>Meses: ${anoData.meses.length} | Lancamentos: ${totalLancamentosAno}</p>
                </div>
                <div class="table-wrap">
                    <table class="year-matrix-table">
                        <thead>
                            <tr>
                                <th>Mes</th>
                                ${cabecalhoTags}
                            </tr>
                        </thead>
                        <tbody>${linhasMeses}</tbody>
                        <tfoot>
                            <tr>
                                <th>TOTAL ${anoData.ano}</th>
                                ${linhaTotal}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </section>
        `;
    };

    const renderTela = () => {
        const anos = construirAnos();
        const secoesAnos = anos.map(renderTabelaAno).join('');

        const estadoVazio = secoesAnos
            ? ''
            : '<section class="table-panel"><div class="panel-head"><p>Nenhum lancamento encontrado para os filtros selecionados.</p></div></section>';

        alvo.innerHTML = `${renderLegendaCategorias()}${estadoVazio}${secoesAnos}`;
    };

    alvo.addEventListener('click', (event) => {
        const botao = event.target.closest('[data-filter-category]');
        if (!botao || !alvo.contains(botao)) return;

        const valor = botao.dataset.filterCategory;
        if (!valor) return;

        if (valor === 'ALL') {
            categoriasAtivas.clear();
        } else if (categoriasAtivas.has(valor)) {
            categoriasAtivas.delete(valor);
        } else {
            categoriasAtivas.add(valor);
        }

        renderTela();
    });

    renderTela();
})();
