import { Client, Databases, Storage, ID, InputFile } from 'node-appwrite';
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async ({ req, res, log, error }) => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
        
    const databases = new Databases(client);
    const storage = new Storage(client);
    
    let testDoc;
    try {
        if (req.bodyRaw) {
            testDoc = JSON.parse(req.bodyRaw);
        }
    } catch (e) {
        log("No body provided or invalid JSON");
    }
    
    if (!testDoc || testDoc.status !== 'generating_solutions') {
        return res.json({ success: false, message: 'Invalid test doc or status' });
    }
    
    try {
        log(`Generating solutions for test: ${testDoc.$id}`);
        
        const mcqFileBuffer = await storage.getFileDownload('mock-jsons', testDoc.mcq_file_id);
        const mcqJson = JSON.parse(mcqFileBuffer.toString('utf8'));
        
        const questions = mcqJson.questions || [];
        const solutions = [];
        
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
${JSON.stringify(batch)}`;
            
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            });
            
            const response = await result.response;
            const text = response.text();
            
            let batchSolutions = [];
            try {
                batchSolutions = JSON.parse(text);
                if(!Array.isArray(batchSolutions)) throw new Error("Expected array");
            } catch(e) {
                throw new Error("Failed to parse Gemini response");
            }
            
            batchSolutions.forEach(sol => {
                const orig = batch.find(q => q.id === sol.question_id || q.question_id === sol.question_id);
                if (!orig) throw new Error(`Missing question_id in response: ${sol.question_id}`);
                solutions.push(sol);
            });
        }
        
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
        
        await storage.createFile('solutions', fileId, InputFile.fromBuffer(buffer, `${testDoc.test_id}-solutions.json`));
        
        await databases.updateDocument(process.env.DATABASE_ID, 'mock_tests', testDoc.$id, {
            status: 'ready',
            solution_file_id: fileId,
            updated_at: new Date().toISOString()
        });
        
        log("Successfully generated solutions.");
        return res.json({ success: true, fileId });
        
    } catch (e) {
        error("Error generating solutions: " + e.message);
        if (testDoc && testDoc.$id) {
            await databases.updateDocument(process.env.DATABASE_ID, 'mock_tests', testDoc.$id, {
                status: 'failed',
                updated_at: new Date().toISOString()
            });
        }
        return res.json({ success: false, error: e.message });
    }
};
