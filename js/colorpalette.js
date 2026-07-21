// COLOR PALETTE MODULE
//
// A scene-wide colour-scheme node — connected exactly like Color Grade
// (hasIn=false, straight into Stack), NOT a Material-style per-object
// wrapper. A palette describes the whole shot's colour identity, not one
// object's surface, so it has no host to attach to.
//
// This file contains ONLY logic — DB content (DB.colorPalettes,
// DB.palDominance, DB.palSaturation) lives in db.js.

const PALETTE_FIELDS = [
    { key: 'dominance',  label: 'DOMINANCE',  options: 'palDominance',  half: true },
    { key: 'saturation', label: 'SATURATION', options: 'palSaturation', half: true },
];

// ---------------------------------------------------------------------------
// buildColorPaletteHTML — mirrors buildMaterialHTML's shape: an optgroup
// picker with a flavor line, plus a small swatch strip (palette's one
// addition over Material — a literal preview of the chosen colours).
// ---------------------------------------------------------------------------
function buildColorPaletteHTML(id) {
    let opts = `<option value="">--</option>`;
    DB.colorPalettes.forEach(group => {
        opts += `<optgroup label="${group.label}">`;
        group.items.forEach(entry => {
            opts += `<option value="${entry.name}" data-flavor="${entry.flavor}">${entry.name}</option>`;
        });
        opts += '</optgroup>';
    });

    let html = '';
    html += sectionHTML('PALETTE PRESET');
    html += `<select id="pal_preset_${id}" onchange="window.updatePaletteFlavor('${id}'); triggerUpdate();">${opts}</select>`;
    html += `<div id="pal_flav_${id}" style="font-size:0.6rem; color:#888; min-height:1.2em; margin:2px 0 4px;"></div>`;
    html += `<div id="pal_swatch_${id}" style="display:flex; gap:4px; height:18px; margin-bottom:4px; border-radius:4px; overflow:hidden;"></div>`;
    html += `<input type="text" class="obj-input" id="pal_accent_${id}" placeholder="Custom accent color (e.g. blood red)" oninput="triggerUpdate()">`;

    html += sectionHTML('CHARACTER');
    html += rowHTML(
        fieldHTML('DOMINANCE', `pal_dominance_${id}`, DB.palDominance),
        fieldHTML('SATURATION', `pal_saturation_${id}`, DB.palSaturation)
    );

    html += sectionHTML('NOTE');
    html += `<textarea id="pal_note_${id}" rows="2" placeholder="Custom palette notes..." oninput="triggerUpdate()" style="width:100%; padding:4px; background:#111; color:#eee; border:1px solid #333; border-radius:4px; font-size:0.75rem; resize:none;"></textarea>`;

    return html;
}

// ---------------------------------------------------------------------------
// updatePaletteFlavor — flavor line + live swatch chips, same reverse-lookup
// discipline as updateMatFlavor (reads the option's own data-flavor attribute,
// never re-derives from DB, so it also works against the test mocks).
// ---------------------------------------------------------------------------
window.updatePaletteFlavor = function(id) {
    const sel = document.getElementById(`pal_preset_${id}`);
    const out = document.getElementById(`pal_flav_${id}`);
    const swatchBox = document.getElementById(`pal_swatch_${id}`);
    if (!sel) return;
    const opt = sel.options[sel.selectedIndex];
    const f = opt ? opt.getAttribute('data-flavor') : null;
    if (out) out.innerText = f ? '💡 ' + f : '';
    if (swatchBox) {
        const entry = findColorPalette(sel.value);
        swatchBox.innerHTML = entry
            ? entry.swatch.map(hex => `<div style="flex:1; background:${hex};"></div>`).join('')
            : '';
    }
};

// ---------------------------------------------------------------------------
// findColorPalette — reverse-lookup by name across all groups (mirrors
// readMaterial's family lookup against DB.materialTypes).
// ---------------------------------------------------------------------------
function findColorPalette(name) {
    if (!name) return null;
    for (const group of DB.colorPalettes) {
        const hit = group.items.find(e => e.name === name);
        if (hit) return hit;
    }
    return null;
}

// ---------------------------------------------------------------------------
// readColorPalette — mirrors readMaterial's shape.
// ---------------------------------------------------------------------------
function readColorPalette(id) {
    const v = {};
    PALETTE_FIELDS.forEach(f => {
        const el = document.getElementById(`pal_${f.key}_${id}`);
        v[f.key] = el ? el.value : '';
    });
    const presetEl = document.getElementById(`pal_preset_${id}`);
    v.preset = presetEl ? presetEl.value : '';
    const accentEl = document.getElementById(`pal_accent_${id}`);
    v.accent = accentEl ? accentEl.value.trim() : '';
    const noteEl = document.getElementById(`pal_note_${id}`);
    v.note = noteEl ? noteEl.value.trim() : '';
    return v;
}

// ---------------------------------------------------------------------------
// colorPalettePhrase — a fluent clause for the style/look segment of the
// prompt, alongside Color Grade's contribution. '' if nothing is chosen.
// ---------------------------------------------------------------------------
const palFirst = s => (s || '').split(' / ')[0].toLowerCase();

function colorPalettePhrase(v) {
    if (!v.preset) return '';
    const entry = findColorPalette(v.preset);
    let phrase = entry ? entry.flavor : v.preset.toLowerCase();
    const mods = [palFirst(v.dominance), palFirst(v.saturation)].filter(Boolean);
    if (mods.length) phrase += `, ${mods.join(', ')}`;
    if (v.accent) phrase += `, a ${v.accent.toLowerCase()} accent`;
    if (v.note) phrase += `, ${v.note}`;
    return phrase;
}

// ---------------------------------------------------------------------------
// colorPaletteTags — same shape as SUBJECTS[x].tags / materialTags.
// ---------------------------------------------------------------------------
function colorPaletteTags(v) {
    if (!v.preset) return [];
    return [
        v.preset,
        v.dominance,
        v.saturation,
        v.accent ? v.accent + ' accent' : '',
        v.note,
    ].filter(Boolean);
}
