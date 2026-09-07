import { showToast } from '../components/toast.js';

export const validatorController = {
    async render(container) {
        container.innerHTML = `
            <div class="space-y-6 max-w-5xl mx-auto">
                <!-- Action Bar -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">JSON Integrity & Schema Validator</h1>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-700">v2.0 Schema Ready</span>
                        </div>
                        <p class="text-xs sm:text-sm text-slate-500 mt-1">Pre-publish quality assurance: detect broken question IDs, option discrepancies, section mismatches, and solution sync issues.</p>
                    </div>
                    <button id="run-validation-btn" class="btn-primary">
                        <i data-lucide="play" class="w-4 h-4"></i>
                        <span>Execute Integrity Check</span>
                    </button>
                </div>

                <!-- Input Panels Grid (Pattern, MCQs, Solutions) -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- 1. Pattern JSON -->
                    <div class="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between space-y-3">
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <label class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                    <i data-lucide="file-code" class="w-4 h-4 text-sky-600"></i>
                                    <span>1. Pattern JSON</span>
                                </label>
                                <span class="text-[10px] text-slate-400 font-bold">Blueprint</span>
                            </div>
                            <input type="file" id="val-file-pattern" accept=".json" class="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 w-full mb-2">
                            <textarea id="val-text-pattern" rows="8" placeholder="Or paste Pattern JSON here..." class="form-input font-mono text-[11px]"></textarea>
                        </div>
                    </div>

                    <!-- 2. MCQ JSON -->
                    <div class="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between space-y-3">
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <label class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                    <i data-lucide="help-circle" class="w-4 h-4 text-indigo-600"></i>
                                    <span>2. MCQ Questions JSON</span>
                                </label>
                                <span class="text-[10px] text-slate-400 font-bold">Required</span>
                            </div>
                            <input type="file" id="val-file-mcq" accept=".json" class="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 w-full mb-2">
                            <textarea id="val-text-mcq" rows="8" placeholder="Or paste MCQ Questions JSON here..." class="form-input font-mono text-[11px]"></textarea>
                        </div>
                    </div>

                    <!-- 3. Solutions JSON -->
                    <div class="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between space-y-3">
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <label class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                    <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600"></i>
                                    <span>3. Solution Explanations</span>
                                </label>
                                <span class="text-[10px] text-slate-400 font-bold">Optional</span>
                            </div>
                            <input type="file" id="val-file-sol" accept=".json" class="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 w-full mb-2">
                            <textarea id="val-text-sol" rows="8" placeholder="Or paste Solution JSON here..." class="form-input font-mono text-[11px]"></textarea>
                        </div>
                    </div>
                </div>

                <!-- Live Diagnostic Telemetry Console -->
                <div class="bg-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-4">
                    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div class="flex items-center gap-2">
                            <div class="w-3 h-3 rounded-full bg-rose-500"></div>
                            <div class="w-3 h-3 rounded-full bg-amber-500"></div>
                            <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
                            <span class="text-xs font-mono font-bold text-slate-400 ml-2">Diagnostic Validation Console</span>
                        </div>
                        <button id="clear-console-btn" class="text-xs text-slate-500 hover:text-slate-300 transition">Clear Console</button>
                    </div>

                    <div id="validator-output" class="font-mono text-xs space-y-1.5 max-h-96 overflow-y-auto leading-relaxed text-slate-300">
                        <span class="text-slate-500">> Ready for input. Select files or paste JSON payloads above, then click "Execute Integrity Check".</span>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
        this.setupEvents();
    },

    setupEvents() {
        // File to textarea bindings
        const bindFile = (fileInputId, textAreaId) => {
            document.getElementById(fileInputId)?.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const text = await this.readFile(file);
                    document.getElementById(textAreaId).value = text;
                    showToast(`Loaded ${file.name}`, 'info');
                }
            });
        };

        bindFile('val-file-pattern', 'val-text-pattern');
        bindFile('val-file-mcq', 'val-text-mcq');
        bindFile('val-file-sol', 'val-text-sol');

        document.getElementById('clear-console-btn')?.addEventListener('click', () => {
            document.getElementById('validator-output').innerHTML = `<span class="text-slate-500">> Console cleared.</span>`;
        });

        document.getElementById('run-validation-btn')?.addEventListener('click', () => {
            this.runDiagnostics();
        });
    },

    runDiagnostics() {
        const out = document.getElementById('validator-output');
        out.innerHTML = `> [START] Executing FUNGEP Enterprise v2.0 Schema Audit...<br>`;

        const pText = document.getElementById('val-text-pattern').value.trim();
        const mText = document.getElementById('val-text-mcq').value.trim();
        const sText = document.getElementById('val-text-sol').value.trim();

        if (!mText) {
            out.innerHTML += `<span class="text-rose-400 font-bold">> [CRITICAL] MCQ JSON is required to perform integrity checks.</span><br>`;
            return;
        }

        let pattern = null;
        let mcqs = null;
        let solutions = null;
        let errors = 0;
        let warnings = 0;

        // 1. JSON Syntax Check
        if (pText) {
            try {
                pattern = JSON.parse(pText);
                out.innerHTML += `<span class="text-emerald-400">✓ Pattern JSON valid syntax.</span><br>`;
            } catch (e) {
                out.innerHTML += `<span class="text-rose-400">❌ Syntax Error in Pattern JSON: ${e.message}</span><br>`;
                errors++;
            }
        }

        try {
            mcqs = JSON.parse(mText);
            out.innerHTML += `<span class="text-emerald-400">✓ MCQ Questions JSON valid syntax.</span><br>`;
        } catch (e) {
            out.innerHTML += `<span class="text-rose-400">❌ Syntax Error in MCQ JSON: ${e.message}</span><br>`;
            errors++;
            return;
        }

        if (sText) {
            try {
                solutions = JSON.parse(sText);
                out.innerHTML += `<span class="text-emerald-400">✓ Solution JSON valid syntax.</span><br>`;
            } catch (e) {
                out.innerHTML += `<span class="text-rose-400">❌ Syntax Error in Solution JSON: ${e.message}</span><br>`;
                errors++;
            }
        }

        // 2. MCQ Questions Evaluation
        let questions = [];
        if (Array.isArray(mcqs)) questions = mcqs;
        else if (mcqs && Array.isArray(mcqs.questions)) questions = mcqs.questions;
        else {
            out.innerHTML += `<span class="text-rose-400">❌ MCQ root must be an array of questions or an object with "questions" array.</span><br>`;
            errors++;
            return;
        }

        out.innerHTML += `> Found ${questions.length} question nodes in MCQ bank.<br>`;

        const qIdSet = new Set();
        const mcqKeyMap = {};
        const mcqSectionCounts = {};

        questions.forEach((q, idx) => {
            const qId = q.id || q.question_id || `q_${idx}`;

            // Check Duplicate IDs
            if (qIdSet.has(qId)) {
                out.innerHTML += `<span class="text-rose-400">❌ Duplicate Question ID: "${qId}" at position ${idx + 1}.</span><br>`;
                errors++;
            }
            qIdSet.add(qId);

            // Check Options
            const optA = q.option_a ?? q.options?.A ?? q.options?.a;
            const optB = q.option_b ?? q.options?.B ?? q.options?.b;
            const optC = q.option_c ?? q.options?.C ?? q.options?.c;
            const optD = q.option_d ?? q.options?.D ?? q.options?.d;

            if (optA === undefined || optB === undefined || optC === undefined || optD === undefined) {
                out.innerHTML += `<span class="text-rose-400">❌ Question ${qId} lacks complete options (A, B, C, D).</span><br>`;
                errors++;
            }

            // Check Correct Option
            const correct = (q.correct_option || q.answer || '').toString().trim().toUpperCase();
            if (!correct || !['A', 'B', 'C', 'D'].includes(correct)) {
                out.innerHTML += `<span class="text-rose-400">❌ Question ${qId} has invalid correct_option "${correct}". Must be 'A', 'B', 'C', or 'D'.</span><br>`;
                errors++;
            } else {
                mcqKeyMap[qId] = correct;
            }

            // Section Tally
            const sec = q.section || q.section_id || 'General';
            mcqSectionCounts[sec] = (mcqSectionCounts[sec] || 0) + 1;
        });

        // 3. Pattern Cross-Verification
        if (pattern) {
            out.innerHTML += `> Cross-verifying against Pattern Blueprint specifications...<br>`;
            const pSections = pattern.sections || [];
            let expectedTotalQs = 0;

            pSections.forEach(s => {
                const sName = s.name || s.section_id;
                expectedTotalQs += (s.total_questions || 0);

                const matchCount = mcqSectionCounts[sName] || mcqSectionCounts[s.section_id] || 0;
                if (matchCount !== s.total_questions) {
                    out.innerHTML += `<span class="text-amber-400">⚠ Section "${sName}" discrepancy: Pattern expects ${s.total_questions} Qs, MCQ has ${matchCount} Qs.</span><br>`;
                    warnings++;
                } else {
                    out.innerHTML += `<span class="text-emerald-400">✓ Section "${sName}" matches expected ${s.total_questions} Qs exactly.</span><br>`;
                }
            });

            if (expectedTotalQs > 0 && expectedTotalQs !== questions.length) {
                out.innerHTML += `<span class="text-amber-400">⚠ Total Question Count mismatch: Pattern expects ${expectedTotalQs}, MCQ contains ${questions.length}.</span><br>`;
                warnings++;
            }
        }

        // 4. Solutions Cross-Verification
        if (solutions) {
            let sList = [];
            if (Array.isArray(solutions)) sList = solutions;
            else if (solutions && Array.isArray(solutions.solutions)) sList = solutions.solutions;

            out.innerHTML += `> Verifying ${sList.length} solution explanations against answer keys...<br>`;
            let solMismatches = 0;

            sList.forEach((s, sIdx) => {
                const sId = s.id || s.question_id || `q_${sIdx}`;
                const solAns = (s.correct_option || s.answer || '').toString().trim().toUpperCase();
                const mcqAns = mcqKeyMap[sId];

                if (mcqAns && solAns && mcqAns !== solAns) {
                    out.innerHTML += `<span class="text-rose-400">❌ Key Mismatch at ${sId}: MCQ specifies '${mcqAns}' but Solution specifies '${solAns}'.</span><br>`;
                    errors++;
                    solMismatches++;
                }
            });

            if (solMismatches === 0) {
                out.innerHTML += `<span class="text-emerald-400">✓ All solution answer keys match MCQ answers 100%.</span><br>`;
            }
        }

        // Conclusion Summary
        out.innerHTML += `<br>========================================<br>`;
        if (errors === 0 && warnings === 0) {
            out.innerHTML += `<span class="text-emerald-400 font-bold text-sm">🎉 ALL CHECKS PASSED: Zero errors or warnings detected. Safe to publish!</span><br>`;
            showToast("Integrity check passed with zero errors!", "success");
        } else if (errors === 0) {
            out.innerHTML += `<span class="text-amber-400 font-bold text-sm">⚠️ PASSED WITH ${warnings} WARNING(S): Review warnings before publishing.</span><br>`;
            showToast(`Passed with ${warnings} warning(s)`, "info");
        } else {
            out.innerHTML += `<span class="text-rose-400 font-bold text-sm">❌ AUDIT FAILED: ${errors} critical error(s) and ${warnings} warning(s) found.</span><br>`;
            showToast(`Integrity check failed with ${errors} error(s)`, "error");
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
