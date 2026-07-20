const SPATIAL_WORDS = {
    extreme_fg: "in the extreme foreground", foreground: "in the foreground", midground: "in the middle ground",
    background: "in the background", far_bg: "far in the background", horizon: "at the horizon",
    far_left: "at the far left edge", camera_left: "camera-left", center: "in the center",
    camera_right: "camera-right", far_right: "at the far right edge",
    ground: "at ground level", eye_level: "at eye level", above: "elevated above eye level",
    overhead: "directly overhead", below: "sunken below eye level"
};

// Any of the three axes may be unassigned; each simply drops out of the phrase.
// All three unassigned => no "positioned ..." clause at all.
function formatSpatial(id) {
    const d = document.getElementById(`depth_${id}`);
    const h = document.getElementById(`hpos_${id}`);
    const v = document.getElementById(`vpos_${id}`);
    if (!d || !h || !v) return "";
    return [d.value, h.value, v.value].map(x => SPATIAL_WORDS[x]).filter(Boolean).join(', ');
}

// Final grammar pass over the assembled prompt.
//
// Each builder appends its own clause without knowing what will follow it, so
// "a" vs "an" and punctuation seams can only be settled once the whole string
// exists. Runs on every platform's output as the last step.
const AN_EXCEPTIONS = /^(uni|use|user|eu|one)/i;   // "a university", "a one-off"
const A_EXCEPTIONS = /^(hour|honest|heir)/i;       // "an hour"

function polishPrompt(s) {
    if (!s) return s;
    return s
        .replace(/\b([Aa])\s+([A-Za-z]+)/g, (m, art, word) => {
            const vowel = /^[aeiou]/i.test(word)
                ? !AN_EXCEPTIONS.test(word)
                : A_EXCEPTIONS.test(word);
            if (!vowel) return `${art} ${word}`;
            return `${art === 'A' ? 'An' : 'an'} ${word}`;
        })
        .replace(/[ \t]+([,.])/g, '$1')   // " ," -> ","
        .replace(/\.\s*,/g, ',')          // "(blinds)., Shot" -> "(blinds), Shot"
        .replace(/,\s*\./g, '.')          // ", ." -> "."
        .replace(/\.{2,}/g, '.')          // ".." -> "."
        .replace(/,{2,}/g, ',')           // ",," -> ","
        .replace(/[ \t]{2,}/g, ' ')       // collapse runs of spaces, keep newlines
        .trim();
}

// DB stores ages as "Middle Age (41-60)"; prose wants a noun phrase that can
// follow an adjective ("an average middle-aged adult").
const AGE_PHRASES = {
    'Middle Age': 'middle-aged adult',
    'Elderly': 'elderly person',
    'Senior': 'senior',
};
function charAgePhrase(raw) {
    const base = (raw || '').replace(/\s*\(.*\)\s*$/, '');   // drop "(41-60)"
    return (AGE_PHRASES[base] || base).toLowerCase();
}

function pluralize(w) {
    if (/[^aeiou]y$/i.test(w)) return w.slice(0, -1) + 'ies';
    if (/(s|x|z|ch|sh)$/i.test(w)) return w + 'es';
    return w + 's';
}

function insectNoun(count, spec) {
    // count is lowercased; spec is the raw singular species
    if (count === 'single specimen') return `a single ${spec.toLowerCase()}`;
    if (count === 'a few') return `a few ${pluralize(spec).toLowerCase()}`;
    return `a ${count} of ${pluralize(spec).toLowerCase()}`; // cluster / swarm / massive infestation
}

function updateSequence(sid, nodes, cables) {
    const inputs = cables.filter(c => c.to === sid);
    const stacks = inputs.map(c => nodes[c.from]).filter(n => n && n.type === 'stack');
    stacks.sort((a,b) => parseFloat(a.el.style.left) - parseFloat(b.el.style.left));
    
    let seqText = "SCENE SEQUENCE:\\n\\n";
    stacks.forEach((s, idx) => {
        const prompt = document.getElementById(`val_${s.id}`).value;
        seqText += `SHOT ${idx + 1}:\\n${prompt}\\n\\n`;
    });
    
    const ta = document.getElementById(`val_${sid}`);
    if(ta) ta.value = seqText;
}

// ---------------------------------------------------------------------------
// PROMPT PIPELINE
//
//   collectInputs -> buildComposition -> platform adapter -> lint -> polish
//
// The composition step turns the node graph into eight neutral clauses. Adapters
// never touch the DOM: they only rearrange those clauses the way their target
// model likes to read them. That is what makes a new platform one entry below
// instead of another branch in a 300-line if/else.
// ---------------------------------------------------------------------------

const val = id => { const el = document.getElementById(id); return el ? el.value : ''; };
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const trimList = s => (s || '').replace(/,\s*$/, '');

function readMaterial(id) {
    const v = { id, type: val(`mat_type_${id}`) };
    ['substance', 'texture', 'finish', 'opacity', 'tint', 'condition', 'character', 'kinesthetic', 'energy', 'energy_int', 'synesthetic', 'note']
        .forEach(f => v[f] = val(`mat_${f}_${id}`));
    return v;
}

function formatMaterialPhrase(mat) {
    if (!mat || (!mat.type && !mat.substance && !mat.texture && !mat.finish && !mat.opacity && !mat.tint && !mat.condition && !mat.character && !mat.kinesthetic && !mat.energy && !mat.synesthetic && !mat.note)) return '';
    
    let base = mat.type || [mat.texture, mat.substance].filter(Boolean).join(' ').toLowerCase();
    if (!base) base = 'material';
    
    let parts = [];
    if (mat.condition) parts.push(mat.condition.toLowerCase());
    if (mat.finish) parts.push(mat.finish.toLowerCase());
    parts.push(base);
    parts.push('surface');
    
    let phrase = "with a " + parts.join(' ');
    
    if (mat.tint) phrase += `, tinted ${mat.tint.toLowerCase()}`;
    if (mat.kinesthetic) phrase += `, ${mat.kinesthetic.toLowerCase()}`;
    if (mat.energy && mat.energy !== 'None') phrase += `, emitting a ${mat.energy.toLowerCase()}`;
    if (mat.synesthetic) phrase += `, ${mat.synesthetic.toLowerCase()}`;
    if (mat.note) phrase += `, ${mat.note.trim()}`;
    
    return phrase.trim();
}

function collectInputs(sid, nodes, cables) {
    const inputs = cables.filter(c => c.to === sid);
    const g = {
        scene: null, style: null, chars: [], objects: [], lights: [], camera: null,
        render: null, shot: null, move: null, atmos: null, color: null, comp: null,
        neg: null, subjects: [], customLoc: null, positions: {}, materials: {},
    };
    // Position and Material nodes are a special case. They don't connect to the stack,
    // they connect to the subject they modify. We must scan ALL cables.
    cables.forEach(c => {
        if (nodes[c.from]?.type === 'position') {
            g.positions[c.to] = readPosition(c.from);
        }
        if (nodes[c.to]?.type === 'material') {
            g.materials[c.from] = readMaterial(c.to);
        }
    });
    inputs.forEach(c => {
        const n = nodes[c.from];
        if (!n) return;
        // Anything in the SUBJECTS registry is scene content.
        if (SUBJECTS[n.type]) { g.subjects.push(n); return; }
        switch (n.type) {
            case 'scene': g.scene = n; break;
            case 'style': g.style = n; break;
            case 'character': g.chars.push(n); break;
            case 'object': g.objects.push(n); break;
            case 'customloc': g.customLoc = n; break;
            case 'light': g.lights.push(n); break;
            case 'camera': g.camera = n; break;
            case 'render': g.render = n; break;
            case 'shot': g.shot = n; break;
            case 'cammove': g.move = n; break;
            case 'atmos': g.atmos = n; break;
            case 'colorg': g.color = n; break;
            case 'comp': g.comp = n; break;
            case 'neg': g.neg = n; break;
        }
    });
    return g;
}

// The graph as eight neutral clauses. No platform opinions live here.
function buildComposition(g) {
    let shot = '', subj = '', act = '', env = '', cam = '', lit = '', sty = '', audio = '';

    if (g.shot || g.move) {
        // An absent node still implies a default; a connected-but-unassigned one
        // means "don't mention it", so it drops out instead.
        const sType = g.shot ? val(`shot_type_${g.shot.id}`).split(' (')[0] : 'medium shot';
        const sMove = g.move ? val(`cam_move_${g.move.id}`) : 'static camera';
        shot = [sType, sMove].filter(Boolean).map(s => s.toLowerCase()).join(', ');
    }

    if (g.scene) {
        const id = g.scene.id;
        const loc = val(`scn_loc_${id}`), cust = val(`scn_cust_${id}`);
        const time = val(`scn_time_${id}`), wea = val(`scn_wea_${id}`), mood = val(`scn_mood_${id}`);
        const bits = [];
        if (loc) bits.push(`set in a ${loc.toLowerCase().replace('interior: ', '').replace('exterior: ', '')}`);
        if (cust) bits.push(`with ${cust}`);
        if (time) bits.push(`during ${time.split(' ')[0].toLowerCase()}`);
        if (wea && wea !== 'Clear') {
            bits.push(`under ${wea.toLowerCase()} weather`);
            if (wea.includes('Rain') || wea.includes('Storm')) audio += 'sound of heavy rain and distant thunder, ';
        }
        env = bits.join(' ');
        if (mood) lit += `The overall mood is ${mood.toLowerCase()}. `;
    }

    if (g.customLoc) {
        const id = g.customLoc.id;
        const lname = val(`loc_name_${id}`).trim();
        const arch = val(`loc_arch_${id}`), surf = val(`loc_surf_${id}`);
        const scale = val(`loc_scale_${id}`), feat = val(`loc_feat_${id}`).trim();
        const envNoun = {
            'Interior': 'interior space', 'Exterior': 'exterior environment',
            'Underground': 'underground space', 'Underwater': 'underwater environment',
            'Aerial / Sky': 'aerial vista', 'Outer Space': 'outer-space void',
            'Mixed Interior/Exterior': 'sprawling indoor-outdoor space',
        }[val(`loc_env_${id}`)] || 'environment';

        const adjs = [];
        if (scale) adjs.push(scale.split(' /')[0].toLowerCase());
        if (arch && arch !== 'Undefined') adjs.push(arch.split(' / ')[0].toLowerCase());
        const adjStr = adjs.length ? adjs.join(', ') + ' ' : '';

        // With no name, no descriptors and no environment kind, there is nothing
        // to say — emit nothing rather than a hollow "a environment".
        const core = lname ? lname.toLowerCase() : (val(`loc_env_${id}`) ? envNoun : '');
        if (core || adjStr) {
            let phrase = `a ${adjStr}${core || envNoun}`;
            if (surf && surf !== 'Undefined') phrase += ` with ${surf.toLowerCase()} ground`;
            if (feat) phrase += `, featuring ${feat}`;
            env = env ? `${env}, set within ${phrase}` : `set in ${phrase}`;
        } else if (feat) {
            env = env ? `${env}, featuring ${feat}` : `featuring ${feat}`;
        }
    }

    const sArr = [], aArr = [];
    g.chars.forEach(c => {
        const id = c.id;
        const cname = val(`chr_name_${id}`) || 'A person';
        // "Middle Age (41-60)" -> "middle-aged adult"; split(' ')[0] gave "middle".
        const age = charAgePhrase(val(`chr_age_${id}`));
        // "Athletic / Muscular" -> "athletic", but "Tall & Lanky" stays whole.
        const bld = val(`chr_bld_${id}`).split(' / ')[0].toLowerCase();
        const clo = val(`chr_clo_${id}`).toLowerCase();
        const emo = val(`chr_emo_${id}`).toLowerCase();
        const pos = val(`chr_pos_${id}`).toLowerCase();
        // wear / micro / gesture / gait were in the UI but never reached the
        // cinematic prompt — only Midjourney read them.
        const wear = val(`chr_wear_${id}`).toLowerCase();
        const micro = val(`chr_mic_${id}`).toLowerCase();
        const ges = val(`chr_ges_${id}`).toLowerCase();
        const gait = val(`chr_gait_${id}`).toLowerCase();
        const hair = val(`chr_hair_${id}`).toLowerCase();
        const beard = val(`chr_beard_${id}`).toLowerCase();
        const feat = val(`chr_feat_${id}`).toLowerCase();
        const prop = val(`chr_prop_${id}`).trim();
        const actEl = document.getElementById(`chr_act_${id}`);
        const a = actEl && actEl.value ? actEl.value.split(': ').pop().toLowerCase() : '';

        const bits = [cname];
        const build = [bld, age].filter(Boolean).join(' ');
        if (build) bits.push(`a ${build}`);
        if (hair) bits.push(`with ${hair}`);
        if (beard) bits.push(beard);
        if (feat) bits.push(feat);
        // Wear is an adjective on the clothing, not an afterthought:
        // "wearing immaculate casual streetwear", not "wearing streetwear, immaculate".
        if (clo) bits.push(`wearing ${wear ? wear + ' ' : ''}${clo}`);
        else if (wear) bits.push(`in ${wear} clothing`);
        if (prop) bits.push(`holding ${prop}`);
        const sp = formatSpatial(id);
        if (sp) bits.push(`positioned ${sp}`);
        const matPhrase = g.materials[id] ? formatMaterialPhrase(g.materials[id]) : '';
        if (matPhrase) bits.push(matPhrase);
        if (emo) bits.push(`showing expressions of ${emo}`);
        if (micro) bits.push(micro);
        sArr.push(bits.join(', '));

        if (a) {
            aArr.push(`${cname} is actively ${a}`);
            if (a.includes('argument') || a.includes('dialog')) audio += 'muffled speaking voices, ';
            if (a.includes('chase') || a.includes('running')) audio += 'heavy footsteps, fast breathing, ';
        } else if (pos) {
            aArr.push(`${cname} is ${pos}`);
        }
        // Gesture and gait were in the UI but never reached the prompt. Posture
        // stays the fallback above: pairing it with an explicit action reads as a
        // contradiction ("actively sneaking while standing straight").
        const body = [];
        if (ges) body.push(ges);
        if (gait && gait !== 'standing still') body.push(gait);
        if (body.length) aArr.push(`${cname} is ${body.join(', ')}`);
    });

    // Every registry subject contributes the same three things.
    g.subjects.forEach(sn => {
        const def = SUBJECTS[sn.type];
        const v = readSubject(sn.type, sn.id);
        let s = def.phrase(v, formatSpatial(sn.id));
        const matPhrase = g.materials[sn.id] ? formatMaterialPhrase(g.materials[sn.id]) : '';
        if (matPhrase) s += `, ${matPhrase}`;
        sArr.push(s);
        const a = def.action(v);
        if (a) aArr.push(a);
        (def.audio ? def.audio(v) : []).forEach(x => { audio += x + ', '; });
    });

    if (g.objects.length) {
        sArr.push(...g.objects.map(o => val(`val_${o.id}`)).filter(v => v && v.trim()));
    }
    if (sArr.length) { subj = sArr.join(' and '); act = aArr.join(' while '); }

    if (g.lights.length) {
        const lstr = g.lights.map(l => {
            const id = l.id;
            if (val(`mode_${id}`) === 'industrial') {
                const mod = val(`lit_mod_${id}`), gel = val(`lit_gel_${id}`), brand = val(`brand_${id}`);
                const fixture = [`${val(`watt_${id}`)}W`, brand].filter(Boolean).join(' ');
                let s = `illuminated by a ${fixture} studio light`;
                if (mod && mod !== 'Bare Bulb') s += ` with a ${mod.toLowerCase()}`;
                if (gel && gel !== 'None') s += ` using a ${gel.toLowerCase()} gel`;
                return s;
            }
            return `lit by natural sunlight at ${val(`time_${id}`)}:00`;
        }).filter(Boolean);
        if (lstr.length) lit += lstr.join(', ') + '. ';
    }

    if (g.atmos) {
        const fx = val(`atm_fx_${g.atmos.id}`);
        if (fx) env += `${env ? ', ' : ''}featuring ${fx.toLowerCase()} in the air`;
    }

    if (g.camera) {
        const id = g.camera.id;
        const body = val(`cam_${id}`), lens = val(`lens_${id}`), mm = val(`mm_in_${id}`);
        const fmt = val(`cam_fmt_${id}`), fps = val(`cam_fps_${id}`);
        const focus = val(`cam_focus_${id}`), angle = val(`cam_angle_${id}`);
        const camBits = [];
        if (body) camBits.push(`Shot on ${body}`);
        const glass = [lens, mm ? `${mm}mm` : ''].filter(Boolean).join(' ');
        if (glass) camBits.push(`with a ${glass} lens`);
        cam = camBits.join(' ');
        const extra = [];
        if (fmt) extra.push(`${fmt.toLowerCase()} camera`);
        if (fps) extra.push(fps.toLowerCase());
        if (focus) extra.push(focus.toLowerCase());
        if (angle) extra.push(angle.toLowerCase());
        if (extra.length) cam += `${cam ? ', ' : ''}${extra.join(', ')}`;
        const advAct = val(`cam_adv_act_${id}`) || 'none';
        const advTgt = val(`cam_adv_tgt_${id}`);
        const advDist = val(`cam_adv_dist_${id}`);
        if (advAct !== 'none' && advTgt) {
            const verbs = {
                follow: `following ${advTgt}`, orbit: `orbiting around ${advTgt}`,
                dolly_in: `dollying in towards ${advTgt}`, dolly_out: `dollying out from ${advTgt}`,
                rack_focus: `rack focusing onto ${advTgt}`,
            };
            let a = verbs[advAct] || '';
            if (advDist) a += `, maintaining a ${advDist}`;
            cam += `. The camera is ${a}`;
        }
    }

    if (g.style || g.color || g.comp) {
        const arr = [];
        if (g.style) {
            const id = g.style.id;
            const cin = val(`sty_cin_${id}`), dir = val(`sty_dir_${id}`), dp = val(`sty_dp_${id}`);
            const per = val(`sty_per_${id}`), art = val(`sty_art_${id}`);
            const tex = val(`sty_tex_${id}`), ref = val(`sty_ref_${id}`).trim();
            if (cin) arr.push(`${cin.toLowerCase()} style`);
            if (per) arr.push(`set in the ${per.toLowerCase()}`);
            if (art) arr.push(`${art.toLowerCase()} influence`);
            // Full name — split(' ')[0] turned "Roger Deakins" into "Roger".
            if (dir) arr.push(`directed by ${dir}`);
            if (dp) arr.push(`shot by ${dp}`);
            if (tex) arr.push(tex.toLowerCase());
            if (ref) arr.push(`in the vein of ${ref}`);
        }
        if (g.color) {
            const id = g.color.id;
            const lut = val(`col_lut_${id}`), stock = val(`col_stk_${id}`);
            const con = val(`col_con_${id}`), sat = val(`col_sat_${id}`);
            const grain = val(`col_grain_${id}`), halo = val(`col_halo_${id}`), vig = val(`col_vig_${id}`);
            if (lut) arr.push(`${lut} color grading`);
            if (stock) arr.push(`${stock} film stock`);
            if (con) arr.push(`${con.toLowerCase()} contrast`);
            if (sat) arr.push(`${sat.toLowerCase()} saturation`);
            if (grain) arr.push(`${grain.toLowerCase()} grain`);
            if (halo) arr.push(halo.toLowerCase());
            if (vig) arr.push(`${vig.toLowerCase()} vignette`);
        }
        if (g.comp) {
            const rule = val(`comp_rule_${g.comp.id}`);
            if (rule) arr.push(`${rule.toLowerCase()} composition`);
        }
        sty = arr.join(', ');
    }

    return { shot, subj, act, env, cam, lit, sty, audio };
}

function buildMidjourneyTags(c, g) {
    const tags = [];
    // `add` swallows unassigned fields so a skipped dropdown never becomes a
    // dangling tag like " mood" or "wearing ".
    const add = (v, fmt) => { if (v) tags.push(fmt ? fmt(v) : v); };

    if (g.scene) {
        const id = g.scene.id;
        add(val(`scn_loc_${id}`), v => v.replace('Interior: ', '').replace('Exterior: ', ''));
        add(val(`scn_cust_${id}`));
        add(val(`scn_time_${id}`), v => v.split(' ')[0]);
        add(val(`scn_wea_${id}`));
        add(val(`scn_mood_${id}`), v => v + ' mood');
    }
    g.chars.forEach(ch => {
        const id = ch.id;
        tags.push(val(`chr_name_${id}`) || 'person');
        add(val(`chr_age_${id}`), v => v.split(' ')[0]);
        add(val(`chr_bld_${id}`), v => v.split(' ')[0] + ' build');
        add(val(`chr_clo_${id}`), v => 'wearing ' + v);
        add(val(`chr_wear_${id}`));
        add(val(`chr_hair_${id}`));
        add(val(`chr_beard_${id}`));
        add(val(`chr_feat_${id}`));
        add(val(`chr_prop_${id}`), v => 'holding ' + v);
        add(val(`chr_emo_${id}`), v => v + ' expression');
        add(val(`chr_mic_${id}`));
        add(val(`chr_ges_${id}`));
        add(val(`chr_gait_${id}`));
        const actEl = document.getElementById(`chr_act_${id}`);
        if (actEl && actEl.value) tags.push(actEl.value.split(': ').pop());
        const mat = g.materials[id];
        if (mat) {
            add(mat.type); add(mat.finish); add(mat.tint, v => v + ' tint');
            add(mat.condition); add(mat.character);
            add(mat.energy && mat.energy !== 'None' ? mat.energy : '');
        }
    });
    if (g.customLoc) {
        const id = g.customLoc.id;
        const arch = val(`loc_arch_${id}`), surf = val(`loc_surf_${id}`);
        add(val(`loc_name_${id}`).trim());
        add(val(`loc_env_${id}`));
        if (arch && arch !== 'Undefined') tags.push(arch);
        if (surf && surf !== 'Undefined') tags.push(surf + ' ground');
        add(val(`loc_scale_${id}`), v => v.split(' /')[0] + ' scale');
        add(val(`loc_feat_${id}`).trim());
    }
    g.subjects.forEach(sn => {
        const def = SUBJECTS[sn.type];
        const v = readSubject(sn.type, sn.id);
        (def.tags ? def.tags(v) : []).forEach(t => tags.push(t));
        const mat = g.materials[sn.id];
        if (mat) {
            add(mat.type); add(mat.finish); add(mat.tint, v => v + ' tint');
            add(mat.condition); add(mat.character);
            add(mat.energy && mat.energy !== 'None' ? mat.energy : '');
        }
    });
    g.objects.forEach(o => add(val(`val_${o.id}`)));
    if (g.atmos) add(val(`atm_fx_${g.atmos.id}`));
    if (g.style) {
        const id = g.style.id;
        add(val(`sty_cin_${id}`));
        add(val(`sty_per_${id}`));
        add(val(`sty_art_${id}`));
        add(val(`sty_dir_${id}`), v => 'directed by ' + v);
        add(val(`sty_dp_${id}`), v => 'shot by ' + v);
        add(val(`sty_pal_${id}`), v => v + ' colors');
        add(val(`sty_tex_${id}`));
        add(val(`sty_ref_${id}`).trim());
    }
    if (g.color) {
        const id = g.color.id;
        add(val(`col_lut_${id}`), v => v + ' color grading');
        add(val(`col_stk_${id}`), v => v + ' film stock');
        add(val(`col_con_${id}`), v => v + ' contrast');
        add(val(`col_sat_${id}`), v => v + ' saturation');
        add(val(`col_grain_${id}`), v => v + ' grain');
        add(val(`col_halo_${id}`));
        add(val(`col_vig_${id}`), v => v + ' vignette');
    }
    if (g.comp) add(val(`comp_rule_${g.comp.id}`));
    if (g.shot) add(val(`shot_type_${g.shot.id}`));
    if (g.move) add(val(`cam_move_${g.move.id}`));
    if (g.camera) {
        const id = g.camera.id;
        add(val(`cam_${id}`), v => 'shot on ' + v);
        add(val(`lens_${id}`), v => v + ' lens');
        add(val(`mm_in_${id}`), v => v + 'mm');
        add(val(`cam_fmt_${id}`), v => v + ' format');
        add(val(`cam_ap_${id}`));
        add(val(`cam_iso_${id}`), v => 'ISO ' + v);
        add(val(`cam_fps_${id}`));
        add(val(`cam_focus_${id}`));
        add(val(`cam_angle_${id}`), v => v + ' angle');
        const fil = val(`cam_fil_${id}`);
        if (fil && fil !== 'None') tags.push(fil);
        const advAct = val(`cam_adv_act_${id}`) || 'none';
        const advTgt = val(`cam_adv_tgt_${id}`), advDist = val(`cam_adv_dist_${id}`);
        if (advAct !== 'none' && advTgt) {
            const verbs = {
                follow: `following ${advTgt}`, orbit: `orbiting around ${advTgt}`,
                dolly_in: `dollying in towards ${advTgt}`, dolly_out: `dollying out from ${advTgt}`,
                rack_focus: `rack focus to ${advTgt}`,
            };
            let a = verbs[advAct] || '';
            if (advDist) a += ` at ${advDist}`;
            tags.push('camera ' + a);
        }
    }
    if (g.render) {
        const id = g.render.id;
        tags.push(val(`eng_${id}`));
        tags.push(val(`res_${id}`));
        const ratioMap = { '16:9': '--ar 16:9', '1:1': '--ar 1:1', '9:16': '--ar 9:16', '4:3': '--ar 4:3', '2.39:1': '--ar 239:100' };
        tags.push('--v 6.0 ' + (ratioMap[val(`rat_${id}`)] || '--ar 16:9'));
    }
    if (g.neg) {
        const nval = val(`neg_val_${g.neg.id}`);
        if (nval) tags.push('--no ' + nval.split(',').map(s => s.trim()).join(', '));
    }
    return tags.filter(t => t && String(t).trim() !== '');
}

// ---------------------------------------------------------------------------
// PLATFORM ADAPTERS — one entry per target model.
// `build` receives the neutral clauses (c) and the raw graph (g), and returns
// the lines to join. Adding a platform means adding an entry here; nothing else.
// ---------------------------------------------------------------------------
const PLATFORMS = {
    runway: {
        label: '🎬 Runway Gen-3/4 (Cinematic)', limit: 1000,
        // Classic structural prompting: Shot > Subject > Action > Environment > Style.
        build: c => [[c.shot, c.subj, c.act, c.env, c.lit.trim(), c.cam, c.sty]
            .filter(Boolean).join(', ') + '.'],
    },
    kling: {
        label: '🐉 Kling (High Motion / Audio)', limit: 2000,
        // Kling weights the opening clause heavily, so subject+action lead.
        build: c => {
            const out = [];
            const lead = [c.subj, c.act].filter(Boolean).join(' ');
            if (lead) out.push(lead + '.');
            if (c.env) out.push(`The setting is ${c.env.replace('set in a', 'a')}.`);
            if (c.shot || c.cam) out.push([c.shot || 'Cinematic shot', c.cam].filter(Boolean).join('. ') + '.');
            if (c.audio) out.push(`Soundtrack: ${trimList(c.audio)}.`);
            return out;
        },
    },
    veo: {
        label: '🎥 Google Veo (Realism)', limit: 1000,
        // Veo grounds itself in the environment first, and takes an audio track.
        build: c => {
            const out = [];
            if (c.env) out.push(cap(c.env) + '.');
            if (c.subj) out.push(c.subj + '.');
            if (c.act) out.push(c.act + '.');
            if (c.shot || c.cam) out.push([c.shot || 'Cinematic shot', c.cam].filter(Boolean).join('. ') + '.');
            if (c.lit) out.push(c.lit);
            if (c.audio) out.push(`Audio: ${trimList(c.audio)}.`);
            return out;
        },
    },
    luma: {
        label: '✨ Luma Dream Machine (Dynamic)', limit: 1000,
        // Luma responds to motion words and superlatives more than to specs.
        build: c => {
            const out = [];
            let s = `Dynamic ${c.shot || 'cinematic sequence'} of `;
            if (c.subj) s += c.subj;
            if (c.act) s += ` ${c.act}`;
            out.push(s + '.');
            if (c.env) out.push(`Environment is ${c.env.replace('set in a', 'a')}.`);
            if (c.sty) out.push(`Visuals are breathtaking, ${c.sty}.`);
            return out;
        },
    },
    sora: {
        label: '🌀 Sora (Descriptive)', limit: 2000,
        // Sora reads one continuous, richly described passage and wants the
        // camera language stated outright rather than implied.
        build: c => {
            const out = [];
            // Not "<shot> of <subject>": the shot clause already carries the
            // camera move, so "of" would attach to "static camera".
            out.push(cap(c.shot || 'cinematic shot') + '.');
            if (c.subj) out.push(`The frame holds ${c.subj}.`);
            if (c.act) out.push(cap(c.act) + '.');
            if (c.env) out.push(cap(c.env.replace(/^set in /, 'the scene is set in ')) + '.');
            if (c.lit) out.push(c.lit.trim());
            if (c.cam) out.push(c.cam + '.');
            if (c.sty) out.push(`Rendered in ${c.sty}.`);
            if (c.audio) out.push(`Ambient sound: ${trimList(c.audio)}.`);
            return out;
        },
    },
    pika: {
        label: '⚡ Pika (Short / Motion)', limit: 350,
        // Pika degrades on long prompts: subject, motion, look — nothing else.
        // Lighting, camera bodies and audio are deliberately dropped.
        build: c => {
            const bits = [c.subj, c.act, c.shot, c.sty].filter(Boolean);
            return bits.length ? [bits.join(', ') + '.'] : [];
        },
    },
    hailuo: {
        label: '🎞 Hailuo / MiniMax', limit: 1500,
        // MiniMax treats [bracketed] text as camera instruction, so the camera
        // work goes in brackets instead of prose.
        build: c => {
            const out = [];
            const lead = [c.subj, c.act].filter(Boolean).join(', ');
            if (lead) out.push(lead + '.');
            if (c.env) out.push(cap(c.env) + '.');
            if (c.shot) out.push(`[${c.shot}]`);
            if (c.cam) out.push(`[${c.cam}]`);
            if (c.sty) out.push(c.sty + '.');
            return out;
        },
    },
    generic: {
        label: '📄 Generic (Plain text)', limit: 0,
        // A labelled block: for a model not modelled here, or for pasting into
        // a treatment/doc. Newlines survive polishPrompt.
        build: c => {
            const rows = [
                ['SHOT', c.shot], ['SUBJECT', c.subj], ['ACTION', c.act],
                ['ENVIRONMENT', c.env], ['LIGHTING', c.lit.trim()],
                ['CAMERA', c.cam], ['STYLE', c.sty], ['AUDIO', trimList(c.audio)],
            ].filter(r => r[1]);
            return rows.length ? [rows.map(r => `${r[0]}: ${r[1]}`).join('\n')] : [];
        },
    },
    midjourney: {
        label: '🚀 Midjourney (Tags)', limit: 6000, mode: 'tags',
        empty: 'Connect nodes to generate Midjourney tags.',
        build: (c, g) => {
            const tags = buildMidjourneyTags(c, g);
            return tags.length ? [tags.join(', ')] : [];
        },
    },
};
const PLATFORM_IDS = Object.keys(PLATFORMS);
const EMPTY_PROSE = 'Connect Scene, Style, or Character nodes to generate a cinematic prompt.';

// ---------------------------------------------------------------------------
// LINT — combinations that will fight each other inside the model. Advisory
// only: the graph is never blocked, the stack just shows a warning.
// ---------------------------------------------------------------------------
function lintScene(g) {
    const w = [];
    const time = g.scene ? val(`scn_time_${g.scene.id}`) : '';
    const wea = g.scene ? val(`scn_wea_${g.scene.id}`) : '';
    const loc = g.scene ? val(`scn_loc_${g.scene.id}`) : '';
    const env = g.customLoc ? val(`loc_env_${g.customLoc.id}`) : '';
    const atmos = g.atmos ? val(`atm_fx_${g.atmos.id}`) : '';
    const pal = g.style ? val(`sty_pal_${g.style.id}`) : '';
    const lut = g.color ? val(`col_lut_${g.color.id}`) : '';
    const shotType = g.shot ? val(`shot_type_${g.shot.id}`) : '';

    const isNight = time.includes('Night');
    const daylitSun = g.lights.some(l =>
        val(`mode_${l.id}`) === 'sunlight' && +val(`time_${l.id}`) > 6 && +val(`time_${l.id}`) < 19);
    if (isNight && daylitSun) w.push('Scene is night but a sun light is set to a daytime hour');

    if (wea === 'Clear' && /Rain|Snow|Fog/.test(atmos)) {
        w.push(`Weather is "Clear" but atmosphere is "${atmos}"`);
    }
    if (loc.startsWith('Interior:') && /Rain|Snow|Storm|Blizzard/.test(wea)) {
        w.push(`Interior location but weather is "${wea}" — precipitation indoors`);
    }
    if (env === 'Underwater' && /Dust|Smoke|Fog|Rain/.test(atmos)) {
        w.push(`Underwater environment but atmosphere is "${atmos}"`);
    }
    if (env === 'Underwater' && g.subjects.some(s => /fire|ember|explosion/i.test(val(`vfx_spec_${s.id}`) || ''))) {
        w.push('Fire/explosion effect in an underwater environment');
    }
    // A B&W look and a colour LUT cancel each other out.
    if (/B&W/.test(pal) && lut && !/Desaturated|High Contrast|Bleach/.test(lut)) {
        w.push(`Black-and-white palette but "${lut}" colour grade`);
    }
    // A macro subject inside a wide frame cannot both be true.
    if (/Extreme Wide|Wide Shot/.test(shotType) &&
        g.subjects.some(s => /Macro/.test(val(`ins_scale_${s.id}`) || ''))) {
        w.push('Wide shot but macro insect scale');
    }
    if (g.subjects.length + g.chars.length + g.objects.length === 0 && !g.scene && !g.customLoc) {
        // Nothing to say — not a contradiction, so no warning.
    }
    return w;
}

// ---------------------------------------------------------------------------
// VARIANTS — same graph, three intensities. Rather than reroll wording randomly
// (which would give a different answer every click), each variant applies a
// fixed lexical transform, so A/B/C are reproducible and comparable.
// ---------------------------------------------------------------------------
const VARIANT_SUBS = {
    B: [   // dialled up
        [/\bwalking\b/g, 'striding'], [/\bstanding\b/g, 'planted'],
        [/\blarge\b/g, 'immense'], [/\bsmall\b/g, 'diminutive'],
        [/\bdark\b/g, 'pitch-black'], [/\bbright\b/g, 'blazing'],
        [/\bfog\b/g, 'thick fog'], [/\brain\b/g, 'driving rain'],
        [/\bcinematic\b/g, 'intensely cinematic'],
    ],
    C: [   // pared back
        [/\bintensely\s+/g, ''], [/\bbreathtaking,\s*/g, ''],
        [/\bDynamic\s+/g, ''], [/,\s*shot in extreme macro detail/g, ''],
        [/\s*The camera is [^.]+\./g, '.'],
        [/\bshowing expressions of\b/g, 'expressing'],
    ],
};

function buildVariants(sid) {
    const base = val(`val_${sid}`);
    if (!base || base.startsWith('Connect')) return [];
    const apply = subs => polishPrompt(subs.reduce((s, [re, to]) => s.replace(re, to), base));
    return [
        { key: 'A', note: 'base', text: base },
        { key: 'B', note: 'intensified', text: apply(VARIANT_SUBS.B) },
        { key: 'C', note: 'pared back', text: apply(VARIANT_SUBS.C) },
    ];
}

// Structured form of the prompt — what Faz 6 will POST to a generator API.
function buildStructured(sid, nodes, cables) {
    const g = collectInputs(sid, nodes, cables);
    const c = buildComposition(g);
    const pid = val(`stack_plat_${sid}`) || 'runway';
    const def = PLATFORMS[pid] || PLATFORMS.runway;
    const parts = def.build(c, g);
    const negative = g.neg ? val(`neg_val_${g.neg.id}`) : '';
    return {
        version: 1,
        platform: pid,
        prompt: parts.length ? polishPrompt(parts.join(def.mode === 'tags' ? '' : ' ')) : '',
        negative,
        composition: c,
        aspect: g.render ? val(`rat_${g.render.id}`) : null,
        resolution: g.render ? val(`res_${g.render.id}`) : null,
        engine: g.render ? val(`eng_${g.render.id}`) : null,
        warnings: lintScene(g),
    };
}

function updateStack(sid, nodes, cables) {
    const pid = val(`stack_plat_${sid}`) || 'runway';
    const def = PLATFORMS[pid] || PLATFORMS.runway;
    const g = collectInputs(sid, nodes, cables);
    const c = buildComposition(g);

    let prompt;
    const isTags = def.mode === 'tags';
    if (!isTags && !c.subj && !c.env) {
        prompt = EMPTY_PROSE;
    } else {
        const parts = def.build(c, g);
        prompt = parts.length ? parts.join(' ') : (def.empty || EMPTY_PROSE);
    }

    if (g.neg && !isTags) {
        const nval = val(`neg_val_${g.neg.id}`);
        if (nval) prompt += `\n\nNEGATIVE PROMPT: ${nval}`;
    }

    prompt = polishPrompt(prompt);
    const ta = document.getElementById(`val_${sid}`);
    if (ta) ta.value = prompt;

    renderStackMeta(sid, prompt, def, lintScene(g));
}

// Character budget + lint warnings, shown under the stack's textarea.
function renderStackMeta(sid, prompt, def, warnings) {
    const meta = document.getElementById(`stack_meta_${sid}`);
    if (!meta) return;
    const isPlaceholder = prompt.startsWith('Connect');
    const len = isPlaceholder ? 0 : prompt.length;
    const over = def.limit > 0 && len > def.limit;
    const near = def.limit > 0 && !over && len > def.limit * 0.85;
    const color = over ? '#ff5555' : near ? '#ffcc55' : '#666';
    const budget = def.limit > 0 ? `${len} / ${def.limit}` : `${len} chars`;

    meta.innerHTML =
        `<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.6rem; color:${color}; font-family:'JetBrains Mono',monospace;">
            <span>${budget}${over ? ' — over limit' : ''}</span>
        </div>`
        + warnings.map(x =>
            `<div style="font-size:0.6rem; color:#ffcc55; background:rgba(255,204,85,0.08);
                border-left:2px solid #ffcc55; padding:3px 6px; margin-top:3px; border-radius:0 3px 3px 0;">
                ⚠ ${x}</div>`).join('');
}


function addToHistory(promptText) {
    if(!promptText || promptText.trim() === '' || promptText.startsWith('Connect')) return;
    let hist = JSON.parse(localStorage.getItem('prompt_history') || '[]');
    if(hist[0] === promptText) return; 
    hist.unshift(promptText);
    if(hist.length > 50) hist.pop();
    localStorage.setItem('prompt_history', JSON.stringify(hist));
}

function openHistory() {
    const modal = document.getElementById('history-modal');
    const cont = document.getElementById('history-content');
    modal.style.display = 'block';
    let hist = JSON.parse(localStorage.getItem('prompt_history') || '[]');
    cont.innerHTML = hist.length === 0 ? '<div style="color:#666">No history found.</div>' : '';
    hist.forEach((p, i) => {
        cont.innerHTML += `
            <div style="background:#111; border:1px solid #333; padding:10px; border-radius:4px; position:relative;">
                <textarea readonly style="width:100%; background:transparent; color:#eee; border:none; resize:none; font-size:0.8rem; height:60px;">${p}</textarea>
                <button onclick="navigator.clipboard.writeText(this.previousElementSibling.value).then(()=>window.showToast('Copied!'))" style="position:absolute; top:5px; right:5px; background:#333; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.7rem;">Copy</button>
            </div>
        `;
    });
}

function clearHistory() {
    localStorage.removeItem('prompt_history');
    openHistory();
}

function exportHistory() {
    let hist = JSON.parse(localStorage.getItem('prompt_history') || '[]');
    if(hist.length === 0) { window.showToast("No history to export."); return; }
    const text = hist.join('\\n\\n--------------------------------\\n\\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ScenePrompter_History.txt';
    a.click();
    window.showToast("Exported as .txt!");
}

function sendToAPI(id) {
    const ta = document.getElementById(`val_${id}`);
    if (!ta || ta.value.trim() === "" || ta.value.startsWith("Connect")) {
        window.showToast("No valid prompt to generate!");
        return;
    }
    
    addToHistory(ta.value);

    let modal = document.getElementById('api-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'api-modal';
        modal.style.cssText = "position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:400px; background:#1a1a1a; border:1px solid #444; border-radius:8px; z-index:4000; padding:20px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); text-align:center;";
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'block';
    modal.innerHTML = `
        <h3 style="margin-top:0; color:var(--accent)">🚀 Sending to Generator API...</h3>
        <p style="color:#aaa; font-size:0.8rem; text-align:left; background:#111; padding:10px; border-radius:4px; margin-bottom:15px; height:80px; overflow-y:auto;">${ta.value}</p>
        <div style="width:100%; background:#333; height:4px; border-radius:2px; overflow:hidden; position:relative; margin-bottom:15px;">
            <div id="api-progress" style="width:0%; height:100%; background:var(--accent); transition: width 2s linear;"></div>
        </div>
        <p id="api-status" style="color:#eee; font-size:0.9rem;">Connecting to server...</p>
    `;

    setTimeout(() => { document.getElementById('api-progress').style.width = '100%'; }, 50);
    setTimeout(() => { document.getElementById('api-status').innerText = 'Generating Video/Image (Simulation)...'; }, 1000);
    setTimeout(() => {
        modal.innerHTML = `
            <h3 style="margin-top:0; color:#55ff55">✅ Generation Complete!</h3>
            <p style="color:#aaa; font-size:0.8rem;">(This is a mock response. In production, the media would appear here.)</p>
            <button onclick="document.getElementById('api-modal').style.display='none'" style="background:var(--accent); color:#000; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:bold; width:100%;">Close</button>
        `;
        window.showToast("Mock Generation Successful!");
    }, 2500);
}
