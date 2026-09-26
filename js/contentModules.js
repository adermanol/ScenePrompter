// CONTENT MODULES — UI Elements, Graphic Design & Asset Pack
//
// All three are hand-built, customloc-style nodes: no spatial-context panel
// (the whole frame IS the interface / the whole frame IS the artifact / the
// whole frame IS the pack — there is nothing to position within a scene), no
// mesh() (2D-composition concepts don't have a natural 3D form). Category:
// SOURCE (they answer "what is this image fundamentally", like Scene/CustomLoc
// do — not a positioned SUBJECT).
//
// Despite the SOURCE category colour, all three contribute to compSubj (sArr)
// in buildComposition — the category colour is about nav/UI grouping; where a
// clause lands in the sentence is a separate decision. A UI mockup, a poster,
// or a sticker sheet genuinely IS "what's depicted", so each belongs alongside
// characters and objects in the subject clause.
//
// Asset Pack is the odd one out in one way: it describes a SET of N
// consistent items (icons/stickers/UI components/badges), not a single
// artifact — its distinguishing fields are COUNT and the consistency
// descriptors (line weight, corner style, color mode), which is exactly what
// Graphic Design's single-artifact fields don't cover.

// ---------------------------------------------------------------------------
// UI ELEMENTS
// ---------------------------------------------------------------------------
const UI_FIELDS = [
    { key: 'platform', label: 'PLATFORM',       options: 'uiPlatform',       half: true },
    { key: 'screen',   label: 'SCREEN TYPE',    options: 'uiScreenType',     half: true },
    { key: 'lang',     label: 'DESIGN LANGUAGE', options: 'uiDesignLanguage', half: true },
    { key: 'color',    label: 'COLOR MODE',     options: 'uiColorMode',      half: true },
    { key: 'density',  label: 'LAYOUT DENSITY', options: 'uiLayoutDensity',  half: false },
    { key: 'state',    label: 'STATE',          options: 'uiState',         half: false },
];

function buildUiElementsHTML(id) {
    let html = '';
    html += sectionHTML('SCREEN');
    html += rowHTML(
        fieldHTML('PLATFORM', `ui_platform_${id}`, DB.uiPlatform),
        fieldHTML('SCREEN TYPE', `ui_screen_${id}`, DB.uiScreenType)
    );
    html += sectionHTML('LOOK');
    html += rowHTML(
        fieldHTML('DESIGN LANGUAGE', `ui_lang_${id}`, DB.uiDesignLanguage),
        fieldHTML('COLOR MODE', `ui_color_${id}`, DB.uiColorMode)
    );
    html += fieldHTML('LAYOUT DENSITY', `ui_density_${id}`, DB.uiLayoutDensity);
    html += fieldHTML('STATE', `ui_state_${id}`, DB.uiState);
    html += sectionHTML('NOTE');
    html += `<textarea id="ui_note_${id}" rows="2" placeholder="Custom UI notes..." oninput="triggerUpdate()" style="width:100%; padding:4px; background:#111; color:#eee; border:1px solid #333; border-radius:4px; font-size:0.75rem; resize:none;"></textarea>`;
    return html;
}

function readUiElements(id) {
    const v = {};
    UI_FIELDS.forEach(f => {
        const el = document.getElementById(`ui_${f.key}_${id}`);
        v[f.key] = el ? el.value : '';
    });
    const noteEl = document.getElementById(`ui_note_${id}`);
    v.note = noteEl ? noteEl.value.trim() : '';
    return v;
}

// Target-agnostic prose clause. '' if nothing is chosen (unassigned contract).
function uiElementsPhrase(v) {
    const color = (v.color || '').toLowerCase();
    const platform = (v.platform || '').toLowerCase();
    const screen = (v.screen || '').toLowerCase();
    if (!platform && !screen) return '';

    const head = [color, platform, screen].filter(Boolean).join(' ');
    let phrase = `a ${head} interface`;
    if (v.lang) phrase += `, ${v.lang.toLowerCase()} design language`;
    if (v.density) phrase += `, ${v.density.toLowerCase()} layout`;
    if (v.state) phrase += `, showing a ${v.state.toLowerCase()}`;
    if (v.note) phrase += `, ${v.note}`;
    return phrase;
}

function uiElementsTags(v) {
    if (!v.platform && !v.screen) return [];
    return [v.platform, v.screen, v.lang, v.color, v.density, v.state, v.note].filter(Boolean);
}

// ---------------------------------------------------------------------------
// GRAPHIC DESIGN
// ---------------------------------------------------------------------------
const GD_FIELDS = [
    { key: 'artifact',   label: 'ARTIFACT TYPE', options: 'gdArtifact',   half: true },
    { key: 'layout',     label: 'LAYOUT STYLE',  options: 'gdLayout',     half: true },
    { key: 'typography', label: 'TYPOGRAPHY',    options: 'gdTypography', half: true },
    { key: 'palette',    label: 'PALETTE ROLE',  options: 'gdPalette',    half: true },
    { key: 'finish',     label: 'FINISH / MEDIUM', options: 'gdFinish',   half: false },
];

function buildGraphicDesignHTML(id) {
    let html = '';
    html += sectionHTML('ARTIFACT');
    html += rowHTML(
        fieldHTML('ARTIFACT TYPE', `gd_artifact_${id}`, DB.gdArtifact),
        fieldHTML('LAYOUT STYLE', `gd_layout_${id}`, DB.gdLayout)
    );
    html += sectionHTML('LOOK');
    html += rowHTML(
        fieldHTML('TYPOGRAPHY', `gd_typography_${id}`, DB.gdTypography),
        fieldHTML('PALETTE ROLE', `gd_palette_${id}`, DB.gdPalette)
    );
    html += fieldHTML('FINISH / MEDIUM', `gd_finish_${id}`, DB.gdFinish);
    html += sectionHTML('NOTE');
    html += `<textarea id="gd_note_${id}" rows="2" placeholder="Custom design notes..." oninput="triggerUpdate()" style="width:100%; padding:4px; background:#111; color:#eee; border:1px solid #333; border-radius:4px; font-size:0.75rem; resize:none;"></textarea>`;
    return html;
}

function readGraphicDesign(id) {
    const v = {};
    GD_FIELDS.forEach(f => {
        const el = document.getElementById(`gd_${f.key}_${id}`);
        v[f.key] = el ? el.value : '';
    });
    const noteEl = document.getElementById(`gd_note_${id}`);
    v.note = noteEl ? noteEl.value.trim() : '';
    return v;
}

function graphicDesignPhrase(v) {
    if (!v.artifact) return '';
    let phrase = `a ${v.artifact.toLowerCase()}`;
    const bits = [];
    if (v.layout) bits.push(`${v.layout.toLowerCase()} layout`);
    if (v.typography) bits.push(`${v.typography.toLowerCase()} typography`);
    if (v.palette) bits.push(`${v.palette.toLowerCase()} palette`);
    if (v.finish) bits.push(`${v.finish.toLowerCase()} finish`);
    if (bits.length) phrase += `, ${bits.join(', ')}`;
    if (v.note) phrase += `, ${v.note}`;
    return phrase;
}

function graphicDesignTags(v) {
    if (!v.artifact) return [];
    return [v.artifact, v.layout, v.typography, v.palette, v.finish, v.note].filter(Boolean);
}

// ---------------------------------------------------------------------------
// ASSET PACK
// ---------------------------------------------------------------------------
const ASSET_PACK_FIELDS = [
    { key: 'count',      label: 'COUNT',        options: 'assetPackCount',  half: true },
    { key: 'style',      label: 'ART STYLE',    options: 'assetArtStyle',   half: true },
    { key: 'lineweight', label: 'LINE WEIGHT',  options: 'assetLineWeight', half: true },
    { key: 'corner',     label: 'CORNER STYLE', options: 'assetCorner',     half: true },
    { key: 'color',      label: 'COLOR MODE',   options: 'assetColorMode',  half: true },
    { key: 'bg',         label: 'BACKGROUND',   options: 'assetBackground', half: true },
    { key: 'layout',     label: 'LAYOUT',       options: 'assetLayout',     half: true },
    { key: 'finish',     label: 'FINISH',       options: 'assetFinish',     half: true },
];

function buildAssetPackHTML(id) {
    let typeOpts = `<option value="">--</option>`;
    DB.assetPackTypes.forEach(group => {
        typeOpts += `<optgroup label="${group.label}">`;
        group.items.forEach(entry => {
            typeOpts += `<option value="${entry.name}" data-flavor="${entry.flavor}">${entry.name}</option>`;
        });
        typeOpts += '</optgroup>';
    });

    let html = '';
    html += sectionHTML('PACK');
    html += `<select id="ap_type_${id}" onchange="window.updateAssetPackFlavor('${id}'); triggerUpdate();">${typeOpts}</select>`;
    html += `<div id="ap_flav_${id}" style="font-size:0.6rem; color:#888; min-height:1.2em; margin:2px 0 4px;"></div>`;
    html += `<input type="text" class="obj-input" id="ap_theme_${id}" placeholder="Theme (e.g. cozy autumn coffee shop)" oninput="triggerUpdate()">`;
    html += fieldHTML('COUNT', `ap_count_${id}`, DB.assetPackCount);

    html += sectionHTML('STYLE');
    html += rowHTML(
        fieldHTML('ART STYLE', `ap_style_${id}`, DB.assetArtStyle),
        fieldHTML('LINE WEIGHT', `ap_lineweight_${id}`, DB.assetLineWeight)
    );
    html += fieldHTML('CORNER STYLE', `ap_corner_${id}`, DB.assetCorner);

    html += sectionHTML('COLOR & PRESENTATION');
    html += rowHTML(
        fieldHTML('COLOR MODE', `ap_color_${id}`, DB.assetColorMode),
        fieldHTML('BACKGROUND', `ap_bg_${id}`, DB.assetBackground)
    );
    html += rowHTML(
        fieldHTML('LAYOUT', `ap_layout_${id}`, DB.assetLayout),
        fieldHTML('FINISH', `ap_finish_${id}`, DB.assetFinish)
    );

    html += sectionHTML('NOTE');
    html += `<textarea id="ap_note_${id}" rows="2" placeholder="Custom pack notes..." oninput="triggerUpdate()" style="width:100%; padding:4px; background:#111; color:#eee; border:1px solid #333; border-radius:4px; font-size:0.75rem; resize:none;"></textarea>`;
    return html;
}

// updateAssetPackFlavor — same data-flavor reverse-lookup discipline as
// updatePaletteFlavor/updateMatFlavor (reads the option's own attribute, never
// re-derives from DB).
window.updateAssetPackFlavor = function(id) {
    const sel = document.getElementById(`ap_type_${id}`);
    const out = document.getElementById(`ap_flav_${id}`);
    if (!sel || !out) return;
    const opt = sel.options[sel.selectedIndex];
    const f = opt ? opt.getAttribute('data-flavor') : null;
    out.innerText = f ? '💡 ' + f : '';
};

// findAssetPackType — reverse-lookup by name across all groups (mirrors
// findColorPalette / findProductCategory).
function findAssetPackType(name) {
    if (!name) return null;
    for (const group of DB.assetPackTypes) {
        const hit = group.items.find(e => e.name === name);
        if (hit) return hit;
    }
    return null;
}

function readAssetPack(id) {
    const v = {};
    ASSET_PACK_FIELDS.forEach(f => {
        const el = document.getElementById(`ap_${f.key}_${id}`);
        v[f.key] = el ? el.value : '';
    });
    const typeEl = document.getElementById(`ap_type_${id}`);
    v.type = typeEl ? typeEl.value : '';
    const themeEl = document.getElementById(`ap_theme_${id}`);
    v.theme = themeEl ? themeEl.value.trim() : '';
    const noteEl = document.getElementById(`ap_note_${id}`);
    v.note = noteEl ? noteEl.value.trim() : '';
    return v;
}

const apFirst = s => (s || '').split(' / ')[0].split(' + ')[0].toLowerCase();

// assetPackPhrase — target-agnostic prose clause. '' if no type is chosen.
function assetPackPhrase(v) {
    if (!v.type) return '';
    const entry = findAssetPackType(v.type);
    const desc = entry ? entry.flavor : v.type.toLowerCase();
    const head = [v.count, v.theme].filter(Boolean).join(' ');
    let phrase = `a set of ${head ? head + ' ' : ''}${desc}`;

    const bits = [];
    if (v.style) bits.push(`${apFirst(v.style)} style`);
    if (v.lineweight) bits.push(`${apFirst(v.lineweight)} lines`);
    if (v.corner) bits.push(`${apFirst(v.corner)} corners`);
    if (v.color) bits.push(`${apFirst(v.color)} palette`);
    if (v.bg) bits.push(apFirst(v.bg));
    if (v.layout) bits.push(`arranged as a ${apFirst(v.layout)}`);
    if (v.finish) bits.push(`${apFirst(v.finish)} finish`);
    if (bits.length) phrase += `, ${bits.join(', ')}`;
    if (v.note) phrase += `, ${v.note}`;
    return phrase;
}

function assetPackTags(v) {
    if (!v.type) return [];
    return [
        v.type, v.theme, v.count, v.style, v.lineweight, v.corner,
        v.color, v.bg, v.layout, v.finish, v.note,
    ].filter(Boolean);
}
