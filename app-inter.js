(function () {
    const dados = globalThis.DADOS_FINANCEIROS;
    const cargas = globalThis.INTER_CARGAS || [];
    if (!dados) return;

    const moeda = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });

    const formatarDataISO = (iso) => {
        const data = new Date(iso);
        if (Number.isNaN(data.getTime())) return '-';
        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

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

    const extrairOrdemMesAno = (mesTexto) => {
        const [mesNome, anoTexto] = String(mesTexto || '').split('-');
        const ano = Number.parseInt(anoTexto, 10);
        const mes = ORDEM_MESES.indexOf(mesNome);
        if (!Number.isFinite(ano) || mes < 0) return { ano: 0, mes: -1 };
        return { ano, mes };
    };

    const cards = [
        {
            titulo: 'Arquivo',
            valor: dados.arquivo || '-',
        },
        {
            titulo: 'Periodo',
            valor: `${dados.periodo.inicio || '-'} ate ${dados.periodo.fim || '-'}`,
        },
        {
            titulo: 'Entradas Totais',
            valor: moeda.format(dados.resumo.totalEntradas || 0),
        },
        {
            titulo: 'Saidas Totais',
            valor: moeda.format(dados.resumo.totalSaidas || 0),
        },
        {
            titulo: 'Saldo Geral',
            valor: moeda.format(dados.resumo.saldoGeral || 0),
        },
        {
            titulo: 'Atualizado em',
            valor: formatarDataISO(dados.atualizadoEm),
        },
    ];

    const resumoCards = document.getElementById('resumoCards');
    resumoCards.innerHTML = cards
        .map(
            (card) => `
      <article class="card">
        <small>${escapeHtml(card.titulo)}</small>
        <strong>${escapeHtml(card.valor)}</strong>
      </article>
    `,
        )
        .join('');

    const seletorDetalhe = document.getElementById('cargaSelectDetalhe');
    if (seletorDetalhe) {
        const atual = String(location.pathname).split('/').pop();
        const options = [
            '<option value="">Selecione uma carga</option>',
            ...cargas.map(
                (c) =>
                    `<option value="${escapeHtml(c.paginaHtml)}" ${c.paginaHtml === atual ? 'selected' : ''}>${escapeHtml(c.arquivoCsv)}</option>`,
            ),
        ];
        seletorDetalhe.innerHTML = options.join('');
        seletorDetalhe.addEventListener('change', (event) => {
            const pagina = event.target.value;
            if (pagina) location.href = pagina;
        });
    }

    const tabelasMeses = document.getElementById('tabelasMeses');
    const mesesOrdenados = [...(dados.porMes || [])].sort((a, b) => {
        const ordemA = extrairOrdemMesAno(a.mes);
        const ordemB = extrairOrdemMesAno(b.mes);
        return ordemB.ano - ordemA.ano || ordemB.mes - ordemA.mes;
    });

    tabelasMeses.innerHTML = mesesOrdenados
        .map((mes) => {
            const saldoClass = mes.saldo >= 0 ? 'positive' : 'negative';

            const linhas = (mes.lancamentos || [])
                .map((item) => {
                    const tipoClass =
                        item.tipo === 'entrada' ? 'positive' : 'negative';
                    const tipoTexto =
                        item.tipo === 'entrada' ? 'Entrada' : 'Saida';
                    const valorClass =
                        item.valor >= 0 ? 'positive' : 'negative';

                    return `
                        <tr>
                            <td>${escapeHtml(item.data)}</td>
                            <td>${escapeHtml(item.descricao)}</td>
                            <td class="${tipoClass}">${tipoTexto}</td>
                            <td class="${valorClass}">${moeda.format(item.valor)}</td>
                            <td>${moeda.format(item.saldoConta || 0)}</td>
                        </tr>
                    `;
                })
                .join('');

            return `
                <article class="month-section">
                    <header class="month-header">
                        <h3>${escapeHtml(mes.mes)}</h3>
                        <div class="month-summary">
                            <span>Entradas: <strong>${moeda.format(mes.entradas || 0)}</strong></span>
                            <span>Saidas: <strong>${moeda.format(mes.saidas || 0)}</strong></span>
                            <span class="${saldoClass}">Saldo: <strong>${moeda.format(mes.saldo || 0)}</strong></span>
                            <span>Itens: <strong>${mes.itens || 0}</strong></span>
                        </div>
                    </header>
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Data Lancamento</th>
                                    <th>Descricao</th>
                                    <th>Tipo</th>
                                    <th>Valor</th>
                                    <th>Saldo</th>
                                </tr>
                            </thead>
                            <tbody>${linhas}</tbody>
                        </table>
                    </div>
                </article>
            `;
        })
        .join('');
})();
