import { Client, Databases, Storage, ID } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async ({ req, res, log, error }) => {
    const genAI = new GoogleGenerativeAI((process.env.GEMINI_API_KEY || '').trim());
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Using the internal Appwrite Function Endpoint if available to bypass DNS issues, otherwise fallback to cloud
    const endpoint = (process.env.APPWRITE_FUNCTION_ENDPOINT || 'https://cloud.appwrite.io/v1').trim();
    const projectId = (process.env.APPWRITE_FUNCTION_PROJECT_ID || '6a11e2ba00082db8f17a').trim();
    const apiKey = (process.env.APPWRITE_API_KEY || '').trim();

    if (!apiKey) {
        log("WARNING: APPWRITE_API_KEY environment variable is missing or empty.");
    }

    const client = new Client()
        .setEndpoint(endpoint)
        .setProject(projectId)
        .setKey(apiKey);
        
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
        
        let mcqJson;
        try {
            const fileUrl = `${endpoint}/storage/buckets/mock-jsons/files/${testDoc.mcq_file_id}/download`;
            log(`Attempting to download file from: ${fileUrl}`);
            const fetchRes = await fetch(fileUrl, {
                headers: {
                    'X-Appwrite-Project': projectId,
                    'X-Appwrite-Key': apiKey
                }
            });
            
            if (!fetchRes.ok) {
                const errText = await fetchRes.text();
                throw new Error(`HTTP ${fetchRes.status}: ${errText}`);
            }
            
            mcqJson = await fetchRes.json();
            log("Successfully downloaded and parsed JSON file.");
        } catch (downloadErr) {
            error(`APPWRITE DOWNLOAD ERROR: ${downloadErr.message}`);
            throw downloadErr;
        }
        
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
            
            let result;
            try {
                log("Calling Gemini API...");
                result = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                });
                log("Gemini API call successful.");
            } catch (geminiErr) {
                error(`GEMINI API ERROR: ${geminiErr.message}`);
                throw geminiErr;
            }
            
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
        
        log("Uploading solutions to Appwrite...");
        const formData = new FormData();
        formData.append('fileId', fileId);
        formData.append('file', new Blob([buffer], { type: 'application/json' }), `${testDoc.test_id}-solutions.json`);
        
        const uploadRes = await fetch(`${endpoint}/storage/buckets/solutions/files`, {
            method: 'POST',
            headers: {
                'X-Appwrite-Project': projectId,
                'X-Appwrite-Key': apiKey
            },
            body: formData
        });

        if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            throw new Error(`Upload failed HTTP ${uploadRes.status}: ${errText}`);
        }
        
        const dbId = process.env.DATABASE_ID || '6a635234001c8046ec7d';
        const updateRes = await fetch(`${endpoint}/databases/${dbId}/collections/mock_tests/documents/${testDoc.$id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-Appwrite-Project': projectId,
                'X-Appwrite-Key': apiKey
            },
            body: JSON.stringify({
                data: {
                    status: 'ready',
                    solution_file_id: fileId,
                    updated_at: new Date().toISOString()
                }
            })
        });

        if (!updateRes.ok) {
            const errText = await updateRes.text();
            throw new Error(`Update failed HTTP ${updateRes.status}: ${errText}`);
        }
        
        log("Successfully generated solutions.");
        return res.json({ success: true, fileId });
        
    } catch (e) {
        error("Error generating solutions: " + e.message);
        if (testDoc && testDoc.$id) {
            try {
                const dbId = process.env.DATABASE_ID || '6a635234001c8046ec7d';
                await fetch(`${endpoint}/databases/${dbId}/collections/mock_tests/documents/${testDoc.$id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Appwrite-Project': projectId,
                        'X-Appwrite-Key': apiKey
                    },
                    body: JSON.stringify({
                        data: {
                            status: 'failed',
                            updated_at: new Date().toISOString()
                        }
                    })
                });
            } catch (dbErr) {
                error("Error updating document status: " + dbErr.message);
            }
        }
        return res.json({ success: false, error: e.message });
    }
};
