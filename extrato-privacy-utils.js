(function () {
    const normalizar = (texto) =>
        String(texto || '')
            .normalize('NFD')
            .replaceAll(/[\u0300-\u036f]/g, '')
            .toLowerCase();

    const TAGS_FIXAS = [
        'Boleto Condo. Bloco',
        'Gratificação Subsind',
        'Gratificação Limpeza',
        'Conta Consumo',
        'Rateio Agua',
        'Repasse Condo. Geral',
        'Seguro/Manut.',
        'Devolução',
        'Material Limpeza',
        'Terceiros',
    ];

    const REGRAS_CATEGORIA_PADRAO = [
        {
            tag: 'Boleto Condo. Bloco',
            includesAny: ['boleto de cobranca recebido', 'pix recebido: "'],
            includesAll: [['pix recebido', 'cp']],
        },
        {
            tag: 'Gratificação Subsind',
            includesAny: [],
            includesAll: [
                ['pix enviado', 'glayce kelly'],
                ['pix enviado', 'mariana'],
            ],
        },
        {
            tag: 'Gratificação Limpeza',
            includesAny: [],
            includesAll: [['pix enviado', 'maria edina ferreira']],
        },
        {
            tag: 'Conta Consumo',
            includesAny: [
                'pagamento copasa',
                'companhia de saneamento',
                'pagamento cemig',
                'pix enviado cemig',
                'pix enviado copasa',
                'cemig distribuicao',
                'copasa minas gerais',
                'copasa mg',
            ],
            includesAll: [],
        },
        {
            tag: 'Rateio Agua',
            includesAny: ['seu consumo', 'seu cosumo'],
            includesAll: [
                ['pix enviado', '60701190-seu consumo'],
                ['leitura', 'hidrometro'],
            ],
        },
        {
            tag: 'Repasse Condo. Geral',
            includesAny: ['sandro souza'],
            includesAll: [
                ['pagamento de titulo', 'residencial village da fonte'],
                ['pix enviado', 'residencial village da fonte'],
                ['pix', 'sandro'],
            ],
        },
        {
            tag: 'Seguro/Manut.',
            includesAny: [
                'tokio marine seguradora',
                'seguradora',
                'seguradoras',
                'desinsetizadora',
                'desentupidora',
                'nitro',
            ],
            includesAll: [['pix enviado', 'incendio']],
        },
        {
            tag: 'Devolução',
            includesAny: [],
            includesAll: [['pix enviado', 'gleidstone']],
        },
        {
            tag: 'Material Limpeza',
            includesAny: [],
            includesAll: [
                ['pix enviado', 'supermercados bh'],
                ['pix enviado', 'comercio de alimentos'],
            ],
        },
        {
            tag: 'Terceiros',
            includesAny: ['pagamento efetuado'],
            includesAll: [['pix enviado', 'cp']],
        },
    ];

    const clonarSemStructuredClone = (valor) => {
        if (Array.isArray(valor)) {
            return valor.map((item) => clonarSemStructuredClone(item));
        }

        if (valor && typeof valor === 'object') {
            const saida = {};
            for (const [chave, item] of Object.entries(valor)) {
                saida[chave] = clonarSemStructuredClone(item);
            }
            return saida;
        }

        return valor;
    };

    const clonar = (valor) => {
        if (typeof structuredClone === 'function') {
            return structuredClone(valor);
        }

        return clonarSemStructuredClone(valor);
    };

    const limparString = (texto) => String(texto || '').trim();

    const dedupe = (lista) => {
        const vistos = new Set();
        const saida = [];

        for (const item of lista) {
            const valor = limparString(item);
            if (!valor) continue;
            const chave = valor.toLowerCase();
            if (vistos.has(chave)) continue;
            vistos.add(chave);
            saida.push(valor);
        }

        return saida;
    };

    const normalizarRegras = (entrada) => {
        const porTag = new Map((entrada || []).map((item) => [item.tag, item]));

        return TAGS_FIXAS.map((tag) => {
            const base = porTag.get(tag) || {};
            const includesAny = dedupe(
                Array.isArray(base.includesAny) ? base.includesAny : [],
            );

            const includesAll = (
                Array.isArray(base.includesAll) ? base.includesAll : []
            )
                .map((grupo) =>
                    dedupe(
                        Array.isArray(grupo)
                            ? grupo
                            : String(grupo || '').split(','),
                    ),
                )
                .filter((grupo) => grupo.length > 0);

            return {
                tag,
                includesAny,
                includesAll,
            };
        });
    };

    const prepararRegrasComparacao = (regras) =>
        (regras || []).map((regra) => ({
            tag: regra.tag,
            includesAny: (regra.includesAny || []).map(normalizar),
            includesAll: (regra.includesAll || []).map((grupo) =>
                (grupo || []).map(normalizar),
            ),
        }));

    let regrasAtivas = normalizarRegras(REGRAS_CATEGORIA_PADRAO);
    let regrasComparacao = prepararRegrasComparacao(regrasAtivas);

    const setRegrasCategoria = (novasRegras) => {
        regrasAtivas = normalizarRegras(novasRegras);
        regrasComparacao = prepararRegrasComparacao(regrasAtivas);
    };

    const getRegrasCategoria = () => clonar(regrasAtivas);

    const carregarRegrasDoJson = async () => {
        if (typeof fetch !== 'function') return;

        try {
            const resposta = await fetch('./categoria-regras.json', {
                cache: 'no-store',
            });
            if (!resposta.ok) return;
            const payload = await resposta.json();

            let regras = null;
            if (Array.isArray(payload)) {
                regras = payload;
            } else if (Array.isArray(payload?.regras)) {
                regras = payload.regras;
            }

            if (regras) {
                setRegrasCategoria(regras);
            }
        } catch (error) {
            // Fallback padrao em memoria.
            console.warn('Falha ao carregar categoria-regras.json:', error);
        }
    };

    const bateAlgumTermo = (desc, termos) =>
        (termos || []).some((termo) => desc.includes(termo));

    const bateTodosTermosDoGrupo = (desc, grupo) =>
        (grupo || []).every((termo) => desc.includes(termo));

    const bateAlgumGrupo = (desc, grupos) =>
        (grupos || []).some((grupo) => bateTodosTermosDoGrupo(desc, grupo));

    const classificarCategoria = (descricao) => {
        const desc = normalizar(descricao);
        const regra = regrasComparacao.find((item) => {
            const bateAny = bateAlgumTermo(desc, item.includesAny);
            if (bateAny) return true;
            return bateAlgumGrupo(desc, item.includesAll);
        });
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
        getRegrasCategoria,
        setRegrasCategoria,
        getRegrasCategoriaPadrao: () => clonar(REGRAS_CATEGORIA_PADRAO),
    };

    globalThis.EXTRATO_PRIVACY_UTILS = privacyUtils;
    globalThis.INTER_PRIVACY_UTILS = privacyUtils;

    carregarRegrasDoJson();
})();
