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
                + '\n;window.PRESETS = PRESETS;'
                + '\n;window.SPATIAL_BUCKETS = SPATIAL_BUCKETS;'
                + '\n;window.nearestBucket = nearestBucket;'
                + '\n;window.serializeWorkspace = serializeWorkspace;');

// randomizeAll needs confirm=true; saveAsPreset needs a name from prompt.
window.confirm = () => true;
window.prompt = () => 'Test Preset';

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

  console.log('\n=== 6c. duplicateNode gerçekten çalışan bir kopya üretiyor ===');
  await preset();
  window.createNode('character');
  const dSrc = 'node_' + window.nodeIdCounter;
  doc.getElementById(`chr_name_${dSrc}`).value = 'ORIGINAL';
  doc.getElementById(`chr_emo_${dSrc}`).value = 'Anger';
  window.duplicateNode(dSrc);
  await wait(20);   // copyNodeValues runs on a timeout
  const dDup = 'node_' + window.nodeIdCounter;
  check('kopya ayrı bir id aldı', dSrc !== dDup, true);
  check('kopyanın alanları KENDİ id\'siyle var  <-- eski hata: id hiç yeniden yazılmıyordu',
    !!doc.getElementById(`chr_name_${dDup}`), true);
  check('değerler kopyalandı', doc.getElementById(`chr_name_${dDup}`).value, 'ORIGINAL');
  check('ikinci alan da kopyalandı', doc.getElementById(`chr_emo_${dDup}`).value, 'Anger');
  // The header must drag the COPY, not the source — this is why the duplicate
  // "never moved": its header still called nodeDrag on the original.
  const dupHeader = window.nodes[dDup].el.querySelector('.node-header').getAttribute('onpointerdown');
  check('kopyanın başlığı kendini sürüklüyor', dupHeader.includes(dDup), true);
  check('kopyanın başlığı kaynağı sürüklemiyor', dupHeader.includes(`'${dSrc}'`), false);
  check('çift DOM id yok', doc.querySelectorAll(`#chr_name_${dDup}`).length, 1);
  check('kaynak bozulmadı', doc.getElementById(`chr_name_${dSrc}`).value, 'ORIGINAL');
  check('kopya kategori rengini taşıyor', window.nodes[dDup].el.getAttribute('data-cat'), 'subject');

  console.log('\n=== 6d. Tap-to-connect (dokunmatik kablo) ===');
  await preset();
  window.createNode('scene');  const tcScn = 'node_' + window.nodeIdCounter;
  window.createNode('stack');  const tcStk = 'node_' + window.nodeIdCounter;
  const noop = { stopPropagation() {} };
  const before6d = window.cables.length;
  // arm the scene output, then tap the stack input
  window.armedSocket = tcScn;
  window.inSockTap(noop, tcStk);
  check('tap-connect: kablo kuruldu', window.cables.some(c => c.from === tcScn && c.to === tcStk), true);
  check('tap-connect: bağlantı sonrası disarm', window.armedSocket, null);
  // arming again + same target must not double-wire
  window.armedSocket = tcScn;
  window.inSockTap(noop, tcStk);
  check('tap-connect: çift kablo kurulmuyor', window.cables.filter(c => c.from === tcScn && c.to === tcStk).length, 1);
  // invalid pair: a position output into a sequence (which only takes a stack)
  window.createNode('position'); const tcPos = 'node_' + window.nodeIdCounter;
  window.createNode('sequence'); const tcSeq = 'node_' + window.nodeIdCounter;
  const beforeInvalid = window.cables.length;
  window.armedSocket = tcPos;
  window.inSockTap(noop, tcSeq);
  check('tap-connect: geçersiz çift bağlanmıyor', window.cables.length, beforeInvalid);
  check('tap-connect: geçersiz denemede de disarm', window.armedSocket, null);
  // tapping an input with nothing armed does nothing
  window.inSockTap(noop, tcStk);
  check('tap-connect: armed değilken input dokunuşu no-op', window.cables.length, beforeInvalid);

  console.log('\n=== 6e. Tidy: nodes bir sütuna diziliyor ===');
  await preset();   // cyberpunk: scattered nodes at various x
  const preTidyX = Object.values(window.nodes).map(n => n.el.style.left);
  const wereScattered = new Set(preTidyX).size > 1;
  window.tidyLayout();
  const allAt40 = Object.values(window.nodes).every(n => n.el.style.left === '40px');
  check('tidy öncesi dağınıktı', wereScattered, true);
  check('tidy sonrası hepsi tek sütunda (x=40)', allAt40, true);
  // nodes should be ordered by category stage top-to-bottom
  const order = Object.values(window.nodes)
    .sort((a, b) => parseFloat(a.el.style.top) - parseFloat(b.el.style.top))
    .map(n => n.type);
  const sceneIdx = order.indexOf('scene');
  const stackIdx = order.indexOf('stack');
  check('tidy: source (scene) output (stack) üstünde', sceneIdx < stackIdx, true);
  window.undo();
  check('tidy geri alınabiliyor', Object.values(window.nodes).every(n => n.el.style.left === '40px'), false);

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
  check("registry 7 özne node tanımlıyor", types.length, 7);
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

  console.log('\n=== 13. Presetler ===');
  // The noir option existed in the menu but loadPreset only ever handled
  // cyberpunk — picking it silently did nothing.
  const presetNames = Object.keys(window.PRESETS);
  check('en az 2 preset tanımlı', presetNames.length >= 2, true);
  check('noir tanımlı  <-- menüde vardı ama hiç uygulanmıyordu',
    presetNames.includes('noir'), true);

  for (const name of presetNames) {
    window.loadPreset(name);
    await wait(150);
    const def = window.PRESETS[name];
    check(`${name}: doğru sayıda node kuruldu`,
      Object.keys(window.nodes).length, def.nodes.length);
    check(`${name}: doğru sayıda kablo kuruldu`, counts().model, def.connect.length);
    check(`${name}: DOM tutarlı`, dom3(),
      { g: def.connect.length, h: def.connect.length, v: def.connect.length });

    // Every declared field value must actually have landed on its input.
    const wrong = [];
    def.nodes.forEach((n, i) => {
      const id = 'node_' + (i + 1);
      for (const k in (n.values || {})) {
        const el = doc.getElementById(`${k}_${id}`);
        if (!el) wrong.push(`${name}:${k}_${id} yok`);
        else if (el.value !== n.values[k]) wrong.push(`${name}:${k}=${el.value}≠${n.values[k]}`);
      }
    });
    check(`${name}: tüm preset değerleri uygulandı`, wrong, []);

    // A preset must produce a real prompt, not the placeholder.
    const stackId = 'node_' + (def.nodes.findIndex(n => n.type === 'stack') + 1);
    const out = doc.getElementById(`val_${stackId}`);
    check(`${name}: stack gerçek prompt üretti`,
      !!out && out.value.length > 40 && !out.value.startsWith('Connect'), true);
  }

  console.log('\n=== 13b. Kayıt formatı sürümü ve v1 uyumluluğu ===');
  await preset();
  const snap = window.serializeWorkspace();
  check('kayıt sürüm alanı taşıyor', snap.version, 2);

  // Old saves have no `version`; they must still load rather than be rejected.
  const v1 = JSON.parse(JSON.stringify(snap));
  delete v1.version;
  window.loadWorkspaceData(JSON.stringify(v1));
  await wait(20);
  check('sürümsüz (v1) kayıt hâlâ yükleniyor', Object.keys(window.nodes).length, 5);
  check('v1 kabloları yüklendi', counts().model, 4);

  // A save from a future version must be refused, not half-loaded.
  const vNext = JSON.parse(JSON.stringify(snap));
  vNext.version = 99;
  const beforeFuture = Object.keys(window.nodes).length;
  window.loadWorkspaceData(JSON.stringify(vNext));
  check('gelecek sürümlü kayıt reddedildi, kanvas bozulmadı',
    Object.keys(window.nodes).length, beforeFuture);

  console.log('\n=== 13c. Randomize tam bir sahne kuruyor ===');
  await preset();
  window.randomizeAll();
  await wait(120);   // randomizeAll wires on a setTimeout(60)
  const rNodes = Object.keys(window.nodes).length;
  check('randomize 9 node kurdu', rNodes, 9);
  check('randomize kabloları bağladı (7 içerik -> stack + stack -> preview)', counts().model, 8);
  const rStack = Object.keys(window.nodes).find(id => window.nodes[id].type === 'stack');
  const rOut = doc.getElementById(`val_${rStack}`).value;
  check('randomize gerçek bir prompt üretti', rOut.length > 40 && !rOut.startsWith('Connect'), true);
  // Fields must be assigned, not left blank — a scene loc dropdown got a value.
  const rScene = Object.keys(window.nodes).find(id => window.nodes[id].type === 'scene');
  check('randomize alanları doldurdu (boş bırakmadı)', doc.getElementById(`scn_loc_${rScene}`).value !== '', true);
  check('randomize undo geçmişini kirletmedi', window.undoStack.length, 0);

  console.log('\n=== 13d. Save-as-preset roundtrip ===');
  window.localStorage.removeItem('user_presets');
  await preset();
  window.createNode('character');
  const upSrc = 'node_' + window.nodeIdCounter;
  doc.getElementById(`chr_name_${upSrc}`).value = 'PresetGuy';
  window.saveAsPreset();
  const stored = JSON.parse(window.localStorage.getItem('user_presets') || '{}');
  check('preset localStorage\'a kaydedildi', !!stored['Test Preset'], true);
  check('preset node verisi taşıyor', Object.keys(stored['Test Preset'].nodes || {}).length > 0, true);
  // Load it back into a clean canvas via the user-preset path.
  Object.keys(window.nodes).forEach(id => window.kill(id));
  window.clearAllCables();
  window.loadPresetConfirmed('user:Test Preset');
  await wait(20);
  // The preset holds every node that was on the canvas (cyberpunk + PresetGuy),
  // so check that PresetGuy survived the roundtrip, not that it's the only one.
  const names = Object.values(window.nodes)
    .filter(n => n.type === 'character')
    .map(n => doc.getElementById(`chr_name_${n.id}`).value);
  check('user preset geri yüklendi (PresetGuy korundu)', names.includes('PresetGuy'), true);
  window.deleteUserPreset('Test Preset');
  check('preset silindi', !!JSON.parse(window.localStorage.getItem('user_presets') || '{}')['Test Preset'], false);

  console.log('\n=== 14. Preset yükleme undo geçmişini kirletmiyor ===');
  window.loadPreset('noir');
  await wait(150);
  check('preset sonrası undo geçmişi boş', window.undoStack.length, 0);

  console.log('\n=== 15. Faz 4: spatial bucket dönüşümü (3D sürükleme) ===');
  // Dragging in 3D maps a world coordinate back to a dropdown value. Round-trip
  // must be exact, or dragging an object would nudge it to a different bucket.
  const B = window.SPATIAL_BUCKETS;
  const near = window.nearestBucket;
  check('bucket tablosu 3 eksen', Object.keys(B).sort().join(','), 'depth,hpos,vpos');
  ['hpos', 'depth', 'vpos'].forEach(kind => {
    const wrong = Object.keys(B[kind]).filter(k => near(kind, B[kind][k]) !== k);
    check(`${kind}: her bucket kendi değerine geri dönüyor`, wrong, []);
  });
  check('tam ortadaki değer en yakına gidiyor', near('hpos', -39), 'camera_left');
  check('aralık dışı sola taşan sola kilitleniyor', near('hpos', -500), 'far_left');
  check('aralık dışı sağa taşan sağa kilitleniyor', near('hpos', 500), 'far_right');
  check('sıfıra yakın -> center', near('hpos', 3), 'center');
  check('derinlik: 45 -> foreground', near('depth', 45), 'foreground');
  check('derinlik: -140 -> horizon', near('depth', -140), 'horizon');

  console.log('\n=== 16. Faz 4: lens FOV hesabı ===');
  // fov = 2*atan(24 / (2*mm)) — 24mm is the Super35 sensor height.
  const fovOf = mm => 2 * Math.atan(24 / (2 * mm)) * (180 / Math.PI);
  check('50mm ~ 27°', Math.round(fovOf(50)), 27);
  check('24mm geniş açı ~ 53°', Math.round(fovOf(24)), 53);
  check('200mm tele ~ 7°', Math.round(fovOf(200)), 7);
  check('kısa focal = geniş açı', fovOf(18) > fovOf(85), true);

  console.log('\n=== 16b. Faz 4: kamera artık konumlandırılabilir ===');
  await preset();
  window.createNode('camera');
  const camId = 'node_' + window.nodeIdCounter;
  await wait(20);   // camera defers its vpos default to a timeout
  // A camera is a physical object like a light, but it shipped without spatial
  // fields — so it was pinned to the world origin and the lens view was useless.
  check('kamerada spatial context var', !!doc.getElementById(`hpos_${camId}`), true);
  check('kamera derinliği ayarlanabilir', !!doc.getElementById(`depth_${camId}`), true);
  check('kamera varsayılanı eye level', doc.getElementById(`vpos_${camId}`).value, 'eye_level');
  check('kamera position node\'una bağlanabiliyor kalıyor',
    window.createCable(camId, 'node_5') && true, true);

  console.log('\n=== 17. Faz 4: preview node kontrolleri ===');
  await preset();
  window.createNode('preview');
  const pvid = 'node_' + window.nodeIdCounter;
  // THREE is stubbed out in jsdom, so initThreePreview bails — but the node's
  // controls are plain DOM and must still be wired.
  check('lens viewport kabı var', !!doc.getElementById(`ttl_${pvid}`), true);
  check('lens başlangıçta gizli',
    doc.getElementById(`ttl_wrap_${pvid}`).style.display, 'none');
  check('LENS butonu var', !!doc.getElementById(`ttl_btn_${pvid}`), true);
  check('toggleLensView tanımlı', typeof window.toggleLensView, 'function');
  check('playCameraMove tanımlı', typeof window.playCameraMove, 'function');
  // No preview registered (THREE absent) — must not throw.
  window.toggleLensView(pvid);
  window.playCameraMove(pvid);
  check('THREE yokken kontroller patlamıyor', true, true);

  console.log(`\n${failures === 0 ? '✅ TÜM TESTLER GEÇTİ' : `❌ ${failures} TEST BAŞARISIZ`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(e => { console.error('HATA:', e); process.exit(1); });
