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

    const privacyUtils = globalThis.INTER_PRIVACY_UTILS || {
        classificarCategoria: () => 'Outros',
        anonimizarDescricaoPorCategoria: (descricao) => descricao,
    };

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
        { nome: 'Outros', classe: 'cat-outros' },
    ];

    const categoriasAtivas = new Set();

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

    const extrairOrdemMesAno = (mesTexto) => {
        const [mesNome, anoTexto] = String(mesTexto || '').split('-');
        const ano = Number.parseInt(anoTexto, 10);
        const mes = ORDEM_MESES.indexOf(mesNome);
        if (!Number.isFinite(ano) || mes < 0) return { ano: 0, mes: -1 };
        return { ano, mes };
    };

    const getClasseCategoria = (categoria) => {
        const valor = normalizar(categoria);

        if (valor.includes('boleto condo. bloco')) return 'cat-boleto';
        if (valor.includes('gratificacao subsind')) return 'cat-subsindico';
        if (valor.includes('gratificacao limpeza')) return 'cat-limpeza';
        if (valor.includes('conta consumo')) return 'cat-consumo';
        if (valor.includes('rateio agua')) return 'cat-rateio';
        if (valor.includes('repasse condo')) return 'cat-repasse';
        if (valor.includes('seguro/manut')) return 'cat-seguro';
        if (valor.includes('devolucao')) return 'cat-devolucao';
        if (valor.includes('material limpeza')) return 'cat-materiais';
        if (valor.includes('terceiros')) return 'cat-terceiros';

        return 'cat-outros';
    };

    const getCategoriaLancamento = (item) =>
        limitarTag(privacyUtils.classificarCategoria(item.descricao));

    const normalizarUrlComprovante = (valor) => {
        const texto = String(valor || '').trim();
        if (!texto) return null;

        const caminho = texto.replaceAll('\\', '/');
        const possuiProtocolo = /^https?:\/\//i.test(caminho);
        const iniciaComWww = /^www\./i.test(caminho);

        if (possuiProtocolo) {
            return encodeURI(caminho);
        }

        if (iniciaComWww) {
            return encodeURI(`https://${caminho}`);
        }

        if (
            caminho.startsWith('./') ||
            caminho.startsWith('../') ||
            caminho.startsWith('/')
        ) {
            return encodeURI(caminho);
        }

        return encodeURI(`./${caminho}`);
    };

    const isCredito = (item) =>
        item.tipo === 'entrada' || Number(item.valor || 0) > 0;

    const filtrarLancamentos = (lancamentos) => {
        if (!categoriasAtivas.size) return lancamentos || [];
        return (lancamentos || []).filter((item) =>
            categoriasAtivas.has(getCategoriaLancamento(item)),
        );
    };

    const resumirLancamentos = (lancamentos) => {
        return (lancamentos || []).reduce(
            (acc, item) => {
                const valor = Number(item.valor || 0);
                if (isCredito(item)) {
                    acc.entradas += Math.abs(valor);
                } else {
                    acc.saidas += Math.abs(valor);
                }
                acc.itens += 1;
                return acc;
            },
            { entradas: 0, saidas: 0, itens: 0 },
        );
    };

    const construirAnos = () => {
        const anosMap = new Map();

        for (const carga of cargas) {
            for (const mes of carga.porMes || []) {
                const ordem = extrairOrdemMesAno(mes.mes);
                if (!ordem.ano || ordem.mes < 0) continue;

                if (!anosMap.has(ordem.ano)) {
                    anosMap.set(ordem.ano, new Map());
                }

                const mesesMap = anosMap.get(ordem.ano);
                const chaveMes = `${ordem.ano}-${String(ordem.mes + 1).padStart(2, '0')}`;
                const entradaExistente = mesesMap.get(chaveMes);

                if (entradaExistente) {
                    entradaExistente.lancamentos.push(
                        ...(mes.lancamentos || []),
                    );
                    continue;
                }

                mesesMap.set(chaveMes, {
                    mes: mes.mes,
                    ordemMes: ordem.mes,
                    lancamentos: [...(mes.lancamentos || [])],
                });
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

    const renderMes = (mes) => {
        const lancamentosFiltrados = filtrarLancamentos(mes.lancamentos || []);
        const resumoFiltrado = resumirLancamentos(lancamentosFiltrados);
        const saldoFiltrado = resumoFiltrado.entradas - resumoFiltrado.saidas;
        const saldoClass = saldoFiltrado >= 0 ? 'positive' : 'negative';

        const linhas = lancamentosFiltrados
            .map((item) => {
                const tipoClass =
                    item.tipo === 'entrada' ? 'positive' : 'negative';
                const tipoTexto = item.tipo === 'entrada' ? 'Entrada' : 'Saida';
                const valorClass =
                    Number(item.valor || 0) >= 0 ? 'positive' : 'negative';
                const categoria = getCategoriaLancamento(item);
                const classeCategoria = getClasseCategoria(categoria);
                const urlComprovante = normalizarUrlComprovante(
                    item.urlcomprovante,
                );
                const descricaoExibicao =
                    privacyUtils.anonimizarDescricaoPorCategoria(
                        item.descricao,
                        categoria,
                    );
                const descricaoHtml = escapeHtml(descricaoExibicao);
                const descricaoConteudo = urlComprovante
                    ? `<a class="comprovante-link" href="${escapeHtml(urlComprovante)}" target="_blank" rel="noopener noreferrer">${descricaoHtml}</a>`
                    : descricaoHtml;

                return `
                    <tr>
                        <td>${escapeHtml(item.data)}</td>
                        <td>${descricaoConteudo}</td>
                        <td><span class="tag tag-category ${classeCategoria}">${escapeHtml(categoria)}</span></td>
                        <td class="${tipoClass}">${tipoTexto}</td>
                        <td class="${valorClass}">${moeda.format(Number(item.valor || 0))}</td>
                        <td>${moeda.format(Number(item.saldoConta || 0))}</td>
                    </tr>
                `;
            })
            .join('');

        const tbodyHtml =
            linhas ||
            '<tr><td colspan="6">Nenhum lancamento para o filtro selecionado.</td></tr>';

        return `
            <article class="month-section">
                <header class="month-header">
                    <h3>${escapeHtml(mes.mes)}</h3>
                    <div class="month-summary">
                        <span>Entradas: <strong>${moeda.format(resumoFiltrado.entradas)}</strong></span>
                        <span>Saidas: <strong>${moeda.format(resumoFiltrado.saidas)}</strong></span>
                        <span class="${saldoClass}">Saldo: <strong>${moeda.format(saldoFiltrado)}</strong></span>
                        <span>Itens: <strong>${resumoFiltrado.itens}</strong></span>
                    </div>
                </header>
                <div class="table-wrap">
                    <table class="detailed-table">
                        <thead>
                            <tr>
                                <th>Data Lancamento</th>
                                <th>Descricao</th>
                                <th>Tag</th>
                                <th>Tipo</th>
                                <th>Valor</th>
                                <th>Saldo</th>
                            </tr>
                        </thead>
                        <tbody>${tbodyHtml}</tbody>
                    </table>
                </div>
            </article>
        `;
    };

    const renderTela = () => {
        const secoesAnos = construirAnos()
            .map((anoData) => {
                const mesesRender = categoriasAtivas.size
                    ? anoData.meses.filter(
                          (mes) =>
                              filtrarLancamentos(mes.lancamentos || []).length >
                              0,
                      )
                    : anoData.meses;

                const totalLancamentos = mesesRender.reduce(
                    (acc, mes) =>
                        acc + filtrarLancamentos(mes.lancamentos || []).length,
                    0,
                );

                if (!totalLancamentos && categoriasAtivas.size) {
                    return '';
                }

                const tabelasMeses = mesesRender.map(renderMes).join('');

                return `
                    <section class="table-panel reveal delay-2">
                        <div class="panel-head">
                            <h3>${anoData.ano}</h3>
                            <p>Meses: ${mesesRender.length} | Lancamentos: ${totalLancamentos}</p>
                        </div>
                        <div class="months-grid">${tabelasMeses}</div>
                    </section>
                `;
            })
            .join('');

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
