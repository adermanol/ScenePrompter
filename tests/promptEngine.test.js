const fs = require('fs');

// ---- Fake DOM ----
const els = {};
function mk(value) { return { value, style: {}, options: [{ text: value }], selectedIndex: 0 }; }
function set(id, value) { els[id] = mk(value); }

global.document = {
  getElementById: (id) => els[id] || null,
};
global.window = {};
global.localStorage = { getItem: () => null, setItem: () => {} };

// ---- Load promptEngine.js into this scope ----
const code = fs.readFileSync('c:/Works/Projects/ScenePrompter/js/promptEngine.js', 'utf8');
eval(code); // defines updateStack, formatSpatial, etc. as vars in this scope

// ---- Scenario ----
const nodes = {
  node_s: { id: 'node_s', type: 'stack', el: { style: { left: '0px' } } },
  node_q: { id: 'node_q', type: 'quadruped', el: { style: { left: '10px' } } },
  node_i: { id: 'node_i', type: 'insect', el: { style: { left: '20px' } } },
  node_l: { id: 'node_l', type: 'customloc', el: { style: { left: '30px' } } },
};
const cables = [
  { from: 'node_q', to: 'node_s' },
  { from: 'node_i', to: 'node_s' },
  { from: 'node_l', to: 'node_s' },
];

// stack + spatial
set('val_node_s', '');
// spatial context for creatures
['node_q', 'node_i'].forEach(id => {
  set(`depth_${id}`, 'foreground'); set(`hpos_${id}`, 'center'); set(`vpos_${id}`, 'ground');
});

// quadruped
set('quad_cust_node_q', ''); set('quad_spec_node_q', 'Wolf'); set('quad_size_node_q', 'Large');
set('quad_coat_node_q', 'Shaggy / Thick Fur'); set('quad_act_node_q', 'Prowling / Stalking');
set('quad_mood_node_q', 'Feral / Wild'); set('quad_note_node_q', '');

// insect
set('ins_cust_node_i', ''); set('ins_spec_node_i', 'Butterfly'); set('ins_scale_node_i', 'Extreme Macro Close-up');
set('ins_count_node_i', 'Swarm'); set('ins_beh_node_i', 'Flying'); set('ins_surf_node_i', 'On a Flower');
set('ins_note_node_i', '');

// customloc
set('loc_name_node_l', 'rusted freighter deck'); set('loc_env_node_l', 'Exterior');
set('loc_arch_node_l', 'Industrial / Factory'); set('loc_surf_node_l', 'Wet Asphalt');
set('loc_scale_node_l', 'Vast / Cavernous'); set('loc_feat_node_l', 'hanging cables, flickering lights');

function run(platform) {
  set('stack_plat_node_s', platform);
  set('val_node_s', '');
  updateStack('node_s', nodes, cables);
  console.log(`\n===== ${platform.toUpperCase()} =====\n` + els['val_node_s'].value);
}

['runway', 'veo', 'kling', 'luma', 'midjourney'].forEach(run);
