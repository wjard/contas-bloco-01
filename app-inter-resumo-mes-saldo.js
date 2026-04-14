(function () {
    const cargas = globalThis.INTER_TODAS_CARGAS || [];
    const alvo = document.getElementById('tabelaResumoMes');
    if (!alvo) return;

    let mostrarTabelaMobile = false;

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

    const extrairMesAno = (mesTexto) => {
        const [mesNome, anoTexto] = String(mesTexto || '').split('-');
        const ano = Number.parseInt(anoTexto, 10);
        const ordemMes = ORDEM_MESES.indexOf(mesNome);

        if (!Number.isFinite(ano) || ordemMes < 0) return null;

        return {
            mesNome,
            ano,
            ordemMes,
            chave: `${ano}-${String(ordemMes + 1).padStart(2, '0')}`,
            rotulo: `${mesNome}/${ano}`,
        };
    };

    const isEntrada = (item) =>
        item.tipo === 'entrada' || Number(item.valor || 0) > 0;

    const garantirMes = (mapMeses, info) => {
        if (mapMeses.has(info.chave)) return mapMeses.get(info.chave);

        const base = {
            ano: info.ano,
            ordemMes: info.ordemMes,
            rotulo: info.rotulo,
            entradas: 0,
            saidas: 0,
        };

        mapMeses.set(info.chave, base);
        return base;
    };

    const acumularLancamentosMes = (acumulador, lancamentos) => {
        for (const item of lancamentos || []) {
            const valor = Math.abs(Number(item.valor || 0));
            if (isEntrada(item)) {
                acumulador.entradas += valor;
            } else {
                acumulador.saidas += valor;
            }
        }
    };

    const construirResumoMensal = () => {
        const mapMeses = new Map();

        for (const carga of cargas) {
            for (const mes of carga.porMes || []) {
                const info = extrairMesAno(mes.mes);
                if (!info) continue;

                const acumulador = garantirMes(mapMeses, info);
                acumularLancamentosMes(acumulador, mes.lancamentos);
            }
        }

        return Array.from(mapMeses.values()).sort(
            (a, b) => b.ano - a.ano || b.ordemMes - a.ordemMes,
        );
    };

    const formatarValorAssinado = (valor, formatter) => {
        const sinal = valor >= 0 ? '+' : '-';
        return `${sinal}${formatter(Math.abs(valor))}`;
    };

    const construirResumoRapido = (mesesOrdenados, totais) => {
        const ultimoMes = mesesOrdenados[0] || null;
        const mesAnterior = mesesOrdenados[1] || null;
        const saldoUltimoMes = ultimoMes
            ? ultimoMes.entradas - ultimoMes.saidas
            : 0;
        const saldoGeral = totais.entradas - totais.saidas;
        const saldoGeralClass = saldoGeral >= 0 ? 'positive' : 'negative';
        const saldoUltimoMesClass =
            saldoUltimoMes >= 0 ? 'positive' : 'negative';

        let textoVariacao = 'Sem mes anterior';
        let textoVariacaoPercentual = 'N/D';
        let variacaoClass = 'positive';

        if (mesAnterior) {
            const saldoAnterior = mesAnterior.entradas - mesAnterior.saidas;
            const variacaoSaldo = saldoUltimoMes - saldoAnterior;
            variacaoClass = variacaoSaldo >= 0 ? 'positive' : 'negative';
            textoVariacao = formatarValorAssinado(variacaoSaldo, (v) =>
                moeda.format(v),
            );

            if (Math.abs(saldoAnterior) >= 0.01) {
                const variacaoPercentual =
                    (variacaoSaldo / Math.abs(saldoAnterior)) * 100;
                textoVariacaoPercentual = formatarValorAssinado(
                    variacaoPercentual,
                    (v) => `${v.toFixed(1)}%`,
                );
            }
        }

        return {
            rotuloUltimoMes: ultimoMes ? ultimoMes.rotulo : 'N/D',
            saldoUltimoMes,
            saldoUltimoMesClass,
            saldoGeral,
            saldoGeralClass,
            textoVariacao,
            textoVariacaoPercentual,
            variacaoClass,
        };
    };

    const renderTela = () => {
        const mesesOrdenados = construirResumoMensal();

        const totais = mesesOrdenados.reduce(
            (acc, item) => {
                acc.entradas += item.entradas;
                acc.saidas += item.saidas;
                return acc;
            },
            { entradas: 0, saidas: 0 },
        );

        const resumoRapido = construirResumoRapido(mesesOrdenados, totais);

        const linhas = mesesOrdenados
            .map((item) => {
                const saldo = item.entradas - item.saidas;
                const saldoClass = saldo >= 0 ? 'positive' : 'negative';
                return `
                    <tr>
                        <td>${escapeHtml(item.rotulo)}</td>
                        <td class="positive">${moeda.format(item.entradas)}</td>
                        <td class="negative">${moeda.format(item.saidas)}</td>
                        <td class="${saldoClass}">${moeda.format(saldo)}</td>
                    </tr>
                `;
            })
            .join('');

        const cards = mesesOrdenados
            .map((item) => {
                const saldo = item.entradas - item.saidas;
                const saldoClass = saldo >= 0 ? 'positive' : 'negative';
                const volume = item.entradas + item.saidas;

                return `
                    <article class="resumo-mes-card-mobile">
                        <header class="resumo-mes-card-head">
                            <h3>${escapeHtml(item.rotulo)}</h3>
                            <strong class="${saldoClass}">${moeda.format(saldo)}</strong>
                        </header>
                        <div class="resumo-mes-card-grid">
                            <div>
                                <small>Entradas</small>
                                <strong class="positive">${moeda.format(item.entradas)}</strong>
                            </div>
                            <div>
                                <small>Saidas</small>
                                <strong class="negative">${moeda.format(item.saidas)}</strong>
                            </div>
                            <div>
                                <small>Movimentacao</small>
                                <strong>${moeda.format(volume)}</strong>
                            </div>
                        </div>
                    </article>
                `;
            })
            .join('');

        const textoToggleMobile = mostrarTabelaMobile
            ? 'Ver cards mobile'
            : 'Mostrar tabela completa';

        alvo.innerHTML = `
            <section class="resumo-mes-layout ${mostrarTabelaMobile ? 'show-table-mobile' : ''}">
                <section class="resumo-rapido-panel">
                    <article class="resumo-rapido-item">
                        <small>Ultimo mes</small>
                        <strong>${escapeHtml(resumoRapido.rotuloUltimoMes)}</strong>
                        <span class="${resumoRapido.saldoUltimoMesClass}">${moeda.format(resumoRapido.saldoUltimoMes)}</span>
                    </article>
                    <article class="resumo-rapido-item">
                        <small>Saldo acumulado</small>
                        <strong class="${resumoRapido.saldoGeralClass}">${moeda.format(resumoRapido.saldoGeral)}</strong>
                        <span>Entradas ${moeda.format(totais.entradas)} | Saidas ${moeda.format(totais.saidas)}</span>
                    </article>
                    <article class="resumo-rapido-item">
                        <small>Variacao vs mes anterior</small>
                        <strong class="${resumoRapido.variacaoClass}">${resumoRapido.textoVariacao}</strong>
                        <span>${resumoRapido.textoVariacaoPercentual}</span>
                    </article>
                </section>
                <div class="mobile-view-controls resumo-mes-controls">
                    <button type="button" class="mobile-view-toggle" data-resumo-mes-view-toggle="toggle">${textoToggleMobile}</button>
                </div>
                <div class="resumo-mes-mobile-list">
                    ${cards || '<article class="resumo-mes-card-mobile"><p class="cell-empty">Nenhum dado encontrado.</p></article>'}
                    <article class="resumo-mes-card-mobile resumo-mes-total-card">
                        <header class="resumo-mes-card-head">
                            <h3>Total Geral</h3>
                            <strong class="${resumoRapido.saldoGeralClass}">${moeda.format(resumoRapido.saldoGeral)}</strong>
                        </header>
                        <div class="resumo-mes-card-grid">
                            <div>
                                <small>Entradas</small>
                                <strong class="positive">${moeda.format(totais.entradas)}</strong>
                            </div>
                            <div>
                                <small>Saidas</small>
                                <strong class="negative">${moeda.format(totais.saidas)}</strong>
                            </div>
                            <div>
                                <small>Movimentacao</small>
                                <strong>${moeda.format(totais.entradas + totais.saidas)}</strong>
                            </div>
                        </div>
                    </article>
                </div>
                <div class="table-wrap resumo-mes-table-wrap">
                    <table class="resumo-mes-table">
                        <thead>
                            <tr>
                                <th>Mes</th>
                                <th>Entradas</th>
                                <th>Saidas</th>
                                <th>Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${linhas || '<tr><td colspan="4">Nenhum dado encontrado.</td></tr>'}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th>Total Geral</th>
                                <th class="positive">${moeda.format(totais.entradas)}</th>
                                <th class="negative">${moeda.format(totais.saidas)}</th>
                                <th class="${resumoRapido.saldoGeralClass}">${moeda.format(resumoRapido.saldoGeral)}</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </section>
        `;
    };

    alvo.addEventListener('click', (event) => {
        const botaoToggle = event.target.closest(
            '[data-resumo-mes-view-toggle]',
        );
        if (!botaoToggle || !alvo.contains(botaoToggle)) return;

        mostrarTabelaMobile = !mostrarTabelaMobile;
        renderTela();
    });

    renderTela();
})();
