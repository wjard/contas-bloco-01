const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'docs');

const isExternalUrl = (value) => /^(https?:)?\/\//i.test(value || '');

const readText = (filePath) => fs.readFileSync(filePath, 'utf8');

const escapeInlineScriptContent = (content) =>
    String(content || '').replaceAll('</script>', String.raw`<\/script>`);

const escapeInlineStyleContent = (content) =>
    String(content || '').replaceAll('</style>', String.raw`<\/style>`);

const resolveLocalAsset = (htmlPath, assetPath) => {
    const normalized = String(assetPath || '').trim();
    if (!normalized || isExternalUrl(normalized)) return null;

    const withoutQuery = normalized.split('?')[0].split('#')[0];
    const resolved = path.resolve(path.dirname(htmlPath), withoutQuery);

    if (!resolved.startsWith(rootDir)) return null;
    if (!fs.existsSync(resolved)) return null;
    return resolved;
};

const shouldDropScriptFromPublishedHtml = (src) => {
    const normalized = String(src || '')
        .trim()
        .replaceAll('\\', '/')
        .toLowerCase();
    return (
        normalized === 'scripts/gerar-dados.js' ||
        normalized === 'scripts/gerar-dados-bancario.js'
    );
};

const inlineStyles = (html, htmlPath) => {
    const linkRegex =
        /<link\s+[^>]*href=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi;

    return html.replaceAll(linkRegex, (fullMatch, href) => {
        const filePath = resolveLocalAsset(htmlPath, href);
        if (!filePath) return fullMatch;

        const css = escapeInlineStyleContent(readText(filePath));
        return `<style>\n${css}\n</style>`;
    });
};

const inlineScripts = (html, htmlPath) => {
    const scriptRegex =
        /<script\s+([^>]*?)src=["']([^"']+\.js(?:\?[^"']*)?)["']([^>]*)><\/script>/gi;

    return html.replaceAll(
        scriptRegex,
        (fullMatch, beforeAttrs, src, afterAttrs) => {
            if (shouldDropScriptFromPublishedHtml(src)) {
                return '';
            }

            const filePath = resolveLocalAsset(htmlPath, src);
            if (!filePath) return fullMatch;

            const script = escapeInlineScriptContent(readText(filePath));
            const attrs = `${beforeAttrs || ''}${afterAttrs || ''}`.trim();
            const attrText = attrs ? ` ${attrs}` : '';
            return `<script${attrText}>\n${script}\n</script>`;
        },
    );
};

const buildHtml = (htmlPath) => {
    const original = readText(htmlPath);
    let output = original;

    output = inlineStyles(output, htmlPath);
    output = inlineScripts(output, htmlPath);

    return output;
};

const build = () => {
    if (fs.existsSync(outDir)) {
        fs.rmSync(outDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outDir, { recursive: true });

    const htmlFiles = fs
        .readdirSync(rootDir, { withFileTypes: true })
        .filter(
            (entry) =>
                entry.isFile() && entry.name.toLowerCase().endsWith('.html'),
        )
        .map((entry) => entry.name);

    for (const name of htmlFiles) {
        const sourcePath = path.join(rootDir, name);
        const result = buildHtml(sourcePath);
        const targetPath = path.join(outDir, name);
        fs.writeFileSync(targetPath, result);
    }

    fs.writeFileSync(path.join(outDir, '.nojekyll'), '\n');

    console.log(`[pages] html gerado: ${htmlFiles.length} arquivo(s) em docs/`);
};

build();
