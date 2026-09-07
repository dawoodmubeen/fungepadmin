import { databases, storage, CONFIG, Query, ID } from '../appwrite/config.js';
import { showToast } from '../components/toast.js';

export const universitiesController = {
    async render(container, args) {
        if (args && args.length > 0 && args[0] === 'pattern-builder') {
            await this.renderPatternBuilder(container);
        } else if (args && args.length > 0 && args[0] === 'new') {
            await this.renderForm(container, null);
        } else if (args && args.length > 0 && args[0] === 'edit' && args[1]) {
            await this.renderForm(container, args[1]);
        } else {
            await this.renderList(container);
        }
    },

    async renderList(container) {
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Action Bar -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div>
                        <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Universities & Pattern Blueprints</h1>
                        <p class="text-xs sm:text-sm text-slate-500 mt-1">Manage target universities and visually build v2.0 examination pattern blueprints.</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <a href="#universities/pattern-builder" class="px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs sm:text-sm transition flex items-center gap-2 border border-amber-200">
                            <i data-lucide="compass" class="w-4 h-4"></i>
                            <span>Visual Pattern Builder</span>
                        </a>
                        <a href="#universities/new" class="btn-primary">
                            <i data-lucide="plus" class="w-4 h-4"></i>
                            <span>Add University</span>
                        </a>
                    </div>
                </div>

                <!-- Universities Directory Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="uni-cards-container">
                    ${Array(6).fill(0).map(() => `
                        <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs animate-pulse">
                            <div class="w-12 h-12 bg-slate-200 rounded-2xl mb-4"></div>
                            <div class="h-4 bg-slate-200 rounded w-2/3 mb-2"></div>
                            <div class="h-3 bg-slate-200 rounded w-1/3"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
        await this.loadUniversitiesList();
    },

    async loadUniversitiesList() {
        const container = document.getElementById('uni-cards-container');
        if (!container) return;

        try {
            const res = await databases.listDocuments(CONFIG.databaseId, CONFIG.universitiesCol, [
                Query.limit(50)
            ]);

            if (res.documents.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full bg-white rounded-3xl p-12 text-center text-slate-400">
                        <i data-lucide="school" class="w-10 h-10 text-slate-300 mx-auto mb-2"></i>
                        <p class="text-sm font-bold text-slate-700">No universities in directory</p>
                        <p class="text-xs text-slate-400 mt-0.5">Click "Add University" above to start adding institutes.</p>
                    </div>
                `;
                if (window.lucide) window.lucide.createIcons();
                return;
            }

            container.innerHTML = res.documents.map(uni => `
                <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between">
                    <div>
                        <div class="flex items-start justify-between gap-3 mb-4">
                            <div class="w-14 h-14 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-lg border border-sky-100 p-2 flex-shrink-0">
                                ${uni.logo_url ? `<img src="${uni.logo_url}" class="w-full h-full object-contain">` : `<i data-lucide="school" class="w-7 h-7"></i>`}
                            </div>
                            <span class="badge ${uni.active !== false ? 'badge-success' : 'badge-gray'} text-[10px]">
                                ${uni.active !== false ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        <h3 class="text-base font-extrabold text-slate-900">${uni.name}</h3>
                        <p class="text-xs font-semibold text-sky-600 mt-0.5">${uni.short_name || uni.slug}</p>
                        <p class="text-xs text-slate-400 mt-2 line-clamp-2">${uni.description || 'Premier entrance test target university.'}</p>
                    </div>

                    <div class="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span class="text-slate-400">${uni.city || 'Pakistan'}</span>
                        <div class="flex items-center gap-2">
                            <a href="#universities/edit/${uni.$id}" class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition">
                                Edit Details
                            </a>
                        </div>
                    </div>
                </div>
            `).join('');

            if (window.lucide) window.lucide.createIcons();

        } catch (error) {
            console.error("Failed to load universities:", error);
            container.innerHTML = `<div class="col-span-full p-8 text-center text-rose-500">Failed to load universities.</div>`;
        }
    },

    async renderForm(container, id) {
        let uni = { name: '', short_name: '', slug: '', city: '', description: '', official_website: '', logo_url: '', active: true };
        let isEdit = false;

        if (id) {
            try {
                uni = await databases.getDocument(CONFIG.databaseId, CONFIG.universitiesCol, id);
                isEdit = true;
            } catch (e) {
                showToast("Failed to load university", "error");
                window.location.hash = '#universities';
                return;
            }
        }

        container.innerHTML = `
            <div class="max-w-2xl mx-auto space-y-6">
                <div class="flex items-center justify-between">
                    <a href="#universities" class="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i>
                        <span>Back to Universities</span>
                    </a>
                    <span class="text-xs font-bold text-slate-400">${isEdit ? 'Update Existing' : 'New Institute'}</span>
                </div>

                <div class="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
                    <h2 class="text-lg font-bold text-slate-900 mb-6">${isEdit ? 'Edit University' : 'Register New University'}</h2>
                    
                    <form id="uni-form" class="space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="sm:col-span-2">
                                <label class="form-label">Full Institute Name *</label>
                                <input type="text" id="u-name" required value="${uni.name || ''}" placeholder="e.g. FAST National University of Computer and Emerging Sciences" class="form-input">
                            </div>
                            <div>
                                <label class="form-label">Short Name / Code *</label>
                                <input type="text" id="u-short" required value="${uni.short_name || ''}" placeholder="FAST-NUCES" class="form-input">
                            </div>
                            <div>
                                <label class="form-label">Slug *</label>
                                <input type="text" id="u-slug" required value="${uni.slug || ''}" placeholder="fast-nuces" class="form-input">
                            </div>
                            <div>
                                <label class="form-label">Primary City</label>
                                <input type="text" id="u-city" value="${uni.city || ''}" placeholder="Islamabad / Lahore / Karachi" class="form-input">
                            </div>
                            <div>
                                <label class="form-label">Official Website URL</label>
                                <input type="url" id="u-url" value="${uni.official_website || ''}" placeholder="https://nu.edu.pk" class="form-input">
                            </div>
                            <div class="sm:col-span-2">
                                <label class="form-label">Logo Image URL</label>
                                <input type="url" id="u-logo" value="${uni.logo_url || ''}" placeholder="https://..." class="form-input">
                            </div>
                            <div class="sm:col-span-2">
                                <label class="form-label">Description / Admission Guidelines</label>
                                <textarea id="u-desc" rows="3" class="form-input" placeholder="Overview of admission criteria, test structure, and campuses...">${uni.description || ''}</textarea>
                            </div>
                            <div class="sm:col-span-2 pt-2 flex items-center gap-2">
                                <input type="checkbox" id="u-active" class="w-4 h-4 text-sky-600 rounded" ${uni.active !== false ? 'checked' : ''}>
                                <label for="u-active" class="text-xs font-bold text-slate-700">Display as Active University on Student Dashboard</label>
                            </div>
                        </div>

                        <div class="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                            <a href="#universities" class="btn-secondary">Cancel</a>
                            <button type="submit" id="u-save-btn" class="btn-primary">
                                <span>Save University</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        document.getElementById('uni-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('u-save-btn');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            try {
                const payload = {
                    name: document.getElementById('u-name').value.trim(),
                    short_name: document.getElementById('u-short').value.trim(),
                    slug: document.getElementById('u-slug').value.trim().toLowerCase(),
                    description: document.getElementById('u-desc').value.trim(),
                    active: document.getElementById('u-active').checked,
                    is_active: document.getElementById('u-active').checked
                };

                if (isEdit) {
                    await databases.updateDocument(CONFIG.databaseId, CONFIG.universitiesCol, id, payload);
                    showToast("University updated successfully", "success");
                } else {
                    const docId = payload.slug || ID.unique();
                    await databases.createDocument(CONFIG.databaseId, CONFIG.universitiesCol, docId, payload);
                    showToast("University created successfully", "success");
                }
                window.location.hash = '#universities';

            } catch (err) {
                console.error(err);
                showToast(err.message || "Failed to save university", "error");
            } finally {
                btn.disabled = false;
                btn.textContent = 'Save University';
            }
        });
    },

    // Visual Pattern Blueprint Editor (Module 5 core feature)
    async renderPatternBuilder(container) {
        container.innerHTML = `
            <div class="space-y-6 max-w-5xl mx-auto">
                <div class="flex items-center justify-between">
                    <a href="#universities" class="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i>
                        <span>Back to Universities</span>
                    </a>
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Visual Pattern Blueprint Editor v2.0</span>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <!-- Builder Form (Cols 1-2) -->
                    <div class="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-6">
                        <div>
                            <h2 class="text-lg font-bold text-slate-900">Pattern Blueprint Settings</h2>
                            <p class="text-xs text-slate-500">Configure negative marking rules, score floor clamping, and academic sections.</p>
                        </div>

                        <!-- Basic Blueprint Info -->
                        <div class="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <label class="form-label">Pattern ID</label>
                                <input type="text" id="p-pattern-id" value="fast-nuces-cs-pattern" class="form-input font-mono">
                            </div>
                            <div>
                                <label class="form-label">Test ID</label>
                                <input type="text" id="p-test-id" value="fast-nuces-mock-1" class="form-input font-mono">
                            </div>
                            <div class="col-span-2">
                                <label class="form-label">Test Name</label>
                                <input type="text" id="p-test-name" value="FAST-NUCES Entrance Exam Mock 1" class="form-input">
                            </div>
                        </div>

                        <!-- Global Scoring Rules -->
                        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
                            <span class="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">Default Scoring Configuration</span>
                            <div class="grid grid-cols-3 gap-3 text-xs">
                                <div>
                                    <label class="text-[10px] font-bold text-slate-500 uppercase">Correct Marks</label>
                                    <input type="number" id="p-default-correct" value="1.0" step="0.25" class="form-input bg-white">
                                </div>
                                <div>
                                    <label class="text-[10px] font-bold text-slate-500 uppercase">Wrong Penalty</label>
                                    <input type="number" id="p-default-wrong" value="-0.25" step="0.05" class="form-input bg-white font-mono">
                                </div>
                                <div>
                                    <label class="text-[10px] font-bold text-slate-500 uppercase">Unattempted</label>
                                    <input type="number" id="p-default-skip" value="0.0" step="0.1" class="form-input bg-white font-mono">
                                </div>
                            </div>
                        </div>

                        <!-- Sections Builder -->
                        <div class="space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-extrabold uppercase tracking-wider text-slate-700">Exam Sections</span>
                                <button type="button" id="add-section-btn" class="px-3 py-1 rounded-lg bg-sky-50 text-sky-700 font-bold text-xs hover:bg-sky-100 transition flex items-center gap-1">
                                    <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                                    <span>Add Section</span>
                                </button>
                            </div>

                            <div id="sections-container" class="space-y-3"></div>
                        </div>
                    </div>

                    <!-- Live JSON Blueprint Preview (Col 3) -->
                    <div class="bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between sticky top-24">
                        <div>
                            <div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
                                <span class="text-xs font-extrabold uppercase tracking-wider text-sky-400">Generated pattern.json</span>
                                <button id="copy-pattern-json-btn" class="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-bold">
                                    <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                                    <span>Copy</span>
                                </button>
                            </div>
                            <pre id="pattern-preview" class="text-[11px] font-mono text-slate-300 overflow-y-auto max-h-[460px] leading-relaxed"></pre>
                        </div>
                        <button id="download-pattern-json-btn" class="mt-4 w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition flex items-center justify-center gap-2">
                            <i data-lucide="download" class="w-4 h-4"></i>
                            <span>Download pattern.json</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        // Default sections
        const sections = [
            { id: 'adv_math', name: 'Advanced Mathematics', questions: 50, marks_per_q: 1.0, penalty: 0.25, weight: 50 },
            { id: 'basic_math', name: 'Basic Mathematics', questions: 20, marks_per_q: 1.0, penalty: 0.25, weight: 20 },
            { id: 'english', name: 'English', questions: 30, marks_per_q: 0.3333, penalty: 0.0833, weight: 10 },
            { id: 'physics', name: 'Physics', questions: 20, marks_per_q: 1.0, penalty: 0.25, weight: 20 }
        ];

        const renderSectionsUI = () => {
            const containerEl = document.getElementById('sections-container');
            if (!containerEl) return;

            containerEl.innerHTML = sections.map((sec, idx) => `
                <div class="p-3.5 rounded-2xl bg-white border border-slate-200 flex flex-col gap-2">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-slate-800">Section #${idx + 1}</span>
                        ${sections.length > 1 ? `
                            <button type="button" class="del-sec-btn text-rose-500 hover:text-rose-700 text-xs" data-idx="${idx}">
                                <i data-lucide="trash" class="w-3.5 h-3.5"></i>
                            </button>
                        ` : ''}
                    </div>
                    <div class="grid grid-cols-3 gap-2 text-xs">
                        <div class="col-span-2">
                            <input type="text" class="sec-name form-input py-1 text-xs" value="${sec.name}" placeholder="Section Name" data-idx="${idx}">
                        </div>
                        <div>
                            <input type="text" class="sec-id form-input py-1 text-xs font-mono" value="${sec.id}" placeholder="Section ID" data-idx="${idx}">
                        </div>
                        <div>
                            <label class="text-[9px] text-slate-400 font-bold block">Questions</label>
                            <input type="number" class="sec-qs form-input py-1 text-xs" value="${sec.questions}" min="1" data-idx="${idx}">
                        </div>
                        <div>
                            <label class="text-[9px] text-slate-400 font-bold block">Marks / Q</label>
                            <input type="number" class="sec-marks form-input py-1 text-xs" value="${sec.marks_per_q}" step="0.0001" data-idx="${idx}">
                        </div>
                        <div>
                            <label class="text-[9px] text-slate-400 font-bold block">Penalty</label>
                            <input type="number" class="sec-penalty form-input py-1 text-xs" value="${sec.penalty}" step="0.0001" data-idx="${idx}">
                        </div>
                    </div>
                </div>
            `).join('');

            if (window.lucide) window.lucide.createIcons();

            // Bind delete
            containerEl.querySelectorAll('.del-sec-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.currentTarget.dataset.idx);
                    sections.splice(idx, 1);
                    renderSectionsUI();
                    updatePreview();
                });
            });

            // Bind inputs
            containerEl.querySelectorAll('input').forEach(inp => {
                inp.addEventListener('input', (e) => {
                    const idx = parseInt(e.target.dataset.idx);
                    if (e.target.classList.contains('sec-name')) sections[idx].name = e.target.value;
                    if (e.target.classList.contains('sec-id')) sections[idx].id = e.target.value;
                    if (e.target.classList.contains('sec-qs')) sections[idx].questions = parseInt(e.target.value) || 0;
                    if (e.target.classList.contains('sec-marks')) sections[idx].marks_per_q = parseFloat(e.target.value) || 0;
                    if (e.target.classList.contains('sec-penalty')) sections[idx].penalty = parseFloat(e.target.value) || 0;
                    updatePreview();
                });
            });
        };

        const updatePreview = () => {
            const patternObj = {
                schema_version: "2.0",
                pattern_id: document.getElementById('p-pattern-id')?.value || 'pattern',
                test_id: document.getElementById('p-test-id')?.value || 'test',
                test_name: document.getElementById('p-test-name')?.value || 'Test',
                version: 2,
                scoring_config: {
                    marking_model: "negative_marking",
                    allow_negative_section_scores: false,
                    allow_negative_total_score: false,
                    score_display_mode: "raw",
                    decimal_precision: 2,
                    default_rule: {
                        correct: parseFloat(document.getElementById('p-default-correct')?.value || 1.0),
                        wrong: parseFloat(document.getElementById('p-default-wrong')?.value || -0.25),
                        unattempted: parseFloat(document.getElementById('p-default-skip')?.value || 0.0)
                    }
                },
                sections: sections.map(s => ({
                    section_id: s.id,
                    name: s.name,
                    total_questions: s.questions,
                    weightage_percent: s.weight || 25,
                    marks_per_question: s.marks_per_q,
                    total_marks: parseFloat((s.questions * s.marks_per_q).toFixed(2)),
                    scoring: {
                        marks_per_correct: s.marks_per_q,
                        penalty_type: "fixed",
                        penalty_value: s.penalty,
                        unattempted_value: 0.0,
                        min_score_floor: 0.0
                    }
                })),
                rules: [
                    "Negative marking applies strictly to incorrect choices.",
                    "Calculators are strictly not permitted in exam halls."
                ]
            };

            const jsonStr = JSON.stringify(patternObj, null, 2);
            const previewEl = document.getElementById('pattern-preview');
            if (previewEl) previewEl.textContent = jsonStr;
        };

        renderSectionsUI();
        updatePreview();

        ['p-pattern-id', 'p-test-id', 'p-test-name', 'p-default-correct', 'p-default-wrong', 'p-default-skip'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', updatePreview);
        });

        document.getElementById('add-section-btn')?.addEventListener('click', () => {
            sections.push({
                id: `sec_${sections.length + 1}`,
                name: `Section ${sections.length + 1}`,
                questions: 25,
                marks_per_q: 1.0,
                penalty: 0.25,
                weight: 25
            });
            renderSectionsUI();
            updatePreview();
        });

        document.getElementById('copy-pattern-json-btn')?.addEventListener('click', () => {
            const text = document.getElementById('pattern-preview').textContent;
            navigator.clipboard.writeText(text);
            showToast("Pattern JSON copied to clipboard!", "success");
        });

        document.getElementById('download-pattern-json-btn')?.addEventListener('click', () => {
            const text = document.getElementById('pattern-preview').textContent;
            const blob = new Blob([text], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${document.getElementById('p-pattern-id')?.value || 'pattern'}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast("Pattern JSON downloaded!", "success");
        });
    }
};
