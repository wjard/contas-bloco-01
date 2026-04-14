(function () {
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

    const CONFIG_ROTULO_TAG_COLUNA = {
        'Boleto Condo. Bloco': 'Boleto Cond.<br>Bloco',
        'Repasse Condo. Geral': 'Repasse Cond.<br>Geral',
        'Material Limpeza': 'Material<br>Limpeza',
        'Conta Consumo': 'Conta<br>Consumo',
        'Rateio Agua': 'Rateio<br>Água',
        'Seguro/Manut.': 'Seguro/<br>Manut.',
    };

    const LIMITE_CHARS_TAG_COLUNA = 16;

    const quebrarPalavraPorLimite = (palavra, limite) => {
        const partes = [];
        let restante = String(palavra || '');

        while (restante.length > limite) {
            partes.push(restante.slice(0, limite));
            restante = restante.slice(limite);
        }

        if (restante) partes.push(restante);
        return partes;
    };

    const empilharPalavraLonga = (palavra, limite, linhas) => {
        const partes = quebrarPalavraPorLimite(palavra, limite);
        if (!partes.length) return '';
        linhas.push(...partes.slice(0, -1));
        return partes.at(-1) || '';
    };

    const quebrarTextoPorLimite = (texto, limite = LIMITE_CHARS_TAG_COLUNA) => {
        const escapeHtml = getUiUtils().escapeHtml;
        const textoLimpo = String(texto || '').trim();
        if (!textoLimpo) return '';
        if (textoLimpo.length <= limite) return escapeHtml(textoLimpo);

        const palavras = textoLimpo.split(/\s+/);
        const linhas = [];
        let linhaAtual = '';

        for (const palavra of palavras) {
            const candidato = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;

            if (candidato.length <= limite) {
                linhaAtual = candidato;
                continue;
            }

            if (linhaAtual) {
                linhas.push(linhaAtual);
            }

            if (palavra.length <= limite) {
                linhaAtual = palavra;
                continue;
            }

            linhaAtual = empilharPalavraLonga(palavra, limite, linhas);
        }

        if (linhaAtual) linhas.push(linhaAtual);
        return linhas.map((item) => escapeHtml(item)).join('<br>');
    };

    const formatarRotuloColunaTag = (
        nomeTag,
        configRotulo = CONFIG_ROTULO_TAG_COLUNA,
        limite = LIMITE_CHARS_TAG_COLUNA,
    ) => {
        const escapeHtml = getUiUtils().escapeHtml;
        const valorConfigurado = configRotulo[nomeTag];
        if (valorConfigurado) {
            return String(valorConfigurado)
                .split(/<br\s*\/?\s*>/i)
                .map((parte) => escapeHtml(parte.trim()))
                .filter(Boolean)
                .join('<br>');
        }

        return quebrarTextoPorLimite(nomeTag, limite);
    };

    const getClasseCategoria = (categoria) => {
        const normalizar = getUiUtils().normalizar;
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

    const getUiUtils = () =>
        globalThis.EXTRATO_UI_UTILS || {
            criarFormatadorMoeda: () =>
                new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                }),
            formatarDataISO: () => '-',
            escapeHtml: String,
            normalizar: (texto) => String(texto || '').toLowerCase(),
            formatarDataCurta: (valor) => String(valor || ''),
        };

    const getPrivacyUtils = () =>
        globalThis.EXTRATO_PRIVACY_UTILS || {
            classificarCategoria: () => 'Outros',
            anonimizarDescricaoPorCategoria: (descricao) => descricao,
        };

    const extrairOrdemMesAno = (mesTexto) => {
        const [mesNome, anoTexto] = String(mesTexto || '').split('-');
        const ano = Number.parseInt(anoTexto, 10);
        const mes = ORDEM_MESES.indexOf(mesNome);
        if (!Number.isFinite(ano) || mes < 0) return { ano: 0, mes: -1 };
        return { ano, mes };
    };

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

    const limitarTag = (texto, limite = 20) => String(texto).slice(0, limite);

    const isEntrada = (item) =>
        item?.tipo === 'entrada' || Number(item?.valor || 0) > 0;

    const isCredito = (item) => isEntrada(item);

    const normalizarUrlComprovante = (valor) => {
        const texto = String(valor || '').trim();
        if (!texto) return null;

        const caminho = texto.replaceAll('\\', '/');
        const possuiProtocolo = /^https?:\/\//i.test(caminho);
        const iniciaComWww = /^www\./i.test(caminho);

        if (possuiProtocolo) return encodeURI(caminho);
        if (iniciaComWww) return encodeURI(`https://${caminho}`);

        if (
            caminho.startsWith('./') ||
            caminho.startsWith('../') ||
            caminho.startsWith('/')
        ) {
            return encodeURI(caminho);
        }

        return encodeURI(`./${caminho}`);
    };

    const appUtils = {
        ORDEM_MESES,
        LEGENDA_CATEGORIAS,
        CONFIG_ROTULO_TAG_COLUNA,
        LIMITE_CHARS_TAG_COLUNA,
        quebrarTextoPorLimite,
        formatarRotuloColunaTag,
        getUiUtils,
        getPrivacyUtils,
        extrairOrdemMesAno,
        extrairMesAno,
        limitarTag,
        isEntrada,
        isCredito,
        normalizarUrlComprovante,
        getClasseCategoria,
    };

    globalThis.EXTRATO_APP_UTILS = appUtils;
})();
