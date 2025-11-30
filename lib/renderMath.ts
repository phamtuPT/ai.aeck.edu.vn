import katex from 'katex';
import he from 'he';

/**
 * Render mathematical content with KaTeX
 * Processes both inline ($...$) and display ($$...$$) math
 */
export default function renderMathContent(content: string): string {
    if (!content) return '';

    // 1. Fix missing ampersands for common entities (e.g. "gt;" -> "&gt;")
    content = content.replace(/(^|[^&;])(gt|lt|amp|quot|apos|nbsp);/g, '$1&$2;');

    // 2. Manual decode for critical entities
    content = content.replaceAll("&lt;", "<");
    content = content.replaceAll("&gt;", ">");
    content = content.replaceAll("&amp;", "&");
    content = content.replaceAll("&nbsp;", " ");
    content = content.replaceAll("gt;", ">");
    content = content.replaceAll("lt;", "<");

    // 3. Robust decode with he library
    try {
        let decoded = he.decode(content);
        let prev = content;
        let loops = 0;
        while (decoded !== prev && loops < 5) {
            prev = decoded;
            decoded = he.decode(decoded);
            loops++;
        }
        content = decoded;
    } catch (e) {
        console.error('Error decoding HTML entities:', e);
    }

    // 4. Normalize malformed HTML tags
    content = content.replace(/<\s*(\/?)\s*(p|div|br|span|strong|em|u|s|b|i)\s*>/gi, '<$1$2>');
    content = content.replace(/<\s+([a-z]+)/gi, '<$1');
    content = content.replace(/<\s+\/([a-z]+)/gi, '</$1');

    content = content.replaceAll("< /p >", "</p>");
    content = content.replaceAll("< p >", "<p>");
    content = content.replaceAll("</ p >", "</p>");
    content = content.replaceAll("< / p >", "</p>");

    // Helper to render math
    const renderMath = (math: string, displayMode: boolean) => {
        try {
            math = math.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
            math = math.replace(/<\/?(p|div|br|span|strong|em|u|s|b|i)[^>]*>/gi, "");
            math = math.replaceAll("< /p >", "").replaceAll("< p >", "").replaceAll("</ p >", "").replaceAll("< / p >", "");

            return katex.renderToString(math, {
                displayMode: displayMode,
                throwOnError: false,
            });
        } catch (e) {
            console.error('KaTeX error:', e);
            return math;
        }
    };

    // 1. Handle display math: $$...$$ and \[...\]
    let processed = content.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => renderMath(math, true));
    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (match, math) => renderMath(math, true));

    // 2. Handle inline math: \(...\) and $...$
    processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (match, math) => renderMath(math, false));
    processed = processed.replace(/\$([^$\n]+?)\$/g, (match, math) => renderMath(math, false));

    return processed;
}
