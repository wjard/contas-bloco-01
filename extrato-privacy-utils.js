(function () {
    const normalizar = (texto) =>
        String(texto || '')
            .normalize('NFD')
            .replaceAll(/[\u0300-\u036f]/g, '')
            .toLowerCase();

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
                temTodos(d, ['pix enviado', 'glayce kelly']) ||
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
            test: (d) =>
                d.includes('tokio marine seguradora') ||
                d.includes('seguradora') ||
                d.includes('seguradoras') ||
                d.includes('desinsetizadora') ||
                d.includes('desentupidora') ||
                temTodos(d, ['pix enviado', 'incendio']) ||
                d.includes('nitro'),
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

    const classificarCategoria = (descricao) => {
        const desc = normalizar(descricao);
        const regra = REGRAS_CATEGORIA.find((item) => item.test(desc));
        return regra ? regra.tag : 'Outros';
    };

    const anonimizarDescricaoPorCategoria = (descricao, categoria) => {
        if (categoria !== 'Boleto Condo. Bloco') return descricao;

        const descNormalizada = normalizar(descricao);
        if (descNormalizada.includes('pix recebido')) {
            return 'Boleto Recebido Via Pix';
        }

        if (descNormalizada.includes('boleto de cobran')) {
            return 'Boleto de Cobranca Recebido';
        }

        return descricao;
    };

    const privacyUtils = {
        classificarCategoria,
        anonimizarDescricaoPorCategoria,
    };

    globalThis.EXTRATO_PRIVACY_UTILS = privacyUtils;
})();
