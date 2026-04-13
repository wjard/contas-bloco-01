(function () {
    // Browser loader: keeps legacy file name while avoiding Node-only code.
    const carregado = !!globalThis.INTER_TODAS_CARGAS;

    if (carregado) {
        globalThis.GERAR_DADOS_INTER_STATUS = 'todas-cargas ja carregado';
        return;
    }

    const script = document.createElement('script');
    script.src = './dados-inter/todas-cargas.js';
    script.defer = true;
    script.onload = function () {
        globalThis.GERAR_DADOS_INTER_STATUS = 'todas-cargas carregado';
    };
    script.onerror = function () {
        globalThis.GERAR_DADOS_INTER_STATUS =
            'erro ao carregar dados-inter/todas-cargas.js';
    };

    document.head.appendChild(script);
})();
