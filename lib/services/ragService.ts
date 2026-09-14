import { Collection } from 'mongodb';
import { ContextItem } from '@/types/chat';
import { escapeRegex } from '@/lib/utils/regex';

function buildKeywordRegex(message: string): RegExp | null {
    const keywords = message
        .split(/\s+/)
        .filter((w: string) => w.length > 3)
        .slice(0, 5)
        .map(escapeRegex);
    return keywords.length > 0 ? new RegExp(keywords.join('|'), 'i') : null;
}

export async function getContext(
    message: string,
    geminiApiKey: string | null,
    examsCollection: Collection
): Promise<ContextItem[]> {
    let relevantExams: any[] = [];

    // Try Vector Search first
    try {
        if (geminiApiKey) {
            const { getEmbedding } = await import('@/lib/gemini');
            const embedding = await getEmbedding(message, geminiApiKey);

            if (embedding) {
                relevantExams = await examsCollection.aggregate([
                    {
                        $vectorSearch: {
                            index: "vector_index",
                            path: "embedding",
                            queryVector: embedding,
                            numCandidates: 100,
                            limit: 5
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            questions: 1,
                            score: { $meta: "vectorSearchScore" }
                        }
                    }
                ]).toArray();
            }
        }
    } catch (e) {
        console.warn('Vector search failed (likely missing index), falling back to regex:', e);
    }

    // Fallback to Regex if Vector Search returned no results
    if (relevantExams.length === 0) {
        // Simple keyword search - split message into words and find matching exams
        const regex = buildKeywordRegex(message);
        if (regex) {
            relevantExams = await examsCollection.find({
                $or: [
                    { "questions.content": regex },
                    { "questions.explanation": regex }
                ]
            }).limit(5).toArray();
        }
    }

    const contextItems: ContextItem[] = [];

    if (relevantExams.length > 0) {
        relevantExams.forEach((exam: any) => {
            // Simplified: Take first 3 questions if vector search, or match regex if regex search
            const questions = Array.isArray(exam.questions) ? exam.questions : [];
            let matchingQuestions = questions.slice(0, 3);

            // If we have keywords, try to filter by them even for vector search results to be more precise
            const regex = buildKeywordRegex(message);
            if (regex) {
                const filtered = questions.filter((q: any) =>
                    (q.content && regex.test(q.content)) || (q.explanation && regex.test(q.explanation))
                );
                if (filtered.length > 0) matchingQuestions = filtered.slice(0, 3);
            }

            matchingQuestions.forEach((q: any) => {
                contextItems.push({
                    id: q.id || 'unknown',
                    content: q.content,
                    explanation: q.explanation,
                    examId: exam._id.toString(),
                    score: exam.score
                });
            });
        });
    }

    return contextItems;
}
