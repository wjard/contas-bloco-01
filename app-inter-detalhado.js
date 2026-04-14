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

    const ordenarMesesDesc = (meses) => {
        return [...(meses || [])].sort((a, b) => {
            const ordemA = extrairOrdemMesAno(a.mes);
            const ordemB = extrairOrdemMesAno(b.mes);
            return ordemB.ano - ordemA.ano || ordemB.mes - ordemA.mes;
        });
    };

    const ordenarCargasDesc = (listaCargas) => {
        const obterOrdemCarga = (carga) => {
            const meses = ordenarMesesDesc(carga.porMes || []);
            if (!meses.length) return { ano: 0, mes: -1 };
            return extrairOrdemMesAno(meses[0].mes);
        };

        return [...(listaCargas || [])].sort((a, b) => {
            const ordemA = obterOrdemCarga(a);
            const ordemB = obterOrdemCarga(b);
            return ordemB.ano - ordemA.ano || ordemB.mes - ordemA.mes;
        });
    };

    const classificarCategoria = (descricao) => {
        const desc = normalizar(descricao);
        const regra = REGRAS_CATEGORIA.find((item) => item.test(desc));
        return regra ? regra.tag : 'Outros';
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
        limitarTag(classificarCategoria(item.descricao));

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
                const descricaoHtml = escapeHtml(item.descricao);
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
        const secoesCargas = ordenarCargasDesc(cargas)
            .map((carga) => {
                const mesesFonte = ordenarMesesDesc(carga.porMes || []);
                const mesesRender = categoriasAtivas.size
                    ? mesesFonte.filter(
                          (mes) =>
                              filtrarLancamentos(mes.lancamentos || []).length >
                              0,
                      )
                    : mesesFonte;

                const tabelasMeses = mesesRender.map(renderMes).join('');
                const totalLancamentos = mesesRender.reduce(
                    (acc, mes) =>
                        acc + filtrarLancamentos(mes.lancamentos || []).length,
                    0,
                );

                if (!totalLancamentos && categoriasAtivas.size) {
                    return '';
                }

                const tituloPeriodo = `${carga.periodo?.inicio || '-'} ate ${carga.periodo?.fim || '-'}`;

                return `
                    <section class="table-panel reveal delay-2">
                        <div class="panel-head">
                            <h3>${escapeHtml(tituloPeriodo)}</h3>
                            <p>Arquivo: ${escapeHtml(carga.arquivoCsv || '-')} | Lancamentos: ${totalLancamentos}</p>
                        </div>
                        <div class="months-grid">${tabelasMeses}</div>
                    </section>
                `;
            })
            .join('');

        const estadoVazio = secoesCargas
            ? ''
            : '<section class="table-panel"><div class="panel-head"><p>Nenhum lancamento encontrado para os filtros selecionados.</p></div></section>';

        alvo.innerHTML = `${renderLegendaCategorias()}${estadoVazio}${secoesCargas}`;
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
