function normalizeText(text: string): string {
    return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function parsePdf(fileBuffer: Buffer): Promise<string> {
    // Import động: nếu thư viện PDF lỗi trên môi trường serverless thì chỉ việc đọc PDF thất bại,
    // không làm hỏng cả route /api/chat.
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: fileBuffer });
    try {
        const result = await parser.getText();
        return result.text;
    } finally {
        await parser.destroy();
    }
}

export async function parseFile(fileBuffer: Buffer, mimeType: string, fileName: string): Promise<string> {
    try {
        const extension = fileName.split('.').pop()?.toLowerCase();
        let content = '';

        if (mimeType === 'application/pdf' || extension === 'pdf') {
            content = await parsePdf(fileBuffer);
        } else if (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            extension === 'docx'
        ) {
            const mammoth = (await import('mammoth')).default;
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            content = result.value;
        } else {
            // text/plain, md, json, code... và các định dạng khác: đọc như UTF-8
            content = fileBuffer.toString('utf-8');
        }

        return normalizeText(content);
    } catch (error) {
        console.error('Error parsing file:', (error as Error).message);
        throw new Error(`Failed to parse file content: ${fileName}`);
    }
}
