(function () {
    const cargas = globalThis.EXTRATO_TODAS_CARGAS || [];
    const alvo =
        document.getElementById('extrato-main-content') ||
        document.getElementById('tabelasTodasCargas');
    if (!alvo) return;

    const appUtils = globalThis.EXTRATO_APP_UTILS;
    if (!appUtils) return;

    const uiUtils = appUtils.getUiUtils();

    const moeda = uiUtils.criarFormatadorMoeda();
    const escapeHtml = uiUtils.escapeHtml;

    const limitarTag = appUtils.limitarTag;

    const privacyUtils = appUtils.getPrivacyUtils();
    const extrairMesAno = appUtils.extrairMesAno;

    const LEGENDA_CATEGORIAS = appUtils.LEGENDA_CATEGORIAS;

    const CLASSE_CATEGORIA = new Map(
        LEGENDA_CATEGORIAS.map((item) => [item.nome, item.classe]),
    );

    const formatarRotuloColunaTag = appUtils.formatarRotuloColunaTag;

    const categoriasAtivas = new Set();
    let mostrarTabelaMobile = false;
    let mostrarTodasTagsMobileTabela = false;

    const getCategoriaLancamento = (item) =>
        limitarTag(privacyUtils.classificarCategoria(item.descricao));

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

    const categoriasVisiveis = () => {
        const todas = LEGENDA_CATEGORIAS.map((item) => item.nome);
        if (!categoriasAtivas.size) return todas;
        return todas.filter((cat) => categoriasAtivas.has(cat));
    };

    const classeTagCategoria = (categoria) =>
        CLASSE_CATEGORIA.get(categoria) || 'cat-outros';

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
            .sort((a, b) => b[0] - a[0])
            .map(([ano, mesesMap]) => ({
                ano,
                meses: Array.from(mesesMap.values()).sort(
                    (a, b) => b.ordemMes - a.ordemMes,
                ),
            }));
    };

    const renderTabelaAno = (anoData) => {
        const tags = categoriasVisiveis();
        const totalLancamentosAno = anoData.meses.reduce(
            (acc, mes) => acc + mes.lancamentos.length,
            0,
        );

        const totalPorTagAno = new Map(
            tags.map((tag) => [
                tag,
                anoData.meses.reduce(
                    (acc, mes) =>
                        acc +
                        somaValores(valoresDaCategoria(mes.lancamentos, tag)),
                    0,
                ),
            ]),
        );

        const tagsEssenciaisCalculadas = new Set(
            tags
                .slice()
                .sort((a, b) => {
                    const dif =
                        Math.abs(totalPorTagAno.get(b) || 0) -
                        Math.abs(totalPorTagAno.get(a) || 0);
                    if (dif !== 0) return dif;
                    return a.localeCompare(b, 'pt-BR');
                })
                .slice(0, 4),
        );

        const tagsComMeta = tags.map((tag) => ({
            nome: tag,
            opcional: !tagsEssenciaisCalculadas.has(tag),
        }));

        const renderCardsMes = (mes) => {
            const totaisCategorias = tags
                .map((tag) => {
                    const total = somaValores(
                        valoresDaCategoria(mes.lancamentos, tag),
                    );
                    return { tag, total };
                })
                .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

            const categoriasComMovimento = totaisCategorias.filter(
                (item) => Math.abs(item.total) > 0.009,
            );

            const categoriasSemMovimento = totaisCategorias.filter(
                (item) => Math.abs(item.total) <= 0.009,
            );

            const totalMes = somaValores(mes.lancamentos);
            const totalMesClass = totalMes >= 0 ? 'positive' : 'negative';

            const linhasPrincipais = categoriasComMovimento.length
                ? categoriasComMovimento
                      .map((item) => {
                          const classeValor =
                              item.total >= 0 ? 'positive' : 'negative';
                          const classeCat = classeTagCategoria(item.tag);
                          return `
                            <li class="month-card-item">
                                <span class="tag tag-category ${classeCat}">${escapeHtml(item.tag)}</span>
                                <strong class="${classeValor}">${moeda.format(item.total)}</strong>
                            </li>
                        `;
                      })
                      .join('')
                : '<li class="month-card-item"><span class="cell-empty">Sem movimentacao nas categorias selecionadas.</span></li>';

            const linhasSemMovimento = categoriasSemMovimento.length
                ? categoriasSemMovimento
                      .map((item) => {
                          const classeCat = classeTagCategoria(item.tag);
                          return `
                            <li class="month-card-item month-card-item-muted">
                                <span class="tag tag-category ${classeCat}">${escapeHtml(item.tag)}</span>
                                <span class="cell-empty">-</span>
                            </li>
                        `;
                      })
                      .join('')
                : '';

            const blocoSemMovimento = linhasSemMovimento
                ? `
                    <details class="month-card-details">
                        <summary>Mostrar categorias sem movimento (${categoriasSemMovimento.length})</summary>
                        <ul class="month-card-list month-card-list-muted">${linhasSemMovimento}</ul>
                    </details>
                `
                : '';

            return `
                <article class="month-card-mobile">
                    <header class="month-card-head">
                        <h4>${escapeHtml(mes.mesNome)}</h4>
                        <div class="month-card-meta">
                            <small>${mes.lancamentos.length} lanc.</small>
                            <strong class="${totalMesClass}">${moeda.format(totalMes)}</strong>
                        </div>
                    </header>
                    <ul class="month-card-list">${linhasPrincipais}</ul>
                    ${blocoSemMovimento}
                </article>
            `;
        };

        const cabecalhoTags = tagsComMeta
            .map(
                (tag) =>
                    `<th class="${tag.opcional ? 'optional-col' : ''}">${formatarRotuloColunaTag(tag.nome)}</th>`,
            )
            .join('');

        const linhasMeses = anoData.meses
            .map((mes) => {
                const celulas = tagsComMeta
                    .map(
                        (tag) =>
                            `<td class="${tag.opcional ? 'optional-col' : ''}">${renderCelulaCategoria(mes.lancamentos, tag.nome)}</td>`,
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

        const linhaTotal = tagsComMeta
            .map((tag) => {
                const totalTag = anoData.meses.reduce(
                    (acc, mes) =>
                        acc +
                        somaValores(
                            valoresDaCategoria(mes.lancamentos, tag.nome),
                        ),
                    0,
                );
                const totalItens = anoData.meses.reduce(
                    (acc, mes) =>
                        acc +
                        valoresDaCategoria(mes.lancamentos, tag.nome).length,
                    0,
                );
                const classe = totalTag >= 0 ? 'positive' : 'negative';

                return `<td class="year-total-cell ${tag.opcional ? 'optional-col' : ''}"><strong class="${classe}">${moeda.format(totalTag)}</strong><small>${totalItens} lanc.</small></td>`;
            })
            .join('');

        const cardsMeses = anoData.meses.map(renderCardsMes).join('');

        return `
            <section class="table-panel reveal delay-2 year-section ${mostrarTabelaMobile ? 'mobile-show-table' : ''} ${mostrarTabelaMobile && !mostrarTodasTagsMobileTabela ? 'table-mobile-compact' : ''}">
                <div class="panel-head">
                    <h3>${anoData.ano}</h3>
                    <p>Meses: ${anoData.meses.length} | Lancamentos: ${totalLancamentosAno}</p>
                </div>
                <div class="annual-mobile-view">${cardsMeses}</div>
                <div class="table-wrap annual-table-view">
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

        const textoBotaoMobile = mostrarTabelaMobile
            ? 'Ver resumo mobile'
            : 'Mostrar tabela completa';

        const textoBotaoTagsMobile = mostrarTodasTagsMobileTabela
            ? 'Mostrar menos TAGs'
            : 'Ver mais TAGs na tabela';

        const controleTagsMobile = mostrarTabelaMobile
            ? `<button type="button" class="mobile-view-toggle mobile-view-toggle-secondary" data-mobile-tags-toggle="toggle">${textoBotaoTagsMobile}</button>`
            : '';

        const controleMobile = `
            <div class="mobile-view-controls">
                <button type="button" class="mobile-view-toggle" data-mobile-table-toggle="toggle">${textoBotaoMobile}</button>
                ${controleTagsMobile}
            </div>
        `;

        alvo.innerHTML = `${renderLegendaCategorias()}${controleMobile}${estadoVazio}${secoesAnos}`;
    };

    alvo.addEventListener('click', (event) => {
        const botaoMobile = event.target.closest('[data-mobile-table-toggle]');
        if (botaoMobile && alvo.contains(botaoMobile)) {
            mostrarTabelaMobile = !mostrarTabelaMobile;
            renderTela();
            return;
        }

        const botaoTagsMobile = event.target.closest(
            '[data-mobile-tags-toggle]',
        );
        if (botaoTagsMobile && alvo.contains(botaoTagsMobile)) {
            mostrarTodasTagsMobileTabela = !mostrarTodasTagsMobileTabela;
            renderTela();
            return;
        }

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
