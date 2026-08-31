import { Client, Databases, Storage, ID, InputFile } from 'node-appwrite';
import { GoogleGenAI } from '@google/genai';

export default async ({ req, res, log, error }) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
        
    const databases = new Databases(client);
    const storage = new Storage(client);
    
    // In an event trigger, we get the mock_tests document from req.body or context
    // For manual trigger, we fetch mock tests in "generating_solutions" state
    let testDoc;
    try {
        if (req.bodyRaw) {
            const body = JSON.parse(req.bodyRaw);
            testDoc = body;
        }
    } catch (e) {
        log("No body provided or invalid JSON");
    }
    
    if (!testDoc || testDoc.status !== 'generating_solutions') {
        return res.json({ success: false, message: 'Invalid test doc or status' });
    }
    
    try {
        log(`Generating solutions for test: ${testDoc.$id}`);
        
        // 1. Fetch MCQ JSON
        const mcqFileBuffer = await storage.getFileDownload('mock-jsons', testDoc.mcq_file_id);
        const mcqJson = JSON.parse(mcqFileBuffer.toString('utf8'));
        
        const questions = mcqJson.questions || [];
        const solutions = [];
        
        // 2. Batch generate (e.g. 10 at a time)
        const batchSize = 10;
        for (let i = 0; i < questions.length; i += batchSize) {
            const batch = questions.slice(i, i + batchSize);
            log(`Processing batch ${i / batchSize + 1}`);
            
            const prompt = `Generate solutions for the following multiple choice questions.
Return ONLY a valid JSON array matching this exact schema for each question:
{
  "question_id": "string",
  "correct_option": "string",
  "correct_answer": "string (the text of the correct option)",
  "explanation": "string (with LaTeX support if needed)",
  "steps": ["string", "string"]
}
Keep LaTeX equations surrounded by \\( and \\) or \\[ and \\].
Make sure correct_option EXACTLY matches the answer provided in the question.

Questions:
${JSON.stringify(batch)}
`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                }
            });
            
            let batchSolutions = [];
            try {
                const text = response.text;
                batchSolutions = JSON.parse(text);
                if(!Array.isArray(batchSolutions)) throw new Error("Expected array");
            } catch(e) {
                log(`Failed to parse Gemini response for batch ${i/batchSize + 1}`);
                throw new Error("Failed to parse Gemini response");
            }
            
            // Validate solutions against original questions
            batchSolutions.forEach(sol => {
                const orig = batch.find(q => q.id === sol.question_id);
                if (!orig) throw new Error(`Missing question_id in response: ${sol.question_id}`);
                if (orig.correct_option !== sol.correct_option) {
                    throw new Error(`Gemini correct_option (${sol.correct_option}) does not match original (${orig.correct_option}) for ${sol.question_id}`);
                }
                solutions.push(sol);
            });
        }
        
        // Check if all questions are covered
        if (solutions.length !== questions.length) {
            throw new Error(`Generated solutions count (${solutions.length}) does not match questions count (${questions.length})`);
        }
        
        // 3. Save Solution JSON
        const solutionDoc = {
            schema_version: 1,
            metadata: {
                test_id: testDoc.test_id,
                generated_by: 'gemini'
            },
            solutions: solutions
        };
        
        const buffer = Buffer.from(JSON.stringify(solutionDoc, null, 2), 'utf-8');
        const fileId = ID.unique();
        
        // InputFile.fromBuffer is from node-appwrite for uploading files
        await storage.createFile('solutions', fileId, InputFile.fromBuffer(buffer, `${testDoc.test_id}-solutions.json`));
        
        // 4. Update mock_tests status to ready
        await databases.updateDocument(process.env.DATABASE_ID, 'mock_tests', testDoc.$id, {
            status: 'ready',
            solution_file_id: fileId,
            updated_at: new Date().toISOString()
        });
        
        log("Successfully generated solutions.");
        return res.json({ success: true, fileId });
        
    } catch (e) {
        error("Error generating solutions: " + e.message);
        // Mark as failed
        if (testDoc && testDoc.$id) {
            await databases.updateDocument(process.env.DATABASE_ID, 'mock_tests', testDoc.$id, {
                status: 'failed',
                updated_at: new Date().toISOString()
            });
        }
        return res.json({ success: false, error: e.message });
    }
};
