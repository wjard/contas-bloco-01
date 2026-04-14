(function () {
    const cargas = globalThis.INTER_TODAS_CARGAS || [];
    const alvo = document.getElementById('tabelaResumoMes');
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

    const mesesOrdenados = construirResumoMensal();

    const totais = mesesOrdenados.reduce(
        (acc, item) => {
            acc.entradas += item.entradas;
            acc.saidas += item.saidas;
            return acc;
        },
        { entradas: 0, saidas: 0 },
    );

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

    const saldoGeral = totais.entradas - totais.saidas;
    const saldoGeralClass = saldoGeral >= 0 ? 'positive' : 'negative';

    alvo.innerHTML = `
        <div class="table-wrap">
            <table>
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
                        <th class="${saldoGeralClass}">${moeda.format(saldoGeral)}</th>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
})();
