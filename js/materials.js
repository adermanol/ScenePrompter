// MATERIAL MODULE
//
// A pass-through wrapper node (like Position) that attaches a material
// description to any host node: character, object, customloc, or any
// SUBJECTS-registry type.  Affects:
//   - Generated prose (materialPhrase)
//   - Midjourney tags (materialTags)
//   - 3D preview surface (visualParams → applyMaterialToMesh in app.js)
//
// This file contains ONLY logic — DB content lives in db.js, and this is
// NOT a SUBJECTS[] entry (Material needs hasIn=true; registry subjects are
// always hasIn=false).

// ---------------------------------------------------------------------------
// MATERIAL_FIELDS — flat-axis field list.
// The FAMILY+TYPE picker is separate (needs optgroups, not a flat list).
// ---------------------------------------------------------------------------
const MATERIAL_FIELDS = [
    { key: 'substance', label: 'SUBSTANCE',  options: 'matSubstance',   half: true },
    { key: 'texture',   label: 'TEXTURE',    options: 'matTexture',     half: true },
    { key: 'finish',    label: 'FINISH',     options: 'matFinish',      half: true },
    { key: 'opacity',   label: 'OPACITY',    options: 'matOpacity',     half: true },
    { key: 'condition', label: 'CONDITION',  options: 'matCondition',   half: true },
    { key: 'character', label: 'CHARACTER',  options: 'matCharacter',   half: true },
    { key: 'kinesthetic', label: 'KINESTHETIC', options: 'matKinesthetic', half: false },
    { key: 'energy',    label: 'ENERGY',     options: 'matEnergy',      half: false },
    { key: 'synesthetic', label: 'SYNESTHETIC', options: 'matSynesthetic', half: false },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sectionHTML(title) {
    return `<div style="font-size:0.6rem; color:#666; letter-spacing:0.12em; margin:14px 0 6px; border-bottom:1px solid #333; padding-bottom:4px">${title}</div>`;
}
function fieldHTML(label, id, arr) {
    return `<div style="font-size:0.6rem; color:#666">${label}</div><select id="${id}" onchange="triggerUpdate()"><option value="">--</option>${arr.map(o=>`<option>${o}</option>`).join('')}</select>`;
}
function rowHTML(f1, f2) {
    return `<div style="display:flex; gap:5px; margin-top:5px"><div style="flex:1">${f1}</div><div style="flex:1">${f2}</div></div>`;
}

// ---------------------------------------------------------------------------
// buildMaterialHTML — hand-written (not looped from MATERIAL_FIELDS),
// following how character/camera/colorg branches already build their HTML
// directly.
// ---------------------------------------------------------------------------
function buildMaterialHTML(id) {
    // Build optgroup picker for material families
    let typeOpts = `<option value="">--</option>`;
    const families = Object.keys(DB.materialTypes);
    families.forEach(fam => {
        const label = fam.charAt(0).toUpperCase() + fam.slice(1);
        typeOpts += `<optgroup label="${label}">`;
        DB.materialTypes[fam].forEach(entry => {
            typeOpts += `<option value="${entry.name}" data-flavor="${entry.flavor}">${entry.name}</option>`;
        });
        typeOpts += '</optgroup>';
    });

    let html = '';

    // --- MATERIAL FAMILY ---
    html += sectionHTML('MATERIAL FAMILY');
    html += `<select id="mat_type_${id}" onchange="window.updateMatFlavor('${id}'); triggerUpdate();">${typeOpts}</select>`;
    html += `<div id="mat_flav_${id}" style="font-size:0.6rem; color:#888; min-height:1.2em; margin:2px 0 4px;"></div>`;
    html += `<input type="text" class="obj-input" id="mat_tint_${id}" placeholder="Custom tint (e.g. burnt sienna)" oninput="triggerUpdate()" style="margin-top:2px">`;

    // --- SUBSTANCE & SURFACE ---
    html += sectionHTML('SUBSTANCE & SURFACE');
    html += rowHTML(
        fieldHTML('SUBSTANCE', `mat_substance_${id}`, DB.matSubstance),
        fieldHTML('TEXTURE', `mat_texture_${id}`, DB.matTexture)
    );
    html += rowHTML(
        fieldHTML('FINISH', `mat_finish_${id}`, DB.matFinish),
        fieldHTML('OPACITY', `mat_opacity_${id}`, DB.matOpacity)
    );

    // --- CONDITION & CHARACTER ---
    html += sectionHTML('CONDITION & CHARACTER');
    html += rowHTML(
        fieldHTML('CONDITION', `mat_condition_${id}`, DB.matCondition),
        fieldHTML('CHARACTER', `mat_character_${id}`, DB.matCharacter)
    );

    // --- BEHAVIOR & ENERGY ---
    html += sectionHTML('BEHAVIOR & ENERGY');
    html += fieldHTML('KINESTHETIC', `mat_kinesthetic_${id}`, DB.matKinesthetic);
    html += fieldHTML('ENERGY', `mat_energy_${id}`, DB.matEnergy);
    html += `<div style="font-size:0.6rem; color:#666; margin-top:5px">ENERGY INTENSITY</div>`;
    html += `<input type="range" id="mat_energy_int_${id}" min="1" max="10" value="5" oninput="triggerUpdate()" style="width:100%; margin-top:2px">`;

    // --- SYNESTHETIC ---
    html += sectionHTML('SYNESTHETIC');
    html += fieldHTML('SYNESTHETIC', `mat_synesthetic_${id}`, DB.matSynesthetic);
    html += `<textarea id="mat_note_${id}" rows="2" placeholder="Custom material notes..." oninput="triggerUpdate()" style="width:100%; padding:4px; background:#111; color:#eee; border:1px solid #333; border-radius:4px; font-size:0.75rem; margin-top:5px; resize:none;"></textarea>`;

    return html;
}

// ---------------------------------------------------------------------------
// updateMatFlavor — verbatim copy of updateCamFlavor's pattern.
// ---------------------------------------------------------------------------
window.updateMatFlavor = function(id) {
    const sel = document.getElementById(`mat_type_${id}`);
    const out = document.getElementById(`mat_flav_${id}`);
    if (!sel || !out) return;
    const opt = sel.options[sel.selectedIndex];
    const f = opt ? opt.getAttribute('data-flavor') : null;
    out.innerText = f ? '💡 ' + f : '';
};

// ---------------------------------------------------------------------------
// readMaterial — mirrors readSubject.
// Family is resolved by reverse-lookup against DB.materialTypes (NOT by
// reading a data-family DOM attribute — the test mock's mk(v) fabricates
// plain {value, style, options, selectedIndex} objects with no getAttribute
// support, so an attribute-based lookup would break every material test).
// ---------------------------------------------------------------------------
function readMaterial(id) {
    const v = {};

    // Flat axes
    MATERIAL_FIELDS.forEach(f => {
        const el = document.getElementById(`mat_${f.key}_${id}`);
        v[f.key] = el ? el.value : '';
    });

    // Type (from optgroup picker)
    const typeEl = document.getElementById(`mat_type_${id}`);
    v.type = typeEl ? typeEl.value : '';

    // Tint (free-text)
    const tintEl = document.getElementById(`mat_tint_${id}`);
    v.tint = tintEl ? tintEl.value.trim() : '';

    // Energy intensity (slider, numeric)
    const intEl = document.getElementById(`mat_energy_int_${id}`);
    v.energyInt = intEl ? parseInt(intEl.value, 10) || 5 : 5;

    // Note (free-text)
    const noteEl = document.getElementById(`mat_note_${id}`);
    v.note = noteEl ? noteEl.value.trim() : '';

    // Family — resolved by reverse-lookup
    v.family = '';
    if (v.type) {
        for (const fam of Object.keys(DB.materialTypes)) {
            if (DB.materialTypes[fam].some(e => e.name === v.type)) {
                v.family = fam;
                break;
            }
        }
    }

    return v;
}

// ---------------------------------------------------------------------------
// materialPhrase — target-agnostic prose clause.
// Returns '' immediately if v.type is empty (nothing chosen ⇒ nothing said).
// ---------------------------------------------------------------------------
const matFirst = s => (s || '').split(' / ')[0].toLowerCase();

function materialPhrase(v) {
    if (!v.type) return '';

    const adjs = [
        matFirst(v.condition),
        matFirst(v.character),
        matFirst(v.kinesthetic),
        matFirst(v.finish),
        matFirst(v.substance),
    ].filter(Boolean);

    let phrase = 'with a ';
    if (adjs.length) phrase += adjs.join(', ') + ' ';
    phrase += v.type.toLowerCase() + ' surface';

    if (v.texture) phrase += `, ${matFirst(v.texture)} texture`;
    if (v.opacity) phrase += `, ${v.opacity.toLowerCase()}`;
    if (v.tint) phrase += `, tinted ${v.tint.toLowerCase()}`;
    if (v.energy && v.energy !== 'None') phrase += `, ${v.energy.toLowerCase()}`;
    if (v.synesthetic) phrase += ` that ${v.synesthetic}`;
    if (v.note) phrase += `, ${v.note}`;

    return phrase;
}

// ---------------------------------------------------------------------------
// materialTags — same shape as SUBJECTS[x].tags.
// ---------------------------------------------------------------------------
function materialTags(v) {
    if (!v.type) return [];
    return [
        v.type,
        v.substance,
        v.texture,
        v.finish,
        v.opacity,
        v.tint ? v.tint + ' tint' : '',
        v.condition,
        v.character,
        v.kinesthetic,
        (v.energy && v.energy !== 'None') ? v.energy : '',
        v.synesthetic,
        v.note,
    ].filter(Boolean);
}

// ---------------------------------------------------------------------------
// Render-mapping constants (not DB — these are Three.js parameter tables).
// ---------------------------------------------------------------------------
const MAT_FINISH_PARAMS = {
    'Raw / Unfinished': { roughness: 0.9 },
    'Matte':            { roughness: 0.8 },
    'Satin':            { roughness: 0.5 },
    'Glossy':           { roughness: 0.15 },
    'Mirror-Polished':  { roughness: 0.02, metalness: 0.85 },
    'Brushed':          { roughness: 0.35, metalness: 0.7 },
    'Hammered':         { roughness: 0.6 },
    'Weathered / Patina': { roughness: 0.75 },
    'Wet / Slick':      { roughness: 0.05 },
};

const MAT_OPACITY_PARAMS = {
    'Opaque':           { opacity: 1.0, transparent: false },
    'Mostly Opaque':    { opacity: 0.85, transparent: true },
    'Translucent':      { opacity: 0.55, transparent: true },
    'Semi-Transparent': { opacity: 0.35, transparent: true },
    'Crystal-Clear':    { opacity: 0.15, transparent: true },
};

const MAT_ENERGY_COLORS = {
    'Faint Inner Glow':       { color: 0xffffcc, multiplier: 0.3 },
    'Pulsing Bioluminescence': { color: 0x00ffaa, multiplier: 0.5 },
    'Crackling Electricity':  { color: 0x88ccff, multiplier: 0.8 },
    'Smouldering Ember':      { color: 0xff4400, multiplier: 0.6 },
    'Radiant Aura':           { color: 0xffdd44, multiplier: 1.0 },
    'Flickering Holographic': { color: 0xaaddff, multiplier: 0.4 },
    'Intense Plasma Burn':    { color: 0xaa44ff, multiplier: 1.5 },
};

// ---------------------------------------------------------------------------
// visualParams — pure function.
// Returns {color, roughness, metalness, opacity, transparent, emissive,
//          emissiveIntensity} from DB.materialTypes, then layered overrides:
//   1. Finish → roughness (some also raise metalness floor)
//   2. Opacity → opacity + transparent
//   3. Energy → emissive color + scaled intensity
// Returns null if type/family unresolved.
// ---------------------------------------------------------------------------
function visualParams(v) {
    if (!v.type || !v.family) return null;
    const fam = DB.materialTypes[v.family];
    if (!fam) return null;
    const entry = fam.find(e => e.name === v.type);
    if (!entry) return null;

    // Start from the base entry's properties
    const p = {
        color: entry.color,
        roughness: entry.roughness,
        metalness: entry.metalness,
        opacity: entry.opacity !== undefined ? entry.opacity : 1.0,
        transparent: entry.opacity !== undefined && entry.opacity < 1.0,
        emissive: entry.emissive || 0x000000,
        emissiveIntensity: entry.emissiveIntensity || 0,
    };

    // 1. Finish override
    if (v.finish) {
        const fp = MAT_FINISH_PARAMS[v.finish];
        if (fp) {
            p.roughness = fp.roughness;
            if (fp.metalness !== undefined) {
                p.metalness = Math.max(p.metalness, fp.metalness);
            }
        }
    }

    // 2. Opacity override
    if (v.opacity) {
        const op = MAT_OPACITY_PARAMS[v.opacity];
        if (op) {
            p.opacity = op.opacity;
            p.transparent = op.transparent;
        }
    }

    // 3. Energy override
    if (v.energy === 'None') {
        // Explicitly kill any natural glow
        p.emissive = 0x000000;
        p.emissiveIntensity = 0;
    } else if (v.energy) {
        const ep = MAT_ENERGY_COLORS[v.energy];
        if (ep) {
            p.emissive = ep.color;
            p.emissiveIntensity = (v.energyInt / 10) * 2 * ep.multiplier;
        }
    }
    // If energy is unassigned (''), base type's bundled glow survives untouched.

    return p;
}
