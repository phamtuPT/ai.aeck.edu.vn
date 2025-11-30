const pdf = require('pdf-parse');
import mammoth from 'mammoth';

function normalizeText(text: string): string {
    return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export async function parseFile(fileBuffer: Buffer, mimeType: string, fileName: string): Promise<string> {
    try {
        const extension = fileName.split('.').pop()?.toLowerCase();
        let content = '';

        if (mimeType === 'application/pdf' || extension === 'pdf') {
            const data = await pdf(fileBuffer);
            content = data.text;
        } else if (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            extension === 'docx'
        ) {
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            content = result.value;
        } else if (
            mimeType === 'text/plain' ||
            extension === 'txt' ||
            extension === 'md' ||
            extension === 'json' ||
            extension === 'js' ||
            extension === 'ts' ||
            extension === 'tsx' ||
            extension === 'jsx' ||
            extension === 'css' ||
            extension === 'html'
        ) {
            content = fileBuffer.toString('utf-8');
        } else {
            // Fallback
            content = fileBuffer.toString('utf-8');
        }

        return normalizeText(content);
    } catch (error) {
        console.error('Error parsing file:', error);
        throw new Error(`Failed to parse file content: ${fileName}`);
    }
}
