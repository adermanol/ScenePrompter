const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

// saveWorkspace() triggers a blob download via a.click(); jsdom cannot navigate
// and logs a noisy stack for it. Drop jsdom's own errors, keep page console.
const vc = new VirtualConsole();
vc.sendTo(console, { omitJSDOMErrors: true });

const ROOT = 'c:/Works/Projects/ScenePrompter';
const html = fs.readFileSync(`${ROOT}/index.html`, 'utf8');

const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  url: 'http://localhost/',   // localStorage needs a real origin
  virtualConsole: vc,
});
const { window } = dom;

// Stubs for things the app expects but jsdom/CDN don't give us.
window.THREE = undefined;
window.ResizeObserver = class { observe(){} disconnect(){} unobserve(){} };
window.localStorage.clear();

// One eval so the files share scope, exactly like real <script> tags do
// (db.js declares `const DB` at top level — separate evals would hide it).
const src = ['js/db.js', 'js/subjects.js', 'js/promptEngine.js', 'js/app.js']
  .map(f => fs.readFileSync(`${ROOT}/${f}`, 'utf8')).join('\n;\n');
// `const` bindings live in the global lexical scope, not on `window` — re-export
// the ones the tests need to reach.
window.eval(src + '\n;window.SUBJECTS = SUBJECTS;'
                + '\n;window.SUBJECT_TYPES = SUBJECT_TYPES;'
                + '\n;window.serializeWorkspace = serializeWorkspace;');

const doc = window.document;
const svg = doc.getElementById('svg-layer');

const counts = () => ({
  groups: svg.querySelectorAll('g.cable-group').length,
  hits: svg.querySelectorAll('path.cable-hit').length,
  visible: svg.querySelectorAll('path.cable').length,
  stray: Array.from(svg.querySelectorAll('path')).filter(
    p => !p.classList.contains('cable') && !p.classList.contains('cable-hit')
  ).length,
  model: window.cables.length,
});
const dom3 = () => { const c = counts(); return { g: c.groups, h: c.hits, v: c.visible }; };

let failures = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}`);
  if (!ok) console.log(`        beklenen ${e}\n        gelen    ${a}`);
}

const wait = ms => new Promise(r => setTimeout(r, ms));
// loadPreset wires its cables inside a setTimeout(50) — always await it.
const preset = async () => { window.loadPreset('cyberpunk'); await wait(150); };

async function main() {
  await preset();

  console.log('\n=== 1. Preset yüklendi: 4 kablo ===');
  check('model kablo sayısı', counts().model, 4);
  check('DOM: kablo başına 1 grup + 1 hit + 1 görünür path', dom3(), { g: 4, h: 4, v: 4 });
  check('başıboş path yok', counts().stray, 0);

  console.log('\n=== 2. dblclick ile silme DOM u tam temizliyor mu ===');
  window.cables[0].hit.dispatchEvent(new window.Event('dblclick'));
  check('model 3 e düştü', counts().model, 3);
  check('DOM da 3 (grup+hit+path birlikte gitti)', dom3(), { g: 3, h: 3, v: 3 });

  console.log('\n=== 3. kill(node): bağlı kablolar orphan bırakmıyor mu ===');
  await preset();
  check('başlangıç 4 kablo', counts().model, 4);
  window.kill('node_5');   // stack — 4 kablonun da hedefi
  check('model 0 kablo', counts().model, 0);
  check('DOM tamamen boş  <-- regresyon testi: hit path DOM da kalıyordu', dom3(), { g: 0, h: 0, v: 0 });

  console.log('\n=== 4. resetStack hayalet kablo bırakmıyor mu ===');
  await preset();
  window.resetStack('node_5');
  check('model 0 kablo', counts().model, 0);
  check('DOM tamamen boş  <-- eski hata: DOM hiç temizlenmiyordu', dom3(), { g: 0, h: 0, v: 0 });

  console.log('\n=== 5. Kablo seçimi ===');
  await preset();
  const c0 = window.cables[0], c1 = window.cables[1];
  c0.hit.dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
  check('kablo seçili işaretlendi', c0.path.classList.contains('cable-selected'), true);
  check('window.selectedCable eşleşiyor', window.selectedCable === c0, true);
  c1.hit.dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
  check('yeni seçim eskisini temizledi', c0.path.classList.contains('cable-selected'), false);
  window.clearCableSelection();
  check('clearCableSelection çalışıyor', window.selectedCable, null);

  console.log('\n=== 6. Undo/Redo: node silme geri alınıyor mu ===');
  await preset();
  const nodesBefore = Object.keys(window.nodes).length;
  window.kill('node_5');
  check('silme sonrası 0 kablo', counts().model, 0);
  check('silme sonrası 4 node', Object.keys(window.nodes).length, nodesBefore - 1);
  window.undo();
  check('undo: node_5 geri geldi', !!window.nodes['node_5'], true);
  check('undo: 4 kablo geri geldi  <-- undo tamamen no-op idi', counts().model, 4);
  check('undo: DOM tutarlı (orphan/çift yok)', dom3(), { g: 4, h: 4, v: 4 });
  window.redo();
  check('redo: tekrar silindi, 0 kablo', counts().model, 0);
  check('redo: DOM temiz', dom3(), { g: 0, h: 0, v: 0 });

  console.log('\n=== 7. Undo: node ekleme geri alınıyor mu ===');
  await preset();
  const n7 = Object.keys(window.nodes).length;
  window.createNode('quadruped');
  check('quadruped eklendi', Object.keys(window.nodes).length, n7 + 1);
  window.undo();
  check('undo: ekleme geri alındı', Object.keys(window.nodes).length, n7);
  check('undo: kablolar bozulmadı', counts().model, 4);

  console.log('\n=== 8. Undo: kablo silme geri alınıyor mu ===');
  await preset();
  window.cables[0].hit.dispatchEvent(new window.Event('dblclick'));
  check('kablo silindi -> 3', counts().model, 3);
  window.undo();
  check('undo: kablo geri geldi -> 4', counts().model, 4);
  check('undo: DOM tutarlı', dom3(), { g: 4, h: 4, v: 4 });

  console.log('\n=== 9. createCable çift kablo kurmuyor (yeni guard) ===');
  await preset();
  window.createCable('node_1', 'node_5');   // zaten var
  check('çift kablo eklenmedi', counts().model, 4);
  check('DOM da çiftlenmedi', dom3(), { g: 4, h: 4, v: 4 });

  console.log('\n=== 10. saveWorkspace undo geçmişini silmiyor ===');
  await preset();
  window.createNode('insect');
  const histBefore = window.undoStack.length;
  check('geçmişte kayıt var', histBefore > 0, true);
  window.URL.createObjectURL = () => 'blob:x';
  window.URL.revokeObjectURL = () => {};
  window.saveWorkspace();
  check('save sonrası geçmiş duruyor  <-- save geçmişi siliyordu', window.undoStack.length, histBefore);

  console.log('\n=== 11. Registry node\'ları gerçekten kuruluyor mu ===');
  await preset();
  // Drive every registry type through the real createNode path: the node must
  // mount, expose every field by its declared id, and survive a save/load round
  // trip (which is what a stale element id would break).
  const types = window.SUBJECT_TYPES || Object.keys(window.SUBJECTS || {});
  check('registry 6 özne node tanımlıyor', types.length, 6);
  types.forEach(t => {
    window.createNode(t);
    const nid = 'node_' + window.nodeIdCounter;
    const def = window.SUBJECTS[t];
    const el = doc.getElementById(nid);
    check(`${t}: node DOM'a eklendi`, !!el, true);
    const missing = def.fields
      .filter(f => !doc.getElementById(`${def.prefix}_${f.key}_${nid}`))
      .map(f => f.key);
    check(`${t}: tüm alanlar doğru id ile var`, missing, []);
    check(`${t}: spatial context var`, !!doc.getElementById(`depth_${nid}`), true);
    check(`${t}: stack'e bağlanabiliyor`,
      (window.createCable(nid, 'node_5'), window.cables.some(c => c.from === nid)), true);
  });

  console.log('\n=== 12. Registry node save/load round trip ===');
  const before12 = window.SUBJECT_TYPES.map(t => {
    const def = window.SUBJECTS[t];
    const nid = Object.keys(window.nodes).find(k => window.nodes[k].type === t);
    return doc.getElementById(`${def.prefix}_${def.fields[0].key}_${nid}`).value;
  });
  const saved = JSON.stringify(window.serializeWorkspace ? window.serializeWorkspace() : null);
  check('workspace serialize edilebiliyor', saved !== 'null', true);
  window.loadWorkspaceData(saved);
  const after12 = window.SUBJECT_TYPES.map(t => {
    const def = window.SUBJECTS[t];
    const nid = Object.keys(window.nodes).find(k => window.nodes[k].type === t);
    return nid ? doc.getElementById(`${def.prefix}_${def.fields[0].key}_${nid}`)?.value : null;
  });
  check('load sonrası tüm özne node alanları korundu', after12, before12);

  console.log(`\n${failures === 0 ? '✅ TÜM TESTLER GEÇTİ' : `❌ ${failures} TEST BAŞARISIZ`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(e => { console.error('HATA:', e); process.exit(1); });
