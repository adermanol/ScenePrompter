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

console.log(`\n${failures === 0 ? '✅ TÜM TESTLER GEÇTİ' : `❌ ${failures} TEST BAŞARISIZ`}`);
process.exit(failures === 0 ? 0 : 1);
