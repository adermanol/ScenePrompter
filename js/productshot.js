// PRODUCT SHOT MODULE
//
// Studio product photography as a first-class node — a hand-built, customloc-
// style SOURCE node (no spatial-context panel, no mesh(): a generic product has
// no natural 3D form, same reasoning as UI Elements / Graphic Design).
//
// One node, THREE prompt clauses — the same pattern SUBJECTS[x] uses
// (phrase→sArr, action→aArr, audio→audio, js/promptEngine.js):
//   - productShotPhrase(v)   → sArr → `subj`   (what is depicted + set + style)
//   - productLightPhrase(v)  → `lit`           (the named lighting recipe)
//   - productOpticsPhrase(v) → `cam`           (only when NO Camera node is wired)
//   - productShotTags(v)     → Midjourney tags
//
// `lit` must stay its own clause: Sora/Veo print it as a sentence, Pika drops it.
//
// This file is ONLY logic — DB content (DB.productCategories, DB.productLightSetups,
// DB.productLightRecipes, DB.productOpticsRecipes, …) lives in db.js.

// ---------------------------------------------------------------------------
// Field list — flat axes. The CATEGORY and LIGHT SETUP pickers are separate
// (they need optgroups + data-flavor, not a flat list).
// ---------------------------------------------------------------------------
const PRODUCT_FIELDS = [
    { key: 'size',      label: 'SIZE CLASS' },
    { key: 'surface',   label: 'SURFACE / TABLE' },
    { key: 'backdrop',  label: 'BACKDROP' },
    { key: 'pattern',   label: 'BACKDROP PATTERN' },
    { key: 'lightchar', label: 'LIGHT QUALITY' },
    { key: 'shadow',    label: 'SHADOW' },
    { key: 'lens',      label: 'LENS' },
    { key: 'dof',       label: 'DEPTH OF FIELD' },
    { key: 'dist',      label: 'WORKING DISTANCE' },
    { key: 'style',     label: 'SHOT STYLE' },
    { key: 'finish',    label: 'PRODUCT FINISH' },
    { key: 'mood',      label: 'MOOD' },
    { key: 'props',     label: 'PROPS / STYLING' },
];

// First segment, lower-cased — drops a " / alt" tail and a " (parenthetical)".
// Mirrors matFirst / palFirst.
const prFirst = s => (s || '').split(' / ')[0].split(' (')[0].toLowerCase();
const prArticle = s => (/^[aeiou]/i.test((s || '').trim()) ? 'an ' : 'a ') + s.toLowerCase();

// ---------------------------------------------------------------------------
// buildProductShotHTML — five sections. Uses the shared sectionHTML /
// fieldHTML / rowHTML helpers (defined in materials.js).
// ---------------------------------------------------------------------------
function buildProductShotHTML(id) {
    // CATEGORY optgroup picker (carries data-flavor + the recommendation keys).
    let catOpts = `<option value="">--</option>`;
    DB.productCategories.forEach(group => {
        catOpts += `<optgroup label="${group.label}">`;
        group.items.forEach(e => {
            catOpts += `<option value="${e.name}" data-flavor="${e.flavor}">${e.name}</option>`;
        });
        catOpts += '</optgroup>';
    });

    let lightOpts = `<option value="">--</option>`;
    DB.productLightSetups.forEach(group => {
        lightOpts += `<optgroup label="${group.label}">`;
        group.items.forEach(e => {
            lightOpts += `<option value="${e.name}" data-flavor="${e.flavor}">${e.name}</option>`;
        });
        lightOpts += '</optgroup>';
    });

    let html = '';

    html += sectionHTML('PRODUCT');
    html += `<select id="pr_category_${id}" onchange="window.updateProductFlavor('${id}'); triggerUpdate();">${catOpts}</select>`;
    html += `<div id="pr_flav_${id}" style="font-size:0.6rem; color:#888; min-height:1.2em; margin:2px 0 3px;"></div>`;
    html += `<div id="pr_sugg_${id}" style="font-size:0.6rem; color:var(--accent); min-height:1.2em; margin:2px 0 4px; line-height:1.35;"></div>`;
    html += `<input type="text" class="obj-input" id="pr_name_${id}" placeholder="Custom product name (optional)" oninput="triggerUpdate()">`;
    html += fieldHTML('SIZE CLASS', `pr_size_${id}`, DB.productSizes);

    html += sectionHTML('SET');
    html += rowHTML(
        fieldHTML('SURFACE / TABLE', `pr_surface_${id}`, DB.productSurfaces),
        fieldHTML('BACKDROP', `pr_backdrop_${id}`, DB.productBackdrops)
    );
    html += fieldHTML('BACKDROP PATTERN', `pr_pattern_${id}`, DB.productPatterns);
    html += `<input type="text" class="obj-input" id="pr_bgcolor_${id}" placeholder="Custom backdrop color (e.g. dusty terracotta, #1b2a4a)" oninput="triggerUpdate()" style="margin-top:5px">`;

    html += sectionHTML('LIGHTING');
    html += `<div style="font-size:0.6rem; color:#666">SETUP</div>`;
    html += `<select id="pr_light_${id}" onchange="triggerUpdate()">${lightOpts}</select>`;
    html += rowHTML(
        fieldHTML('LIGHT QUALITY', `pr_lightchar_${id}`, DB.productLightChar),
        fieldHTML('SHADOW', `pr_shadow_${id}`, DB.productShadow)
    );

    html += sectionHTML('OPTICS');
    html += `<div style="font-size:0.6rem; color:#666; margin-bottom:3px">Ignored when a Camera node is connected.</div>`;
    html += rowHTML(
        fieldHTML('LENS', `pr_lens_${id}`, DB.productLens),
        fieldHTML('DEPTH OF FIELD', `pr_dof_${id}`, DB.productDof)
    );
    html += fieldHTML('WORKING DISTANCE', `pr_dist_${id}`, DB.productDistance);

    html += sectionHTML('SHOT');
    html += rowHTML(
        fieldHTML('SHOT STYLE', `pr_style_${id}`, DB.productShotStyles),
        fieldHTML('PRODUCT FINISH', `pr_finish_${id}`, DB.productFinish)
    );
    html += rowHTML(
        fieldHTML('MOOD', `pr_mood_${id}`, DB.productMood),
        fieldHTML('PROPS / STYLING', `pr_props_${id}`, DB.productProps)
    );
    html += `<textarea id="pr_note_${id}" rows="2" placeholder="Custom shot notes..." oninput="triggerUpdate()" style="width:100%; padding:4px; background:#111; color:#eee; border:1px solid #333; border-radius:4px; font-size:0.75rem; margin-top:5px; resize:none;"></textarea>`;

    return html;
}

// ---------------------------------------------------------------------------
// Reverse-lookups by name across all groups (mirror findColorPalette).
// ---------------------------------------------------------------------------
function findProductCategory(name) {
    if (!name) return null;
    for (const group of DB.productCategories) {
        const hit = group.items.find(e => e.name === name);
        if (hit) return hit;
    }
    return null;
}
function findProductLightSetup(name) {
    if (!name) return null;
    for (const group of DB.productLightSetups) {
        const hit = group.items.find(e => e.name === name);
        if (hit) return hit;
    }
    return null;
}

// Size-class label → recipe key. Accepts a raw DB.productSizes entry.
function prSizeKey(label) {
    const first = (label || '').split(' ')[0].toLowerCase();
    return ['miniature', 'small', 'medium', 'large', 'oversized'].includes(first) ? first : '';
}

// ---------------------------------------------------------------------------
// recommendFor — join the two research tables (surface→lighting, size→optics)
// into one 6-field recipe. `sizeOverride` is a raw DB.productSizes label; when
// present it wins over the category's implied size. Returns null if the
// category name is unknown.
// ---------------------------------------------------------------------------
function recommendFor(catName, sizeOverride) {
    const cat = findProductCategory(catName);
    if (!cat) return null;
    const light = DB.productLightRecipes[cat.surface] || null;
    const sizeKey = prSizeKey(sizeOverride) || cat.size;
    const optics = DB.productOpticsRecipes[sizeKey] || null;
    if (!light && !optics) return null;
    return {
        light:  light ? light.light : '',
        ground: light ? light.ground : '',
        shadow: light ? light.shadow : '',
        lens:   optics ? optics.lens : '',
        dof:    optics ? optics.dof : '',
        dist:   optics ? optics.dist : '',
    };
}

// ---------------------------------------------------------------------------
// updateProductFlavor — flavor line + one-line suggestion with an [Apply]
// button. Same data-flavor discipline as updateMatFlavor / updatePaletteFlavor
// (reads the option's own attribute, never re-derives from DB).
// ---------------------------------------------------------------------------
window.updateProductFlavor = function(id) {
    const sel = document.getElementById(`pr_category_${id}`);
    const flav = document.getElementById(`pr_flav_${id}`);
    const sugg = document.getElementById(`pr_sugg_${id}`);
    if (!sel) return;
    const opt = sel.options[sel.selectedIndex];
    const f = opt ? opt.getAttribute('data-flavor') : null;
    if (flav) flav.innerText = f ? '💡 ' + f : '';

    if (sugg) {
        const sizeEl = document.getElementById(`pr_size_${id}`);
        const rec = recommendFor(sel.value, sizeEl ? sizeEl.value : '');
        if (rec) {
            const chips = [rec.light, prFirst(rec.ground), prFirst(rec.shadow), prFirst(rec.lens), rec.dof.split(' ')[0]]
                .filter(Boolean).join(' · ');
            sugg.innerHTML = `Suggested: ${chips} `
                + `<button type="button" onclick="window.applyProductSetup('${id}')" `
                + `style="font-size:0.6rem; padding:1px 7px; margin-left:2px; background:#222; color:var(--accent); `
                + `border:1px solid var(--accent); border-radius:4px; cursor:pointer;">Apply</button>`;
        } else {
            sugg.innerHTML = '';
        }
    }
};

// ---------------------------------------------------------------------------
// applyProductSetup — write the 6 recommended values into their selects.
// Does nothing unless the user presses [Apply], so fields stay unassigned by
// default (the '' = "say nothing" contract).
// ---------------------------------------------------------------------------
window.applyProductSetup = function(id) {
    const catEl = document.getElementById(`pr_category_${id}`);
    const sizeEl = document.getElementById(`pr_size_${id}`);
    if (!catEl) return;
    const rec = recommendFor(catEl.value, sizeEl ? sizeEl.value : '');
    if (!rec) return;
    const put = (field, value) => {
        const el = document.getElementById(`pr_${field}_${id}`);
        if (el && value) el.value = value;
    };
    put('light', rec.light);
    put('surface', rec.ground);
    put('shadow', rec.shadow);
    put('lens', rec.lens);
    put('dof', rec.dof);
    put('dist', rec.dist);
    if (window.triggerUpdate) window.triggerUpdate();
};

// ---------------------------------------------------------------------------
// readProductShot — mirrors readColorPalette / readMaterial.
// ---------------------------------------------------------------------------
function readProductShot(id) {
    const v = {};
    PRODUCT_FIELDS.forEach(f => {
        const el = document.getElementById(`pr_${f.key}_${id}`);
        v[f.key] = el ? el.value : '';
    });
    const catEl = document.getElementById(`pr_category_${id}`);
    v.category = catEl ? catEl.value : '';
    const lightEl = document.getElementById(`pr_light_${id}`);
    v.light = lightEl ? lightEl.value : '';
    const nameEl = document.getElementById(`pr_name_${id}`);
    v.name = nameEl ? nameEl.value.trim() : '';
    const bgEl = document.getElementById(`pr_bgcolor_${id}`);
    v.bgcolor = bgEl ? bgEl.value.trim() : '';
    const noteEl = document.getElementById(`pr_note_${id}`);
    v.note = noteEl ? noteEl.value.trim() : '';
    return v;
}

// ---------------------------------------------------------------------------
// productShotPhrase — the subject/set/style clause. '' if nothing is chosen.
// ---------------------------------------------------------------------------
function productShotPhrase(v) {
    const label = v.name || v.category;
    if (!label) return '';
    const cat = findProductCategory(v.category);
    let phrase = 'a ' + (v.name ? v.name.toLowerCase() : (cat ? cat.flavor : v.category.toLowerCase()));

    const bits = [];
    if (v.surface) bits.push(`on ${prFirst(v.surface)}`);
    const bg = [v.bgcolor ? v.bgcolor.toLowerCase() : '', v.backdrop ? prFirst(v.backdrop) : '']
        .filter(Boolean).join(' ');
    if (bg) bits.push(`against a ${bg} background`);
    if (v.pattern && !/^none/i.test(v.pattern)) bits.push(`the backdrop carrying a ${prFirst(v.pattern)} pattern`);
    if (v.style) bits.push(`shot as ${prArticle(v.style)}`);
    if (v.finish && v.finish !== 'As-is / Natural') bits.push(prFirst(v.finish));
    if (v.mood) bits.push(`${prFirst(v.mood)} mood`);
    if (v.props && v.props !== 'None') bits.push(`styled with ${prFirst(v.props)}`);
    if (bits.length) phrase += ', ' + bits.join(', ');
    if (v.note) phrase += `, ${v.note}`;
    return phrase;
}

// ---------------------------------------------------------------------------
// productLightPhrase — the `lit` clause. '' unless a named setup is chosen.
// ---------------------------------------------------------------------------
function productLightPhrase(v) {
    const setup = findProductLightSetup(v.light);
    if (!setup) return '';
    let phrase = setup.flavor;
    const extra = [];
    if (v.lightchar) extra.push(`${prFirst(v.lightchar)} light`);
    if (v.shadow) extra.push(prFirst(v.shadow));
    if (extra.length) phrase += ', ' + extra.join(', ');
    return phrase;
}

// ---------------------------------------------------------------------------
// productOpticsPhrase — the `cam` clause, used ONLY when no Camera node is
// wired (the caller in promptEngine gates on !g.camera). '' if all empty.
// ---------------------------------------------------------------------------
function productOpticsPhrase(v) {
    if (!v.lens && !v.dof && !v.dist) return '';
    const stacked = /focus-stacked/i.test(v.dof || '');
    let s = '';
    if (v.lens) s = `shot on a ${prFirst(v.lens)} lens`;
    if (v.dof && !stacked) s += (s ? ' ' : 'shot ') + `at ${v.dof.split(' ')[0]}`;

    const tail = [];
    if (stacked) tail.push('focus-stacked for full-product sharpness');
    if (v.dist && !/^whatever/i.test(v.dist)) {
        tail.push(`from a ${v.dist.replace(/\s*\(.*\)/, '').trim().toLowerCase()} working distance`);
    }
    if (tail.length) s += (s ? ', ' : '') + tail.join(', ');
    return s;
}

// ---------------------------------------------------------------------------
// productShotTags — same shape as SUBJECTS[x].tags / materialTags.
// ---------------------------------------------------------------------------
function productShotTags(v) {
    if (!v.category && !v.name) return [];
    return [
        v.name || v.category,
        v.size,
        v.surface,
        v.backdrop,
        v.bgcolor ? v.bgcolor + ' backdrop' : '',
        (v.pattern && !/^none/i.test(v.pattern)) ? v.pattern + ' pattern' : '',
        v.light,
        v.lightchar,
        v.shadow,
        v.lens,
        v.dof,
        v.dist,
        v.style,
        (v.finish && v.finish !== 'As-is / Natural') ? v.finish : '',
        v.mood,
        (v.props && v.props !== 'None') ? v.props : '',
        v.note,
    ].filter(Boolean);
}
