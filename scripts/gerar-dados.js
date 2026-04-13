(function () {
    // Browser loader: keeps legacy file name while avoiding Node-only code.
    const carregado = !!globalThis.DADOS_FINANCEIROS;

    if (carregado) {
        globalThis.GERAR_DADOS_STATUS = 'dados-financeiros ja carregado';
        return;
    }

    const script = document.createElement('script');
    script.src = './dados-financeiros.js';
    script.defer = true;
    script.onload = function () {
        globalThis.GERAR_DADOS_STATUS = 'dados-financeiros carregado';
    };
    script.onerror = function () {
        globalThis.GERAR_DADOS_STATUS = 'erro ao carregar dados-financeiros.js';
    };

    document.head.appendChild(script);
})();
