(function () {
    const isBrowser =
        globalThis.window !== undefined && globalThis.document !== undefined;

    if (isBrowser) {
        // Browser loader: keeps legacy file name while avoiding Node-only code.
        const carregado = !!globalThis.EXTRATO_TODAS_CARGAS;

        if (carregado) {
            globalThis.GERAR_DADOS_EXTRATO_STATUS = 'todas-cargas ja carregado';
            return;
        }

        const script = document.createElement('script');
        script.src = './dados-extrato/todas-cargas.js';
        script.defer = true;
        script.onload = function () {
            globalThis.GERAR_DADOS_EXTRATO_STATUS = 'todas-cargas carregado';
        };
        script.onerror = function () {
            globalThis.GERAR_DADOS_EXTRATO_STATUS =
                'erro ao carregar dados-extrato/todas-cargas.js';
        };

        document.head.appendChild(script);
        return;
    }

    const fs = require('node:fs');
    const path = require('node:path');
    const crypto = require('node:crypto');
    const vm = require('node:vm');

    const rootDir = path.resolve(__dirname, '..');
    const csvDir = path.join(rootDir, 'extrato_bancario');
    const outputDir = path.join(rootDir, 'dados-extrato');
    const cacheFile = path.join(outputDir, '.cache-extrato-csv.json');

    const MESES_PT = [
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

    function round2(valor) {
        return Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;
    }

    function normalizarNumeroBr(valor) {
        const texto = String(valor || '').trim();
        if (!texto) return 0;
        const semMilhar = texto.replaceAll('.', '');
        const normalizado = semMilhar.replace(',', '.');
        const numero = Number.parseFloat(normalizado);
        return Number.isFinite(numero) ? round2(numero) : 0;
    }

    function formatarMesAno(dataBr) {
        const partes = String(dataBr || '').split('/');
        if (partes.length !== 3) return null;

        const mes = Number.parseInt(partes[1], 10);
        const ano = Number.parseInt(partes[2], 10);

        if (!Number.isFinite(mes) || !Number.isFinite(ano)) return null;
        if (mes < 1 || mes > 12) return null;

        return `${MESES_PT[mes - 1]}-${ano}`;
    }

    function slugDoCsv(nomeArquivoCsv) {
        return String(nomeArquivoCsv)
            .toLowerCase()
            .replaceAll(/\.csv$/g, '')
            .replaceAll(/[^a-z0-9]+/g, '-')
            .replaceAll(/(^-|-$)/g, '');
    }

    function caminhoDadosJs(nomeArquivoCsv) {
        return `dados-extrato/${slugDoCsv(nomeArquivoCsv)}.js`;
    }

    function caminhoPaginaHtml(nomeArquivoCsv) {
        return `${slugDoCsv(nomeArquivoCsv)}.html`;
    }

    function caminhoDadosJsAbsoluto(nomeArquivoCsv) {
        return path.join(outputDir, `${slugDoCsv(nomeArquivoCsv)}.js`);
    }

    function caminhoPaginaHtmlAbsoluto(nomeArquivoCsv) {
        return path.join(rootDir, `${slugDoCsv(nomeArquivoCsv)}.html`);
    }

    function apagarArquivoSeExistir(caminhoArquivo) {
        if (!caminhoArquivo) return false;
        if (!fs.existsSync(caminhoArquivo)) return false;
        fs.unlinkSync(caminhoArquivo);
        return true;
    }

    function limparArtefatosObsoletos({ cache, arquivosCsvAtuais }) {
        const csvAtuaisSet = new Set(arquivosCsvAtuais);
        const removidos = [];

        for (const arquivoCsvAntigo of Object.keys(cache.arquivos)) {
            if (csvAtuaisSet.has(arquivoCsvAntigo)) continue;

            const entradaCache = cache.arquivos[arquivoCsvAntigo] || {};
            const dadosJsRel =
                entradaCache.dadosJs || caminhoDadosJs(arquivoCsvAntigo);
            const paginaHtmlRel =
                entradaCache.paginaHtml || caminhoPaginaHtml(arquivoCsvAntigo);
            const caminhoDados = path.join(rootDir, dadosJsRel);
            const caminhoPagina = path.join(rootDir, paginaHtmlRel);

            const removeuDados = apagarArquivoSeExistir(caminhoDados);
            const removeuPagina = apagarArquivoSeExistir(caminhoPagina);

            removidos.push({
                arquivoCsv: arquivoCsvAntigo,
                removeuDados,
                removeuPagina,
                dadosJs: dadosJsRel,
                paginaHtml: paginaHtmlRel,
            });

            delete cache.arquivos[arquivoCsvAntigo];
        }

        return removidos;
    }

    function calcularHash(buffer) {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    function extrairTimestampFinalCsv(nomeArquivo) {
        const matchFinal = String(nomeArquivo).match(
            /-a-(\d{2})-(\d{2})-(\d{4})-csv\.csv$/i,
        );
        if (matchFinal) {
            const dia = Number.parseInt(matchFinal[1], 10);
            const mes = Number.parseInt(matchFinal[2], 10);
            const ano = Number.parseInt(matchFinal[3], 10);
            const ts = Date.UTC(ano, mes - 1, dia);
            if (Number.isFinite(ts)) return ts;
        }

        const matchInicio = String(nomeArquivo).match(
            /^extrato-(\d{2})-(\d{2})-(\d{4})-a-/i,
        );
        if (matchInicio) {
            const dia = Number.parseInt(matchInicio[1], 10);
            const mes = Number.parseInt(matchInicio[2], 10);
            const ano = Number.parseInt(matchInicio[3], 10);
            const ts = Date.UTC(ano, mes - 1, dia);
            if (Number.isFinite(ts)) return ts;
        }

        return 0;
    }

    function lerCache() {
        if (!fs.existsSync(cacheFile)) {
            return {
                versao: 1,
                arquivos: {},
            };
        }

        try {
            const bruto = fs.readFileSync(cacheFile, 'utf8');
            const parsed = JSON.parse(bruto);
            if (!parsed || typeof parsed !== 'object') {
                throw new Error('cache invalido');
            }
            if (!parsed.arquivos || typeof parsed.arquivos !== 'object') {
                parsed.arquivos = {};
            }
            return parsed;
        } catch (error_) {
            console.warn(
                `[extrato] cache corrompido (${error_.message}); sera recriado.`,
            );
            return {
                versao: 1,
                arquivos: {},
            };
        }
    }

    function salvarCache(cache) {
        fs.writeFileSync(cacheFile, `${JSON.stringify(cache, null, 2)}\n`);
    }

    function parseCsvInter(buffer) {
        const texto = buffer.toString('utf8').replace(/^\uFEFF/, '');
        const linhas = texto
            .split(/\r?\n/)
            .map((linha) => linha.trim())
            .filter(Boolean);

        const idxCabecalho = linhas.findIndex((linha) =>
            /^Data\s+Lançamento;Descrição;Valor;Saldo$/i.test(linha),
        );

        if (idxCabecalho < 0) {
            throw new Error(
                'cabecalho CSV nao encontrado (Data Lançamento;Descrição;Valor;Saldo)',
            );
        }

        const lancamentos = [];

        for (let i = idxCabecalho + 1; i < linhas.length; i += 1) {
            const linha = linhas[i];
            const cols = linha.split(';');
            if (cols.length < 4) continue;

            const data = String(cols[0] || '').trim();
            const descricao = String(cols[1] || '').trim();
            const valor = normalizarNumeroBr(cols[2]);
            const saldoConta = normalizarNumeroBr(cols[3]);

            if (!data || !descricao) continue;
            if (!Number.isFinite(valor)) continue;

            lancamentos.push({
                linhaCsv: i + 1,
                data,
                descricao,
                valor,
                saldoConta,
                tipo: valor >= 0 ? 'entrada' : 'saida',
            });
        }

        const porMesMap = new Map();
        let totalEntradas = 0;
        let totalSaidas = 0;

        for (const item of lancamentos) {
            const mesChave = formatarMesAno(item.data) || 'SEM-DATA';

            if (!porMesMap.has(mesChave)) {
                porMesMap.set(mesChave, {
                    mes: mesChave,
                    lancamentos: [],
                    entradas: 0,
                    saidas: 0,
                    saldo: 0,
                    itens: 0,
                });
            }

            const grupo = porMesMap.get(mesChave);
            grupo.lancamentos.push(item);
            grupo.itens += 1;

            if (item.valor >= 0) {
                grupo.entradas = round2(grupo.entradas + item.valor);
                totalEntradas = round2(totalEntradas + item.valor);
            } else {
                const abs = Math.abs(item.valor);
                grupo.saidas = round2(grupo.saidas + abs);
                totalSaidas = round2(totalSaidas + abs);
            }
            grupo.saldo = round2(grupo.entradas - grupo.saidas);
        }

        const porMes = Array.from(porMesMap.values()).sort((a, b) => {
            const [mesA, anoA] = String(a.mes).split('-');
            const [mesB, anoB] = String(b.mes).split('-');
            const idxA = MESES_PT.indexOf(mesA);
            const idxB = MESES_PT.indexOf(mesB);
            const anoNumA = Number.parseInt(anoA, 10) || 0;
            const anoNumB = Number.parseInt(anoB, 10) || 0;
            return anoNumA - anoNumB || idxA - idxB;
        });

        const inicio = porMes[0]?.mes || '-';
        const fim = porMes.at(-1)?.mes || '-';

        return {
            periodo: { inicio, fim },
            resumo: {
                totalEntradas,
                totalSaidas,
                saldoGeral: round2(totalEntradas - totalSaidas),
            },
            porMes,
            totalLancamentos: lancamentos.length,
        };
    }

    function chaveLancamento(item) {
        return [
            String(item.data || '').trim(),
            String(item.descricao || '').trim(),
            round2(Number(item.valor || 0)).toFixed(2),
            round2(Number(item.saldoConta || 0)).toFixed(2),
        ].join('|');
    }

    function carregarDadosJsExistente(caminhoJsOut) {
        if (!fs.existsSync(caminhoJsOut)) return null;

        try {
            const codigo = fs.readFileSync(caminhoJsOut, 'utf8');
            const sandbox = { window: {} };
            vm.createContext(sandbox);
            vm.runInContext(codigo, sandbox, { timeout: 1000 });
            const dados = sandbox.window?.DADOS_FINANCEIROS;
            if (!dados || typeof dados !== 'object') return null;
            return dados;
        } catch (error_) {
            console.warn(
                `[extrato] nao foi possivel ler metadados existentes de ${path.basename(caminhoJsOut)}: ${error_.message}`,
            );
            return null;
        }
    }

    function indexarMetadadosLancamentos(dadosExistentes) {
        const map = new Map();
        if (!dadosExistentes || !Array.isArray(dadosExistentes.porMes)) {
            return map;
        }

        for (const mes of dadosExistentes.porMes) {
            for (const item of mes.lancamentos || []) {
                if (!item || typeof item !== 'object') continue;
                const chave = chaveLancamento(item);
                const meta = {};
                if (item.urlcomprovante) {
                    meta.urlcomprovante = item.urlcomprovante;
                }
                if (Object.keys(meta).length > 0) {
                    map.set(chave, meta);
                }
            }
        }

        return map;
    }

    function aplicarMetadadosExistentes(dadosProcessados, dadosExistentes) {
        const mapa = indexarMetadadosLancamentos(dadosExistentes);
        if (!mapa.size) return;

        for (const mes of dadosProcessados.porMes || []) {
            for (const item of mes.lancamentos || []) {
                const meta = mapa.get(chaveLancamento(item));
                if (!meta) continue;
                Object.assign(item, meta);
            }
        }
    }

    function gerarConteudoDadosJs(dados) {
        return `window.DADOS_FINANCEIROS = ${JSON.stringify(dados, null, 4)};\n`;
    }

    function gerarConteudoManifest(cargas) {
        return `window.EXTRATO_CARGAS = ${JSON.stringify(cargas, null, 4)};\nwindow.EXTRATO_CARGAS;\n`;
    }

    function gerarConteudoTodasCargas(todasCargas) {
        return `window.EXTRATO_TODAS_CARGAS = ${JSON.stringify(todasCargas, null, 4)};\nwindow.EXTRATO_TODAS_CARGAS;\n`;
    }

    function gerarPaginaHtml(carga) {
        return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Extrato ${carga.arquivoCsv.replaceAll('.csv', '')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="noise"></div>
  <main class="layout">
    <header class="hero reveal">
    <p class="eyebrow">Extrato Bancário</p>
      <h1>Extrato ${carga.arquivoCsv.replaceAll('.csv', '')}</h1>
      <p class="subtitle">Tabela mensal detalhada de entradas e saidas com base no CSV.</p>
      <div class="page-switcher">
        <label for="cargaSelectDetalhe">Escolher carga:</label>
        <select id="cargaSelectDetalhe">
          <option value="">Carregando opcoes...</option>
        </select>
      </div>
      <p class="subtitle"><a href="extrato-index.html">Voltar para selecao de cargas</a></p>
    </header>
    <section class="cards reveal delay-1" id="resumoCards"></section>
    <section class="table-panel reveal delay-2">
      <div class="panel-head">
        <h2>Tabelas Detalhadas por Mes/Ano</h2>
        <p>Fonte: ${carga.dadosJs}</p>
      </div>
      <div id="tabelasMeses" class="months-grid"></div>
    </section>
  </main>
  <script src="dados-extrato/manifest.js"></script>
  <script src="${carga.dadosJs}"></script>
    <script src="ui-utils.js"></script>
    <script src="app-utils.js"></script>
    <script src="extrato-privacy-utils.js"></script>
  <script src="app-extrato.js"></script>
</body>
</html>
`;
    }

    function processar() {
        if (!fs.existsSync(csvDir)) {
            throw new Error(`diretorio de CSV nao encontrado: ${csvDir}`);
        }

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const cache = lerCache();
        const arquivosCsv = fs
            .readdirSync(csvDir, { withFileTypes: true })
            .filter((ent) => ent.isFile())
            .map((ent) => ent.name)
            .filter((nome) => nome.toLowerCase().endsWith('.csv'))
            .sort((a, b) => {
                const tsA = extrairTimestampFinalCsv(a);
                const tsB = extrairTimestampFinalCsv(b);
                if (tsA !== tsB) return tsB - tsA;
                return b.localeCompare(a, 'pt-BR');
            });

        const manifest = [];
        const todasCargas = [];

        let novos = 0;
        let alterados = 0;
        let inalterados = 0;
        const forcarTudo =
            typeof process !== 'undefined' && process.argv.includes('--force');
        const forcarVerbose =
            typeof process !== 'undefined' &&
            process.argv.includes('--verbose');

        const detalhes = {
            criados: [],
            atualizados: [],
            mantidos: [],
            removidos: [],
        };

        const removidos = limparArtefatosObsoletos({
            cache,
            arquivosCsvAtuais: arquivosCsv,
        });
        detalhes.removidos.push(...removidos);

        for (const arquivoCsv of arquivosCsv) {
            const caminhoCsv = path.join(csvDir, arquivoCsv);
            const buffer = fs.readFileSync(caminhoCsv);
            const hash = calcularHash(buffer);
            const cacheAtual = cache.arquivos[arquivoCsv];
            const mudou = forcarTudo || !cacheAtual || cacheAtual.hash !== hash;

            const dados = parseCsvInter(buffer);
            const caminhoJsOut = caminhoDadosJsAbsoluto(arquivoCsv);
            const dadosExistentes = carregarDadosJsExistente(caminhoJsOut);
            aplicarMetadadosExistentes(dados, dadosExistentes);

            const payloadDados = {
                arquivo: arquivoCsv,
                atualizadoEm: new Date().toISOString(),
                periodo: dados.periodo,
                resumo: dados.resumo,
                porMes: dados.porMes,
            };

            const dadosJsRel = caminhoDadosJs(arquivoCsv);
            const paginaHtml = caminhoPaginaHtml(arquivoCsv);

            manifest.push({
                arquivoCsv,
                dadosJs: dadosJsRel,
                paginaHtml,
                periodo: `${dados.periodo.inicio} ate ${dados.periodo.fim}`,
                totalLancamentos: dados.totalLancamentos,
            });

            todasCargas.push({
                arquivoCsv,
                periodo: dados.periodo,
                resumo: dados.resumo,
                porMes: dados.porMes,
            });

            if (mudou) {
                if (typeof caminhoJsOut !== 'string') {
                    throw new TypeError('caminho JS invalido para escrita');
                }
                fs.writeFileSync(
                    caminhoJsOut,
                    gerarConteudoDadosJs(payloadDados),
                );

                const caminhoPaginaOut = caminhoPaginaHtmlAbsoluto(arquivoCsv);
                const cargaAtual = manifest.at(-1);
                fs.writeFileSync(caminhoPaginaOut, gerarPaginaHtml(cargaAtual));

                if (cacheAtual) alterados += 1;
                else novos += 1;

                if (cacheAtual) {
                    detalhes.atualizados.push({
                        arquivoCsv,
                        dadosJs: dadosJsRel,
                        paginaHtml,
                    });
                } else {
                    detalhes.criados.push({
                        arquivoCsv,
                        dadosJs: dadosJsRel,
                        paginaHtml,
                    });
                }

                cache.arquivos[arquivoCsv] = {
                    hash,
                    atualizadoEm: new Date().toISOString(),
                    dadosJs: dadosJsRel,
                    paginaHtml,
                    totalLancamentos: dados.totalLancamentos,
                };
            } else {
                inalterados += 1;
                detalhes.mantidos.push({
                    arquivoCsv,
                    dadosJs: dadosJsRel,
                    paginaHtml,
                });
            }
        }

        fs.writeFileSync(
            path.join(outputDir, 'manifest.js'),
            gerarConteudoManifest(manifest),
        );
        fs.writeFileSync(
            path.join(outputDir, 'todas-cargas.js'),
            gerarConteudoTodasCargas(todasCargas),
        );

        salvarCache(cache);

        console.log('[extrato] processamento concluido');
        console.log(`[extrato] total CSV: ${arquivosCsv.length}`);
        console.log(`[extrato] novos: ${novos}`);
        console.log(`[extrato] alterados: ${alterados}`);
        console.log(`[extrato] inalterados: ${inalterados}`);
        console.log(`[extrato] removidos: ${removidos.length}`);
        if (removidos.length) {
            const ids = removidos.map((item) => item.arquivoCsv).join(', ');
            console.log(`[extrato] CSVs removidos e limpos: ${ids}`);
        }

        if (forcarVerbose) {
            const imprimirSecao = (titulo, itens, mapFn) => {
                console.log(`[extrato][verbose] ${titulo}: ${itens.length}`);
                if (!itens.length) return;
                for (const item of itens) {
                    console.log(`[extrato][verbose] - ${mapFn(item)}`);
                }
            };

            imprimirSecao('criados', detalhes.criados, (item) => {
                return `${item.arquivoCsv} -> ${item.dadosJs} | ${item.paginaHtml}`;
            });

            imprimirSecao('atualizados', detalhes.atualizados, (item) => {
                return `${item.arquivoCsv} -> ${item.dadosJs} | ${item.paginaHtml}`;
            });

            imprimirSecao('mantidos', detalhes.mantidos, (item) => {
                return `${item.arquivoCsv} -> ${item.dadosJs} | ${item.paginaHtml}`;
            });

            imprimirSecao('removidos', detalhes.removidos, (item) => {
                const tipos = [];
                if (item.removeuDados) tipos.push('dados-extrato removido');
                if (item.removeuPagina) tipos.push('pagina removida');
                if (!tipos.length) tipos.push('sem arquivo para remover');
                return `${item.arquivoCsv} -> ${item.dadosJs} | ${item.paginaHtml} (${tipos.join('; ')})`;
            });
        }

        console.log(
            '[extrato] arquivos consolidados atualizados: manifest.js, todas-cargas.js',
        );
    }

    const deveExecutarComoScript =
        typeof process !== 'undefined' &&
        process.argv?.[1] &&
        path.resolve(process.argv[1]) === path.resolve(__filename);

    if (deveExecutarComoScript) {
        try {
            processar();
        } catch (error_) {
            console.error(`[extrato] erro: ${error_.message}`);
            if (error_?.stack) {
                console.error(error_.stack);
            }
            process.exitCode = 1;
        }
    }
})();
