// CONTENT MODULES — UI Elements & Graphic Design
//
// Both are hand-built, customloc-style nodes: no spatial-context panel (the
// whole frame IS the interface / the whole frame IS the artifact — there is
// nothing to position within a scene), no mesh() (2D-composition concepts
// don't have a natural 3D form). Category: SOURCE (they answer "what is this
// image fundamentally", like Scene/CustomLoc do — not a positioned SUBJECT).
//
// Despite the SOURCE category colour, both contribute to compSubj (sArr) in
// buildComposition — the category colour is about nav/UI grouping; where a
// clause lands in the sentence is a separate decision. A UI mockup or a
// poster genuinely IS "what's depicted", so it belongs alongside characters
// and objects in the subject clause.

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
