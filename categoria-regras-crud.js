(function () {
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

    const REGRAS_PADRAO = [
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

    const cardsRegras = document.getElementById('cardsRegras');
    const statusMensagem = document.getElementById('statusMensagem');
    const inputImportarJson = document.getElementById('inputImportarJson');
    const btnSalvarJson = document.getElementById('btnSalvarJson');
    const btnRestaurarPadrao = document.getElementById('btnRestaurarPadrao');

    if (
        !cardsRegras ||
        !statusMensagem ||
        !inputImportarJson ||
        !btnSalvarJson ||
        !btnRestaurarPadrao
    ) {
        return;
    }

    const escapeHtml = (texto) =>
        String(texto || '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');

    const clone = (valor) => JSON.parse(JSON.stringify(valor));

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

    const normalizarPayload = (payload) => {
        if (Array.isArray(payload)) {
            return {
                versao: 1,
                regras: normalizarRegras(payload),
            };
        }

        const regras = normalizarRegras(payload?.regras || []);
        return {
            versao: Number(payload?.versao || 1),
            regras,
        };
    };

    let estado = normalizarPayload({ versao: 1, regras: clone(REGRAS_PADRAO) });

    const render = () => {
        const html = estado.regras
            .map((regra, regraIndex) => {
                const termosAny = regra.includesAny
                    .map(
                        (valor, itemIndex) => `
                        <div class="row">
                            <input type="text" data-kind="any" data-regra-index="${regraIndex}" data-item-index="${itemIndex}" value="${escapeHtml(valor)}" />
                            <button type="button" class="btn-danger" data-action="remove-any" data-regra-index="${regraIndex}" data-item-index="${itemIndex}">Remover</button>
                        </div>
                    `,
                    )
                    .join('');

                const termosAll = regra.includesAll
                    .map((grupo, itemIndex) => {
                        const texto = grupo.join(', ');
                        return `
                        <div class="row">
                            <input type="text" data-kind="all" data-regra-index="${regraIndex}" data-item-index="${itemIndex}" value="${escapeHtml(texto)}" />
                            <button type="button" class="btn-danger" data-action="remove-all" data-regra-index="${regraIndex}" data-item-index="${itemIndex}">Remover</button>
                        </div>
                    `;
                    })
                    .join('');

                return `
                    <article class="card">
                        <div>
                            <h3>${escapeHtml(regra.tag)}</h3>
                            <span class="badge">TAG fixa</span>
                        </div>

                        <div>
                            <div class="section-title">Qualquer termo (OR)</div>
                            <div class="stack">${termosAny || '<p class="help">Nenhum termo.</p>'}</div>
                            <div class="actions">
                                <button type="button" data-action="add-any" data-regra-index="${regraIndex}">Adicionar termo</button>
                            </div>
                        </div>

                        <div>
                            <div class="section-title">Todos os termos (AND, separado por vírgula)</div>
                            <div class="stack">${termosAll || '<p class="help">Nenhum conjunto.</p>'}</div>
                            <div class="actions">
                                <button type="button" data-action="add-all" data-regra-index="${regraIndex}">Adicionar conjunto</button>
                            </div>
                        </div>
                    </article>
                `;
            })
            .join('');

        cardsRegras.innerHTML = html;
    };

    const setStatus = (texto, erro) => {
        statusMensagem.textContent = texto;
        statusMensagem.style.color = erro ? '#9f1239' : '#6a5647';
    };

    const lerJsonPadrao = async () => {
        try {
            const res = await fetch('./categoria-regras.json', {
                cache: 'no-store',
            });
            if (!res.ok)
                throw new Error('Falha ao carregar arquivo JSON padrão.');
            const payload = await res.json();
            estado = normalizarPayload(payload);
            render();
            setStatus('JSON padrão carregado com sucesso.');
        } catch (_error) {
            estado = normalizarPayload({
                versao: 1,
                regras: clone(REGRAS_PADRAO),
            });
            render();
            setStatus(
                'Usando fallback padrão em memória (não foi possível ler categoria-regras.json).',
                true,
            );
        }
    };

    const coletarEstadoDaTela = () => {
        const proximo = clone(estado);

        const inputs = cardsRegras.querySelectorAll('input[data-kind]');
        for (const input of inputs) {
            const regraIndex = Number(input.dataset.regraIndex);
            const itemIndex = Number(input.dataset.itemIndex);
            const kind = input.dataset.kind;
            const valor = limparString(input.value);

            if (!Number.isInteger(regraIndex) || !Number.isInteger(itemIndex)) {
                continue;
            }

            const regra = proximo.regras[regraIndex];
            if (!regra) continue;

            if (kind === 'any') {
                regra.includesAny[itemIndex] = valor;
            }

            if (kind === 'all') {
                const grupo = valor
                    .split(',')
                    .map((parte) => limparString(parte))
                    .filter(Boolean);
                regra.includesAll[itemIndex] = grupo;
            }
        }

        proximo.regras = normalizarRegras(proximo.regras);
        estado = proximo;
    };

    const toJson = () => {
        coletarEstadoDaTela();
        return JSON.stringify(estado, null, 2);
    };

    const baixarJson = (conteudo, nomeArquivo) => {
        const blob = new Blob([conteudo], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const salvarJson = async () => {
        try {
            const conteudo = toJson();

            if (window.showSaveFilePicker) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'categoria-regras.json',
                    types: [
                        {
                            description: 'Arquivo JSON',
                            accept: { 'application/json': ['.json'] },
                        },
                    ],
                });
                const writable = await handle.createWritable();
                await writable.write(conteudo);
                await writable.close();
                setStatus('Arquivo JSON salvo com sucesso.');
                return;
            }

            baixarJson(conteudo, 'categoria-regras.json');
            setStatus('JSON exportado (download).');
        } catch (error) {
            setStatus(
                `Erro ao salvar JSON: ${error?.message || 'desconhecido'}`,
                true,
            );
        }
    };

    cardsRegras.addEventListener('click', (event) => {
        const btn = event.target.closest('button[data-action]');
        if (!btn) return;

        coletarEstadoDaTela();

        const action = btn.dataset.action;
        const regraIndex = Number(btn.dataset.regraIndex);
        const regra = estado.regras[regraIndex];
        if (!regra) return;

        if (action === 'add-any') {
            regra.includesAny.push('');
        }

        if (action === 'remove-any') {
            const itemIndex = Number(btn.dataset.itemIndex);
            regra.includesAny.splice(itemIndex, 1);
        }

        if (action === 'add-all') {
            regra.includesAll.push(['']);
        }

        if (action === 'remove-all') {
            const itemIndex = Number(btn.dataset.itemIndex);
            regra.includesAll.splice(itemIndex, 1);
        }

        render();
    });

    inputImportarJson.addEventListener('change', async () => {
        const file = inputImportarJson.files?.[0];
        if (!file) return;

        try {
            const texto = await file.text();
            const payload = JSON.parse(texto);
            estado = normalizarPayload(payload);
            render();
            setStatus('JSON importado com sucesso.');
        } catch (error) {
            setStatus(
                `Falha ao importar JSON: ${error?.message || 'desconhecido'}`,
                true,
            );
        } finally {
            inputImportarJson.value = '';
        }
    });

    btnSalvarJson.addEventListener('click', salvarJson);

    btnRestaurarPadrao.addEventListener('click', () => {
        estado = normalizarPayload({ versao: 1, regras: clone(REGRAS_PADRAO) });
        render();
        setStatus('Regras restauradas para o padrão.');
    });

    lerJsonPadrao();
})();
