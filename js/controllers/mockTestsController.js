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
                        <div id="validation-summary" class="hidden bg-gray-50 p-4 rounded-md mt-4 text-sm font-mono border"></div>
                        <div class="mt-6 flex justify-end gap-3">
                            <button type="button" id="cancel-mock-btn" class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                            <button type="submit" id="submit-mock-btn" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary">Validate & Upload</button>
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

        document.getElementById('create-mock-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleCreateMock();
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
            html += '<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>';
            html += '<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">University</th>';
            html += '<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>';
            html += '<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Access</th>';
            html += '<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>';
            html += '</tr></thead><tbody class="divide-y divide-gray-200">';
            
            result.documents.forEach(doc => {
                const statusColor = doc.status === 'ready' ? 'bg-green-100 text-green-800' :
                                   doc.status === 'published' ? 'bg-blue-100 text-blue-800' :
                                   doc.status === 'generating_solutions' ? 'bg-yellow-100 text-yellow-800' :
                                   doc.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';
                
                html += `<tr>
                    <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${doc.title}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${doc.university_name}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm"><span class="px-2 py-1 rounded-full text-xs font-medium ${statusColor}">${doc.status}</span></td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${doc.is_premium ? 'Premium' : 'Free'}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 space-x-2">
                        ${doc.status === 'ready' ? `<button class="text-blue-600 hover:text-blue-900 publish-btn" data-id="${doc.$id}">Publish</button>` : ''}
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

        } catch (error) {
            console.error(error);
            document.getElementById('mock-tests-list').innerHTML = '<div class="text-center text-red-500 py-8">Failed to load mock tests.</div>';
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
        
        const validationSummary = document.getElementById('validation-summary');
        const btn = document.getElementById('submit-mock-btn');
        
        btn.disabled = true;
        btn.textContent = 'Validating...';
        validationSummary.classList.remove('hidden');
        validationSummary.innerHTML = 'Starting validation...<br>';
        
        try {
            const patternContent = await this.readFile(patternFileEl.files[0]);
            const mcqContent = await this.readFile(mcqFileEl.files[0]);
            
            let pattern, mcq;
            try {
                pattern = JSON.parse(patternContent);
                mcq = JSON.parse(mcqContent);
                validationSummary.innerHTML += '✓ Valid JSON<br>';
            } catch (e) {
                throw new Error("Invalid JSON files provided.");
            }
            
            if(pattern.schema_version && mcq.schema_version) {
                validationSummary.innerHTML += '✓ schema_version<br>';
            } else {
                throw new Error("Missing schema_version");
            }
            
            if(uniId) {
                validationSummary.innerHTML += '✓ University exists<br>';
            } else {
                throw new Error("University not selected");
            }
            
            const testId = pattern.test?.test_id;
            if(testId) {
                validationSummary.innerHTML += '✓ Test ID exists<br>';
            } else {
                throw new Error("Pattern JSON missing test_id");
            }
            
            if(testId === mcq.metadata?.test_id) {
                validationSummary.innerHTML += '✓ Pattern test_id matches MCQ test_id<br>';
            } else {
                throw new Error("Pattern test_id and MCQ test_id mismatch");
            }
            
            const patternSections = pattern.sections || [];
            const sectionMap = {};
            patternSections.forEach(s => sectionMap[s.id] = s);
            
            const mcqQuestions = mcq.questions || [];
            const mcqSectionCounts = {};
            const questionIds = new Set();
            
            let allValidOptions = true;
            let correctOptionExists = true;
            let sectionRefsValid = true;
            
            mcqQuestions.forEach(q => {
                if(!sectionMap[q.section_id]) sectionRefsValid = false;
                if(questionIds.has(q.id)) throw new Error("Duplicate question ID: " + q.id);
                questionIds.add(q.id);
                
                if(!q.options || Object.keys(q.options).length < 2) allValidOptions = false;
                if(!q.correct_option || !q.options[q.correct_option]) correctOptionExists = false;
                
                mcqSectionCounts[q.section_id] = (mcqSectionCounts[q.section_id] || 0) + 1;
            });
            
            if(sectionRefsValid) validationSummary.innerHTML += '✓ Section references valid<br>';
            else throw new Error("Invalid section references in MCQ JSON");
            
            validationSummary.innerHTML += '✓ Question IDs unique<br>';
            
            if(allValidOptions) validationSummary.innerHTML += '✓ Every question has valid options<br>';
            else throw new Error("Some questions have missing or invalid options");
            
            if(correctOptionExists) validationSummary.innerHTML += '✓ Correct option exists<br>';
            else throw new Error("Some questions have invalid correct_option");
            
            if(pattern.test.total_questions === mcqQuestions.length) {
                validationSummary.innerHTML += '✓ Total question count matches pattern<br>';
            } else {
                throw new Error("Total question count mismatch. Pattern: " + pattern.test.total_questions + ", MCQ: " + mcqQuestions.length);
            }
            
            let sectionCountsMatch = true;
            validationSummary.innerHTML += '<br>Questions<br>';
            patternSections.forEach(s => {
                const count = mcqSectionCounts[s.id] || 0;
                if(count === s.total_questions) {
                    validationSummary.innerHTML += `&nbsp;&nbsp;${s.name} ${count}/${s.total_questions} ✓<br>`;
                } else {
                    validationSummary.innerHTML += `&nbsp;&nbsp;${s.name} ${count}/${s.total_questions} ❌<br>`;
                    sectionCountsMatch = false;
                }
            });
            
            if(sectionCountsMatch) validationSummary.innerHTML += '✓ Per-section question count matches<br>';
            else throw new Error("Per-section question count mismatch");
            
            validationSummary.innerHTML += '<br><span class="text-green-600 font-bold">All validation checks passed. Uploading...</span><br>';
            
            const patternUploaded = await storage.createFile('test_patterns', ID.unique(), patternFileEl.files[0]);
            const mcqUploaded = await storage.createFile('mock-jsons', ID.unique(), mcqFileEl.files[0]);
            
            const docId = ID.unique();
            const now = new Date().toISOString();
            await databases.createDocument(CONFIG.databaseId, 'mock_tests', docId, {
                test_id: testId,
                university_id: uniId,
                university_name: uniName,
                title: title,
                slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                test_type: testType,
                pattern_file_id: patternUploaded.$id,
                mcq_file_id: mcqUploaded.$id,
                is_premium: isPremium,
                status: 'generating_solutions',
                created_at: now,
                updated_at: now
            });
            
            showToast("Test uploaded and queued for solution generation!");
            document.getElementById('create-mock-modal').classList.add('hidden');
            this.loadList();
            
        } catch (error) {
            console.error(error);
            validationSummary.innerHTML += `<br><span class="text-red-600 font-bold">❌ Validation failed: ${error.message}</span>`;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Validate & Upload';
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
