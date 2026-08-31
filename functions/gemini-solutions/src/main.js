```javascript
import { Client, Databases, Storage, ID } from "node-appwrite";
import { GoogleGenAI } from "@google/genai";

export default async ({ req, res, log, error }) => {

    // =========================================================
    // CONFIGURATION
    // =========================================================

    const geminiApiKey = (process.env.GEMINI_API_KEY || "").trim();

    const endpoint = (
        process.env.APPWRITE_FUNCTION_ENDPOINT ||
        process.env.APPWRITE_ENDPOINT ||
        "https://sgp.cloud.appwrite.io/v1"
    ).trim();

    const projectId = (
        process.env.APPWRITE_FUNCTION_PROJECT_ID ||
        "6a11e2ba00082db8f17a"
    ).trim();

    const appwriteApiKey = (
        process.env.APPWRITE_API_KEY ||
        ""
    ).trim();

    const databaseId = (
        process.env.DATABASE_ID ||
        "6a635234001c8046ec7d"
    ).trim();

    const mockJsonBucketId = (
        process.env.MOCK_JSON_BUCKET_ID ||
        "mock-jsons"
    ).trim();

    const solutionsBucketId = (
        process.env.SOLUTIONS_BUCKET_ID ||
        "solutions"
    ).trim();

    // =========================================================
    // VALIDATE ENVIRONMENT
    // =========================================================

    if (!geminiApiKey) {
        error("GEMINI_API_KEY is missing.");
        return res.json({
            success: false,
            error: "GEMINI_API_KEY environment variable is missing."
        });
    }

    if (!appwriteApiKey) {
        log(
            "WARNING: APPWRITE_API_KEY environment variable is missing or empty."
        );
    }

    log("Environment configuration loaded.");
    log(`Appwrite project: ${projectId}`);
    log(`Database: ${databaseId}`);
    log(`Mock JSON bucket: ${mockJsonBucketId}`);
    log(`Solutions bucket: ${solutionsBucketId}`);

    // =========================================================
    // INITIALIZE GEMINI
    // =========================================================

    const genAI = new GoogleGenAI({
        apiKey: geminiApiKey
    });

    // Current Gemini model.
    // You can change this later if required.
    const GEMINI_MODEL = "gemini-3.7-flash";

    // =========================================================
    // INITIALIZE APPWRITE
    // =========================================================

    const client = new Client()
        .setEndpoint(endpoint)
        .setProject(projectId);

    if (appwriteApiKey) {
        client.setKey(appwriteApiKey);
    }

    const databases = new Databases(client);
    const storage = new Storage(client);

    // Prevent unused-variable warnings in some build setups.
    void databases;
    void storage;

    // =========================================================
    // READ REQUEST BODY
    // =========================================================

    let testDoc;

    try {
        if (req.bodyRaw) {
            testDoc = JSON.parse(req.bodyRaw);
        }
    } catch (parseError) {
        error(`Invalid request JSON: ${parseError.message}`);

        return res.json({
            success: false,
            error: "Invalid JSON request body."
        });
    }

    // =========================================================
    // VALIDATE REQUEST
    // =========================================================

    if (!testDoc) {
        return res.json({
            success: false,
            message: "No test document supplied."
        });
    }

    if (testDoc.status !== "generating_solutions") {
        return res.json({
            success: false,
            message: "Invalid test status. Expected generating_solutions."
        });
    }

    if (!testDoc.$id) {
        return res.json({
            success: false,
            message: "Test document ID is missing."
        });
    }

    if (!testDoc.mcq_file_id) {
        return res.json({
            success: false,
            message: "MCQ file ID is missing."
        });
    }

    // =========================================================
    // HELPER: UPDATE TEST STATUS
    // =========================================================

    const updateTestStatus = async (data) => {
        const updateUrl =
            `${endpoint}/databases/${databaseId}` +
            `/collections/mock_tests` +
            `/documents/${testDoc.$id}`;

        const updateResponse = await fetch(updateUrl, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "X-Appwrite-Project": projectId,
                "X-Appwrite-Key": appwriteApiKey
            },
            body: JSON.stringify({
                data
            })
        });

        if (!updateResponse.ok) {
            const responseText = await updateResponse.text();

            throw new Error(
                `Database update failed HTTP ${updateResponse.status}: ${responseText}`
            );
        }

        return updateResponse.json();
    };

    // =========================================================
    // HELPER: DOWNLOAD MCQ JSON
    // =========================================================

    const downloadMCQFile = async () => {

        const fileUrl =
            `${endpoint}/storage/buckets/${mockJsonBucketId}` +
            `/files/${testDoc.mcq_file_id}/download`;

        log(`Downloading MCQ JSON: ${fileUrl}`);

        const response = await fetch(fileUrl, {
            method: "GET",
            headers: {
                "X-Appwrite-Project": projectId,
                "X-Appwrite-Key": appwriteApiKey
            }
        });

        if (!response.ok) {
            const responseText = await response.text();

            throw new Error(
                `MCQ file download failed HTTP ${response.status}: ${responseText}`
            );
        }

        const json = await response.json();

        return json;
    };

    // =========================================================
    // HELPER: GENERATE GEMINI SOLUTION
    // =========================================================

    const generateGeminiSolution = async (prompt) => {

        log(`Calling Gemini model: ${GEMINI_MODEL}`);

        const result = await genAI.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = result.text;

        if (!text || !text.trim()) {
            throw new Error("Gemini returned an empty response.");
        }

        return text.trim();
    };

    // =========================================================
    // MAIN PROCESS
    // =========================================================

    try {

        log(`Starting solution generation for test: ${testDoc.$id}`);

        // -----------------------------------------------------
        // DOWNLOAD MCQ JSON
        // -----------------------------------------------------

        let mcqJson;

        try {

            mcqJson = await downloadMCQFile();

            log("Successfully downloaded MCQ JSON.");

        } catch (downloadError) {

            error(
                `APPWRITE DOWNLOAD ERROR: ${downloadError.message}`
            );

            throw downloadError;
        }

        // -----------------------------------------------------
        // GET QUESTIONS
        // -----------------------------------------------------

        const questions = Array.isArray(mcqJson.questions)
            ? mcqJson.questions
            : [];

        if (questions.length === 0) {
            throw new Error(
                "No questions found in MCQ JSON."
            );
        }

        log(`Total questions: ${questions.length}`);

        // -----------------------------------------------------
        // GENERATE SOLUTIONS
        // -----------------------------------------------------

        const solutions = [];

        // Ten questions per Gemini request.
        const batchSize = 10;

        const totalBatches = Math.ceil(
            questions.length / batchSize
        );

        for (
            let i = 0;
            i < questions.length;
            i += batchSize
        ) {

            const batch = questions.slice(
                i,
                i + batchSize
            );

            const batchNumber =
                Math.floor(i / batchSize) + 1;

            log(
                `Processing batch ${batchNumber}/${totalBatches} ` +
                `(${batch.length} questions)`
            );

            // -------------------------------------------------
            // CREATE PROMPT
            // -------------------------------------------------

            const prompt = `
You are an expert Pakistani university entrance-exam teacher.

Your task is to solve the multiple-choice questions provided below.

These questions may come from:
- Mathematics
- Physics
- Chemistry
- English
- Computer Science
- General Knowledge
- Other university entrance-test subjects

For EVERY question:

1. Determine the correct option.
2. Give the exact correct option identifier.
3. Give the exact text of the correct answer.
4. Explain why it is correct.
5. Provide clear step-by-step working where appropriate.
6. For mathematical/scientific questions, show the relevant formula and calculation.
7. Do not invent information.
8. Do not change the question ID.
9. Do not omit any question.
10. Keep explanations suitable for Pakistani university entrance-test students.

IMPORTANT:
- Return ONLY valid JSON.
- Return a JSON ARRAY.
- Do not use Markdown.
- Do not wrap the JSON in \`\`\`json.
- Every input question must produce exactly one output object.
- "question_id" MUST exactly match the input question ID.
- "correct_option" MUST exactly match the option identifier/value used by the question.
- "correct_answer" must contain the text of the correct option.
- Use LaTeX for mathematical equations where useful.
- LaTeX may be written using \\\\( ... \\\\) or \\\\[ ... \\\\].

Required output schema:

[
  {
    "question_id": "string",
    "correct_option": "string",
    "correct_answer": "string",
    "explanation": "string",
    "steps": [
      "string",
      "string"
    ]
  }
]

Questions:

${JSON.stringify(batch, null, 2)}
`;

            // -------------------------------------------------
            // CALL GEMINI
            // -------------------------------------------------

            let responseText;

            try {

                responseText =
                    await generateGeminiSolution(prompt);

                log(
                    `Gemini batch ${batchNumber} completed.`
                );

            } catch (geminiError) {

                error(
                    `GEMINI API ERROR in batch ${batchNumber}: ` +
                    geminiError.message
                );

                throw geminiError;
            }

            // -------------------------------------------------
            // PARSE GEMINI JSON
            // -------------------------------------------------

            let batchSolutions;

            try {

                batchSolutions = JSON.parse(
                    responseText
                );

                if (!Array.isArray(batchSolutions)) {
                    throw new Error(
                        "Gemini response is not a JSON array."
                    );
                }

            } catch (jsonError) {

                error(
                    `Gemini JSON parse error: ${jsonError.message}`
                );

                log(
                    `Raw Gemini response:\n${responseText}`
                );

                throw new Error(
                    "Failed to parse Gemini response as JSON."
                );
            }

            // -------------------------------------------------
            // VALIDATE BATCH
            // -------------------------------------------------

            if (
                batchSolutions.length !== batch.length
            ) {

                throw new Error(
                    `Gemini returned ${batchSolutions.length} ` +
                    `solutions for ${batch.length} questions ` +
                    `in batch ${batchNumber}.`
                );
            }

            for (const solution of batchSolutions) {

                if (!solution.question_id) {
                    throw new Error(
                        "Gemini returned a solution without question_id."
                    );
                }

                const originalQuestion =
                    batch.find(
                        (question) =>
                            question.id === solution.question_id ||
                            question.question_id === solution.question_id
                    );

                if (!originalQuestion) {

                    throw new Error(
                        `Gemini returned unknown question_id: ` +
                        `${solution.question_id}`
                    );
                }

                if (!solution.correct_option) {
                    throw new Error(
                        `Missing correct_option for question ` +
                        `${solution.question_id}`
                    );
                }

                if (!solution.correct_answer) {
                    throw new Error(
                        `Missing correct_answer for question ` +
                        `${solution.question_id}`
                    );
                }

                if (!solution.explanation) {
                    throw new Error(
                        `Missing explanation for question ` +
                        `${solution.question_id}`
                    );
                }

                if (!Array.isArray(solution.steps)) {
                    solution.steps = [];
                }

                solutions.push(solution);
            }

            log(
                `Validated batch ${batchNumber}/${totalBatches}.`
            );
        }

        // -----------------------------------------------------
        // VERIFY TOTAL SOLUTIONS
        // -----------------------------------------------------

        if (solutions.length !== questions.length) {

            throw new Error(
                `Solution count mismatch. ` +
                `Expected ${questions.length}, ` +
                `got ${solutions.length}.`
            );
        }

        log(
            `Successfully generated ${solutions.length} solutions.`
        );

        // -----------------------------------------------------
        // CREATE SOLUTION JSON
        // -----------------------------------------------------

        const solutionDoc = {
            schema_version: 1,

            metadata: {
                test_id: testDoc.test_id || null,
                generated_by: "gemini",
                model: GEMINI_MODEL,
                generated_at: new Date().toISOString(),
                question_count: questions.length
            },

            solutions
        };

        const buffer = Buffer.from(
            JSON.stringify(
                solutionDoc,
                null,
                2
            ),
            "utf-8"
        );

        // -----------------------------------------------------
        // UPLOAD SOLUTION FILE
        // -----------------------------------------------------

        const fileId = ID.unique();

        log(
            `Uploading solution file: ${fileId}`
        );

        const formData = new FormData();

        formData.append(
            "fileId",
            fileId
        );

        formData.append(
            "file",
            new Blob(
                [buffer],
                {
                    type: "application/json"
                }
            ),
            `${testDoc.test_id || testDoc.$id}-solutions.json`
        );

        const uploadUrl =
            `${endpoint}/storage/buckets/${solutionsBucketId}/files`;

        const uploadResponse = await fetch(
            uploadUrl,
            {
                method: "POST",

                headers: {
                    "X-Appwrite-Project": projectId,
                    "X-Appwrite-Key": appwriteApiKey
                },

                body: formData
            }
        );

        if (!uploadResponse.ok) {

            const responseText =
                await uploadResponse.text();

            throw new Error(
                `Solution upload failed HTTP ` +
                `${uploadResponse.status}: ${responseText}`
            );
        }

        const uploadedFile =
            await uploadResponse.json();

        log(
            `Solution file uploaded successfully: ${fileId}`
        );

        // -----------------------------------------------------
        // UPDATE TEST DOCUMENT
        // -----------------------------------------------------

        await updateTestStatus({
            status: "ready",
            solution_file_id: fileId,
            updated_at: new Date().toISOString()
        });

        log(
            `Test ${testDoc.$id} marked as ready.`
        );

        // -----------------------------------------------------
        // SUCCESS
        // -----------------------------------------------------

        return res.json({
            success: true,

            test_id: testDoc.$id,

            fileId,

            solution_file_id: fileId,

            question_count: questions.length,

            model: GEMINI_MODEL,

            uploaded_file: uploadedFile.$id || fileId
        });

    } catch (e) {

        // =====================================================
        // GLOBAL ERROR HANDLING
        // =====================================================

        error(
            `Error generating solutions: ${e.message}`
        );

        // -----------------------------------------------------
        // MARK TEST AS FAILED
        // -----------------------------------------------------

        if (testDoc && testDoc.$id) {

            try {

                await updateTestStatus({
                    status: "failed",
                    updated_at: new Date().toISOString()
                });

                log(
                    `Test ${testDoc.$id} marked as failed.`
                );

            } catch (dbError) {

                error(
                    "Error updating document status: " +
                    dbError.message
                );
            }
        }

        // -----------------------------------------------------
        // RETURN ERROR
        // -----------------------------------------------------

        return res.json({
            success: false,
            error: e.message,
            test_id: testDoc?.$id || null
        });
    }
};
```
