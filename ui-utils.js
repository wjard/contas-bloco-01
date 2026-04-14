(function () {
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

    const criarFormatadorMoeda = () =>
        new Intl.NumberFormat('pt-BR', {
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

    const formatarDataCurta = (valor) => {
        const texto = String(valor || '').trim();
        if (!texto) return '';

        const pad2 = (n) => String(n).padStart(2, '0');

        const matchPtBr = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(texto);
        if (matchPtBr) {
            const dia = Number(matchPtBr[1]);
            const mes = Number(matchPtBr[2]);
            const anoTexto = matchPtBr[3];
            const ano2 = anoTexto.length === 2 ? anoTexto : anoTexto.slice(-2);
            return `${pad2(dia)}/${pad2(mes)}/${ano2}`;
        }

        const matchIso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(texto);
        if (matchIso) {
            const ano2 = matchIso[1].slice(-2);
            const mes = Number(matchIso[2]);
            const dia = Number(matchIso[3]);
            return `${pad2(dia)}/${pad2(mes)}/${ano2}`;
        }

        const data = new Date(texto);
        if (!Number.isNaN(data.getTime())) {
            return `${pad2(data.getDate())}/${pad2(data.getMonth() + 1)}/${String(data.getFullYear()).slice(-2)}`;
        }

        return texto;
    };

    const uiUtils = {
        escapeHtml,
        normalizar,
        criarFormatadorMoeda,
        formatarDataISO,
        formatarDataCurta,
    };

    globalThis.EXTRATO_UI_UTILS = uiUtils;
})();
