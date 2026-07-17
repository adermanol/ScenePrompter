// Locks the exact prompt text updateStack() produces, per platform.
// These are behaviour snapshots: if a refactor changes the wording, that is a
// deliberate decision and the expected string here must be updated with it.
const fs = require('fs');

const els = {};
const mk = v => ({ value: v, style: {}, options: [{ text: v }], selectedIndex: 0 });
const set = (id, v) => { els[id] = mk(v); };

global.document = { getElementById: id => els[id] || null };
global.window = {};
global.localStorage = { getItem: () => null, setItem: () => {} };

// subjects.js defines the SUBJECTS registry that updateStack() reads from.
// Function declarations leak out of a direct eval, but `const` bindings do not —
// hence the explicit re-export of the const-declared registry and data tables.
const SRC = ['js/db.js', 'js/subjects.js', 'js/promptEngine.js']
  .map(f => fs.readFileSync('c:/Works/Projects/ScenePrompter/' + f, 'utf8'))
  .join('\n;\n');
eval(SRC + '\n;globalThis.SUBJECTS = SUBJECTS;'
         + '\n;globalThis.SUBJECT_TYPES = SUBJECT_TYPES;'
         + '\n;globalThis.PLATFORMS = PLATFORMS;'
         + '\n;globalThis.PLATFORM_IDS = PLATFORM_IDS;'
         + '\n;globalThis.DB = DB;');

let failures = 0;
function eq(label, actual, expected) {
  const ok = typeof actual === 'string' && typeof expected === 'string'
    ? actual === expected
    : JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}`);
  if (!ok) console.log(`        beklenen: ${JSON.stringify(expected)}\n        gelen   : ${JSON.stringify(actual)}`);
}

function stack(id, platform, nodes, cables) {
  set(`stack_plat_${id}`, platform);
  set(`val_${id}`, '');
  updateStack(id, nodes, cables);
  return els[`val_${id}`].value;
}

const spatial = (id, d = 'foreground', h = 'center', v = 'ground') => {
  set(`depth_${id}`, d); set(`hpos_${id}`, h); set(`vpos_${id}`, v);
};

// ---------------------------------------------------------------------------
console.log('\n=== Quadruped + Insect + Custom Location ===');

const nodes = {
  s: { id: 's', type: 'stack', el: { style: { left: '0px' } } },
  q: { id: 'q', type: 'quadruped', el: { style: { left: '1px' } } },
  i: { id: 'i', type: 'insect', el: { style: { left: '2px' } } },
  l: { id: 'l', type: 'customloc', el: { style: { left: '3px' } } },
};
const cables = [{ from: 'q', to: 's' }, { from: 'i', to: 's' }, { from: 'l', to: 's' }];

spatial('q'); spatial('i');
set('quad_cust_q', ''); set('quad_spec_q', 'Wolf'); set('quad_size_q', 'Large');
set('quad_coat_q', 'Shaggy / Thick Fur'); set('quad_act_q', 'Prowling / Stalking');
set('quad_mood_q', 'Feral / Wild'); set('quad_note_q', '');
set('ins_cust_i', ''); set('ins_spec_i', 'Butterfly'); set('ins_scale_i', 'Extreme Macro Close-up');
set('ins_count_i', 'Swarm'); set('ins_beh_i', 'Flying'); set('ins_surf_i', 'On a Flower'); set('ins_note_i', '');
set('loc_name_l', 'rusted freighter deck'); set('loc_env_l', 'Exterior');
set('loc_arch_l', 'Industrial / Factory'); set('loc_surf_l', 'Wet Asphalt');
set('loc_scale_l', 'Vast / Cavernous'); set('loc_feat_l', 'hanging cables, flickering lights');

const SUBJ = 'a large feral wolf with shaggy, thick fur, positioned in the foreground, in the center, at ground level'
  + ' and a swarm of butterflies on a flower, positioned in the foreground, in the center, at ground level,'
  + ' shot in extreme macro detail';
const ACT = 'the wolf is prowling while the butterflies are flying';
const ENV = 'set in a vast, industrial rusted freighter deck with wet asphalt ground,'
  + ' featuring hanging cables, flickering lights';

eq('runway', stack('s', 'runway', nodes, cables), `${SUBJ}, ${ACT}, ${ENV}.`);
eq('veo', stack('s', 'veo', nodes, cables),
  `${ENV.charAt(0).toUpperCase() + ENV.slice(1)}. ${SUBJ}. ${ACT}. Audio: buzzing insect wings.`);
eq('kling', stack('s', 'kling', nodes, cables),
  `${SUBJ} ${ACT}. The setting is ${ENV.replace('set in a', 'a')}. Soundtrack: buzzing insect wings.`);
eq('luma', stack('s', 'luma', nodes, cables),
  `Dynamic cinematic sequence of ${SUBJ} ${ACT}. Environment is ${ENV.replace('set in a', 'a')}.`);
eq('midjourney', stack('s', 'midjourney', nodes, cables),
  'rusted freighter deck, Exterior, Industrial / Factory, Wet Asphalt ground, Vast scale,'
  + ' hanging cables, flickering lights, Large Wolf, Shaggy / Thick Fur, Prowling / Stalking, Feral,'
  + ' Swarm of Butterflies, Flying, On a Flower, extreme macro photography');

// ---------------------------------------------------------------------------
console.log('\n=== Pluralization / sayı ifadeleri ===');

const n2 = { s: nodes.s, i: nodes.i };
const c2 = [{ from: 'i', to: 's' }];

set('ins_spec_i', 'Praying Mantis'); set('ins_count_i', 'Single Specimen');
set('ins_beh_i', 'Still / Camouflaged'); set('ins_surf_i', 'On a Leaf');
set('ins_scale_i', 'Life-size Detail');
eq('tekil: "a single praying mantis"', stack('s', 'runway', n2, c2),
  'a single praying mantis on a leaf, positioned in the foreground, in the center, at ground level,'
  + ' the praying mantis is still / camouflaged.');

set('ins_spec_i', 'Firefly'); set('ins_count_i', 'A Few'); set('ins_beh_i', 'Hovering');
set('ins_surf_i', 'In Mid-air Flight');
eq('"a few fireflies" ("a a few" değil) + çoğul fiil', stack('s', 'runway', n2, c2),
  'a few fireflies in mid-air flight, positioned in the foreground, in the center, at ground level,'
  + ' the fireflies are hovering.');

set('ins_count_i', 'Massive Infestation'); set('ins_spec_i', 'Cockroach');
eq('"a massive infestation of cockroaches"', stack('s', 'runway', n2, c2).split(' in mid-air')[0],
  'a massive infestation of cockroaches');

console.log('\n=== pluralize() birim ===');
eq('Butterfly -> Butterflies', pluralize('Butterfly'), 'Butterflies');
eq('Praying Mantis -> Praying Mantises', pluralize('Praying Mantis'), 'Praying Mantises');
eq('Ant -> Ants', pluralize('Ant'), 'Ants');
eq('Firefly -> Fireflies', pluralize('Firefly'), 'Fireflies');

// ---------------------------------------------------------------------------
console.log('\n=== Custom Location: sahne ile birlikte / minimal alanlar ===');

const n3 = { s: nodes.s, sc: { id: 'sc', type: 'scene', el: { style: { left: '0px' } } }, l: nodes.l };
const c3 = [{ from: 'sc', to: 's' }, { from: 'l', to: 's' }];
set('scn_loc_sc', 'Interior: Living Room'); set('scn_cust_sc', '');
set('scn_time_sc', 'Noon (10:00-14:00)'); set('scn_wea_sc', 'Clear'); set('scn_mood_sc', 'Peaceful');
set('loc_name_l', ''); set('loc_env_l', 'Interior'); set('loc_arch_l', 'Undefined');
set('loc_surf_l', 'Undefined'); set('loc_scale_l', 'Intimate'); set('loc_feat_l', '');
eq('sahne varsa location "set within" ile ekleniyor; Undefined alanlar atlanıyor',
  stack('s', 'runway', n3, c3),
  'set in a living room during noon, set within an intimate interior space,'
  + ' The overall mood is peaceful.');

console.log('\n=== polishPrompt() — Faz 0 dilbilgisi geçişi ===');
eq('a -> an sesli harften önce', polishPrompt('a intimate room'), 'an intimate room');
eq('cümle başında A -> An', polishPrompt('A elderly man'), 'An elderly man');
eq('sessiz harf önünde a kalır', polishPrompt('a large wolf'), 'a large wolf');
eq('"a university" bozulmuyor', polishPrompt('a university campus'), 'a university campus');
eq('"a one-off" bozulmuyor', polishPrompt('a one-off shot'), 'a one-off shot');
eq('"an hour" düzeltiliyor', polishPrompt('a hour later'), 'an hour later');
eq('çift nokta tekleniyor', polishPrompt('peaceful..'), 'peaceful.');
eq('nokta+virgül artığı', polishPrompt('(blinds)., Shot on'), '(blinds), Shot on');
eq('virgül+nokta artığı', polishPrompt('foo, .'), 'foo.');
eq('boşluk+virgül', polishPrompt('foo , bar'), 'foo, bar');
eq('fazla boşluk', polishPrompt('foo   bar'), 'foo bar');
eq('satır sonu korunuyor', polishPrompt('a apple\n\nNEGATIVE: x'), 'an apple\n\nNEGATIVE: x');

console.log('\n=== charAgePhrase() ===');
eq('"Middle Age (41-60)" -> middle-aged adult  <-- "middle" idi',
  charAgePhrase('Middle Age (41-60)'), 'middle-aged adult');
eq('"Young Adult (18-25)" -> young adult', charAgePhrase('Young Adult (18-25)'), 'young adult');
eq('"Elderly (80+)" -> elderly person', charAgePhrase('Elderly (80+)'), 'elderly person');
eq('"Child (3-12)" -> child', charAgePhrase('Child (3-12)'), 'child');

console.log('\n=== Karakter: yaş + yapı + yönetmen ===');
const n4 = {
  s: nodes.s,
  c: { id: 'c', type: 'character', el: { style: { left: '0px' } } },
  st: { id: 'st', type: 'style', el: { style: { left: '1px' } } },
};
const c4 = [{ from: 'c', to: 's' }, { from: 'st', to: 's' }];
spatial('c');
set('chr_name_c', 'Detective'); set('chr_age_c', 'Middle Age (41-60)');
set('chr_bld_c', 'Athletic / Muscular'); set('chr_clo_c', 'Formal Suit / Dress');
set('chr_emo_c', 'Controlled Fury'); set('chr_pos_c', 'Standing straight');
set('chr_act_c', 'Suspense: Sneaking');
set('sty_cin_st', 'Film Noir'); set('sty_dir_st', 'Roger Deakins');
set('sty_pal_st', 'High Contrast B&W');
eq('yaş/yapı düzgün, yönetmen tam adıyla  <-- "a average middle" ve "Roger" idi',
  stack('s', 'runway', n4, c4),
  'Detective, an athletic middle-aged adult, wearing formal suit / dress, positioned'
  + ' in the foreground, in the center, at ground level, showing expressions of controlled fury,'
  + ' Detective is actively sneaking, film noir style, directed by Roger Deakins.');

// ---------------------------------------------------------------------------
console.log('\n=== Registry: yeni özne node\'ları ===');

// One helper drives any registry node: fill its fields, wire it to a stack, read
// the prompt. Adding a subject to SUBJECTS makes it testable with zero new code.
function subjectPrompt(type, values, platform = 'runway') {
  const def = SUBJECTS[type];
  const nid = 'x';
  spatial(nid, 'midground', 'camera_left', 'eye_level');
  def.fields.forEach(f => set(`${def.prefix}_${f.key}_${nid}`, values[f.key] ?? ''));
  const nn = { s: nodes.s, x: { id: nid, type, el: { style: { left: '1px' } } } };
  return stack('s', platform, nn, [{ from: nid, to: 's' }]);
}
const SP = 'in the middle ground, camera-left, at eye level';

eq('flying: tekil kuş', subjectPrompt('flying', {
  spec: 'Eagle', count: 'Single', alt: 'High Sky', act: 'Soaring',
}), `a lone eagle high sky, positioned ${SP}, the eagle is soaring.`);

// NOTE: veo only capitalises compEnv, so with no scene/location node the line
// opens lowercase. Pre-existing behaviour for every node type — tracked with the
// other grammar nits (a/an, trailing "..") for Faz 0.
eq('flying: sürü çoğul + ses', subjectPrompt('flying', {
  spec: 'Crow', count: 'Large Flock', alt: 'Treetop', act: 'Flapping Frantically',
}, 'veo'), `a large flock of crows treetop, positioned ${SP}.`
  + ' the crows are flapping frantically. Audio: beating wings, a chorus of distant calls.');

eq('vehicle: durum + dönem + ses', subjectPrompt('vehicle', {
  spec: 'Car', cust: '1969 Mustang', era: 'Vintage / Classic', cond: 'Rusted', act: 'Speeding',
}, 'veo'), `a rusted vintage 1969 mustang, positioned ${SP}.`
  + ` the 1969 mustang is speeding. Audio: a roaring engine.`);

eq('crowd: yoğunluk + davranış', subjectPrompt('crowd', {
  dens: 'Packed', beh: 'Protesting', attire: 'Modern Casual',
}), `a packed crowd in modern casual, positioned ${SP}, the crowd is protesting.`);

eq('aquatic: sürü + su', subjectPrompt('aquatic', {
  spec: 'Dolphin', count: 'School', water: 'Sunlit Blue', act: 'Breaching',
}), `a school of dolphins in sunlit blue water, positioned ${SP}, the dolphins are breaching.`);

eq('aquatic: midjourney tag', subjectPrompt('aquatic', {
  spec: 'Shark', count: 'Single', water: 'Deep Dark', act: 'Hunting',
}, 'midjourney'), 'Shark, Hunting, Deep Dark water');

console.log('\n=== Registry bütünlüğü ===');
SUBJECT_TYPES.forEach(t => {
  const def = SUBJECTS[t];
  const missing = ['title', 'nav', 'prefix', 'fields', 'name', 'label', 'phrase', 'action', 'mesh']
    .filter(k => !def[k]);
  eq(`${t}: zorunlu alanlar tam`, missing, []);
  const badOpts = def.fields.filter(f => f.type === 'select' && !DB[f.options]).map(f => f.options);
  eq(`${t}: select alanları DB'de var`, badOpts, []);
});
eq('prefix çakışması yok', SUBJECT_TYPES.length,
  new Set(SUBJECT_TYPES.map(t => SUBJECTS[t].prefix)).size);

// ---------------------------------------------------------------------------
console.log('\n=== Faz 3: Platform adaptörleri ===');

// A scene rich enough that every adapter has all eight clauses to work with.
const pf = {
  s: nodes.s,
  sc: { id: 'sc', type: 'scene', el: { style: { left: '0px' } } },
  q: nodes.q,
  st: { id: 'st', type: 'style', el: { style: { left: '1px' } } },
  sh: { id: 'sh', type: 'shot', el: { style: { left: '2px' } } },
  cm: { id: 'cm', type: 'camera', el: { style: { left: '3px' } } },
};
const pfc = Object.keys(pf).filter(k => k !== 's').map(k => ({ from: k, to: 's' }));
spatial('q');
set('quad_cust_q', ''); set('quad_spec_q', 'Wolf'); set('quad_size_q', 'Large');
set('quad_coat_q', 'Sleek Fur'); set('quad_act_q', 'Charging');
set('quad_mood_q', 'Aggressive'); set('quad_note_q', '');
set('scn_loc_sc', 'Exterior: Dense Forest'); set('scn_cust_sc', '');
set('scn_time_sc', 'Night Dark (19:30-04:00)'); set('scn_wea_sc', 'Dense Fog');
set('scn_mood_sc', 'Nightmarish');
set('sty_cin_st', 'Dark Fantasy'); set('sty_dir_st', 'Denis Villeneuve');
set('sty_pal_st', 'Muted / Desaturated');
set('shot_type_sh', 'Wide Shot (WS)');
set('cam_sc', ''); set('cam_cm', 'Alexa 35'); set('lens_cm', 'Master Primes');
set('mm_in_cm', '35'); set('cam_adv_act_cm', 'none'); set('cam_adv_tgt_cm', '');
set('cam_adv_dist_cm', ''); set('cam_ap_cm', 'f/2.0'); set('cam_iso_cm', '800');
set('cam_fil_cm', 'None');

eq('her platform tanımlı ve build ediyor', PLATFORM_IDS.length, 9);

const outs = {};
PLATFORM_IDS.forEach(p => { outs[p] = stack('s', p, pf, pfc); });

PLATFORM_IDS.forEach(p => {
  eq(`${p}: gerçek çıktı üretti`, outs[p].length > 30 && !outs[p].startsWith('Connect'), true);
});

// Each adapter must arrange the same material differently — otherwise it is not
// an adapter, it is a duplicate.
eq('adaptörler birbirinden farklı çıktı veriyor',
  new Set(Object.values(outs)).size, PLATFORM_IDS.length);

console.log('\n=== Faz 3: Yeni platformların imzaları ===');
// The shot clause carries the camera move, so sora must not glue it to the
// subject with "of" ("Wide shot, static camera of a wolf").
eq('sora: plan kendi cümlesi, özne ayrı', outs.sora.startsWith('Wide shot, static camera. The frame holds'), true);
eq('sora: kamera dilini açıkça yazıyor', outs.sora.includes('Shot on Alexa 35'), true);
eq('pika: kısa — ışık/kamera/ses düşürülmüş',
  !outs.pika.includes('Shot on') && !outs.pika.includes('mood is'), true);
eq('hailuo: kamerayı köşeli parantezde veriyor',
  outs.hailuo.includes('[Shot on Alexa 35'), true);
eq('generic: etiketli blok', outs.generic.includes('SUBJECT:') && outs.generic.includes('\n'), true);
eq('generic: satır sonları korundu', outs.generic.split('\n').length > 4, true);

console.log('\n=== Faz 3: Karakter limiti ===');
eq('pika limiti en dar', PLATFORMS.pika.limit, 350);
eq('generic limitsiz', PLATFORMS.generic.limit, 0);
PLATFORM_IDS.forEach(p => {
  eq(`${p}: limit tanımlı`, typeof PLATFORMS[p].limit, 'number');
  eq(`${p}: etiket tanımlı`, typeof PLATFORMS[p].label, 'string');
});

console.log('\n=== Faz 3: Prompt lint ===');
const lintNodes = { s: nodes.s, sc: pf.sc, at: { id: 'at', type: 'atmos', el: { style: { left: '0px' } } } };
const lintCables = [{ from: 'sc', to: 's' }, { from: 'at', to: 's' }];
set('scn_wea_sc', 'Clear'); set('atm_fx_at', 'Rain');
let g = collectInputs('s', lintNodes, lintCables);
eq('Clear hava + Rain atmosferi yakalandı',
  lintScene(g).some(x => x.includes('Clear')), true);

set('scn_loc_sc', 'Interior: Living Room'); set('scn_wea_sc', 'Heavy Rain'); set('atm_fx_at', 'Clear');
g = collectInputs('s', lintNodes, lintCables);
eq('iç mekânda yağış yakalandı', lintScene(g).some(x => x.includes('İç mekân')), true);

// Night scene + a sun light set to midday.
const lit = { id: 'li', type: 'light', el: { style: { left: '0px' } } };
set('mode_li', 'sunlight'); set('time_li', '13');
set('scn_loc_sc', 'Exterior: City Street'); set('scn_time_sc', 'Night Dark (19:30-04:00)');
set('scn_wea_sc', 'Clear');
g = collectInputs('s', { ...lintNodes, li: lit }, [...lintCables, { from: 'li', to: 's' }]);
eq('gece sahne + gündüz güneşi yakalandı', lintScene(g).some(x => x.includes('gündüz')), true);

set('time_li', '22');
g = collectInputs('s', { ...lintNodes, li: lit }, [...lintCables, { from: 'li', to: 's' }]);
eq('gece güneşi (22:00) uyarı vermiyor', lintScene(g).some(x => x.includes('gündüz')), false);

// B&W palette fighting a colour LUT.
const bw = { id: 'st2', type: 'style', el: { style: { left: '0px' } } };
const cg = { id: 'cg', type: 'colorg', el: { style: { left: '0px' } } };
set('sty_cin_st2', 'Film Noir'); set('sty_dir_st2', 'Roger Deakins');
set('sty_pal_st2', 'High Contrast B&W');
set('col_lut_cg', 'Teal & Orange'); set('col_stk_cg', 'Ilford HP5 (B&W)');
g = collectInputs('s', { s: nodes.s, st2: bw, cg }, [{ from: 'st2', to: 's' }, { from: 'cg', to: 's' }]);
eq('B&W palet + renkli LUT yakalandı', lintScene(g).some(x => x.includes('Siyah-beyaz')), true);

set('col_lut_cg', 'High Contrast');
g = collectInputs('s', { s: nodes.s, st2: bw, cg }, [{ from: 'st2', to: 's' }, { from: 'cg', to: 's' }]);
eq('B&W + High Contrast uyumlu, uyarı yok', lintScene(g).some(x => x.includes('Siyah-beyaz')), false);

console.log('\n=== Faz 3: Yapılandırılmış dışa aktarım ===');
set('scn_loc_sc', 'Exterior: Dense Forest'); set('scn_time_sc', 'Night Dark (19:30-04:00)');
set('scn_wea_sc', 'Dense Fog');
set('stack_plat_s', 'runway');
const st = buildStructured('s', pf, pfc);
eq('platform alanı', st.platform, 'runway');
eq('prompt dolu', st.prompt.length > 40, true);
eq('kompozisyon 8 cümleciği taşıyor',
  Object.keys(st.composition).sort().join(','), 'act,audio,cam,env,lit,shot,sty,subj');
eq('uyarılar dizi', Array.isArray(st.warnings), true);
eq('sürüm alanı', st.version, 1);

console.log('\n=== Faz 3: Varyant üretici ===');
set('stack_plat_s', 'runway');
stack('s', 'runway', pf, pfc);   // populates val_s, which buildVariants reads
const vs = buildVariants('s');
eq('3 varyant', vs.map(v => v.key).join(''), 'ABC');
eq('A temel promptun kendisi', vs[0].text, els['val_s'].value);
eq('B yoğunlaştırıyor ("large" -> "immense")', vs[1].text.includes('immense'), true);
eq('B temelden farklı', vs[1].text !== vs[0].text, true);
eq('C sadeleştiriyor ("showing expressions of" düşer)',
  vs[2].text.includes('showing expressions of'), false);
// Deterministic: same graph must give the same variants every call.
eq('varyantlar tekrarlanabilir (Math.random yok)',
  JSON.stringify(buildVariants('s')), JSON.stringify(vs));
set('val_s', 'Connect Scene, Style, or Character nodes to generate a cinematic prompt.');
eq('boş promptta varyant yok', buildVariants('s').length, 0);

console.log(`\n${failures === 0 ? '✅ TÜM TESTLER GEÇTİ' : `❌ ${failures} TEST BAŞARISIZ`}`);
process.exit(failures === 0 ? 0 : 1);
