(function () {
    const dados = globalThis.DADOS_FINANCEIROS;
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

    const cards = [
        {
            titulo: 'Periodo',
            valor: `${dados.periodo.inicio} ate ${dados.periodo.fim}`,
        },
        {
            titulo: 'Entradas Totais',
            valor: moeda.format(dados.resumo.totalEntradas),
        },
        {
            titulo: 'Saidas Totais',
            valor: moeda.format(dados.resumo.totalSaidas),
        },
        {
            titulo: 'Saldo Geral',
            valor: moeda.format(dados.resumo.saldoGeral),
        },
        { titulo: 'Atualizado em', valor: formatarDataISO(dados.atualizadoEm) },
    ];

    const resumoCards = document.getElementById('resumoCards');
    resumoCards.innerHTML = cards
        .map(
            (card) => `
      <article class="card">
        <small>${card.titulo}</small>
        <strong>${card.valor}</strong>
      </article>
    `,
        )
        .join('');

    const tabelasMeses = document.getElementById('tabelasMeses');
    tabelasMeses.innerHTML = dados.porMes
        .map((mes) => {
            const saldoClass = mes.saldo >= 0 ? 'positive' : 'negative';

            const linhas = mes.lancamentos
                .map((item) => {
                    const tipoClass =
                        item.tipo === 'entrada' ? 'positive' : 'negative';
                    const tipoTexto =
                        item.tipo === 'entrada' ? 'Entrada' : 'Saida';
                    const origemTexto =
                        item.origem === 'bloco_entrada_extra'
                            ? 'Entrada extra'
                            : 'Bloco 01';

                    return `
                        <tr>
                            <td>${escapeHtml(item.data)}</td>
                            <td>${escapeHtml(item.descricao)}</td>
                            <td class="${tipoClass}">${tipoTexto}</td>
                            <td>${escapeHtml(origemTexto)}</td>
                            <td>${moeda.format(item.valor)}</td>
                        </tr>
                    `;
                })
                .join('');

            return `
                <article class="month-section">
                    <header class="month-header">
                        <h3>${escapeHtml(mes.mes)}</h3>
                        <div class="month-summary">
                            <span>Entradas: <strong>${moeda.format(mes.entradas)}</strong></span>
                            <span>Saidas: <strong>${moeda.format(mes.saidas)}</strong></span>
                            <span class="${saldoClass}">Saldo: <strong>${moeda.format(mes.saldo)}</strong></span>
                            <span>Itens: <strong>${mes.itens}</strong></span>
                        </div>
                    </header>
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Descricao</th>
                                    <th>Tipo</th>
                                    <th>Origem</th>
                                    <th>Valor</th>
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
