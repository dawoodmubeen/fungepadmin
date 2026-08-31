import { databases, storage, CONFIG, ID, Query } from '../appwrite/config.js';
import { showToast } from '../components/toast.js';

export const mockTestsController = {
    async render(container) {
        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold text-gray-900">Mock Tests</h1>
                    <button id="create-mock-btn" class="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-secondary transition-colors">
                        Create Mock Test
                    </button>
                </div>
                <div id="mock-tests-list" class="bg-white shadow rounded-lg p-6">
                    <div class="text-center text-gray-500">Loading...</div>
                </div>
            </div>
            
            <!-- Create Modal -->
            <div id="create-mock-modal" class="fixed inset-0 bg-gray-900 bg-opacity-50 hidden z-50 flex items-center justify-center overflow-y-auto">
                <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 my-8 p-6 relative max-h-[90vh] overflow-y-auto">
                    <button id="close-modal-btn" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <i data-lucide="x" class="h-6 w-6"></i>
                    </button>
                    <h2 class="text-xl font-bold mb-6">Create Mock Test</h2>
                    <form id="create-mock-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">University</label>
                            <select id="university-select" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary py-2 px-3 border">
                                <option value="">Select University</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Test Title</label>
                            <input type="text" id="test-title" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary py-2 px-3 border">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Test Type</label>
                            <select id="test-type" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary py-2 px-3 border">
                                <option value="Mock">Mock</option>
                                <option value="Past Paper">Past Paper</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Access</label>
                            <div class="mt-2 space-x-4">
                                <label class="inline-flex items-center">
                                    <input type="radio" name="access" value="free" class="form-radio text-primary">
                                    <span class="ml-2">Free</span>
                                </label>
                                <label class="inline-flex items-center">
                                    <input type="radio" name="access" value="premium" checked class="form-radio text-primary">
                                    <span class="ml-2">Premium</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Pattern JSON</label>
                            <input type="file" id="pattern-json" accept=".json" required class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border p-2 rounded-md">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">MCQ JSON</label>
                            <input type="file" id="mcq-json" accept=".json" required class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border p-2 rounded-md">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Solution JSON (Optional)</label>
                            <input type="file" id="solution-json" accept=".json" class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border p-2 rounded-md">
                        </div>
                        <div id="validation-summary" class="hidden bg-gray-50 p-4 rounded-md mt-4 text-sm font-mono border"></div>
                        <div class="mt-6 flex justify-end gap-3">
                            <button type="button" id="cancel-mock-btn" class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                            <button type="submit" id="submit-mock-btn" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary">Validate & Upload</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Replace Solution Modal -->
            <div id="replace-solution-modal" class="fixed inset-0 bg-gray-900 bg-opacity-50 hidden z-50 flex items-center justify-center overflow-y-auto">
                <div class="bg-white rounded-xl shadow-xl w-full max-w-md m-4 my-8 p-6 relative">
                    <button id="close-replace-modal-btn" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <i data-lucide="x" class="h-6 w-6"></i>
                    </button>
                    <h2 class="text-xl font-bold mb-6">Upload/Replace Solutions</h2>
                    <form id="replace-solution-form" class="space-y-4">
                        <input type="hidden" id="replace-test-id">
                        <input type="hidden" id="replace-mcq-file-id">
                        <input type="hidden" id="replace-pattern-file-id">
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">New Solution JSON</label>
                            <input type="file" id="new-solution-json" accept=".json" required class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border p-2 rounded-md">
                        </div>
                        <div id="replace-validation-summary" class="hidden bg-gray-50 p-4 rounded-md mt-4 text-sm font-mono border"></div>
                        <div class="mt-6 flex justify-end gap-3">
                            <button type="button" id="cancel-replace-btn" class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                            <button type="submit" id="submit-replace-btn" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary">Validate & Replace</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        await this.loadList();
        await this.loadUniversities();

        document.getElementById('create-mock-btn').addEventListener('click', () => {
            document.getElementById('create-mock-form').reset();
            document.getElementById('validation-summary').classList.add('hidden');
            document.getElementById('validation-summary').innerHTML = '';
            document.getElementById('create-mock-modal').classList.remove('hidden');
        });

        document.getElementById('close-modal-btn').addEventListener('click', () => {
            document.getElementById('create-mock-modal').classList.add('hidden');
        });
        document.getElementById('cancel-mock-btn').addEventListener('click', () => {
            document.getElementById('create-mock-modal').classList.add('hidden');
        });

        document.getElementById('close-replace-modal-btn').addEventListener('click', () => {
            document.getElementById('replace-solution-modal').classList.add('hidden');
        });
        document.getElementById('cancel-replace-btn').addEventListener('click', () => {
            document.getElementById('replace-solution-modal').classList.add('hidden');
        });

        document.getElementById('create-mock-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleCreateMock();
        });

        document.getElementById('replace-solution-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleReplaceSolution();
        });
    },

    async loadUniversities() {
        try {
            const result = await databases.listDocuments(CONFIG.databaseId, CONFIG.universitiesCol, [Query.limit(100)]);
            const select = document.getElementById('university-select');
            result.documents.forEach(uni => {
                const option = document.createElement('option');
                option.value = uni.$id;
                option.textContent = uni.name || uni.title || uni.$id;
                option.dataset.name = uni.name || uni.title || uni.$id;
                select.appendChild(option);
            });
        } catch (error) {
            console.error("Error loading universities:", error);
        }
    },

    async loadList() {
        try {
            const collectionId = 'mock_tests';
            const result = await databases.listDocuments(CONFIG.databaseId, collectionId, [
                Query.orderDesc('created_at'),
                Query.limit(50)
            ]);
            
            const listEl = document.getElementById('mock-tests-list');
            if (result.documents.length === 0) {
                listEl.innerHTML = '<div class="text-center text-gray-500 py-8">No mock tests found.</div>';
                return;
            }

            let html = '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200"><thead><tr>';
            html += '<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Info</th>';
            html += '<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Files</th>';
            html += '<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status & Access</th>';
            html += '<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>';
            html += '</tr></thead><tbody class="divide-y divide-gray-200">';
            
            result.documents.forEach(doc => {
                const statusColor = doc.status === 'ready' ? 'bg-green-100 text-green-800' :
                                   doc.status === 'published' ? 'bg-blue-100 text-blue-800' :
                                   doc.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                   doc.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
                
                const hasSolutions = !!doc.solution_file_id;
                
                html += `<tr>
                    <td class="px-4 py-3 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${doc.title}</div>
                        <div class="text-sm text-gray-500">${doc.university_name}</div>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        <div>Pattern: ✓ Uploaded</div>
                        <div>MCQs: ✓ Uploaded</div>
                        <div>Solutions: ${hasSolutions ? '✓ Uploaded' : '<span class="text-yellow-600">⚠ Missing</span>'}</div>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm">
                        <span class="px-2 py-1 rounded-full text-xs font-medium ${statusColor}">${doc.status}</span>
                        <div class="mt-1 text-gray-500 text-xs">${doc.is_premium ? 'Premium' : 'Free'}</div>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 space-x-2">
                        ${(doc.status === 'ready' || doc.status === 'draft') ? `<button class="text-blue-600 hover:text-blue-900 publish-btn" data-id="${doc.$id}">Publish</button>` : ''}
                        <button class="text-indigo-600 hover:text-indigo-900 replace-sol-btn" data-id="${doc.$id}" data-mcq="${doc.mcq_file_id}" data-pattern="${doc.pattern_file_id}">${hasSolutions ? 'Replace' : 'Upload'} Solutions</button>
                    </td>
                </tr>`;
            });
            html += '</tbody></table></div>';
            listEl.innerHTML = html;

            document.querySelectorAll('.publish-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    if(confirm('Publish this test?')) {
                        try {
                            await databases.updateDocument(CONFIG.databaseId, collectionId, id, {
                                status: 'published',
                                updated_at: new Date().toISOString()
                            });
                            showToast("Test published successfully");
                            this.loadList();
                        } catch (err) {
                            showToast(err.message, "error");
                        }
                    }
                });
            });
            
            document.querySelectorAll('.replace-sol-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.getElementById('replace-solution-form').reset();
                    document.getElementById('replace-validation-summary').classList.add('hidden');
                    document.getElementById('replace-validation-summary').innerHTML = '';
                    
                    document.getElementById('replace-test-id').value = e.target.dataset.id;
                    document.getElementById('replace-mcq-file-id').value = e.target.dataset.mcq;
                    document.getElementById('replace-pattern-file-id').value = e.target.dataset.pattern;
                    
                    document.getElementById('replace-solution-modal').classList.remove('hidden');
                });
            });

        } catch (error) {
            console.error(error);
            document.getElementById('mock-tests-list').innerHTML = '<div class="text-center text-red-500 py-8">Failed to load mock tests.</div>';
        }
    },

    async fetchFileContent(bucketId, fileId) {
        try {
            const url = storage.getFileDownload(bucketId, fileId);
            const response = await fetch(url.href);
            if (!response.ok) throw new Error("Failed to fetch file content");
            return await response.json();
        } catch (error) {
            throw new Error(\`Failed to fetch file \${fileId} from \${bucketId}\`);
        }
    },

    async handleCreateMock() {
        const uniSelect = document.getElementById('university-select');
        const uniId = uniSelect.value;
        const uniName = uniSelect.options[uniSelect.selectedIndex].dataset.name;
        const title = document.getElementById('test-title').value;
        const testType = document.getElementById('test-type').value;
        const isPremium = document.querySelector('input[name="access"]:checked').value === 'premium';
        
        const patternFileEl = document.getElementById('pattern-json');
        const mcqFileEl = document.getElementById('mcq-json');
        const solutionFileEl = document.getElementById('solution-json');
        
        const validationSummary = document.getElementById('validation-summary');
        const btn = document.getElementById('submit-mock-btn');
        
        btn.disabled = true;
        btn.textContent = 'Validating...';
        validationSummary.classList.remove('hidden');
        validationSummary.innerHTML = 'Starting validation...<br>';
        
        try {
            const patternContent = await this.readFile(patternFileEl.files[0]);
            const mcqContent = await this.readFile(mcqFileEl.files[0]);
            const hasSolution = solutionFileEl.files.length > 0;
            let solutionContent = null;
            if (hasSolution) {
                solutionContent = await this.readFile(solutionFileEl.files[0]);
            }
            
            let pattern, mcq, solution;
            try {
                pattern = JSON.parse(patternContent);
                mcq = JSON.parse(mcqContent);
                if (hasSolution) solution = JSON.parse(solutionContent);
                validationSummary.innerHTML += '✓ Valid JSON format<br>';
            } catch (e) {
                throw new Error("Invalid JSON files provided.");
            }
            
            // Validate Pattern JSON
            const requiredPatternFields = ['schema_version', 'pattern_id', 'university_id', 'university_name', 'test', 'sections'];
            for (const field of requiredPatternFields) {
                if (!(field in pattern)) throw new Error(\`Pattern JSON missing \${field}\`);
            }
            const requiredTestFields = ['test_id', 'test_name', 'total_questions', 'total_marks', 'duration_minutes'];
            for (const field of requiredTestFields) {
                if (!(field in pattern.test)) throw new Error(\`Pattern JSON test missing \${field}\`);
            }
            
            const patternSections = pattern.sections || [];
            const sectionMap = {};
            patternSections.forEach(s => {
                const sId = s.section_id || s.id;
                if(!sId || !s.name || s.total_questions === undefined || s.weightage_percent === undefined || s.negative_marking === undefined) {
                    throw new Error("Pattern JSON sections missing required fields");
                }
                sectionMap[sId] = s;
            });
            
            // Validate MCQ JSON
            const requiredMcqFields = ['schema_version', 'test_id', 'pattern_id', 'university_id', 'university_name', 'test_name', 'questions'];
            for (const field of requiredMcqFields) {
                if (!(field in mcq)) throw new Error(\`MCQ JSON missing \${field}\`);
            }
            
            const testId = pattern.test.test_id;
            if (testId === mcq.test_id) {
                validationSummary.innerHTML += '✓ Pattern test_id matches MCQ test_id<br>';
            } else {
                throw new Error(\`Pattern test_id (\${testId}) and MCQ test_id (\${mcq.test_id}) mismatch\`);
            }
            
            const mcqQuestions = mcq.questions || [];
            const mcqSectionCounts = {};
            const questionIds = new Set();
            const mcqAnswers = {};
            
            mcqQuestions.forEach(q => {
                const qId = q.question_id || q.id;
                if(!qId || !q.section_id || !q.question || !q.options || !q.correct_option) {
                    throw new Error(\`Question missing required fields\`);
                }
                if(!sectionMap[q.section_id]) throw new Error(\`Invalid section reference in MCQ JSON: \${q.section_id}\`);
                if(questionIds.has(qId)) throw new Error("Duplicate question ID: " + qId);
                questionIds.add(qId);
                
                if(Object.keys(q.options).length < 2) throw new Error(\`Question \${qId} has missing or invalid options\`);
                if(!q.options[q.correct_option]) throw new Error(\`Question \${qId} has invalid correct_option\`);
                
                mcqSectionCounts[q.section_id] = (mcqSectionCounts[q.section_id] || 0) + 1;
                mcqAnswers[qId] = q.correct_option;
            });
            
            validationSummary.innerHTML += '✓ Section references valid<br>';
            validationSummary.innerHTML += '✓ Question IDs unique and options valid<br>';
            
            if(pattern.test.total_questions === mcqQuestions.length) {
                validationSummary.innerHTML += '✓ Total question count matches pattern<br>';
            } else {
                throw new Error("Total question count mismatch. Pattern: " + pattern.test.total_questions + ", MCQ: " + mcqQuestions.length);
            }
            
            let sectionCountsMatch = true;
            patternSections.forEach(s => {
                const sId = s.section_id || s.id;
                const count = mcqSectionCounts[sId] || 0;
                if(count !== s.total_questions) {
                    validationSummary.innerHTML += \`❌ \${s.name} \${count}/\${s.total_questions}<br>\`;
                    sectionCountsMatch = false;
                }
            });
            
            if(sectionCountsMatch) validationSummary.innerHTML += '✓ Per-section question count matches<br>';
            else throw new Error("Per-section question count mismatch");
            
            // Validate Solution JSON
            let completeSolutions = false;
            if (hasSolution) {
                const reqSol = ['schema_version', 'test_id', 'pattern_id', 'university_id', 'solutions'];
                for (const field of reqSol) {
                    if (!(field in solution)) throw new Error(\`Solution JSON missing \${field}\`);
                }
                if (solution.test_id !== mcq.test_id) throw new Error("Solution test_id mismatch");
                if (solution.pattern_id !== mcq.pattern_id) throw new Error("Solution pattern_id mismatch");
                if (solution.university_id !== mcq.university_id) throw new Error("Solution university_id mismatch");
                
                const solMap = new Set();
                solution.solutions.forEach(s => {
                    if(!s.question_id || !s.correct_option) throw new Error("Solution item missing required fields");
                    if(!mcqAnswers[s.question_id]) throw new Error(\`Solution has unknown question ID: \${s.question_id}\`);
                    if(solMap.has(s.question_id)) throw new Error(\`Duplicate solution question ID: \${s.question_id}\`);
                    
                    if(s.correct_option !== mcqAnswers[s.question_id]) {
                        throw new Error(\`Solution validation failed\\nQuestion: \${s.question_id}\\nMCQ correct option: \${mcqAnswers[s.question_id]}\\nSolution correct option: \${s.correct_option}\\nPlease correct the solution JSON.\`);
                    }
                    solMap.add(s.question_id);
                });
                
                if (solution.solutions.length === mcqQuestions.length) {
                    completeSolutions = true;
                    validationSummary.innerHTML += '✓ Solutions complete and answers match<br>';
                } else {
                    validationSummary.innerHTML += \`⚠ \${mcqQuestions.length - solution.solutions.length} solutions missing<br>\`;
                }
            } else {
                validationSummary.innerHTML += 'ℹ No solution JSON provided (Draft mode)<br>';
            }
            
            validationSummary.innerHTML += '<br><span class="text-green-600 font-bold">All validation checks passed. Uploading...</span><br>';
            
            const patternFileName = \`\${testId}-pattern.json\`;
            const mcqFileName = \`\${testId}.json\`;
            
            const newPatternFile = new File([patternFileEl.files[0]], patternFileName, {type: "application/json"});
            const newMcqFile = new File([mcqFileEl.files[0]], mcqFileName, {type: "application/json"});
            
            const patternUploaded = await storage.createFile('test_patterns', ID.unique(), newPatternFile);
            const mcqUploaded = await storage.createFile('mock-jsons', ID.unique(), newMcqFile);
            
            let solutionUploaded = null;
            if (hasSolution) {
                const solutionFileName = \`\${testId}-solutions.json\`;
                const newSolutionFile = new File([solutionFileEl.files[0]], solutionFileName, {type: "application/json"});
                solutionUploaded = await storage.createFile('solutions', ID.unique(), newSolutionFile);
            }
            
            const docId = ID.unique();
            const now = new Date().toISOString();
            
            const finalStatus = (hasSolution && completeSolutions) ? 'ready' : 'draft';
            
            await databases.createDocument(CONFIG.databaseId, 'mock_tests', docId, {
                test_id: testId,
                university_id: uniId,
                university_name: uniName,
                title: title,
                slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                test_type: testType,
                pattern_file_id: patternUploaded.$id,
                mcq_file_id: mcqUploaded.$id,
                solution_file_id: solutionUploaded ? solutionUploaded.$id : null,
                is_premium: isPremium,
                status: finalStatus,
                created_at: now,
                updated_at: now
            });
            
            showToast(\`Test uploaded successfully and saved as \${finalStatus}\`);
            document.getElementById('create-mock-modal').classList.add('hidden');
            this.loadList();
            
        } catch (error) {
            console.error(error);
            validationSummary.innerHTML += \`<br><span class="text-red-600 font-bold">❌ Validation failed: \${error.message}</span>\`;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Validate & Upload';
        }
    },

    async handleReplaceSolution() {
        const docId = document.getElementById('replace-test-id').value;
        const mcqFileId = document.getElementById('replace-mcq-file-id').value;
        const solutionFileEl = document.getElementById('new-solution-json');
        
        const validationSummary = document.getElementById('replace-validation-summary');
        const btn = document.getElementById('submit-replace-btn');
        
        btn.disabled = true;
        btn.textContent = 'Validating...';
        validationSummary.classList.remove('hidden');
        validationSummary.innerHTML = 'Fetching existing MCQ JSON...<br>';
        
        try {
            // Fetch MCQ JSON for validation
            const mcq = await this.fetchFileContent('mock-jsons', mcqFileId);
            validationSummary.innerHTML += '✓ Fetched existing MCQ JSON<br>';
            
            const solutionContent = await this.readFile(solutionFileEl.files[0]);
            let solution;
            try {
                solution = JSON.parse(solutionContent);
            } catch(e) {
                throw new Error("Invalid Solution JSON file.");
            }
            
            const reqSol = ['schema_version', 'test_id', 'pattern_id', 'university_id', 'solutions'];
            for (const field of reqSol) {
                if (!(field in solution)) throw new Error(\`Solution JSON missing \${field}\`);
            }
            if (solution.test_id !== mcq.test_id) throw new Error("Solution test_id mismatch");
            
            const mcqAnswers = {};
            const mcqQuestions = mcq.questions || [];
            mcqQuestions.forEach(q => {
                mcqAnswers[q.question_id || q.id] = q.correct_option;
            });
            
            const solMap = new Set();
            solution.solutions.forEach(s => {
                if(!s.question_id || !s.correct_option) throw new Error("Solution item missing required fields");
                if(!mcqAnswers[s.question_id]) throw new Error(\`Solution has unknown question ID: \${s.question_id}\`);
                if(solMap.has(s.question_id)) throw new Error(\`Duplicate solution question ID: \${s.question_id}\`);
                
                if(s.correct_option !== mcqAnswers[s.question_id]) {
                    throw new Error(\`Solution validation failed\\nQuestion: \${s.question_id}\\nMCQ correct option: \${mcqAnswers[s.question_id]}\\nSolution correct option: \${s.correct_option}\\nPlease correct the solution JSON.\`);
                }
                solMap.add(s.question_id);
            });
            
            let completeSolutions = false;
            if (solution.solutions.length === mcqQuestions.length) {
                completeSolutions = true;
                validationSummary.innerHTML += '✓ Solutions complete and answers match<br>';
            } else {
                validationSummary.innerHTML += \`⚠ \${mcqQuestions.length - solution.solutions.length} solutions missing<br>\`;
            }
            
            validationSummary.innerHTML += '<br><span class="text-green-600 font-bold">Uploading new solution...</span><br>';
            
            const testId = mcq.test_id;
            const solutionFileName = \`\${testId}-solutions.json\`;
            const newSolutionFile = new File([solutionFileEl.files[0]], solutionFileName, {type: "application/json"});
            
            const solutionUploaded = await storage.createFile('solutions', ID.unique(), newSolutionFile);
            
            await databases.updateDocument(CONFIG.databaseId, 'mock_tests', docId, {
                solution_file_id: solutionUploaded.$id,
                status: completeSolutions ? 'ready' : 'draft',
                updated_at: new Date().toISOString()
            });
            
            showToast("Solutions updated successfully");
            document.getElementById('replace-solution-modal').classList.add('hidden');
            this.loadList();
            
        } catch (error) {
            console.error(error);
            validationSummary.innerHTML += \`<br><span class="text-red-600 font-bold">❌ Validation failed: \${error.message}</span>\`;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Validate & Replace';
        }
    },
    
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e);
            reader.readAsText(file);
        });
    }
};
