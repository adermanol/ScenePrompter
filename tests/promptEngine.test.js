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
const SRC = ['js/db.js', 'js/subjects.js', 'js/materials.js', 'js/colorpalette.js', 'js/contentModules.js', 'js/productshot.js', 'js/promptEngine.js']
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
eq('interior precipitation caught', lintScene(g).some(x => x.includes('Interior location')), true);

// Night scene + a sun light set to midday.
const lit = { id: 'li', type: 'light', el: { style: { left: '0px' } } };
set('mode_li', 'sunlight'); set('time_li', '13');
set('scn_loc_sc', 'Exterior: City Street'); set('scn_time_sc', 'Night Dark (19:30-04:00)');
set('scn_wea_sc', 'Clear');
g = collectInputs('s', { ...lintNodes, li: lit }, [...lintCables, { from: 'li', to: 's' }]);
eq('night scene + daytime sun caught', lintScene(g).some(x => x.includes('daytime hour')), true);

set('time_li', '22');
g = collectInputs('s', { ...lintNodes, li: lit }, [...lintCables, { from: 'li', to: 's' }]);
eq('night sun (22:00) gives no warning', lintScene(g).some(x => x.includes('daytime hour')), false);

// B&W palette fighting a colour LUT.
const bw = { id: 'st2', type: 'style', el: { style: { left: '0px' } } };
const cg = { id: 'cg', type: 'colorg', el: { style: { left: '0px' } } };
set('sty_cin_st2', 'Film Noir'); set('sty_dir_st2', 'Roger Deakins');
set('sty_pal_st2', 'High Contrast B&W');
set('col_lut_cg', 'Teal & Orange'); set('col_stk_cg', 'Ilford HP5 (B&W)');
g = collectInputs('s', { s: nodes.s, st2: bw, cg }, [{ from: 'st2', to: 's' }, { from: 'cg', to: 's' }]);
eq('B&W palette + colour LUT caught', lintScene(g).some(x => x.includes('Black-and-white')), true);

set('col_lut_cg', 'High Contrast');
g = collectInputs('s', { s: nodes.s, st2: bw, cg }, [{ from: 'st2', to: 's' }, { from: 'cg', to: 's' }]);
eq('B&W + High Contrast compatible, no warning', lintScene(g).some(x => x.includes('Black-and-white')), false);

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

// ---------------------------------------------------------------------------
console.log('\n=== Unassigned: alan boşsa cümleden tamamen düşüyor ===');

// The map key must BE the node id — collectInputs looks up nodes[cable.from].
const un = {
  s: nodes.s,
  u_sc: { id: 'u_sc', type: 'scene', el: { style: { left: '0px' } } },
  u_ch: { id: 'u_ch', type: 'character', el: { style: { left: '1px' } } },
};
const unC = [{ from: 'u_sc', to: 's' }, { from: 'u_ch', to: 's' }];
const scnFields = ['scn_loc', 'scn_cust', 'scn_time', 'scn_wea', 'scn_mood'];
const chrFields = ['chr_name', 'chr_age', 'chr_bld', 'chr_clo', 'chr_wear', 'chr_hair',
  'chr_beard', 'chr_feat', 'chr_prop', 'chr_emo', 'chr_mic', 'chr_pos', 'chr_ges',
  'chr_gait', 'chr_act'];
const clearAll = () => {
  scnFields.forEach(f => set(`${f}_u_sc`, ''));
  chrFields.forEach(f => set(`${f}_u_ch`, ''));
  ['depth', 'hpos', 'vpos'].forEach(k => set(`${k}_u_ch`, ''));
};

clearAll();
set('chr_name_u_ch', 'Ada');
eq('her şey boş: sadece isim kalıyor, boşluk/virgül artığı yok',
  stack('s', 'runway', un, unC), 'Ada.');

clearAll();
set('chr_name_u_ch', 'Ada');
set('scn_loc_u_sc', 'Exterior: Desert');
eq('sadece lokasyon: "during"/"under" hiç görünmüyor',
  stack('s', 'runway', un, unC), 'Ada, set in a desert.');

clearAll();
set('chr_name_u_ch', 'Ada');
set('scn_time_u_sc', 'Noon (10:00-14:00)');
eq('sadece zaman: "set in a" yok',
  stack('s', 'runway', un, unC), 'Ada, during noon.');

clearAll();
set('chr_name_u_ch', 'Ada'); set('chr_emo_u_ch', 'Fear');
set('hpos_u_ch', 'camera_left');
eq('spatial eksenlerinden biri: sadece o eksen yazılıyor',
  stack('s', 'runway', un, unC), 'Ada, positioned camera-left, showing expressions of fear.');

clearAll();
set('chr_name_u_ch', 'Ada'); set('chr_bld_u_ch', 'Skinny');
eq('yapı var yaş yok: "a skinny" tek başına doğru',
  stack('s', 'runway', un, unC), 'Ada, a skinny.');

clearAll();
set('chr_name_u_ch', 'Ada'); set('chr_age_u_ch', 'Child (3-12)');
eq('yaş var yapı yok', stack('s', 'runway', un, unC), 'Ada, a child.');

console.log('\n=== Unassigned: midjourney tag üretmiyor ===');
clearAll();
set('chr_name_u_ch', 'Ada');
eq('boş alanlar dangling tag bırakmıyor (" mood", "wearing " yok)',
  stack('s', 'midjourney', un, unC), 'Ada');

console.log('\n=== Unassigned: registry node\'ları ===');
const unQ = { s: nodes.s, u_q: { id: 'u_q', type: 'quadruped', el: { style: { left: '0px' } } } };
const unQC = [{ from: 'u_q', to: 's' }];
SUBJECTS.quadruped.fields.forEach(f => set(`quad_${f.key}_u_q`, ''));
['depth', 'hpos', 'vpos'].forEach(k => set(`${k}_u_q`, ''));
set('quad_spec_u_q', 'Wolf');
eq('sadece tür: "a  wolf" değil "a wolf"',
  stack('s', 'runway', unQ, unQC), 'a wolf.');

set('quad_size_u_q', 'Large');
eq('tür + boyut', stack('s', 'runway', unQ, unQC), 'a large wolf.');

set('quad_act_u_q', 'Charging');
eq('aksiyon eklenince ayrı cümlecik',
  stack('s', 'runway', unQ, unQC), 'a large wolf, the wolf is charging.');

console.log('\n=== Yeni alanlar: camera / character / style / colorgrade ===');
const rich = {
  s: nodes.s,
  r_c: { id: 'r_c', type: 'character', el: { style: { left: '0px' } } },
  r_st: { id: 'r_st', type: 'style', el: { style: { left: '1px' } } },
  r_cg: { id: 'r_cg', type: 'colorg', el: { style: { left: '2px' } } },
  r_cm: { id: 'r_cm', type: 'camera', el: { style: { left: '3px' } } },
};
const richC = ['r_c', 'r_st', 'r_cg', 'r_cm'].map(k => ({ from: k, to: 's' }));
[...chrFields].forEach(f => set(`${f}_r_c`, ''));
['depth', 'hpos', 'vpos'].forEach(k => set(`${k}_r_c`, ''));
set('chr_name_r_c', 'Ada');
set('chr_hair_r_c', 'Slicked back hair');
set('chr_beard_r_c', 'Heavy stubble');
set('chr_feat_r_c', 'Facial scar');
set('chr_prop_r_c', 'a revolver');
set('chr_ges_r_c', 'Clenched fists');
set('chr_gait_r_c', 'Limping');
['sty_cin', 'sty_per', 'sty_art', 'sty_dir', 'sty_dp', 'sty_pal', 'sty_tex', 'sty_ref']
  .forEach(f => set(`${f}_r_st`, ''));
set('sty_dp_r_st', 'Emmanuel Lubezki');
set('sty_tex_r_st', 'Gritty and grainy');
set('sty_ref_r_st', 'Blade Runner 2049');
['col_lut', 'col_stk', 'col_con', 'col_sat', 'col_grain', 'col_halo', 'col_vig']
  .forEach(f => set(`${f}_r_cg`, ''));
set('col_con_r_cg', 'Punchy');
set('col_grain_r_cg', 'Heavy 16mm-style');
set('col_halo_r_cg', 'Strong halation around highlights');
['cam_', 'lens_', 'mm_in_', 'cam_fmt_', 'cam_fps_', 'cam_focus_', 'cam_angle_',
  'cam_ap_', 'cam_iso_', 'cam_fil_', 'cam_sh_', 'cam_adv_act_', 'cam_adv_tgt_', 'cam_adv_dist_']
  .forEach(f => set(`${f}r_cm`, ''));
set('cam_fmt_r_cm', 'Large Format');
set('cam_fps_r_cm', '120 fps (slow motion)');
set('cam_focus_r_cm', 'Shallow focus');
set('cam_angle_r_cm', 'Low angle');

const out = stack('s', 'runway', rich, richC);
eq('character: saç', out.includes('with slicked back hair'), true);
eq('character: sakal', out.includes('heavy stubble'), true);
eq('character: ayırt edici özellik', out.includes('facial scar'), true);
eq('character: taşıdığı eşya', out.includes('holding a revolver'), true);
set('chr_clo_r_c', 'Formal Suit / Dress'); set('chr_wear_r_c', 'Torn and Dirty');
eq('character: aşınma giysinin sıfatı ("wearing X, torn" değil)',
  stack('s', 'runway', rich, richC).includes('wearing torn and dirty formal suit / dress'), true);
set('chr_clo_r_c', ''); set('chr_wear_r_c', '');
eq('character: jest + yürüyüş (eskiden prompt\'a hiç girmiyordu)',
  out.includes('Ada is clenched fists, limping'), true);
eq('style: görüntü yönetmeni', out.includes('shot by Emmanuel Lubezki'), true);
eq('style: doku', out.includes('gritty and grainy'), true);
eq('style: referans', out.includes('in the vein of Blade Runner 2049'), true);
eq('colorgrade: kontrast', out.includes('punchy contrast'), true);
eq('colorgrade: grain', out.includes('heavy 16mm-style grain'), true);
eq('colorgrade: halation', out.includes('strong halation around highlights'), true);
eq('camera: advanced settings', out.includes('large format camera'), true);
eq('camera: frame rate', out.includes('slow motion'), true);
eq('camera: focus', out.includes('shallow focus'), true);
eq('camera: angle', out.includes('low angle'), true);
eq('atanmamış gövde/lens "Shot on" üretmiyor', out.includes('Shot on'), false);

// ---------------------------------------------------------------------------
// 12. MATERIAL MODULE
// ---------------------------------------------------------------------------
const matNodes = {
    m1: { id: 'm1', type: 'material' },
    chr: { id: 'chr', type: 'character' }
};
const matCables = [ { from: 'chr', to: 'm1' }, { from: 'chr', to: 's' } ];

['type', 'substance', 'texture', 'finish', 'opacity', 'tint', 'condition', 'character', 'kinesthetic', 'energy', 'energy_int', 'synesthetic', 'note']
    .forEach(f => set(`mat_${f}_m1`, ''));

set('chr_name_chr', 'A knight');

const unassignedMatOut = stack('s', 'runway', matNodes, matCables);
eq('material (unassigned): no effect', unassignedMatOut.includes('A knight'), true);
eq('material (unassigned): no stray commas', unassignedMatOut.includes('with a'), false);

set('mat_type_m1', 'Liquid Chrome');
set('mat_finish_m1', 'Mirror-Polished');
set('mat_tint_m1', 'Blood Red');
const assignedMatOut = stack('s', 'runway', matNodes, matCables);
console.log('ASSIGNED MAT OUT:', assignedMatOut);
eq('material (assigned): appended clause', assignedMatOut.includes('A knight, with a mirror-polished Liquid Chrome surface, tinted blood red'), true);

const mjOut = stack('s', 'midjourney', matNodes, matCables);
console.log('MJ OUT:', mjOut);
eq('material (midjourney): tags after host', mjOut.includes('A knight, Liquid Chrome, Mirror-Polished, Blood Red tint'), true);

const gMat = collectInputs('s', matNodes, matCables);
eq('material: unwraps in collectInputs (host in chars)', gMat.chars.length, 1);
eq('material: unwraps in collectInputs (mat stored by host id)', gMat.materials['chr'].type, 'Liquid Chrome');

// ---------------------------------------------------------------------------
// 13. STYLE PRESET LIBRARY (106-entry optgroup on the Style node)
// ---------------------------------------------------------------------------
console.log('\n=== Style Preset Library ===');

const spNodes = {
  s: nodes.s,
  sp_ch: { id: 'sp_ch', type: 'character', el: { style: { left: '0px' } } },
  sp_st: { id: 'sp_st', type: 'style', el: { style: { left: '1px' } } },
};
const spCables = [{ from: 'sp_ch', to: 's' }, { from: 'sp_st', to: 's' }];
set('chr_name_sp_ch', 'Robot');
set('sty_preset_sp_st', '3D Model');

eq('preset flavor joins the sentence',
  stack('s', 'runway', spNodes, spCables),
  'Robot, professional 3D render, octane render, cinema4d, high detail, volumetric lighting, ray-traced reflections.');

eq('preset name becomes a midjourney tag',
  stack('s', 'midjourney', spNodes, spCables),
  'Robot, 3D Model');

set('sty_preset_sp_st', '');
eq('unassigned preset: no stray clause', stack('s', 'runway', spNodes, spCables), 'Robot.');
eq('unassigned preset: no dangling tag', stack('s', 'midjourney', spNodes, spCables), 'Robot');

eq('findStylePreset: unknown name returns falsy', !!findStylePreset('Not A Real Preset'), false);
eq('findStylePreset: known name resolves its flavor',
  findStylePreset('Game Voxel Sandbox').flavor,
  'voxel sandbox game art, blocky cubic terrain, bright flat-shaded surfaces, procedurally-tiled world');

// ---------------------------------------------------------------------------
// 14. COLOR PALETTE MODULE
// ---------------------------------------------------------------------------
console.log('\n=== Color Palette ===');

const palNodes = {
  s: nodes.s,
  cp_ch: { id: 'cp_ch', type: 'character', el: { style: { left: '0px' } } },
  pal: { id: 'pal', type: 'colorpalette', el: { style: { left: '1px' } } },
};
const palCables = [{ from: 'cp_ch', to: 's' }, { from: 'pal', to: 's' }];
set('chr_name_cp_ch', 'Wanderer');
set('pal_preset_pal', 'Teal & Orange');
set('pal_dominance_pal', 'Warm-Dominant');
set('pal_saturation_pal', 'Vivid / Saturated');
set('pal_accent_pal', 'lime green');
set('pal_note_pal', 'subtle grain texture');

eq('palette phrase: flavor + dominance/saturation + accent + note',
  stack('s', 'runway', palNodes, palCables),
  'Wanderer, a classic cinematic teal-and-orange grade, cool blue-green shadows against warm skin-tone highlights,'
  + ' warm-dominant, vivid, a lime green accent, subtle grain texture.');

eq('palette midjourney tags', stack('s', 'midjourney', palNodes, palCables),
  'Wanderer, Teal & Orange, Warm-Dominant, Vivid / Saturated, lime green accent, subtle grain texture');

set('pal_preset_pal', ''); set('pal_dominance_pal', ''); set('pal_saturation_pal', '');
set('pal_accent_pal', ''); set('pal_note_pal', '');
eq('unassigned palette: no clause, no stray comma', stack('s', 'runway', palNodes, palCables), 'Wanderer.');
eq('unassigned palette: no dangling tags', stack('s', 'midjourney', palNodes, palCables), 'Wanderer');

eq('findColorPalette: swatch lookup',
  findColorPalette('Teal & Orange').swatch,
  ['#0b3d42', '#1c6e73', '#e8834a', '#f2b26b']);
eq('findColorPalette: unknown name returns null', findColorPalette('Not A Real Palette'), null);

// ---------------------------------------------------------------------------
// 15. UI ELEMENTS MODULE
// ---------------------------------------------------------------------------
console.log('\n=== UI Elements ===');

const uiNodes = { s: nodes.s, ui: { id: 'ui', type: 'uielements', el: { style: { left: '0px' } } } };
const uiCables = [{ from: 'ui', to: 's' }];
set('ui_platform_ui', 'Mobile App');
set('ui_screen_ui', 'Onboarding Flow');
set('ui_lang_ui', 'Material Design');
set('ui_color_ui', 'Dark Mode');
set('ui_density_ui', 'Card-Based Grid');
set('ui_state_ui', 'Loading / Skeleton');
set('ui_note_ui', 'a subtle pull-to-refresh spinner is visible');

eq('UI Elements: full phrase becomes the subject clause',
  stack('s', 'runway', uiNodes, uiCables),
  'a dark mode mobile app onboarding flow interface, material design design language, card-based grid layout,'
  + ' showing a loading / skeleton, a subtle pull-to-refresh spinner is visible.');

eq('UI Elements: midjourney tags', stack('s', 'midjourney', uiNodes, uiCables),
  'Mobile App, Onboarding Flow, Material Design, Dark Mode, Card-Based Grid, Loading / Skeleton,'
  + ' a subtle pull-to-refresh spinner is visible');

['platform', 'screen', 'lang', 'color', 'density', 'state', 'note'].forEach(f => set(`ui_${f}_ui`, ''));
eq('unassigned UI Elements: contributes nothing (placeholder, no node to lean on)',
  stack('s', 'runway', uiNodes, uiCables), 'Connect Scene, Style, or Character nodes to generate a cinematic prompt.');
eq('unassigned UI Elements: no dangling midjourney tags',
  stack('s', 'midjourney', uiNodes, uiCables), 'Connect nodes to generate Midjourney tags.');

// ---------------------------------------------------------------------------
// 16. GRAPHIC DESIGN MODULE
// ---------------------------------------------------------------------------
console.log('\n=== Graphic Design ===');

const gdNodes = { s: nodes.s, gd: { id: 'gd', type: 'graphicdesign', el: { style: { left: '0px' } } } };
const gdCables = [{ from: 'gd', to: 's' }];
set('gd_artifact_gd', 'Poster');
set('gd_layout_gd', 'Grid-Based');
set('gd_typography_gd', 'Bold Sans-Serif Display');
set('gd_palette_gd', 'Neon / Vibrant');
set('gd_finish_gd', 'Risograph');
set('gd_note_gd', 'hand-torn paper edge');

eq('Graphic Design: full phrase becomes the subject clause',
  stack('s', 'runway', gdNodes, gdCables),
  'a poster, grid-based layout, bold sans-serif display typography, neon / vibrant palette, risograph finish,'
  + ' hand-torn paper edge.');

eq('Graphic Design: midjourney tags', stack('s', 'midjourney', gdNodes, gdCables),
  'Poster, Grid-Based, Bold Sans-Serif Display, Neon / Vibrant, Risograph, hand-torn paper edge');

['artifact', 'layout', 'typography', 'palette', 'finish', 'note'].forEach(f => set(`gd_${f}_gd`, ''));
eq('unassigned Graphic Design: contributes nothing',
  stack('s', 'runway', gdNodes, gdCables), 'Connect Scene, Style, or Character nodes to generate a cinematic prompt.');
eq('unassigned Graphic Design: no dangling midjourney tags',
  stack('s', 'midjourney', gdNodes, gdCables), 'Connect nodes to generate Midjourney tags.');

// ---------------------------------------------------------------------------
// 17. PRODUCT SHOT MODULE
// ---------------------------------------------------------------------------
console.log('\n=== Product Shot ===');

const prNodes = { s: nodes.s, pr: { id: 'pr', type: 'productshot', el: { style: { left: '0px' } } } };
const prCables = [{ from: 'pr', to: 's' }];
const prFields = ['size', 'surface', 'backdrop', 'lightchar', 'shadow', 'lens', 'dof', 'dist', 'style', 'finish', 'mood', 'props'];
const setPr = () => {
  set('pr_category_pr', 'Perfume Bottle');
  set('pr_name_pr', ''); set('pr_note_pr', '');
  set('pr_light_pr', 'Dark Field');
  set('pr_size_pr', ''); set('pr_surface_pr', 'Black Acrylic (reflective)');
  set('pr_backdrop_pr', 'Deep Black'); set('pr_lightchar_pr', 'Crisp / Defined');
  set('pr_shadow_pr', 'Reflection Instead of Shadow'); set('pr_lens_pr', '100mm Macro');
  set('pr_dof_pr', 'f/8 — Balanced'); set('pr_dist_pr', 'Close (~50cm)');
  set('pr_style_pr', 'Hero Packshot'); set('pr_finish_pr', 'High-Gloss Retouched');
  set('pr_mood_pr', 'Luxury & Opulent'); set('pr_props_pr', 'None');
};
setPr();

eq('product shot: subject + lit + optics land as separate clauses',
  stack('s', 'runway', prNodes, prCables),
  'a faceted glass flacon, refractive and liquid-filled, heavy crystal base, on black acrylic,'
  + ' against a deep black background, shot as a hero packshot, high-gloss retouched, luxury & opulent mood,'
  + ' lit dark-field, twin strip softboxes raking from behind and the sides against a black ground so only the'
  + ' bright refractive edges of the glass glow, crisp light, reflection instead of shadow,'
  + ' Shot on a 100mm macro lens at f/8, from a close working distance.');

eq('product shot: midjourney tags', stack('s', 'midjourney', prNodes, prCables),
  'Perfume Bottle, Black Acrylic (reflective), Deep Black, Dark Field, Crisp / Defined,'
  + ' Reflection Instead of Shadow, 100mm Macro, f/8 — Balanced, Close (~50cm), Hero Packshot,'
  + ' High-Gloss Retouched, Luxury & Opulent');

// Camera node connected → Product Shot optics drop out, Camera owns `cam`.
const prCamNodes = { ...prNodes, cam: { id: 'cam', type: 'camera', el: { style: { left: '1px' } } } };
const prCamCables = [{ from: 'pr', to: 's' }, { from: 'cam', to: 's' }];
setPr();
set('cam_cam', 'Alexa Mini LF'); set('lens_cam', ''); set('mm_in_cam', '');
const camOut = stack('s', 'runway', prCamNodes, prCamCables);
eq('product shot: Camera node wins the cam clause', camOut.includes('Shot on Alexa Mini LF'), true);
eq('product shot: optics phrase suppressed when Camera present', camOut.includes('100mm macro lens'), false);
eq('product shot: lint warns optics ignored',
  lintScene(collectInputs('s', prCamNodes, prCamCables)).some(x => x.includes('Product Shot optics are ignored')), true);

// Unassigned contract: connected node, nothing chosen → nothing said.
prFields.concat(['category', 'light', 'name', 'note']).forEach(f => set(`pr_${f}_pr`, ''));
eq('unassigned product shot: no cinematic clause',
  stack('s', 'runway', prNodes, prCables), 'Connect Scene, Style, or Character nodes to generate a cinematic prompt.');
eq('unassigned product shot: no dangling tags',
  stack('s', 'midjourney', prNodes, prCables), 'Connect nodes to generate Midjourney tags.');

// lit regression lock: a plain sunlight Light node, no Product Shot.
const litNode = { s: nodes.s, l: { id: 'l', type: 'light', el: { style: { left: '0px' } } }, c: pf.sc };
const litCab = [{ from: 'l', to: 's' }, { from: 'c', to: 's' }];
set('mode_l', 'sunlight'); set('time_l', '15');
eq('lit refactor is behaviour-preserving (sunlight)',
  stack('s', 'runway', litNode, litCab).includes('lit by natural sunlight at 15:00.'), true);

// recommendFor: the two research tables joined.
eq('recommendFor: transparent+small → dark field + 100mm macro',
  recommendFor('Perfume Bottle'),
  { light: 'Dark Field', ground: 'Black Acrylic (reflective)', shadow: 'Reflection Instead of Shadow',
    lens: '100mm Macro', dof: 'f/8 — Balanced', dist: 'Close (~50cm)' });
eq('recommendFor: matte+large sofa → three-point + 50mm f/11',
  recommendFor('Sofa / Upholstered Furniture'),
  { light: 'Three-Point', ground: 'Seamless White Sweep', shadow: 'Natural Grounded Shadow',
    lens: '50mm Standard', dof: 'f/11 — Sharp', dist: 'Far (~3m)' });
eq('recommendFor: size override wins over category size',
  recommendFor('Perfume Bottle', 'Miniature (jewelry, coin)').lens, '100mm Macro');
eq('recommendFor: size override changes dof to focus-stacked',
  recommendFor('Perfume Bottle', 'Miniature (jewelry, coin)').dof, 'Focus-stacked — Full sharpness');
eq('recommendFor: unknown category returns null', recommendFor('Not A Product'), null);
eq('findProductLightSetup: known name resolves flavor',
  typeof findProductLightSetup('Dark Field').flavor, 'string');
eq('findProductLightSetup: unknown returns null', findProductLightSetup('Nope'), null);

console.log(`\n${failures === 0 ? '✅ TÜM TESTLER GEÇTİ' : `❌ ${failures} TEST BAŞARISIZ`}`);
process.exit(failures === 0 ? 0 : 1);
