// SOUND DESIGN MODULE
//
// A scene-wide audio layer — connected exactly like Color Grade/Color Palette
// (hasIn=false, straight into Stack), NOT a Material-style per-object wrapper.
// Category: GRADE (a "finish" layer over the whole shot, like Color Grade).
//
// Fills a gap that was already fully wired: buildComposition's `audio` clause
// (js/promptEngine.js) is consumed by Kling ("Soundtrack: ..."), Veo
// ("Audio: ..."), Sora ("Ambient sound: ...") and the JSON export — but until
// now the only things feeding it were a handful of SUBJECTS' own audio() hooks
// and two hardcoded heuristics (rain, chase footsteps). This node lets a user
// deliberately author score, tempo, instrumentation, ambience, and mix.
//
// Deliberately NOT wired into buildMidjourneyTags — Midjourney renders a still
// image, and Light nodes (equally real, equally "how it's produced") already
// contribute nothing to its tag list for the same reason: a purely audio
// concept has no place in a visual-tag list. The JSON export already carries
// the `audio` clause, which is where a purely audio concept belongs.
//
// This file contains ONLY logic — DB content (DB.sndGenre, DB.sndTempo, ...)
// lives in db.js.

const SOUND_FIELDS = [
    { key: 'genre',          label: 'GENRE / MOOD',    options: 'sndGenre',          half: true },
    { key: 'tempo',          label: 'TEMPO',           options: 'sndTempo',          half: true },
    { key: 'instrumentation', label: 'INSTRUMENTATION', options: 'sndInstrumentation', half: false },
    { key: 'ambient',        label: 'AMBIENT BED',     options: 'sndAmbient',        half: true },
    { key: 'sfx',            label: 'SFX ACCENT',      options: 'sndSfx',            half: true },
    { key: 'diegetic',       label: 'DIEGETIC BALANCE', options: 'sndDiegetic',       half: false },
    { key: 'mix',            label: 'MIX CHARACTER',   options: 'sndMix',            half: false },
];

// ---------------------------------------------------------------------------
// buildSoundDesignHTML — three sections (SCORE / ATMOSPHERE / MIX), same
// sectionHTML/fieldHTML/rowHTML helpers every hand-built module uses
// (defined in materials.js).
// ---------------------------------------------------------------------------
function buildSoundDesignHTML(id) {
    let html = '';

    html += sectionHTML('SCORE');
    html += rowHTML(
        fieldHTML('GENRE / MOOD', `snd_genre_${id}`, DB.sndGenre),
        fieldHTML('TEMPO', `snd_tempo_${id}`, DB.sndTempo)
    );
    html += fieldHTML('INSTRUMENTATION', `snd_instrumentation_${id}`, DB.sndInstrumentation);

    html += sectionHTML('ATMOSPHERE');
    html += rowHTML(
        fieldHTML('AMBIENT BED', `snd_ambient_${id}`, DB.sndAmbient),
        fieldHTML('SFX ACCENT', `snd_sfx_${id}`, DB.sndSfx)
    );
    html += fieldHTML('DIEGETIC BALANCE', `snd_diegetic_${id}`, DB.sndDiegetic);

    html += sectionHTML('MIX');
    html += fieldHTML('MIX CHARACTER', `snd_mix_${id}`, DB.sndMix);

    html += sectionHTML('NOTE');
    html += `<textarea id="snd_note_${id}" rows="2" placeholder="Custom sound notes..." oninput="triggerUpdate()" style="width:100%; padding:4px; background:#111; color:#eee; border:1px solid #333; border-radius:4px; font-size:0.75rem; resize:none;"></textarea>`;

    return html;
}

// ---------------------------------------------------------------------------
// readSoundDesign — mirrors readColorPalette's shape.
// ---------------------------------------------------------------------------
function readSoundDesign(id) {
    const v = {};
    SOUND_FIELDS.forEach(f => {
        const el = document.getElementById(`snd_${f.key}_${id}`);
        v[f.key] = el ? el.value : '';
    });
    const noteEl = document.getElementById(`snd_note_${id}`);
    v.note = noteEl ? noteEl.value.trim() : '';
    return v;
}

// First segment before " (" or " / ", lower-cased — mirrors matFirst/palFirst.
const sndFirst = s => (s || '').split(' (')[0].split(' / ')[0].toLowerCase();

// ---------------------------------------------------------------------------
// soundDesignPhrase — feeds the `audio` clause (promptEngine.js appends this
// with the same `audio += x + ', '` pattern every other audio contributor
// uses — no array refactor needed, `audio` was always a plain accumulator).
// '' if nothing is chosen (unassigned contract).
// ---------------------------------------------------------------------------
function soundDesignPhrase(v) {
    if (!v.genre) return '';

    // "Silence / No Score" makes tempo/instrumentation meaningless — a
    // dedicated branch instead of silently emitting a contradiction like
    // "a silence / no score score at a moderate tempo".
    if (v.genre === 'Silence / No Score') {
        const bits = ['complete silence, no score'];
        if (v.ambient) bits.push(`just ${sndFirst(v.ambient)} in the background`);
        if (v.sfx) bits.push(sndFirst(v.sfx));
        if (v.note) bits.push(v.note);
        return bits.join(', ');
    }

    let phrase = `a ${v.genre.toLowerCase()} score`;
    if (v.tempo) phrase += ` at a ${sndFirst(v.tempo)} tempo`;
    if (v.instrumentation) phrase += `, featuring ${v.instrumentation.toLowerCase()}`;
    if (v.ambient) phrase += `, ${sndFirst(v.ambient)} in the background`;
    if (v.sfx) phrase += `, ${sndFirst(v.sfx)} accents`;
    if (v.diegetic) phrase += `, ${sndFirst(v.diegetic)}`;
    if (v.mix) phrase += `, mixed ${sndFirst(v.mix)}`;
    if (v.note) phrase += `, ${v.note}`;
    return phrase;
}

// ---------------------------------------------------------------------------
// soundDesignTags — same shape as SUBJECTS[x].tags / materialTags. Kept for
// structured (JSON) export completeness even though it is deliberately never
// called from buildMidjourneyTags (see file header).
// ---------------------------------------------------------------------------
function soundDesignTags(v) {
    if (!v.genre) return [];
    return [
        v.genre, v.tempo, v.instrumentation, v.ambient,
        v.sfx, v.diegetic, v.mix, v.note,
    ].filter(Boolean);
}
