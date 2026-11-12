// Generate -> check -> improve -> present (AI mocked): exam, flashcards, study guide; plus what the prompts contain.
const h = require('./lib');
const TOPICS = ['glycolysis location', 'krebs cycle outputs', 'electron transport chain function', 'fermentation purpose', 'pyruvate oxidation product'];
const Qn = n => ({ type: 'mc', question: `Q${n} What does the professor say about ${TOPICS[n]} in lecture three?`, options: { A: `a${n}`, B: `b${n}`, C: `c${n}`, D: `d${n}` }, answer: 'A', explanation: `Because a${n}.`, source: `quote ${n} (Lecture)` });
const DRAFT = [0, 1, 2, 3, 4].map(Qn);
const FIXED2 = { type: 'mc', question: 'Q2 REWRITTEN by auditor: what does the professor say about the Krebs cycle outputs?', options: { A: 'x', B: 'y', C: 'z', D: 'w' }, answer: 'B', explanation: 'Because y.', source: 'fixed quote (Lecture)' };
const REVISED1 = { type: 'mc', question: 'Q1 REWRITTEN after failing verification: which molecule is the final electron acceptor in the chain?', options: { A: 'p', B: 'q', C: 'r', D: 's' }, answer: 'C', explanation: 'Because r.', source: 'revised quote (Lecture)' };
const setup = async s => {
  const page = await h.newPage();
  page.t.mocks.students = [{ id: s, name: h.cap(s), track: 'Pre-Med', target_school: 'WVU', target_program: 'WVU School of Medicine', grad_year: 2030, generation_profile: '' }];
  page.t.mocks.classes = [{ id: 'c1', student_id: s, name: 'BIO 115', semester: 'Fall', professor: 'Dr Smith', notes: '', is_active: true, grade_only: false }];
  page.t.mocks.exam_folders = [{ id: 'f1', class_id: 'c1', name: 'Exam 1', exam_date: '2026-12-30' }];
  page.t.mocks.resources = [{ id: 'r1', file_name: 'Lecture 1', file_type: 'pdf', storage_url: h.BASE + '/favicon.ico', folder_id: 'f1', transcript: null }];
  for (const t of ['flashcard_decks', 'flashcard_cards', 'flashcard_items', 'practice_exams', 'practice_exam_items', 'study_guides', 'tasks', 'grades']) page.t.mocks[t] = [];
  return page;
};
const open = async (page, s, feature) => {
  await h.go(page, `/${s}/${feature}`);
  await h.clickButton(page, /new|generate|make/); await h.sleep(800);
  await h.clickPointer(page, 'BIO 115'); await h.sleep(250); await h.clickPointer(page, 'Exam 1'); await h.sleep(250); await h.clickPointer(page, 'Lecture 1'); await h.sleep(250);
};
const clickGenerate = page => page.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => /^(generate|make) /i.test(b.innerText.trim()) && b.innerText.length > 12); bs[bs.length - 1]?.click(); });
async function watch(page, ms) { const seen = new Set(); const end = Date.now() + ms; while (Date.now() < end) { for (const m of (await h.text(page)).matchAll(/(Drafting[^\n]*|Checking[^\n]*|Re-checking[^\n]*|Rewriting[^\n]*|Final verification[^\n]*)/g)) seen.add(m[1].replace(/\(\d+k.*\)/, '').trim()); await h.sleep(150); } return [...seen]; }

h.run('pipeline', async () => {
  for (const s of h.STUDENTS) {
    let page = await setup(s); const actions = [];
    page.t.apiMocks['/api/generate-study-guide'] = () => ({ delay: 500, json: { studyGuide: 'Here you go:\n```json\n' + JSON.stringify(DRAFT) + '\n```' } });
    page.t.apiMocks['/api/check-resource'] = ({ bodyText }) => {
      const action = h.field(bodyText, 'action'); actions.push(action);
      if (action === 'audit_exam') return { delay: 600, json: { solved: [0, 1, 3, 4].map(i => ({ i, answer: i === 1 ? 'C' : 'A', ambiguous: false, quote: 'q' })), critique: { verdicts: [{ i: 0, codes: ['not_in_materials'], note: 'x', fix: null, drop: true }, { i: 2, codes: ['weak_distractors'], note: 'x', fix: FIXED2, drop: false }], flags: [{ i: 3, flag: 'Possible discrepancy: the handout and the slides disagree here.' }], gaps: [], redundant: [] } } };
      if (action === 'solve_exam') { const only = JSON.parse(h.field(bodyText, 'only') || '[]'); return { delay: 400, json: { solved: only.map(i => ({ i, answer: i === 2 ? 'B' : 'C', ambiguous: false, quote: 'q' })) } }; }
      if (action === 'revise_exam') return { delay: 400, json: { items: [{ i: 1, question: REVISED1 }] } };
      return { status: 400, json: { error: 'bad action' } };
    };
    await open(page, s, 'practice-exam'); const gen = clickGenerate(page); const stages = await watch(page, 6500); await gen;
    let t = await h.text(page);
    h.check(`${s} exam: stages shown while working`, stages.some(x => /^Drafting/.test(x)) && stages.some(x => /Checking every answer/.test(x)), JSON.stringify(stages));
    h.check(`${s} exam: audit -> re-verify -> rewrite -> final verify`, JSON.stringify(actions) === JSON.stringify(['audit_exam', 'solve_exam', 'revise_exam', 'solve_exam']), JSON.stringify(actions));
    const draftCall = page.t.apiCalls.find(c => c.path === '/api/generate-study-guide'); const prompt = h.field(draftCall.bodyText, 'prompt');
    h.check(`${s} exam: request is for this student, with class-first rules and no leaked names`, h.field(draftCall.bodyText, 'student') === s && /CLASS-FIRST RULES/.test(prompt) && /realistic practice exam/i.test(prompt) && (s === 'matthew' || !/Matthew|Dentist/.test(prompt)) && !/undefined|\[object/.test(prompt), prompt.slice(0, 120));
    h.check(`${s} exam: library file sent as a storage URL, not re-uploaded`, /name="resources"/.test(draftCall.bodyText) && /favicon\.ico/.test(draftCall.bodyText) && !/name="files"/.test(draftCall.bodyText));
    h.check(`${s} exam: dropped question gone; rewritten ones in; note shown`, !/Q0 What/.test(t) && /Q2 REWRITTEN/.test(t) && /Q1 REWRITTEN/.test(t) && /Q3 What/.test(t) && /checked against your materials/.test(t) && /1 removed/.test(t));
    const saved = page.t.writes.find(x => x.table === 'practice_exams' && x.method === 'POST')?.body;
    h.check(`${s} exam: saved for this student with 4 sourced questions and the flag`, saved && saved.student_id === s && saved.questions.length === 4 && saved.questions.every(q => q.source) && saved.questions.some(q => /discrepancy/.test(q.flag || '')));
    h.check(`${s} exam: no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();

    page = await setup(s);
    page.t.apiMocks['/api/generate-study-guide'] = () => ({ json: { studyGuide: JSON.stringify(DRAFT) } });
    page.t.apiMocks['/api/check-resource'] = () => ({ status: 500, json: { error: 'overloaded' } });
    await open(page, s, 'practice-exam'); await clickGenerate(page); await h.sleep(3500); t = await h.text(page);
    h.check(`${s} exam: checker down -> still delivered, student told`, /Q0 What/.test(t) && /Q4 What/.test(t) && /could not run|skipped/i.test(t));
    await page.close();

    // opened from a class folder: the prompt carries the class, professor and this student's name
    page = await setup(s);
    page.t.apiMocks['/api/generate-study-guide'] = () => ({ json: { studyGuide: JSON.stringify(DRAFT) } });
    page.t.apiMocks['/api/check-resource'] = () => ({ status: 500, json: { error: 'x' } });
    await h.go(page, `/${s}/practice-exam?folderId=f1&folderName=Exam%201`, 2200);
    if (!/1 file selected|1 selected/i.test(await h.text(page))) { await h.clickPointer(page, 'Lecture 1'); await h.sleep(300); }
    await clickGenerate(page); await h.sleep(3000);
    const fcall = page.t.apiCalls.find(c => c.path === '/api/generate-study-guide'); const fprompt = fcall ? h.field(fcall.bodyText, 'prompt') : '';
    h.check(`${s} exam from a folder: prompt mirrors this professor, for this student`, /mirrors how Dr Smith actually tests in BIO 115/.test(fprompt) && new RegExp('practice exam for ' + h.cap(s)).test(fprompt) && (s === 'matthew' || !/Matthew/.test(fprompt)), fprompt.slice(0, 260));
    const chk = page.t.apiCalls.find(c => c.path === '/api/check-resource');
    h.check(`${s} exam from a folder: checker gets the class context`, chk && /BIO 115/.test(h.field(chk.bodyText, 'context')) && /Dr Smith/.test(h.field(chk.bodyText, 'context')), chk && h.field(chk.bodyText, 'context'));
    await page.close();

    page = await setup(s);
    const FR = ['Where in the cell does glycolysis take place?', 'What is the net ATP yield of glycolysis per glucose?', 'Which molecule accepts electrons last in the electron transport chain?', 'Why does fermentation regenerate NAD plus for glycolysis?'];
    page.t.apiMocks['/api/generate-study-guide'] = () => ({ json: { studyGuide: JSON.stringify(FR.map((f, i) => ({ front: f, back: `Back ${i}` }))) } });
    page.t.apiMocks['/api/check-resource'] = () => ({ delay: 500, json: { verdicts: [{ i: 0, codes: ['not_in_materials'], note: 'x', fix: null, drop: true }, { i: 2, codes: ['discrepancy'], note: 'x', fix: { front: FR[2], back: 'Back 2', flag: 'Possible discrepancy: handout vs slides.' }, drop: false }], gaps: [] } });
    await open(page, s, 'flashcards'); const g2 = clickGenerate(page); const st2 = await watch(page, 2500); await g2; await h.sleep(800); t = await h.text(page);
    h.check(`${s} cards: check stage shown; dropped card gone; note shown`, st2.some(x => /Checking every card/.test(x)) && !t.includes(FR[0]) && /checked against your materials/.test(t) && /1 removed/.test(t));
    const fc = page.t.apiCalls.find(c => c.path === '/api/generate-study-guide'); const fp = h.field(fc.bodyText, 'prompt');
    h.check(`${s} cards: prompt names this student's goal, no leaked names`, /earn an A/.test(fp) && /CLASS-FIRST RULES/.test(fp) && (s === 'matthew' || !/Matthew|Dentist/.test(fp)) && !/undefined/.test(fp));
    h.check(`${s} cards: no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();

    page = await setup(s);
    page.t.apiMocks['/api/generate-study-guide'] = () => ({ contentType: 'text/event-stream', delay: 500, raw: h.sse([{ type: 'meta', slideImagePaths: [] }, { type: 'delta', text: '<div class="sg-section"><h1 class="sg-h1">CELLS</h1><p class="sg-body">Mitochondria make ATP in the nucleus.</p><p class="sg-body">Ribosomes build proteins.</p></div>' }, { type: 'done' }]) });
    page.t.apiMocks['/api/check-resource'] = () => ({ delay: 600, json: { summary: 'x', ops: [{ type: 'replace', find: 'Mitochondria make ATP in the nucleus.', html: 'Mitochondria make ATP in the mitochondrial matrix.' }, { type: 'insert_after', find: '<p class="sg-body">Ribosomes build proteins.</p>', html: '<div class="sg-callout"><span class="sg-callout-label">CHECK</span><p>Possible discrepancy: handout vs slides.</p></div>' }, { type: 'replace', find: 'this text does not exist in the guide at all', html: 'x' }] } });
    await open(page, s, 'study'); const g3 = clickGenerate(page); const st3 = await watch(page, 4200); await g3; await h.sleep(800); t = await h.text(page);
    h.check(`${s} guide: draft -> check stages; corrected text + callout; note; save prompt`, st3.some(x => /Drafting/.test(x)) && st3.some(x => /Checking your study guide/.test(x)) && /mitochondrial matrix/.test(t) && !/in the nucleus/.test(t) && /Possible discrepancy/.test(t) && /Checked against your materials: 2 improvements/.test(t) && /Name this study guide/i.test(t), t.slice(0, 160));
    await h.setInput(page, 'input[type=text]', 'My Guide'); page.t.writes.length = 0; await h.clickButton(page, /^save/); await h.sleep(1200);
    const gw = page.t.writes.find(x => x.table === 'study_guides' && x.method === 'POST');
    h.check(`${s} guide: saved for this student + 3 review tasks`, gw && gw.body.student_id === s && page.t.writes.filter(x => x.table === 'tasks').flatMap(x => x.body || []).filter(x => x.student_id === s).length === 3, JSON.stringify(gw?.body)?.slice(0, 120));
    h.check(`${s} guide: no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();
  }
});
