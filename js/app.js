// Standard script mode, DB and promptEngine are loaded globally.

window.nodeIdCounter = 0;
window.nodes = {};
window.cables = [];
window.undoStack = [];
window.redoStack = [];
window.selectedNodes = new Set();
window.selectMode = false;
window.selectedCable = null;
const MAX_HISTORY = 50;
let isRestoring = false;

const viewport = document.getElementById('viewport');
const world = document.getElementById('world');
const svgLayer = document.getElementById('svg-layer');

let worldState = { x: 0, y: 0, zoom: 1 };
let isPanning = false;
let panStart = { x: 0, y: 0 };
let activePointers = [];
let initialDist = 0;
let spaceDown = false;

window.threePreviews = {};

// INFINITE VIEWPORT POINTER EVENTS
viewport.addEventListener('pointerdown', (e) => {
    if(!spaceDown && (e.target.closest('.node-content') || e.target.closest('.top-bar'))) return;
    if(spaceDown || e.target === viewport || e.target.classList.contains('grid-layer')) {
        if(window.clearCableSelection) window.clearCableSelection();
        if(window.armedSocket) window.disarmSocket();
        activePointers.push(e);
        if (activePointers.length === 1) {
            isPanning = true; 
            panStart = { x: e.clientX - worldState.x, y: e.clientY - worldState.y };
        } else if (activePointers.length === 2) {
            isPanning = false;
            initialDist = Math.hypot(activePointers[0].clientX - activePointers[1].clientX, activePointers[0].clientY - activePointers[1].clientY);
        }
        viewport.setPointerCapture(e.pointerId);
    }
});

viewport.addEventListener('pointermove', (e) => {
    const index = activePointers.findIndex(p => p.pointerId === e.pointerId);
    if (index !== -1) activePointers[index] = e;

    if(isPanning && activePointers.length === 1) {
        worldState.x = e.clientX - panStart.x;
        worldState.y = e.clientY - panStart.y;
        updateWorld();
    } 
    else if (activePointers.length === 2) {
        const currentDist = Math.hypot(activePointers[0].clientX - activePointers[1].clientX, activePointers[0].clientY - activePointers[1].clientY);
        if (initialDist > 0) {
            const delta = currentDist / initialDist;
            initialDist = currentDist;
            const midX = (activePointers[0].clientX + activePointers[1].clientX) / 2;
            const midY = (activePointers[0].clientY + activePointers[1].clientY) / 2;
            const newZoom = Math.min(Math.max(0.1, worldState.zoom * (delta > 1 ? 1.05 : 0.95)), 4);
            worldState.x = midX - (midX - worldState.x) * (newZoom / worldState.zoom);
            worldState.y = midY - (midY - worldState.y) * (newZoom / worldState.zoom);
            worldState.zoom = newZoom;
            updateWorld();
        }
    }
});

const handlePointerUp = (e) => {
    activePointers = activePointers.filter(p => p.pointerId !== e.pointerId);
    if (activePointers.length < 2) initialDist = 0;
    if (activePointers.length === 0) isPanning = false;
};
viewport.addEventListener('pointerup', handlePointerUp);
viewport.addEventListener('pointercancel', handlePointerUp);

viewport.addEventListener('wheel', (e) => {
    if(e.target.closest('.node-content')) return;
    e.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(0.1, worldState.zoom * delta), 5);
    worldState.x = mouseX - (mouseX - worldState.x) * (newZoom / worldState.zoom);
    worldState.y = mouseY - (mouseY - worldState.y) * (newZoom / worldState.zoom);
    worldState.zoom = newZoom;
    updateWorld();
}, {passive:false});

window.updateWorld = function() { 
    world.style.transform = `translate(${worldState.x}px, ${worldState.y}px) scale(${worldState.zoom})`; 
    window.updateMinimap();
}

window.updateMinimap = function() {
    const mm = document.getElementById('minimap');
    if(!mm) return;
    mm.querySelectorAll('.mini-node').forEach(n => n.remove());
    const scale = 0.02;
    for(let id in window.nodes) {
        const n = window.nodes[id];
        const x = parseFloat(n.el.style.left) * scale;
        const y = parseFloat(n.el.style.top) * scale;
        const dot = document.createElement('div');
        dot.className = 'mini-node';
        dot.style.left = (x + 75) + 'px';
        dot.style.top = (y + 50) + 'px';
        if(n.type === 'stack') dot.style.background = '#fff';
        if(n.type === 'sequence') dot.style.background = '#ff5555';
        mm.appendChild(dot);
    }
    const vp = document.getElementById('mini-vp');
    vp.style.width = (window.innerWidth * scale / worldState.zoom) + 'px';
    vp.style.height = (window.innerHeight * scale / worldState.zoom) + 'px';
    vp.style.left = (75 - worldState.x * scale) + 'px';
    vp.style.top = (50 - worldState.y * scale) + 'px';
}

// ---------------------------------------------------------------------------
// FIELDS
//
// Every dropdown carries an "unassigned" choice. An unassigned field is not a
// blank value in the prompt — it is left out of the sentence entirely, so a
// module can be as specific or as loose as the shot needs. The prompt engine
// treats '' as "say nothing about this".
//
// Existing fields keep their old default so saved workspaces read the same;
// fields added later default to unassigned, making new detail opt-in.
// ---------------------------------------------------------------------------
const UNSET_LABEL = '— unassigned';

// ---------------------------------------------------------------------------
// CATEGORIES
//
// Six stages of getting a shot made. Every node belongs to exactly one; the
// category drives the nav button colour, the node's header rail, its output
// socket and the quick-add palette. One table, so a button and the node it
// creates can never disagree about what colour they are.
// ---------------------------------------------------------------------------
const CATEGORIES = {
    source:  { label: 'SOURCE',  types: ['scene', 'customloc', 'style', 'render'] },
    subject: { label: 'SUBJECT', types: ['character', 'object'] },   // + registry subjects
    light:   { label: 'LIGHT',   types: ['light', 'atmos'] },
    camera:  { label: 'CAMERA',  types: ['camera', 'shot', 'cammove', 'position'] },
    grade:   { label: 'GRADE',   types: ['colorg', 'comp', 'preview'] },
    output:  { label: 'OUTPUT',  types: ['stack', 'sequence', 'neg'] },
};

function categoryOf(type) {
    if (typeof SUBJECTS !== 'undefined' && SUBJECTS[type]) return 'subject';
    for (const key in CATEGORIES) if (CATEGORIES[key].types.includes(type)) return key;
    return 'source';
}

function optionsHTML(list, def) {
    return `<option value="">${UNSET_LABEL}</option>`
        + list.map(o => `<option ${o === def ? 'selected' : ''}>${o}</option>`).join('');
}

// `def` omitted => the field starts unassigned.
function selHTML(id, list, def) {
    return `<select id="${id}" onchange="triggerUpdate()">${optionsHTML(list, def)}</select>`;
}

// A labelled field, optionally half-width for side-by-side rows.
function fieldHTML(label, id, list, def) {
    return `<div style="font-size:0.6rem; color:#666; margin-top:5px">${label}</div>${selHTML(id, list, def)}`;
}

function rowHTML(a, b) {
    return `<div style="display:flex; gap:5px; margin-top:5px">
        <div style="flex:1">${a}</div><div style="flex:1">${b}</div></div>`;
}

// Groups related fields inside a node that has grown past a handful of them.
function sectionHTML(label) {
    return `<div style="display:flex; align-items:center; gap:8px; margin:12px 0 2px;">
        <span style="font-size:0.55rem; letter-spacing:0.12em; color:#555; white-space:nowrap;">${label}</span>
        <span style="flex:1; height:1px; background:#2a2a2a;"></span>
    </div>`;
}

function getSpatialContextHTML(id) {
    const axis = (label, kind, opts, def) => `
            <div style="font-size:0.6rem; color:#666">${label}</div>
            <select id="${kind}_${id}" onchange="triggerUpdate()">
                <option value="">${UNSET_LABEL}</option>
                ${opts.map(([v, t]) => `<option value="${v}" ${v === def ? 'selected' : ''}>${t}</option>`).join('')}
            </select>`;
    return `
    <details class="spatial-panel">
        <summary>\u{1F4CD} SPATIAL CONTEXT</summary>
        <div class="spatial-grid">
            ${axis('DEPTH', 'depth', [
                ['extreme_fg', 'Extreme Foreground'], ['foreground', 'Foreground'],
                ['midground', 'Midground'], ['background', 'Background'],
                ['far_bg', 'Far Background'], ['horizon', 'Horizon'],
            ], 'foreground')}
            ${axis('HORIZONTAL', 'hpos', [
                ['far_left', 'Far Left'], ['camera_left', 'Camera-Left'],
                ['center', 'Center'], ['camera_right', 'Camera-Right'],
                ['far_right', 'Far Right'],
            ], 'center')}
            ${axis('VERTICAL', 'vpos', [
                ['ground', 'Ground Level'], ['eye_level', 'Eye Level'],
                ['above', 'Above'], ['overhead', 'Overhead'], ['below', 'Below (Sunken)'],
            ], 'eye_level')}
        </div>
    </details>`;
}

window.createNode = function(type) {
    captureState();   // snapshot the canvas as it was, before this node exists
    window.nodeIdCounter++;
    const id = 'node_' + window.nodeIdCounter;
    const cx = (-worldState.x + window.innerWidth/2)/worldState.zoom - 130;
    const cy = (-worldState.y + window.innerHeight/2)/worldState.zoom - 100;

    const el = document.createElement('div');
    el.className = `node node-${type}`;
    el.id = id;
    el.style.left = cx + 'px'; el.style.top = cy + 'px';

    let title = type.toUpperCase();
    let content = "";
    let hasIn = false; let hasOut = true;

    if (type === 'scene') {
        title = "SCENE"; hasIn = false; hasOut = true;
        content = `
            <div style="font-size:0.6rem; color:#666">LOCATION</div>
            ${selHTML(`scn_loc_${id}`, DB.sceneLoc, DB.sceneLoc[0])}
            <input type="text" class="obj-input" id="scn_cust_${id}" placeholder="Custom details (e.g. broken glass)" oninput="triggerUpdate()" style="margin-top:5px">
            
            <div style="font-size:0.6rem; color:#666; margin-top:5px">TIME OF DAY</div>
            ${selHTML(`scn_time_${id}`, DB.sceneTime, DB.sceneTime[0])}
            
            <div style="display:flex; gap:5px; margin-top:5px">
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">WEATHER</div>${selHTML(`scn_wea_${id}`, DB.sceneWeather, DB.sceneWeather[0])}</div>
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">MOOD</div>${selHTML(`scn_mood_${id}`, DB.sceneMood, DB.sceneMood[0])}</div>
            </div>
            
            <div style="font-size:0.6rem; color:#666; margin-top:5px">DENSITY (1-10)</div>
            <input type="range" id="scn_den_${id}" min="1" max="10" value="3" oninput="triggerUpdate()">
        `;
    }
    else if (type === 'style') {
        title = "STYLE"; hasIn = false; hasOut = true;
        content = `
            ${fieldHTML('CINEMATIC STYLE', `sty_cin_${id}`, DB.styleCinematic, DB.styleCinematic[0])}
            ${rowHTML(
                fieldHTML('PERIOD', `sty_per_${id}`, DB.stylePeriod, DB.stylePeriod[0]),
                fieldHTML('ART MOVEMENT', `sty_art_${id}`, DB.styleArt, DB.styleArt[0])
            )}
            ${sectionHTML('AUTHORSHIP')}
            ${fieldHTML('DIRECTOR REF', `sty_dir_${id}`, DB.styleDirector, DB.styleDirector[0])}
            ${fieldHTML('CINEMATOGRAPHER', `sty_dp_${id}`, DB.styleDp)}
            ${sectionHTML('LOOK')}
            ${fieldHTML('COLOR PALETTE', `sty_pal_${id}`, DB.stylePalette, DB.stylePalette[0])}
            ${fieldHTML('TEXTURE / FINISH', `sty_tex_${id}`, DB.styleTexture)}
            <div style="font-size:0.6rem; color:#666; margin-top:5px">INFLUENCE / REFERENCE</div>
            <input type="text" class="obj-input" id="sty_ref_${id}" placeholder="e.g. Blade Runner 2049" oninput="triggerUpdate()">
        `;
    }
    else if (type === 'character') {
        title = "CHARACTER"; hasIn = false; hasOut = true;
        content = `
            <input type="text" class="obj-input" id="chr_name_${id}" placeholder="Character Name/Role" oninput="triggerUpdate()">
            ${rowHTML(
                fieldHTML('AGE', `chr_age_${id}`, DB.charAge, DB.charAge[0]),
                fieldHTML('BUILD', `chr_bld_${id}`, DB.charBuild, DB.charBuild[0])
            )}
            ${sectionHTML('APPEARANCE')}
            ${rowHTML(
                fieldHTML('HAIR', `chr_hair_${id}`, DB.charHair),
                fieldHTML('FACIAL HAIR', `chr_beard_${id}`, DB.charFacialHair)
            )}
            ${fieldHTML('DISTINGUISHING FEATURE', `chr_feat_${id}`, DB.charFeature)}
            ${rowHTML(
                fieldHTML('CLOTHING', `chr_clo_${id}`, DB.charClothing, DB.charClothing[0]),
                fieldHTML('WEAR LEVEL', `chr_wear_${id}`, DB.charWear, DB.charWear[0])
            )}
            <div style="font-size:0.6rem; color:#666; margin-top:5px">HELD PROP</div>
            <input type="text" class="obj-input" id="chr_prop_${id}" placeholder="e.g. a revolver, a lantern" oninput="triggerUpdate()">
            ${sectionHTML('PERFORMANCE')}
            ${rowHTML(
                fieldHTML('EMOTION', `chr_emo_${id}`, DB.charEmotion, DB.charEmotion[0]),
                fieldHTML('MICRO-EXPRESSION', `chr_mic_${id}`, DB.charMicro, DB.charMicro[0])
            )}
            ${fieldHTML('POSTURE', `chr_pos_${id}`, DB.charPosture, DB.charPosture[0])}
            ${rowHTML(
                fieldHTML('GESTURE', `chr_ges_${id}`, DB.charGesture, DB.charGesture[0]),
                fieldHTML('GAIT', `chr_gait_${id}`, DB.charGait, DB.charGait[0])
            )}
            ${fieldHTML('ACTION TYPE', `chr_act_${id}`, DB.sceneAction, DB.sceneAction[0])}
            <input type="text" class="obj-input" id="chr_cust_${id}" placeholder="Custom action notes" oninput="triggerUpdate()" style="margin-top:5px">
            ${getSpatialContextHTML(id)}
        `;
    }
    else if (type === 'shot') {
        hasIn = false; hasOut = true; title = "SHOT TYPE";
        content = `<div style="font-size:0.6rem; color:#666">SHOT FRAMING</div>
            ${selHTML(`shot_type_${id}`, DB.shotType, DB.shotType[0])}`;
    }
    else if (type === 'cammove') {
        hasIn = false; hasOut = true; title = "CAMERA MOVEMENT";
        content = `<div style="font-size:0.6rem; color:#666">MOVEMENT / RIG</div>
            ${selHTML(`cam_move_${id}`, DB.camMove, DB.camMove[0])}`;
    }
    else if (type === 'atmos') {
        hasIn = false; hasOut = true; title = "ATMOSPHERE";
        content = `<div style="font-size:0.6rem; color:#666">ENVIRONMENT EFFECTS</div>
            ${selHTML(`atm_fx_${id}`, DB.atmos, DB.atmos[0])}
            <div style="font-size:0.6rem; color:#666; margin-top:5px">INTENSITY (1-10)</div>
            <input type="range" id="atm_int_${id}" min="1" max="10" value="5" oninput="triggerUpdate()">`;
    }
    else if (type === 'colorg') {
        hasIn = false; hasOut = true; title = "COLOR GRADE";
        content = `
            ${fieldHTML('LUT / LOOK', `col_lut_${id}`, DB.colLut, DB.colLut[0])}
            ${fieldHTML('FILM STOCK', `col_stk_${id}`, DB.colStock, DB.colStock[0])}
            ${sectionHTML('GRADE')}
            ${rowHTML(
                fieldHTML('CONTRAST', `col_con_${id}`, DB.colContrast),
                fieldHTML('SATURATION', `col_sat_${id}`, DB.colSaturation)
            )}
            ${rowHTML(
                fieldHTML('GRAIN', `col_grain_${id}`, DB.colGrain),
                fieldHTML('VIGNETTE', `col_vig_${id}`, DB.colVignette)
            )}
            ${fieldHTML('HALATION / BLOOM', `col_halo_${id}`, DB.colHalation)}
        `;
    }
    else if (type === 'comp') {
        hasIn = false; hasOut = true; title = "COMPOSITION";
        content = `<div style="font-size:0.6rem; color:#666">COMPOSITION RULE</div>
            ${selHTML(`comp_rule_${id}`, DB.compRule, DB.compRule[0])}`;
    }
    else if (type === 'neg') {
        hasIn = false; hasOut = true; title = "NEGATIVE PROMPT";
        content = `<div style="font-size:0.6rem; color:#666">EXCLUDE FROM SCENE</div>
            <textarea id="neg_val_${id}" rows="3" placeholder="ugly, deformed, noise..." oninput="triggerUpdate()" style="width:100%; padding:4px; background:#111; color:#eee; border:1px solid #333; border-radius:4px; font-size:0.75rem; margin-top:2px; resize:none;"></textarea>`;
    }
    else if (type === 'render') {
        hasIn = false;
        content = `<div style="font-size:0.6rem; color:#666">ENGINE</div>
            ${selHTML(`eng_${id}`, DB.render, DB.render[0])}
            <div style="display:flex; gap:5px; margin-top:5px">
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">RATIO</div>${selHTML(`rat_${id}`, DB.ratio, DB.ratio[0])}</div>
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">RES</div>${selHTML(`res_${id}`, DB.res, DB.res[0])}</div>
            </div>`;
    }
    else if (type === 'light') {
        title = "LIGHT SOURCE";
        content = `<select id="mode_${id}" onchange="toggleLight('${id}')" style="margin-bottom:10px;">
                <option value="industrial">Industrial</option>
                <option value="sunlight">Sunlight</option>
            </select>
            <div id="cont_${id}"></div>
            ${getSpatialContextHTML(id)}`;
        setTimeout(() => window.toggleLight(id), 0);
    }
    else if (type === 'camera') {
        title = "CAMERA";

        // The body/lens pickers are optgroup-based, so they get the unassigned
        // option prepended by hand rather than via selHTML.
        const optGroups = list => `<option value="">${UNSET_LABEL}</option>` + list.map(brand =>
            `<optgroup label="${brand.brand}">` +
            brand.models.map(m => `<option value="${m.name}" data-flavor="${m.flavor}">${m.name}</option>`).join('') +
            `</optgroup>`
        ).join('');

        content = `
            ${sectionHTML('BODY & GLASS')}
            <div style="font-size:0.6rem; color:#666">BODY</div>
            <select id="cam_${id}" onchange="updateCamFlavor('${id}'); triggerUpdate();">${optGroups(DB.camBodies)}</select>
            <div id="cam_flav_${id}" style="font-size:0.55rem; color:var(--accent); margin-top:2px; font-style:italic; line-height:1.2;"></div>

            <div style="font-size:0.6rem; color:#666; margin-top:5px">LENS SERIES</div>
            <select id="lens_${id}" onchange="updateCamFlavor('${id}'); triggerUpdate();">${optGroups(DB.camLenses)}</select>
            <div id="lens_flav_${id}" style="font-size:0.55rem; color:var(--accent); margin-top:2px; font-style:italic; line-height:1.2;"></div>

            ${fieldHTML('SENSOR / FORMAT', `cam_fmt_${id}`, DB.camFormat)}

            <div style="font-size:0.6rem; color:#666; margin-top:5px;">FOCAL LENGTH (mm)</div>
            <div style="display:flex; align-items:center; gap:5px;">
                <input type="number" id="mm_in_${id}" min="2" max="2000" value="50" style="width:56px; text-align:center;" oninput="syncCam('${id}', this.value)">
                <input type="range" id="mm_sl_${id}" min="2" max="2000" value="50" oninput="syncCam('${id}', this.value)">
            </div>

            ${sectionHTML('EXPOSURE')}
            ${rowHTML(
                fieldHTML('APERTURE', `cam_ap_${id}`, DB.camAperture, DB.camAperture[0]),
                fieldHTML('SHUTTER', `cam_sh_${id}`, DB.camShutter, DB.camShutter[0])
            )}
            ${rowHTML(
                fieldHTML('ISO', `cam_iso_${id}`, DB.camIso, DB.camIso[0]),
                fieldHTML('FILTER', `cam_fil_${id}`, DB.camFilter, DB.camFilter[0])
            )}
            ${fieldHTML('FRAME RATE', `cam_fps_${id}`, DB.camFps)}

            ${sectionHTML('FRAMING')}
            ${rowHTML(
                fieldHTML('FOCUS', `cam_focus_${id}`, DB.camFocus),
                fieldHTML('ANGLE', `cam_angle_${id}`, DB.camAngle)
            )}

            ${sectionHTML('ADVANCED TRACKING')}
            <div style="display:flex; gap:5px; margin-top:5px">
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">ACTION</div>
                <select id="cam_adv_act_${id}" onchange="triggerUpdate()">
                    <option value="none">None / Static</option>
                    <option value="follow">Follow Target</option>
                    <option value="orbit">Orbit Around</option>
                    <option value="dolly_in">Dolly In To</option>
                    <option value="dolly_out">Dolly Out From</option>
                    <option value="rack_focus">Rack Focus To</option>
                </select></div>
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">TARGET NODE</div>
                <select id="cam_adv_tgt_${id}" onchange="triggerUpdate()">
                    <option value="">-- Select Target --</option>
                </select></div>
            </div>
            <div style="font-size:0.6rem; color:#666; margin-top:5px">KEEP DISTANCE</div>
            <select id="cam_adv_dist_${id}" onchange="triggerUpdate()">
                <option value="">Auto (Don't specify)</option>
                <option value="extreme close proximity">Extreme Close</option>
                <option value="close proximity (1m)">Close (1m)</option>
                <option value="medium distance (3m)">Medium (3m)</option>
                <option value="far distance (10m)">Far (10m)</option>
            </select>
            ${getSpatialContextHTML(id)}`;
        setTimeout(() => {
            if(window.updateCamFlavor) window.updateCamFlavor(id);
            // A camera is a physical object in the scene like a light is, but it
            // had no spatial fields — so it always sat at the world origin and
            // could not be placed. Default it in front of the scene at eye level.
            const v = document.getElementById(`vpos_${id}`);
            if(v) v.value = 'eye_level';
        }, 0);
    }
    else if (type === 'object') {
        hasIn = false; title = "OBJECT";
        content = `<input type="text" class="obj-input" id="val_${id}" placeholder="OBJECT NAME" oninput="triggerUpdate()">${getSpatialContextHTML(id)}`;
    }
    else if (SUBJECTS[type]) {
        // Animals, insects, birds, vehicles, crowds — all built from js/subjects.js
        hasIn = false; hasOut = true;
        title = SUBJECTS[type].title;
        content = buildSubjectHTML(type, id);
    }
    else if (type === 'customloc') {
        hasIn = false; hasOut = true; title = "CUSTOM LOCATION";
        content = `
            <input type="text" class="obj-input" id="loc_name_${id}" placeholder="LOCATION NAME (e.g. rusted freighter deck)" oninput="triggerUpdate()">
            <div style="display:flex; gap:5px; margin-top:5px">
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">ENVIRONMENT</div><select id="loc_env_${id}" onchange="triggerUpdate()">${DB.locEnv.map(o=>`<option>${o}</option>`).join('')}</select></div>
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">SCALE</div><select id="loc_scale_${id}" onchange="triggerUpdate()">${DB.locScale.map(o=>`<option ${o==='Spacious'?'selected':''}>${o}</option>`).join('')}</select></div>
            </div>
            <div style="font-size:0.6rem; color:#666; margin-top:5px">ARCHITECTURE / STYLE</div>
            <select id="loc_arch_${id}" onchange="triggerUpdate()">${DB.locArch.map(o=>`<option>${o}</option>`).join('')}</select>
            <div style="font-size:0.6rem; color:#666; margin-top:5px">GROUND / SURFACE</div>
            <select id="loc_surf_${id}" onchange="triggerUpdate()">${DB.locSurface.map(o=>`<option>${o}</option>`).join('')}</select>
            <div style="font-size:0.6rem; color:#666; margin-top:5px">KEY FEATURES</div>
            <textarea id="loc_feat_${id}" rows="2" placeholder="hanging cables, flickering neon signs, scattered debris..." oninput="triggerUpdate()" style="width:100%; padding:4px; background:#111; color:#eee; border:1px solid #333; border-radius:4px; font-size:0.75rem; margin-top:2px; resize:none;"></textarea>
        `;
    }
    else if (type === 'position') {
        hasIn = true; hasOut = true; title = "POSITION";
        content = `
            <div class="slider-row"><span>X</span><input type="range" id="x_${id}" min="-180" max="180" value="0" oninput="triggerUpdate()"></div>
            <div class="slider-row"><span>Y</span><input type="range" id="y_${id}" min="-180" max="180" value="0" oninput="triggerUpdate()"></div>
            <div class="slider-row"><span>Z</span><input type="range" id="z_${id}" min="-180" max="180" value="0" oninput="triggerUpdate()"></div>
        `;
    }
    else if (type === 'preview') {
        hasIn = true; hasOut = true; title = "GLOBAL PREVIEW (3D)";
        // A definite starting size so the node's own resize handle has something
        // to grow from. The 3D view fills the content, so resizing the NODE
        // resizes the render — the inner viewport no longer has its own handle
        // or fixed dimensions fighting the node's.
        el.style.width = '360px';
        el.style.height = '460px';
        content = `
            <div class="viewport-3d preview-fill" id="v3d_${id}">
                <div id="three_${id}" style="width:100%; height:100%; position:relative;"></div>
            </div>
            <!-- Through-the-lens: what the connected camera node actually frames -->
            <div id="ttl_wrap_${id}" style="display:none; margin-top:6px; flex-shrink:0;">
                <div style="font-size:0.6rem; color:#666; margin-bottom:2px;">THROUGH THE LENS</div>
                <div class="viewport-3d" id="ttl_${id}" style="width:100%; height:160px; min-height:110px; resize:vertical; overflow:hidden;"></div>
            </div>
            <div style="display:flex; gap:5px; margin-top:5px; flex-shrink:0;">
                <button class="btn-tool" id="ttl_btn_${id}" onpointerdown="toggleLensView('${id}')" title="Frame the connected camera sees">🎥 LENS</button>
                <button class="btn-tool" onpointerdown="playCameraMove('${id}')" title="Play the camera move">▶ MOVE</button>
            </div>
            <div id="v3d_hint_${id}" style="text-align:center; font-size:0.6rem; color:#666; margin-top:4px; flex-shrink:0;">
                Drag an object to position it
            </div>
        `;
        setTimeout(() => initThreePreview(id), 50);
    }
    else if (type === 'stack') {
        hasIn = true; hasOut = true; title = "PROMPT STACK";
        // Platform list comes from the PLATFORMS adapter registry in promptEngine.js.
        content = `
            <select id="stack_plat_${id}" onchange="triggerUpdate()" style="width:100%; margin-bottom:5px; background:#111; color:#eee; border:1px solid #333; padding:5px; border-radius:4px; font-size:0.75rem; font-weight:bold; min-height:36px;">
                ${PLATFORM_IDS.map(p => `<option value="${p}">${PLATFORMS[p].label}</option>`).join('')}
            </select>
            <textarea id="val_${id}" class="stack-output" readonly></textarea>
            <div id="stack_meta_${id}" style="margin-top:4px;"></div>
            <div class="stack-tools">
                <button class="btn-tool" onpointerdown="resetStack('${id}')">RESET</button>
                <button class="btn-tool" onpointerdown="copyStack('${id}')">COPY</button>
                <button class="btn-tool" onpointerdown="copyStructured('${id}')" title="Copy structured JSON">JSON</button>
                <button class="btn-tool" onpointerdown="showVariants('${id}')" title="A/B/C variants">A/B/C</button>
            </div>
            <button class="btn-gen" style="background:#55ff55" onpointerdown="sendToAPI('${id}')">Send to Generator</button>
        `;
    }
    else if (type === 'sequence') {
        hasIn = true; hasOut = false; title = "TIMELINE / SEQUENCE";
        content = `
            <div style="font-size:0.6rem; color:#666">COMBINED SEQUENCE PROMPT</div>
            <textarea id="val_${id}" class="stack-output" readonly></textarea>
            <div class="stack-tools">
                <button class="btn-tool" onpointerdown="copyStack('${id}')">COPY SEQUENCE</button>
            </div>
        `;
    }

    const cat = categoryOf(type);
    el.setAttribute('data-cat', cat);

    el.innerHTML = `
        ${hasIn ? `<div class="socket-wrapper in" data-node="${id}" onpointerdown="inSockTap(event, '${id}')"><div class="socket"></div></div>` : ''}
        <div class="node-header" onpointerdown="nodeDrag(event, '${id}')">
            <span class="node-title">
                <span class="node-cat">${CATEGORIES[cat].label}</span>
                <span>${title}</span>
            </span>
            <span class="close-btn" onpointerdown="event.stopPropagation()" onclick="kill('${id}')">×</span>
        </div>
        <div class="node-content">${content}</div>
        ${hasOut ? `<div class="socket-wrapper out" onpointerdown="sockDown(event, '${id}')"><div class="socket"></div></div>` : ''}
    `;

    world.appendChild(el);
    window.nodes[id] = { id, type, el, zoom: 1 };
    new ResizeObserver(() => updateCables()).observe(el);

    el.addEventListener('pointerdown', (e) => startLongPress(e, id, 'node'));
    el.addEventListener('pointerup', cancelLongPress);
    el.addEventListener('pointerleave', cancelLongPress);
}

window.toggleLight = function(id) {
    const mode = document.getElementById(`mode_${id}`).value;
    const div = document.getElementById(`cont_${id}`);
    if(mode === 'industrial') {
        div.innerHTML = `
            <div style="font-size:0.6rem; color:#666">FIXTURE</div>
            ${selHTML(`brand_${id}`, DB.lightBrand, DB.lightBrand[0])}
            <div class="slider-row"><span>W</span><input type="range" id="watt_${id}" min="0" max="2000" value="1000" oninput="triggerUpdate()"></div>
            <div class="slider-row"><span>K</span><input type="range" id="kel_${id}" min="2000" max="10000" value="5600" oninput="triggerUpdate()"></div>
            <div style="font-size:0.6rem; color:#666; margin-top:5px">MODIFIER</div>
            ${selHTML(`lit_mod_${id}`, DB.lightMod, DB.lightMod[0])}
            <div style="font-size:0.6rem; color:#666; margin-top:5px">COLOR GEL</div>
            ${selHTML(`lit_gel_${id}`, DB.lightGel, DB.lightGel[0])}
        `;
    } else {
        div.innerHTML = `
            <div class="slider-row"><span>Time</span><input type="range" id="time_${id}" min="0" max="24" value="12" oninput="triggerUpdate()"></div>
            <div class="slider-row"><span>Seas</span><input type="range" id="seas_${id}" min="0" max="3" value="1" oninput="triggerUpdate()"></div>
        `;
    }
    window.triggerUpdate();
}

window.syncCam = function(id, val) {
    document.getElementById(`mm_in_${id}`).value = val;
    document.getElementById(`mm_sl_${id}`).value = val;
    triggerUpdate();
}

window.updateCamFlavor = function(id) {
    const camSel = document.getElementById(`cam_${id}`);
    const lensSel = document.getElementById(`lens_${id}`);
    const camFlav = document.getElementById(`cam_flav_${id}`);
    const lensFlav = document.getElementById(`lens_flav_${id}`);
    // The unassigned option carries no flavour text — show nothing rather than
    // the string "null".
    const flavour = (sel, out) => {
        if(!sel || !out) return;
        const opt = sel.options[sel.selectedIndex];
        const f = opt ? opt.getAttribute('data-flavor') : null;
        out.innerText = f ? '💡 ' + f : '';
    };
    flavour(camSel, camFlav);
    flavour(lensSel, lensFlav);
}

// What a node is called when a camera targets it. Single definition — this used
// to be duplicated in triggerUpdate() and again in the 3D preview, and the two
// drifted apart every time a node type was added.
function nodeDisplayName(n) {
    if (SUBJECTS[n.type]) return SUBJECTS[n.type].name(readSubject(n.type, n.id));
    if (n.type === 'character') return document.getElementById(`chr_name_${n.id}`)?.value || 'Character';
    if (n.type === 'object') return document.getElementById(`val_${n.id}`)?.value || 'Object';
    if (n.type === 'light') return 'Light';
    if (n.type === 'camera') return 'Camera';
    return '';
}

window.triggerUpdate = function() {
    let targets = [];
    Object.values(window.nodes).forEach(n => {
        const name = nodeDisplayName(n);

        if (name) {
            targets.push({ id: n.id, name: `${name} (${n.id.substring(0,4)})`, rawName: name });
        }
    });

    Object.values(window.nodes).forEach(n => {
        if (n.type === 'camera') {
            const sel = document.getElementById(`cam_adv_tgt_${n.id}`);
            if (sel) {
                const currentVal = sel.value;
                sel.innerHTML = '<option value="">-- Select Target --</option>';
                targets.forEach(t => {
                    if (t.id === n.id) return;
                    const opt = document.createElement('option');
                    opt.value = t.rawName;
                    opt.text = t.name;
                    sel.appendChild(opt);
                });
                sel.value = currentVal;
            }
        }
    });

    Object.values(window.nodes).forEach(n => {
        if(n.type === 'preview') window.updateThreePreview(n.id);
        if(n.type === 'stack') updateStack(n.id, window.nodes, window.cables);
    });
    Object.values(window.nodes).forEach(n => {
        if(n.type === 'sequence') updateSequence(n.id, window.nodes, window.cables);
    });
    window.updateMinimap();
}

// DRAG AND CABLES LOGIC
let dragItem = null; 
let dragOff = {x:0, y:0};

window.nodeDrag = function(e, id) {
    if(spaceDown) return;
    if(window.selectMode) {
        e.stopPropagation();
        window.toggleNodeSelection(id);
        return;
    }
    e.stopPropagation();
    dragItem = window.nodes[id];
    const r = dragItem.el.getBoundingClientRect();
    dragOff = { x: (e.clientX - r.left)/worldState.zoom, y: (e.clientY - r.top)/worldState.zoom };

    document.querySelectorAll('.node').forEach(n => n.classList.remove('selected'));
    dragItem.el.classList.add('selected');
    highlightCables(id);

    document.addEventListener('pointermove', nodeMove);
    document.addEventListener('pointerup', nodeUp);
}

function highlightCables(nid) {
    document.querySelectorAll('path').forEach(p => p.classList.remove('active-cable'));
    window.cables.forEach(c => {
        if(c.from === nid || c.to === nid) {
            c.path.classList.add('active-cable');
            if(c.g) svgLayer.appendChild(c.g);
        }
    });
}

function nodeMove(e) {
    if (!dragItem || spaceDown) return;
    const newX = (e.clientX - dragOff.x - worldState.x) / worldState.zoom;
    const newY = (e.clientY - dragOff.y - worldState.y) / worldState.zoom;
    dragItem.el.style.left = `${newX}px`;
    dragItem.el.style.top = `${newY}px`;
    updateCables();
    window.updateMinimap();
}

function nodeUp() { 
    dragItem = null; 
    document.removeEventListener('pointermove', nodeMove); 
    document.removeEventListener('pointerup', nodeUp); 
}

// --- CABLE CREATION / SELECTION (single source of truth) ---
window.createCable = function(fromId, toId) {
    // Never wire the same pair twice — guards against a re-entrant preset load
    // or a restore racing a pending timeout.
    const existing = window.cables.find(c => c.from === fromId && c.to === toId);
    if(existing) return existing;

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute('class', 'cable-group');
    const hit = document.createElementNS("http://www.w3.org/2000/svg", "path");
    hit.setAttribute('class', 'cable-hit');
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute('class', 'cable');
    g.appendChild(hit); g.appendChild(path);
    svgLayer.appendChild(g);

    const nc = { from: fromId, to: toId, path, hit, g };

    hit.addEventListener('dblclick', () => removeCable(nc));
    hit.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        selectCable(nc);
        startLongPress(e, nc, 'cable');
    });
    hit.addEventListener('pointerup', cancelLongPress);
    hit.addEventListener('pointerleave', cancelLongPress);

    window.cables.push(nc);
    return nc;
};

// Drop every cable, DOM included. Assigning `window.cables = []` alone leaks the
// SVG groups, which then linger as invisible click targets.
function clearAllCables() {
    window.cables.forEach(c => { const el = c.g || c.path; if(el) el.remove(); });
    window.cables = [];
    window.selectedCable = null;
}

function removeCable(nc) {
    captureState();   // snapshot before the cable is gone
    nc.g.remove();
    window.cables = window.cables.filter(c => c !== nc);
    if(window.selectedCable === nc) window.selectedCable = null;
    updateCables();
    window.triggerUpdate();
}

function selectCable(nc) {
    clearCableSelection();
    window.selectedCable = nc;
    nc.path.classList.add('cable-selected');
}

function clearCableSelection() {
    if(window.selectedCable) window.selectedCable.path.classList.remove('cable-selected');
    window.selectedCable = null;
}
window.clearCableSelection = clearCableSelection;

// Show which input sockets will accept the cable being dragged.
function markDropTargets(srcId) {
    const srcType = window.nodes[srcId]?.type;
    document.querySelectorAll('.socket-wrapper.in').forEach(w => {
        const toId = w.getAttribute('data-node');
        if(!toId || toId === srcId) return;
        const dstType = window.nodes[toId]?.type;
        const ok = srcType && dstType && isValidConnection(srcType, dstType);
        w.classList.add(ok ? 'valid-target' : 'invalid-target');
    });
}

function clearDropTargets() {
    document.querySelectorAll('.socket-wrapper.in').forEach(w => {
        w.classList.remove('valid-target', 'invalid-target');
    });
}

// Touch-friendly: land on a socket directly, or snap to the nearest one.
function findDropTarget(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    const direct = el ? el.closest('.socket-wrapper.in') : null;
    if(direct) return direct;
    let best = null, bestDist = 48;
    document.querySelectorAll('.socket-wrapper.in').forEach(w => {
        const r = w.getBoundingClientRect();
        const d = Math.hypot(clientX - (r.left + r.width/2), clientY - (r.top + r.height/2));
        if(d < bestDist) { bestDist = d; best = w; }
    });
    return best;
}

// One validated connect, shared by drag-to-connect and tap-to-connect.
// Returns true if a cable was made; flashes the target red on an invalid pair.
function tryConnect(fromId, toId) {
    if(!fromId || !toId || fromId === toId) return false;
    const src = window.nodes[fromId], dst = window.nodes[toId];
    if(!src || !dst) return false;
    if(!isValidConnection(src.type, dst.type)) {
        const nEl = document.getElementById(toId);
        if(nEl) { nEl.style.boxShadow = '0 0 15px red'; setTimeout(() => { nEl.style.boxShadow = 'none'; }, 400); }
        return false;
    }
    if(window.cables.some(c => c.from === fromId && c.to === toId)) return false;   // already wired
    captureState();
    window.createCable(fromId, toId);
    updateCables();
    window.triggerUpdate();
    return true;
}

// --- TAP-TO-CONNECT: touch-friendly alternative to dragging a cable. Tap an
// output socket to arm it; tap a valid input to wire. Drag still works. ---
window.armedSocket = null;

function armedOutWrapper(id) {
    return window.nodes[id]?.el.querySelector('.socket-wrapper.out') || null;
}

function armSocket(fromId) {
    disarmSocket();
    window.armedSocket = fromId;
    armedOutWrapper(fromId)?.classList.add('armed');
    markDropTargets(fromId);
    window.showToast('Tap a target to connect');
}

function disarmSocket() {
    if(window.armedSocket) armedOutWrapper(window.armedSocket)?.classList.remove('armed');
    window.armedSocket = null;
    clearDropTargets();
}
window.disarmSocket = disarmSocket;

// Input socket tapped: if a source is armed, complete the connection.
window.inSockTap = function(e, toId) {
    if(!window.armedSocket) return;
    e.stopPropagation();
    tryConnect(window.armedSocket, toId);
    disarmSocket();
};

let activeCable = null;
let cabMoved = false;
window.sockDown = function(e, id) {
    e.stopPropagation();
    cabMoved = false;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svgLayer.appendChild(path);
    activeCable = { from: id, path };
    markDropTargets(id);
    document.addEventListener('pointermove', cabMove);
    document.addEventListener('pointerup', cabUp);
}

function cabMove(e) {
    if(!activeCable) return;
    cabMoved = true;
    const n = window.nodes[activeCable.from];
    const sx = parseFloat(n.el.style.left) + n.el.offsetWidth;
    const sy = parseFloat(n.el.style.top) + (n.el.offsetHeight/2);
    const mx = (e.clientX - worldState.x)/worldState.zoom;
    const my = (e.clientY - worldState.y)/worldState.zoom;
    drawCurve(activeCable.path, sx, sy, mx, my);
}

function isValidConnection(srcType, dstType) {
    if (dstType === 'sequence') return srcType === 'stack';
    if (dstType === 'stack') return srcType !== 'position' && srcType !== 'sequence';
    // Subject nodes are scene contents: they can all be previewed and positioned.
    if (dstType === 'preview') return ['position', 'character', 'object', 'customloc', 'light', 'stack'].includes(srcType) || !!SUBJECTS[srcType];
    if (dstType === 'position') return ['character', 'object', 'light', 'camera'].includes(srcType) || !!SUBJECTS[srcType];
    return false;
}

function cabUp(e) {
    if(!activeCable) return;
    const from = activeCable.from;
    const wrapperIn = findDropTarget(e.clientX, e.clientY);

    if (wrapperIn) {
        // Dragged onto an input — connect and clear.
        tryConnect(from, wrapperIn.getAttribute('data-node'));
        disarmSocket();
    } else if (!cabMoved) {
        // A pure tap on the output socket toggles tap-to-connect arming: the
        // drop-target highlights stay up until you pick an input (or tap away).
        if (window.armedSocket === from) disarmSocket();
        else armSocket(from);
    } else {
        clearDropTargets();
    }
    activeCable.path.remove();
    activeCable = null;
    document.removeEventListener('pointermove', cabMove);
    document.removeEventListener('pointerup', cabUp);
}

function updateCables() {
    window.cables.forEach(c => {
        const n1 = window.nodes[c.from]; const n2 = window.nodes[c.to];
        if(!n1 || !n2) return;
        const x1 = parseFloat(n1.el.style.left) + n1.el.offsetWidth;
        const y1 = parseFloat(n1.el.style.top) + (n1.el.offsetHeight/2);
        const x2 = parseFloat(n2.el.style.left);
        const y2 = parseFloat(n2.el.style.top) + (n2.el.offsetHeight/2);
        drawCurve(c.path, x1, y1, x2, y2);
        if(c.hit) drawCurve(c.hit, x1, y1, x2, y2);
    });
}

function drawCurve(path, x1, y1, x2, y2) {
    const mid = (x1+x2)/2;
    path.setAttribute('d', `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`);
}

// Single source of truth for "what does the workspace look like right now".
// Used by undo/redo history AND by save/load.
// Bump when the shape changes; loadWorkspaceData migrates older saves.
const SAVE_VERSION = 2;

function serializeWorkspace() {
    const state = { version: SAVE_VERSION, nodes: {}, cables: [], counter: window.nodeIdCounter };
    for(let id in window.nodes) {
        const n = window.nodes[id];
        const nodeState = {};
        n.el.querySelectorAll('input, select, textarea').forEach(el => {
            if(el.id) nodeState[el.id] = el.type === 'checkbox' ? el.checked : el.value;
        });
        state.nodes[id] = { type: n.type, x: n.el.style.left, y: n.el.style.top, zoom: n.zoom, state: nodeState };
    }
    state.cables = window.cables.map(c => ({ from: c.from, to: c.to }));
    return state;
}

// Snapshot the state BEFORE a mutation, so undo has somewhere to go back to.
// Every mutating action must call this first, while the old state is still live.
function captureState() {
    if(isRestoring) return;
    window.redoStack = [];
    window.undoStack.unshift(serializeWorkspace());
    if(window.undoStack.length > MAX_HISTORY) window.undoStack.pop();
}

function restoreState(state) {
    isRestoring = true;
    Object.keys(window.nodes).forEach(id => window.kill(id));
    clearAllCables();   // drop anything kill() could not match

    for(let id in state.nodes) {
        const d = state.nodes[id];
        // createNode derives its id from ++nodeIdCounter, so seed the counter one
        // below the id we want back. Setting it to the id itself yields node_N+1,
        // which silently orphans every cable pointing at node_N.
        window.nodeIdCounter = parseInt(id.split('_')[1]) - 1;
        window.createNode(d.type);
        const n = window.nodes[id];
        if(n) {
            n.el.style.left = d.x;
            n.el.style.top = d.y;
            n.zoom = d.zoom || 1;
            for(let key in d.state) {
                const el = document.getElementById(key);
                if(el) {
                    if(el.type === 'checkbox') el.checked = d.state[key];
                    else el.value = d.state[key];
                }
            }
            if(n.type === 'light') window.toggleLight(id);
        }
    }
    window.nodeIdCounter = state.counter;   // put the counter back where it was
    state.cables.forEach(c => window.createCable(c.from, c.to));
    updateCables();
    window.triggerUpdate();
    window.updateMinimap();
    isRestoring = false;
}

window.undo = function() {
    if(window.undoStack.length === 0) return window.showToast('Nothing to undo');
    // Serialize directly (not captureState) so the redo stack survives.
    window.redoStack.unshift(serializeWorkspace());
    restoreState(window.undoStack.shift());
    window.showToast('Undone');
};

window.redo = function() {
    if(window.redoStack.length === 0) return window.showToast('Nothing to redo');
    window.undoStack.unshift(serializeWorkspace());
    restoreState(window.redoStack.shift());
    window.showToast('Redone');
};

// Copy every field value from one node to another of the same type.
function copyNodeValues(srcId, dstId) {
    const src = window.nodes[srcId];
    if(!src) return;
    // A light rebuilds its fixture controls when the mode changes, which would
    // wipe whatever we just wrote — switch mode first, then fill.
    const srcMode = document.getElementById(`mode_${srcId}`);
    const dstMode = document.getElementById(`mode_${dstId}`);
    if(srcMode && dstMode) { dstMode.value = srcMode.value; window.toggleLight(dstId); }

    src.el.querySelectorAll('input, select, textarea').forEach(el => {
        if(!el.id) return;
        const dst = document.getElementById(el.id.replace(srcId, dstId));
        if(!dst) return;
        if(el.type === 'checkbox') dst.checked = el.checked;
        else dst.value = el.value;
    });
}

window.duplicateNode = function(id) {
    const src = window.nodes[id];
    if(!src) return;
    captureState();   // snapshot before the copy exists

    const wasRestoring = isRestoring;
    isRestoring = true;   // the copy is one undo step, not two

    // Build the copy through the real construction path rather than cloning
    // innerHTML. The old code did `.replace(/_${id}/g, ...)` — a regex literal,
    // not a template string, so it matched nothing and no id was ever rewritten.
    // The clone kept the source's ids, which meant its header still called
    // nodeDrag() on the ORIGINAL: dragging the copy moved the source and the
    // copy itself sat there inert, invisible to getElementById and the engine.
    window.createNode(src.type);
    const newId = 'node_' + window.nodeIdCounter;
    const copy = window.nodes[newId];
    isRestoring = wasRestoring;
    if(!copy) return;

    copy.el.style.left = (parseFloat(src.el.style.left) + 30) + 'px';
    copy.el.style.top = (parseFloat(src.el.style.top) + 30) + 'px';
    if(src.el.style.width) copy.el.style.width = src.el.style.width;
    if(src.el.style.height) copy.el.style.height = src.el.style.height;
    copy.zoom = src.zoom;

    // Nodes with deferred init (light's panel, camera's flavour text) finish on a
    // timeout, so values land after that rather than being overwritten by it.
    setTimeout(() => {
        copyNodeValues(id, newId);
        window.triggerUpdate();
    }, 0);

    window.showToast('Node duplicated');
};

window.kill = function(id) {
    if(window.nodes[id]) {
        captureState();   // snapshot before the node and its cables disappear
        if(window.nodes[id].resizeObs) window.nodes[id].resizeObs.disconnect();
        window.nodes[id].el.remove();
        delete window.nodes[id];
        window.cables = window.cables.filter(c => {
            if(c.from === id || c.to === id){
                if(window.selectedCable === c) window.selectedCable = null;
                (c.g || c.path).remove();
                return false;
            }
            return true;
        });
        if(!isRestoring) {
            window.triggerUpdate();
            window.updateMinimap();
        }
    }
}

// SAVE & LOAD
window.saveWorkspace = function() {
    // Saving is not a mutation — it must not touch the undo history.
    const data = serializeWorkspace();
    const jsonStr = JSON.stringify(data);
    localStorage.setItem('scene_save', jsonStr);
    
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workspace_save.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    window.showToast("Workspace Saved & Downloaded!");
}

window.loadWorkspaceData = function(str) {
    if(!str) return window.showToast("No save found!");
    let data;
    try {
        data = JSON.parse(str);
    } catch(e) {
        return window.showToast("Invalid save file!");
    }
    // v1 saves have no version field and the same node/cable shape, so they load
    // as-is. Keep this tolerant: a stricter check would reject every old file.
    if(data.version && data.version > SAVE_VERSION) {
        return window.showToast(`Bu kayıt daha yeni bir sürümden (v${data.version})`);
    }
    if(!data.nodes || !data.cables) return window.showToast("Invalid save file!");

    isRestoring = true;   // loading a workspace is one atomic act, not undo steps
    window.undoStack = []; window.redoStack = [];
    Object.keys(window.nodes).forEach(id => window.kill(id));
    clearAllCables();

    let maxId = 0;
    for(let oldId in data.nodes) {
        const num = parseInt(oldId.split('_')[1]);
        if(num > maxId) maxId = num;
        
        const d = data.nodes[oldId];
        window.nodeIdCounter = num - 1; 
        window.createNode(d.type); 
        const n = window.nodes[oldId];
        if(!n) continue;
        n.el.style.left = d.x; n.el.style.top = d.y;
        n.zoom = d.zoom || 1;
        
        for(let key in d.state) {
            const el = document.getElementById(key);
            if(el) {
                if(el.type === 'checkbox') el.checked = d.state[key];
                else el.value = d.state[key];
            }
        }
        if(n.type === 'light') window.toggleLight(oldId); 
    }
    window.nodeIdCounter = maxId;
    
    data.cables.forEach(c => window.createCable(c.from, c.to));

    updateCables(); window.triggerUpdate(); window.updateMinimap();
    isRestoring = false;   // workspace fully rebuilt; start recording undo again
    window.undoStack = []; window.redoStack = [];
    window.showToast("Workspace Loaded!");
}

window.loadWorkspace = function() {
    if(Object.keys(window.nodes).length > 0 &&
       !confirm('Loading a file will clear the current canvas. Continue?')) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            window.loadWorkspaceData(ev.target.result);
            localStorage.setItem('scene_save', ev.target.result);
        };
        reader.readAsText(file);
    };
    input.click();
}

// PRESETS — data, not code. Each entry lists nodes (type, position, field values
// keyed WITHOUT the node-id suffix) and the cables to wire, by node index.
const PRESETS = {
    cyberpunk: {
        label: 'Cyberpunk',
        nodes: [
            { type: 'scene', x: 100, y: 100, values: {
                scn_loc: 'Fantastic: Cyber City', scn_time: 'Night Dark (19:30-04:00)',
                scn_wea: 'Heavy Rain', scn_mood: 'Tense / Mysterious' } },
            { type: 'character', x: 100, y: 400, values: {
                chr_name: 'Hacker', chr_clo: 'Casual Streetwear', chr_age: 'Young Adult (18-25)',
                chr_emo: 'Anticipation' } },
            { type: 'style', x: 100, y: 800, values: {
                sty_cin: 'Cyberpunk', sty_pal: 'Neon / Synthwave', sty_per: 'Near Future',
                sty_dir: 'Denis Villeneuve' } },
            { type: 'colorg', x: 450, y: 600, values: {
                col_lut: 'Teal & Orange', col_stk: 'Cinestill 800T' } },
            { type: 'stack', x: 800, y: 300 },
        ],
        connect: [[0, 4], [1, 4], [2, 4], [3, 4]],
    },
    noir: {
        label: 'Film Noir',
        nodes: [
            { type: 'scene', x: 100, y: 100, values: {
                scn_loc: 'Exterior: City Street', scn_time: 'Night Dark (19:30-04:00)',
                scn_wea: 'Heavy Rain', scn_mood: 'Dark / Ominous' } },
            { type: 'character', x: 100, y: 400, values: {
                chr_name: 'Detective', chr_age: 'Middle Age (41-60)', chr_bld: 'Average',
                chr_clo: 'Formal Suit / Dress', chr_wear: 'Slightly Worn',
                chr_emo: 'Controlled Fury', chr_mic: 'Jaw clenching',
                chr_pos: 'Standing straight', chr_ges: 'Hands in pockets' } },
            { type: 'style', x: 100, y: 900, values: {
                sty_cin: 'Film Noir', sty_per: '1950s', sty_art: 'Expressionism',
                sty_dir: 'Roger Deakins', sty_pal: 'High Contrast B&W' } },
            { type: 'colorg', x: 450, y: 800, values: {
                col_lut: 'High Contrast', col_stk: 'Ilford HP5 (B&W)' } },
            // Hard key through venetian blinds — the defining noir lighting cue.
            { type: 'light', x: 450, y: 100, values: {
                mode: 'industrial', brand: 'Arri', watt: '1200', kel: '4000',
                lit_mod: 'Gobo (Blinds)', lit_gel: 'None',
                hpos: 'camera_left', vpos: 'above', depth: 'midground' } },
            { type: 'camera', x: 450, y: 420, values: {
                cam: 'Arricam LT (35mm)', lens: 'Zeiss Standard Speeds',
                mm_in: '40', mm_sl: '40', cam_ap: 'f/2.0', cam_fil: 'ProMist 1/4' } },
            { type: 'comp', x: 800, y: 700, values: { comp_rule: 'Dutch Angle' } },
            { type: 'stack', x: 850, y: 300 },
        ],
        connect: [[0, 7], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
    },
};

function applyPresetValues(id, values) {
    for(const key in (values || {})) {
        const el = document.getElementById(`${key}_${id}`);
        if(el) el.value = values[key];
    }
}

// UI entry point for the preset menu. Confirmation lives here, not in
// loadPreset, so loadPreset stays a pure, testable rebuild.
window.loadPresetConfirmed = function(name) {
    if(!name) return;
    const sel = document.getElementById('preset_sel');
    if(Object.keys(window.nodes).length > 0 &&
       !confirm('Loading a preset will clear the current canvas. Continue?')) {
        if(sel) sel.value = '';
        return;
    }
    if(name.startsWith('user:')) {
        // User presets are saved workspaces — load them the same way Load does.
        const data = getUserPresets()[name.slice(5)];
        if(data) window.loadWorkspaceData(JSON.stringify(data));
        else window.showToast('Preset not found');
    } else {
        window.loadPreset(name);
    }
    if(sel) sel.value = '';
};

let presetTimer = null;
window.loadPreset = function(name) {
    if(!name) return;
    const def = PRESETS[name];
    if(!def) { window.showToast(`Unknown preset: ${name}`); return; }

    // A previous preset may still have its cable-wiring timeout pending; drop it
    // or its cables land on top of the canvas we are about to build.
    if(presetTimer) { clearTimeout(presetTimer); presetTimer = null; }
    isRestoring = true;   // building a preset is one atomic act, not undo steps
    Object.keys(window.nodes).forEach(id => window.kill(id));
    clearAllCables();
    window.nodeIdCounter = 0;
    window.undoStack = []; window.redoStack = [];
    worldState = { x: 0, y: 0, zoom: 1 };
    window.updateWorld();

    const ids = def.nodes.map(n => {
        window.createNode(n.type);
        const id = 'node_' + window.nodeIdCounter;
        const el = window.nodes[id].el;
        el.style.left = n.x + 'px';
        el.style.top = n.y + 'px';
        return id;
    });

    presetTimer = setTimeout(() => {
        presetTimer = null;
        // Values are applied here, not above: nodes with deferred init (light
        // builds its fixture controls on a timeout) have no inputs to fill yet.
        def.nodes.forEach((n, i) => {
            // Changing a light's mode rebuilds its fixture controls from scratch,
            // so switch mode first, then fill the controls that rebuild created.
            if(n.type === 'light' && n.values && n.values.mode) {
                const m = document.getElementById(`mode_${ids[i]}`);
                if(m) { m.value = n.values.mode; window.toggleLight(ids[i]); }
            }
            applyPresetValues(ids[i], n.values);
        });
        def.connect.forEach(([a, b]) => window.createCable(ids[a], ids[b]));
        updateCables(); window.triggerUpdate(); window.updateMinimap();
        isRestoring = false;   // preset fully built; start recording undo again
        window.undoStack = []; window.redoStack = [];
        window.showToast(`${def.label} preset loaded`);
    }, 50);

    document.getElementById('preset_sel').value = "";
}

window.showToast = function(msg) {
    let t = document.getElementById('toast');
    if(!t) {
        t = document.createElement('div');
        t.id = 'toast'; t.className = 'toast';
        document.body.appendChild(t);
    }
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

// TOOLS & EXPORTS
window.resetStack = function(id) {
    if(!window.cables.some(c => c.to === id)) return;
    captureState();   // snapshot before the cables are gone
    window.cables = window.cables.filter(c => {
        if(c.to === id) {
            if(window.selectedCable === c) window.selectedCable = null;
            (c.g || c.path).remove();
            return false;
        }
        return true;
    });
    updateCables();
    window.triggerUpdate();
}
window.copyStack = function(id) {
    const ta = document.getElementById(`val_${id}`);
    if(!ta) return;
    ta.select(); ta.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(ta.value).then(() => { window.showToast("Copied to clipboard!"); });
}
// A/B/C variants of the current prompt, side by side, each copyable.
window.showVariants = function(id) {
    const variants = buildVariants(id);
    if(!variants.length) return window.showToast('Generate a prompt first');

    let modal = document.getElementById('variant-modal');
    if(!modal) {
        modal = document.createElement('div');
        modal.id = 'variant-modal'; modal.className = 'modal-sheet';
        modal.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);'
            + 'width:90vw; max-width:640px; max-height:80vh; overflow-y:auto; background:#1a1a1a;'
            + 'border:1px solid #444; border-radius:8px; z-index:3500; padding:20px;'
            + 'box-shadow:0 10px 30px rgba(0,0,0,0.8);';
        document.body.appendChild(modal);
    }
    modal.style.display = 'block';
    modal.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;
             border-bottom:1px solid #333; padding-bottom:10px;">
            <h3 style="margin:0; color:#eee; font-size:1rem;">Prompt Variants</h3>
            <button onclick="document.getElementById('variant-modal').style.display='none'"
                style="background:none; border:none; color:#fff; cursor:pointer; font-size:1.4rem;
                min-width:44px; min-height:44px;">&times;</button>
        </div>
        ${variants.map(v => `
            <div style="margin-bottom:12px;">
                <div style="font-size:0.65rem; color:var(--accent); font-weight:bold; margin-bottom:4px;
                     font-family:'JetBrains Mono',monospace;">${v.key} — ${v.note} · ${v.text.length} karakter</div>
                <textarea readonly style="width:100%; height:80px; background:#111; color:#eee;
                    border:1px solid #333; border-radius:4px; padding:8px; font-size:0.75rem;
                    resize:vertical;">${v.text}</textarea>
                <button class="btn-tool" style="margin-top:4px; width:100%;"
                    onpointerdown="navigator.clipboard.writeText(this.previousElementSibling.value)
                        .then(()=>window.showToast('${v.key} copied'))">COPY ${v.key}</button>
            </div>`).join('')}
    `;
};

// Structured export — the shape a generator API will be handed in Faz 6.
window.copyStructured = function(id) {
    const data = buildStructured(id, window.nodes, window.cables);
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
        .then(() => window.showToast('Structured JSON copied'))
        .catch(() => window.showToast('Copy failed'));
};

// Pan (and gently zoom) the canvas so a node sits centered in the visible area,
// between the top bar and the bottom action bar.
window.focusNode = function(id) {
    const n = window.nodes[id];
    if(!n) return;
    const topH = document.querySelector('.top-bar')?.offsetHeight || 60;
    const botH = window.innerWidth <= 640 ? 60 : 0;   // action bar height on phone
    const cx = window.innerWidth / 2;
    const cy = topH + (window.innerHeight - topH - botH) / 2;
    const nx = parseFloat(n.el.style.left) + n.el.offsetWidth / 2;
    const ny = parseFloat(n.el.style.top) + n.el.offsetHeight / 2;
    if(window.innerWidth <= 640) worldState.zoom = Math.min(worldState.zoom, 0.7);
    worldState.x = cx - nx * worldState.zoom;
    worldState.y = cy - ny * worldState.zoom;
    window.updateWorld();
};

// Bottom-bar "Preview": jump to the preview node, creating one if none exists.
window.focusPreview = function() {
    let id = Object.keys(window.nodes).find(k => window.nodes[k].type === 'preview');
    if(!id) { window.createNode('preview'); id = 'node_' + window.nodeIdCounter; }
    setTimeout(() => window.focusNode(id), 30);
};

// Bottom-bar "Generate": run the first stack that has a real prompt.
window.generateNow = function() {
    const stacks = Object.values(window.nodes).filter(n => n.type === 'stack');
    if(!stacks.length) return window.showToast('Add a Stack node first');
    const ready = stacks.find(s => {
        const v = document.getElementById(`val_${s.id}`)?.value || '';
        return v && !v.startsWith('Connect');
    });
    if(!ready) return window.showToast('Connect nodes to a Stack first');
    sendToAPI(ready.id);
};

// Phone-only: the ⋯ button toggles the file-actions popover.
window.toggleOverflow = function(e) {
    if(e) e.stopPropagation();
    const fa = document.getElementById('file-actions');
    if(!fa) return;
    const open = fa.classList.toggle('open');
    if(open) {
        // Close on the next tap anywhere outside the popover.
        setTimeout(() => document.addEventListener('pointerdown', function off(ev) {
            if(!ev.target.closest('#file-actions') && !ev.target.closest('.overflow-btn')) {
                fa.classList.remove('open');
                document.removeEventListener('pointerdown', off);
            }
        }), 0);
    }
};

window.openHistory = openHistory;
window.clearHistory = clearHistory;
window.exportHistory = exportHistory;
window.sendToAPI = sendToAPI;

// SELECT MODE
window.toggleSelectMode = function() {
    window.selectMode = !window.selectMode;
    const btn = document.getElementById('sel-mode-btn');
    if(window.selectMode) {
        btn.style.borderColor = '#55ff99';
        btn.style.background = 'rgba(85, 255, 153, 0.1)';
        window.showToast('Select mode: ON (Click = select, Ctrl+A = all, Del = delete)');
    } else {
        btn.style.borderColor = '#666';
        btn.style.background = 'transparent';
        window.selectedNodes.clear();
        document.querySelectorAll('.node').forEach(n => n.style.borderColor = '');
        window.showToast('Select mode: OFF');
    }
};

window.toggleNodeSelection = function(id) {
    if(!window.selectMode) return;
    if(window.selectedNodes.has(id)) {
        window.selectedNodes.delete(id);
        document.getElementById(id).style.borderColor = '';
    } else {
        window.selectedNodes.add(id);
        document.getElementById(id).style.borderColor = '#55ff99';
    }
};

window.selectAll = function() {
    if(!window.selectMode) return;
    for(let id in window.nodes) {
        window.selectedNodes.add(id);
        document.getElementById(id).style.borderColor = '#55ff99';
    }
    window.showToast('All nodes selected');
};

window.deleteSelected = function() {
    if(window.selectedNodes.size === 0) return;
    const ids = Array.from(window.selectedNodes);
    window.selectedNodes.clear();
    ids.forEach(id => window.kill(id));
    window.showToast(`${ids.length} nodes deleted`);
};

window.duplicateSelected = function() {
    if(window.selectedNodes.size === 0) return;
    const ids = Array.from(window.selectedNodes);
    ids.forEach(id => window.duplicateNode(id));
    window.showToast(`${ids.length} nodes duplicated`);
};

// QUICK ADD PALETTE
// Palette groups come straight from CATEGORIES, so it can never drift from the
// nav. Registry subjects are folded into `subject` by categoryOf().
function paletteGroups() {
    const out = {};
    for (const key in CATEGORIES) {
        out[key] = CATEGORIES[key].types.slice();
    }
    SUBJECT_TYPES.forEach(t => { if (!out.subject.includes(t)) out.subject.push(t); });
    return out;
}

window.openQuickAdd = function() {
    const modal = document.getElementById('quick-add-modal');
    const search = document.getElementById('quick-add-search');
    search.value = '';
    window.filterQuickAdd('');
    modal.style.display = 'flex';
    search.focus();
};

window.filterQuickAdd = function(query) {
    const list = document.getElementById('quick-add-list');
    list.innerHTML = '';
    const q = query.toLowerCase();
    const groups = paletteGroups();
    for(const cat in groups) {
        const label = CATEGORIES[cat].label;
        const hits = groups[cat].filter(t => t.includes(q) || label.toLowerCase().includes(q));
        if(!hits.length) continue;

        const head = document.createElement('div');
        head.style.cssText = `grid-column:1/-1; font-family:'JetBrains Mono',monospace; font-size:0.5rem;
            letter-spacing:0.14em; color:var(--cat-${cat}); margin:6px 0 2px;`;
        head.textContent = label;
        list.appendChild(head);

        hits.forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'palette-btn';
            btn.setAttribute('data-cat', cat);
            
            btn.textContent = type.toUpperCase();
            btn.onpointerdown = () => {
                createNode(type);
                document.getElementById('quick-add-modal').style.display = 'none';
                window.showToast(`${type} added`);
            };
            list.appendChild(btn);
        });
    }
};

// LONG-PRESS CONTEXT MENU
let longPressTimer = null;
const longPressDuration = 500;

function startLongPress(e, id, type) {
    longPressTimer = setTimeout(() => {
        e.preventDefault();
        showContextMenu(e, id, type);
    }, longPressDuration);
}

function cancelLongPress() {
    if(longPressTimer) clearTimeout(longPressTimer);
}

function showContextMenu(e, id, type) {
    const menu = document.createElement('div');
    menu.style.cssText = 'position:fixed; background:#1a1a1a; border:1px solid #444; border-radius:6px; z-index:4000; box-shadow: 0 4px 12px rgba(0,0,0,0.8); min-width:140px;';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';

    const items = [];
    if(type === 'node') {
        items.push({ label: '🔄 Duplicate', fn: () => window.duplicateNode(id) });
        items.push({ label: '✏️ Select', fn: () => { document.querySelectorAll('.node').forEach(n => n.classList.remove('selected')); document.getElementById(id).classList.add('selected'); } });
        items.push({ label: '🗑️ Delete', fn: () => { window.kill(id); window.showToast('Node deleted'); } });
    } else if(type === 'cable') {
        items.push({ label: '🗑️ Delete connection', fn: () => removeCable(id) });
    }

    items.forEach(item => {
        const btn = document.createElement('button');
        btn.style.cssText = 'display:block; width:100%; text-align:left; background:none; border:none; color:#eee; padding:8px 12px; cursor:pointer; font-size:0.85rem; border-bottom:1px solid #333;';
        btn.textContent = item.label;
        btn.onpointerdown = () => { item.fn(); menu.remove(); };
        menu.appendChild(btn);
    });

    document.body.appendChild(menu);
    setTimeout(() => {
        document.addEventListener('pointerdown', () => menu.remove(), { once: true });
    }, 0);
}

// ---------------------------------------------------------------------------
// THREE.JS PREVIEW
//
// Two views of one scene: an orbit view for staging, and a "through the lens"
// view that renders from the connected camera node with its real focal length.
// The orbit camera keeps its own FOV — the lens FOV belongs to the lens view.
// ---------------------------------------------------------------------------

// Spatial dropdowns <-> world coordinates. SPATIAL_BUCKETS is the single source
// of truth for both directions, so dragging in 3D and picking from the dropdown
// can never disagree.
const SPATIAL_BUCKETS = {
    hpos:  { far_left: -80, camera_left: -40, center: 0, camera_right: 40, far_right: 80 },
    depth: { extreme_fg: 80, foreground: 40, midground: 0, background: -40, far_bg: -80, horizon: -150 },
    vpos:  { below: -20, ground: 0, eye_level: 25, above: 45, overhead: 80 },
};

function nearestBucket(kind, value) {
    const b = SPATIAL_BUCKETS[kind];
    return Object.keys(b).reduce((best, k) =>
        Math.abs(b[k] - value) < Math.abs(b[best] - value) ? k : best, Object.keys(b)[0]);
}

window.initThreePreview = function(id) {
    const container = document.getElementById(`three_${id}`);
    if(!container || !window.THREE) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth/container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const labelContainer = document.createElement('div');
    labelContainer.style.position = 'absolute';
    labelContainer.style.top = '0'; labelContainer.style.left = '0';
    labelContainer.style.width = '100%'; labelContainer.style.height = '100%';
    labelContainer.style.pointerEvents = 'none';
    labelContainer.style.overflow = 'hidden';
    container.appendChild(labelContainer);

    const grid = new THREE.GridHelper(200, 20);
    scene.add(grid);

    // Invisible floor so cast shadows have something to land on.
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(400, 400),
        new THREE.ShadowMaterial({ opacity: 0.35 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    camera.position.set(0, 50, 150);
    camera.lookAt(0,0,0);

    const orbit = new THREE.OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;

    // --- through-the-lens view (hidden until toggled) ---
    const ttlBox = document.getElementById(`ttl_${id}`);
    let ttlRenderer = null;
    const ttlCamera = new THREE.PerspectiveCamera(40, 16/9, 0.1, 2000);
    if(ttlBox) {
        ttlRenderer = new THREE.WebGLRenderer({ antialias: true });
        ttlRenderer.setSize(ttlBox.clientWidth || 300, ttlBox.clientHeight || 180);
        ttlBox.appendChild(ttlRenderer.domElement);
    }

    const preview = {
        scene, camera, renderer, orbit, objects: [], labels: [], labelContainer,
        floor, grid,
        ttlRenderer, ttlCamera, ttlBox, ttlOn: false,
        lens: null,      // {pos, target, fov, action} published by the camera node
        play: null,      // active camera-move playback
        id,
    };
    window.threePreviews[id] = preview;

    attachSceneDrag(preview, container);

    // Keep a renderer matched to its box. Done per-frame rather than through a
    // ResizeObserver: it fires no matter what changed the size — the node's own
    // resize handle, the window, or code — and does not depend on RO delivery
    // timing (which an earlier ResizeObserver approach silently missed when the
    // node grew but the observer never fired).
    let lastW = 0, lastH = 0, lastTW = 0, lastTH = 0;
    const syncSizes = function() {
        const cw = container.clientWidth, ch = container.clientHeight;
        if(cw > 0 && (cw !== lastW || ch !== lastH)) {
            lastW = cw; lastH = ch;
            camera.aspect = cw / ch;
            camera.updateProjectionMatrix();
            renderer.setSize(cw, ch);   // updates the canvas CSS box to fill the container
        }
        if(preview.ttlOn && ttlRenderer && ttlBox) {
            const tw = ttlBox.clientWidth, th = ttlBox.clientHeight;
            if(tw > 0 && (tw !== lastTW || th !== lastTH)) {
                lastTW = tw; lastTH = th;
                ttlCamera.aspect = tw / th;
                ttlCamera.updateProjectionMatrix();
                ttlRenderer.setSize(tw, th);
            }
        }
    };

    const animate = function() {
        requestAnimationFrame(animate);
        syncSizes();
        orbit.update();
        renderer.render(scene, camera);

        if(preview.ttlOn && ttlRenderer) {
            positionLensCamera(preview);
            // The camera's own body sits exactly where the lens is, so without
            // this the lens view renders the inside of its own housing — a
            // black frame. A real camera does not see itself.
            if(preview.camMesh) preview.camMesh.visible = false;
            ttlRenderer.render(scene, ttlCamera);
            if(preview.camMesh) preview.camMesh.visible = true;
        }

        preview.labels.forEach(l => {
            const pos = l.pos.clone();
            pos.project(camera);
            if(pos.z > 1) { l.el.style.display = 'none'; return; }
            l.el.style.display = 'block';
            const x = (pos.x * .5 + .5) * container.clientWidth;
            const y = (pos.y * -.5 + .5) * container.clientHeight;
            l.el.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
        });
    };
    animate();
}

// Place the lens camera for this frame, honouring an in-progress move playback.
function positionLensCamera(preview) {
    const lens = preview.lens;
    const cam = preview.ttlCamera;
    if(!lens) return;

    const target = new THREE.Vector3(lens.target.x, lens.target.y, lens.target.z);
    let pos = new THREE.Vector3(lens.pos.x, lens.pos.y, lens.pos.z);

    if(preview.play) {
        const p = preview.play;
        const t = Math.min(1, (performance.now() - p.t0) / p.duration);
        if(t >= 1) preview.play = null;
        const offset = pos.clone().sub(target);
        if(p.kind === 'orbit') {
            const a = t * Math.PI * 2;
            const r = Math.hypot(offset.x, offset.z);
            pos = new THREE.Vector3(target.x + Math.sin(a) * r, pos.y, target.z + Math.cos(a) * r);
        } else if(p.kind === 'dolly_in') {
            pos = target.clone().add(offset.multiplyScalar(1 - 0.75 * t));
        } else if(p.kind === 'dolly_out') {
            pos = target.clone().add(offset.multiplyScalar(1 + 1.5 * t));
        } else if(p.kind === 'follow') {
            // Target drifts; camera holds its offset and stays locked on.
            target.add(new THREE.Vector3(Math.sin(t * Math.PI * 2) * 25, 0, 0));
            pos = target.clone().add(offset);
        }
    }

    cam.position.copy(pos);
    cam.lookAt(target);
    if(cam.fov !== lens.fov) { cam.fov = lens.fov; cam.updateProjectionMatrix(); }
}

window.toggleLensView = function(id) {
    const p = window.threePreviews[id];
    const wrap = document.getElementById(`ttl_wrap_${id}`);
    const btn = document.getElementById(`ttl_btn_${id}`);
    if(!p || !wrap) return;
    p.ttlOn = !p.ttlOn;
    wrap.style.display = p.ttlOn ? 'block' : 'none';
    if(btn) {
        btn.style.borderColor = p.ttlOn ? 'var(--accent)' : '#333';
        btn.style.color = p.ttlOn ? 'var(--accent)' : '#aaa';
    }
    if(p.ttlOn && !p.lens) window.showToast('Connect a Camera node');
    if(p.ttlOn && p.ttlRenderer && p.ttlBox && p.ttlBox.clientWidth) {
        p.ttlCamera.aspect = p.ttlBox.clientWidth / p.ttlBox.clientHeight;
        p.ttlCamera.updateProjectionMatrix();
        p.ttlRenderer.setSize(p.ttlBox.clientWidth, p.ttlBox.clientHeight);
    }
};

window.playCameraMove = function(id) {
    const p = window.threePreviews[id];
    if(!p) return;
    if(!p.lens) return window.showToast('Connect a Camera node');
    const kind = p.lens.action;
    if(!kind || kind === 'none') return window.showToast('Set ADVANCED TRACKING on the camera');
    if(!p.ttlOn) window.toggleLensView(id);
    p.play = { kind, t0: performance.now(), duration: 3000 };
    window.showToast('Playing ' + kind.replace('_', ' '));
};

// Drag a subject on the ground plane; snap to the nearest spatial bucket and
// write it back to the dropdowns, so the 3D view and the fields stay in sync.
function attachSceneDrag(preview, container) {
    const canvas = preview.renderer.domElement;
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let dragId = null;

    const ndc = e => {
        const r = canvas.getBoundingClientRect();
        return new THREE.Vector2(
            ((e.clientX - r.left) / r.width) * 2 - 1,
            -((e.clientY - r.top) / r.height) * 2 + 1
        );
    };
    const nodeIdAt = e => {
        ray.setFromCamera(ndc(e), preview.camera);
        const hits = ray.intersectObjects(preview.objects, true);
        for(const h of hits) {
            let o = h.object;
            while(o) { if(o.userData && o.userData.nodeId) return o.userData.nodeId; o = o.parent; }
        }
        return null;
    };

    canvas.addEventListener('pointerdown', e => {
        const nid = nodeIdAt(e);
        // Only nodes that expose spatial fields can be placed this way.
        if(!nid || !document.getElementById(`hpos_${nid}`)) return;
        dragId = nid;
        preview.orbit.enabled = false;   // don't spin the view while placing
        canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', e => {
        if(!dragId) return;
        ray.setFromCamera(ndc(e), preview.camera);
        const hit = new THREE.Vector3();
        if(!ray.ray.intersectPlane(plane, hit)) return;
        const h = document.getElementById(`hpos_${dragId}`);
        const d = document.getElementById(`depth_${dragId}`);
        if(!h || !d) return;
        const nh = nearestBucket('hpos', hit.x);
        const nd = nearestBucket('depth', hit.z);
        if(h.value !== nh || d.value !== nd) {
            h.value = nh; d.value = nd;
            window.triggerUpdate();
        }
    });

    const end = e => {
        if(!dragId) return;
        dragId = null;
        preview.orbit.enabled = true;
        if(canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
            canvas.releasePointerCapture(e.pointerId);
        }
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
}

// Mark an object (and everything under it) as belonging to a node, so a raycast
// hit on any child resolves back to the node — and make it cast shadows.
function tagForPicking(obj, nodeId) {
    obj.userData.nodeId = nodeId;
    obj.traverse(o => {
        o.userData.nodeId = nodeId;
        if(o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
}

window.updateThreePreview = function(pid) {
    const preview = window.threePreviews[pid];
    if(!preview) return;

    preview.objects.forEach(obj => preview.scene.remove(obj));
    preview.objects = [];
    preview.labels = [];
    preview.labelContainer.innerHTML = '';
    preview.scene.background = new THREE.Color(0x1a1a1a);
    // Rebuilt below only if a camera node is still connected; otherwise the lens
    // view would keep aiming from a camera that no longer exists.
    preview.lens = null;
    preview.camMesh = null;

    const inputs = window.cables.filter(c => c.to === pid);

    // Reads straight off SPATIAL_BUCKETS — the same table nearestBucket() uses to
    // go the other way when you drag an object, so the two can never disagree.
    const getSpatialCoords = (id) => {
        const pick = (kind, fallback) => {
            const v = document.getElementById(`${kind}_${id}`)?.value || fallback;
            const b = SPATIAL_BUCKETS[kind];
            return b[v] !== undefined ? b[v] : b[fallback];
        };
        return {
            x: pick('hpos', 'center'),
            y: pick('vpos', 'ground'),
            z: pick('depth', 'midground'),
        };
    };

    const renderNodeIn3D = (node, customCoords = null) => {
        const coords = customCoords || getSpatialCoords(node.id);
        const {x, y, z} = coords;

        // Set by the camera branch below once it resolves its tracking target;
        // the lens view then aims at the same point the dashed line points to.
        let camTarget = null;

        const hSel = document.getElementById(`hpos_${node.id}`);
        const vSel = document.getElementById(`vpos_${node.id}`);
        const dSel = document.getElementById(`depth_${node.id}`);
        const hVal = hSel && hSel.selectedIndex >= 0 ? hSel.options[hSel.selectedIndex].text : '';
        const vVal = vSel && vSel.selectedIndex >= 0 ? vSel.options[vSel.selectedIndex].text : '';
        const dVal = dSel && dSel.selectedIndex >= 0 ? dSel.options[dSel.selectedIndex].text : '';
        let labelText = [hVal, vVal, dVal].filter(Boolean).join(' | ');
        
        if (node.type === 'character') {
            labelText = document.getElementById(`chr_name_${node.id}`)?.value || 'CHARACTER';
        } else if (node.type === 'light') {
            labelText = "LIGHT" + (labelText ? ' : ' + labelText : '');
        } else if (node.type === 'camera') {
            labelText = "CAMERA" + (labelText ? ' : ' + labelText : '');
            
            const advAct = document.getElementById(`cam_adv_act_${node.id}`)?.value || 'none';
            const advTgt = document.getElementById(`cam_adv_tgt_${node.id}`)?.value || '';
            const advDist = document.getElementById(`cam_adv_dist_${node.id}`)?.value || '';
            
            if (advAct !== 'none' && advTgt) {
                let actionStr = advAct.toUpperCase().replace('_', ' ');
                let trackInfo = `\n[${actionStr}: ${advTgt}`;
                if (advDist) {
                    const distName = document.getElementById(`cam_adv_dist_${node.id}`)?.options[document.getElementById(`cam_adv_dist_${node.id}`).selectedIndex]?.text || '';
                    if (distName && !distName.includes('Auto')) trackInfo += ` | ${distName}`;
                }
                trackInfo += `]`;
                labelText += trackInfo;
                
                let tgtNode = null;
                for (let nid in window.nodes) {
                    const n = window.nodes[nid];
                    if (n.id !== node.id && nodeDisplayName(n) === advTgt) { tgtNode = n; break; }
                }
                
                if (tgtNode) {
                    let tx = 0, ty = 0, tz = 0;
                    const feeder = window.cables.find(f => f.to === tgtNode.id && window.nodes[f.from]?.type === 'position');
                    if (feeder && window.nodes[feeder.from]) {
                        tx = parseFloat(document.getElementById(`x_${feeder.from}`)?.value || 0);
                        ty = parseFloat(document.getElementById(`y_${feeder.from}`)?.value || 0);
                        tz = parseFloat(document.getElementById(`z_${feeder.from}`)?.value || 0);
                    } else {
                        const tc = getSpatialCoords(tgtNode.id);
                        tx = tc.x; ty = tc.y; tz = tc.z;
                    }
                    
                    camTarget = { x: tx, y: ty + 15, z: tz };   // lens view aims here too

                    const points = [new THREE.Vector3(x, y + 15, z), new THREE.Vector3(tx, ty + 15, tz)];
                    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
                    const lineMat = new THREE.LineDashedMaterial({ color: 0xff00ff, dashSize: 2, gapSize: 2 });
                    const line = new THREE.Line(lineGeo, lineMat);
                    line.computeLineDistances();
                    preview.scene.add(line);
                    preview.objects.push(line);
                }
            }
        } else if (node.type === 'object') {
            labelText = document.getElementById(`val_${node.id}`)?.value || 'OBJECT';
        } else if (SUBJECTS[node.type]) {
            labelText = SUBJECTS[node.type].label(readSubject(node.type, node.id));
        } else if (node.type === 'customloc') {
            labelText = "📍 " + (document.getElementById(`loc_name_${node.id}`)?.value || 'LOCATION');
        }

        if(labelText && node.type !== 'scene' && node.type !== 'position') {
            const el = document.createElement('div');
            el.innerText = labelText;
            el.style.position = 'absolute';
            el.style.color = '#00f2ea';
            el.style.background = 'rgba(0,0,0,0.7)';
            el.style.border = '1px solid #00f2ea';
            el.style.padding = '2px 6px';
            el.style.borderRadius = '4px';
            el.style.fontSize = '10px';
            el.style.fontWeight = 'bold';
            el.style.whiteSpace = 'pre';
            el.style.textAlign = 'center';
            preview.labelContainer.appendChild(el);
            preview.labels.push({ el, pos: new THREE.Vector3(x, y + 25, z) });
        }

        if (node.type === 'character') {
            const charGroup = new THREE.Group();
            const bodyGeo = new THREE.CylinderGeometry(4, 4, 15, 16);
            const bodyMat = new THREE.MeshStandardMaterial({color: 0x3388ff});
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 7.5;
            const headGeo = new THREE.SphereGeometry(3.5, 16, 16);
            const headMat = new THREE.MeshStandardMaterial({color: 0xffccaa});
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 18;
            charGroup.add(body); charGroup.add(head);
            charGroup.position.set(x, y, z);
            tagForPicking(charGroup, node.id);
            preview.scene.add(charGroup);
            preview.objects.push(charGroup);
        }
        else if (node.type === 'object') {
            const geo = new THREE.BoxGeometry(10, 10, 10);
            const mat = new THREE.MeshStandardMaterial({color: 0xaaaaaa});
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, y + 5, z);
            tagForPicking(mesh, node.id);
            preview.scene.add(mesh);
            preview.objects.push(mesh);
        }
        else if (SUBJECTS[node.type]) {
            // Geometry comes from the registry; it returns a group whose origin
            // is the subject's ground point.
            const g = SUBJECTS[node.type].mesh(readSubject(node.type, node.id), THREE);
            g.position.set(x, y, z);
            tagForPicking(g, node.id);
            preview.scene.add(g);
            preview.objects.push(g);
        }
        else if (node.type === 'customloc') {
            const envColor = {
                'Interior': 0x443322, 'Exterior': 0x224433, 'Underground': 0x222228,
                'Underwater': 0x113344, 'Aerial / Sky': 0x3366aa, 'Outer Space': 0x080812,
                'Mixed Interior/Exterior': 0x333322
            };
            const scaleMap = { 'Cramped / Claustrophobic': 60, 'Intimate': 90, 'Room-sized': 120, 'Spacious': 170, 'Vast / Cavernous': 240, 'Endless / Infinite Horizon': 340 };
            const env = document.getElementById(`loc_env_${node.id}`)?.value || 'Exterior';
            const sz = scaleMap[document.getElementById(`loc_scale_${node.id}`)?.value] || 170;
            const col = envColor[env] || 0x333333;
            const plane = new THREE.Mesh(
                new THREE.PlaneGeometry(sz, sz),
                new THREE.MeshStandardMaterial({color: col, transparent: true, opacity: 0.3, side: THREE.DoubleSide})
            );
            plane.rotation.x = -Math.PI / 2;
            plane.position.set(0, 0.2, 0);
            plane.receiveShadow = true;
            preview.scene.add(plane);
            preview.objects.push(plane);

            // Enclosed environments get three solid walls (the fourth is left
            // open — it is where the camera lives). Open ones stay a wireframe
            // volume so they don't box the scene in.
            const enclosed = ['Interior', 'Underground'].includes(env);
            if(enclosed) {
                const h = sz * 0.5;
                const wallMat = new THREE.MeshStandardMaterial({
                    color: col, side: THREE.DoubleSide, transparent: true, opacity: 0.55,
                });
                const walls = new THREE.Group();
                const back = new THREE.Mesh(new THREE.PlaneGeometry(sz, h), wallMat);
                back.position.set(0, h / 2, -sz / 2);
                const left = new THREE.Mesh(new THREE.PlaneGeometry(sz, h), wallMat);
                left.rotation.y = Math.PI / 2; left.position.set(-sz / 2, h / 2, 0);
                const right = new THREE.Mesh(new THREE.PlaneGeometry(sz, h), wallMat);
                right.rotation.y = -Math.PI / 2; right.position.set(sz / 2, h / 2, 0);
                [back, left, right].forEach(w => { w.receiveShadow = true; walls.add(w); });
                preview.scene.add(walls);
                preview.objects.push(walls);
            } else {
                const box = new THREE.Mesh(
                    new THREE.BoxGeometry(sz, sz * 0.5, sz),
                    new THREE.MeshBasicMaterial({color: col, wireframe: true, transparent: true, opacity: 0.25})
                );
                box.position.set(0, sz * 0.25, 0);
                preview.scene.add(box);
                preview.objects.push(box);
            }
        }
        else if (node.type === 'light') {
            const mode = document.getElementById(`mode_${node.id}`)?.value || 'industrial';
            let color = 0xffffff, intensity = 1;
            if(mode === 'industrial') {
                const k = document.getElementById(`kel_${node.id}`)?.value || 5500;
                const w = document.getElementById(`watt_${node.id}`)?.value || 500;
                const rgbMatch = window.kelvinToRgb ? window.kelvinToRgb(k).match(/\d+/g) : [255,255,255];
                if(rgbMatch) color = new THREE.Color(`rgb(${rgbMatch[0]}, ${rgbMatch[1]}, ${rgbMatch[2]})`);
                intensity = w / 500;
            } else {
                intensity = 2;
                color = new THREE.Color(0xffeedd);
                preview.scene.background = new THREE.Color(0x87CEEB);
            }
            
            const lightGroup = new THREE.Group();
            const standGeo = new THREE.CylinderGeometry(0.5, 0.5, 20, 8);
            const standMat = new THREE.MeshStandardMaterial({color: 0x111111});
            const stand = new THREE.Mesh(standGeo, standMat);
            stand.position.y = 10;
            const headGeo = new THREE.BoxGeometry(6, 6, 6);
            const headMat = new THREE.MeshStandardMaterial({color: 0x444444});
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 20;
            const bulbGeo = new THREE.SphereGeometry(2, 16, 16);
            const bulbMat = new THREE.MeshBasicMaterial({color: color});
            const bulb = new THREE.Mesh(bulbGeo, bulbMat);
            bulb.position.y = 20; bulb.position.z = 3;
            
            if(mode === 'industrial') {
                lightGroup.add(stand); lightGroup.add(head); lightGroup.add(bulb);
                lightGroup.position.set(x, y, z);
                lightGroup.lookAt(0, 10, 0); 
            }
            
            const pl = new THREE.PointLight(color, intensity, 300);
            pl.position.set(x, y + 20, z);
            // Gel and colour temperature now actually fall on the scene.
            pl.castShadow = true;
            pl.shadow.mapSize.set(1024, 1024);
            pl.shadow.bias = -0.005;

            if(mode === 'industrial') {
                preview.scene.add(lightGroup); preview.objects.push(lightGroup);
            } else {
                const sunGeo = new THREE.SphereGeometry(15, 16, 16);
                const sunMesh = new THREE.Mesh(sunGeo, bulbMat);
                sunMesh.position.set(x, y + 60, z - 40);
                pl.position.copy(sunMesh.position);
                preview.scene.add(sunMesh); preview.objects.push(sunMesh);
            }
            
            preview.scene.add(pl);
            preview.objects.push(pl);
        }
        else if (node.type === 'camera') {
            const mm = parseFloat(document.getElementById(`mm_in_${node.id}`)?.value || 50);
            // 24mm is the Super35 sensor height; this is the vertical FOV.
            const fov = 2 * Math.atan(24 / (2 * mm)) * (180 / Math.PI);

            // Publish the lens for the through-the-lens view. This used to
            // overwrite the orbit camera's FOV, which made the staging view
            // zoom whenever you changed focal length — the lens FOV belongs to
            // the lens view.
            preview.lens = {
                pos: { x, y: y + 15, z },
                target: camTarget || { x: 0, y: 10, z: 0 },
                fov,
                action: document.getElementById(`cam_adv_act_${node.id}`)?.value || 'none',
            };

            const camGroup = new THREE.Group();
            const bodyGeo = new THREE.BoxGeometry(8, 8, 12);
            const bodyMat = new THREE.MeshStandardMaterial({color: 0x222222});
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            const lensGeo = new THREE.CylinderGeometry(3, 4, 8, 16);
            const lensMat = new THREE.MeshStandardMaterial({color: 0x111111});
            const lens = new THREE.Mesh(lensGeo, lensMat);
            lens.rotation.x = Math.PI / 2;
            lens.position.z = 6;
            camGroup.add(body); camGroup.add(lens);
            camGroup.position.set(x, y + 15, z);
            camGroup.lookAt(camTarget ? new THREE.Vector3(camTarget.x, camTarget.y, camTarget.z)
                                      : new THREE.Vector3(0, 10, 0));

            preview.camMesh = camGroup;   // hidden while rendering the lens view
            preview.scene.add(camGroup);
            preview.objects.push(camGroup);
        }
        else if (node.type === 'scene') {
            const timeStr = document.getElementById(`scn_time_${node.id}`)?.value || "";
            let addSun = false;
            let sunColor = 0xffffff;
            let sunX = -80, sunY = 60, sunZ = -80;

            if (timeStr.includes("Night")) {
                preview.scene.background = new THREE.Color(0x050510);
            } else {
                addSun = true;
                if (timeStr.includes("Golden Hour") || timeStr.includes("Twilight")) {
                    preview.scene.background = new THREE.Color(0xcc5522);
                    sunColor = 0xffaa55;
                    sunY = 20;
                    sunX = timeStr.includes("Morning") ? 100 : -100;
                } else if (timeStr.includes("Morning") || timeStr.includes("Pre-dawn")) {
                    preview.scene.background = new THREE.Color(0x87CEEB);
                    sunColor = 0xffffee;
                    sunY = 50;
                    sunX = 80;
                } else if (timeStr.includes("Noon")) {
                    preview.scene.background = new THREE.Color(0x60b0ff);
                    sunColor = 0xffffff;
                    sunY = 120;
                    sunX = 0;
                } else {
                    preview.scene.background = new THREE.Color(0x87CEEB);
                    sunColor = 0xffffee;
                    sunY = 50;
                    sunX = -80;
                }
            }
            if (addSun) {
                const dl = new THREE.DirectionalLight(sunColor, 1.5);
                dl.position.set(sunX, sunY, sunZ);
                // Sun casts too — this is what makes time-of-day read in 3D.
                dl.castShadow = true;
                dl.shadow.mapSize.set(2048, 2048);
                Object.assign(dl.shadow.camera,
                    { left: -150, right: 150, top: 150, bottom: -150, near: 1, far: 600 });
                dl.shadow.bias = -0.002;
                const sunGeo = new THREE.SphereGeometry(12, 16, 16);
                const sunMat = new THREE.MeshBasicMaterial({color: sunColor});
                const sunMesh = new THREE.Mesh(sunGeo, sunMat);
                sunMesh.position.copy(dl.position);
                preview.scene.add(dl); preview.scene.add(sunMesh);
                preview.objects.push(dl, sunMesh);
                
                const el = document.createElement('div');
                el.innerText = 'SUNLIGHT';
                el.style.position = 'absolute'; el.style.color = '#ffcc00'; el.style.background = 'rgba(0,0,0,0.5)';
                el.style.padding = '2px 6px'; el.style.borderRadius = '4px'; el.style.fontSize = '10px'; el.style.fontWeight = 'bold';
                preview.labelContainer.appendChild(el);
                preview.labels.push({ el, pos: new THREE.Vector3(sunX, sunY + 15, sunZ) });
            }
        }
    };

    inputs.forEach(c => {
        const srcNode = window.nodes[c.from];
        if(!srcNode) return;

        if (srcNode.type === 'stack') {
            const stackInputs = window.cables.filter(sc => sc.to === srcNode.id).map(sc => window.nodes[sc.from]);
            stackInputs.forEach(sn => {
                if(sn) renderNodeIn3D(sn);
            });
        } 
        else if (srcNode.type === 'position') {
            const x = parseFloat(document.getElementById(`x_${srcNode.id}`).value);
            const y = parseFloat(document.getElementById(`y_${srcNode.id}`).value);
            const z = parseFloat(document.getElementById(`z_${srcNode.id}`).value);
            const feeder = window.cables.find(f => f.to === srcNode.id);
            if(feeder && window.nodes[feeder.from]) {
                renderNodeIn3D(window.nodes[feeder.from], {x, y, z});
            }
        }
        else {
            renderNodeIn3D(srcNode);
        }
    });
}

// KEYBOARD SHORTCUTS
document.addEventListener('keydown', (e) => {
    if(e.key === 's' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault(); window.toggleSelectMode();
    }
    if(e.key === 'r' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault(); window.randomizeAll();
    }
    if(e.code === 'Tab' && document.activeElement.id !== 'quick-add-search') {
        e.preventDefault(); window.openQuickAdd();
    }
    if(e.code === 'Space' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault(); spaceDown = true; viewport.style.cursor = 'grab';
    }
    if((e.ctrlKey || e.metaKey) && e.key === 'z' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault(); window.undo();
    }
    if((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z')) && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault(); window.redo();
    }
    if((e.ctrlKey || e.metaKey) && e.key === 'a' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if(window.selectMode) window.selectAll();
    }
    if((e.ctrlKey || e.metaKey) && e.key === 'd' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if(window.selectMode && window.selectedNodes.size > 0) {
            window.duplicateSelected();
        } else {
            const selected = document.querySelector('.node.selected');
            if(selected) window.duplicateNode(selected.id);
        }
    }
    if(e.key === 'Escape') {
        document.querySelectorAll('#quick-add-modal, #history-modal, #variant-modal, #preset-modal')
            .forEach(m => { if(m) m.style.display = 'none'; });
        const fa = document.getElementById('file-actions');
        if(fa) fa.classList.remove('open');
        clearCableSelection();
        disarmSocket();
    }
    if(e.key === 'Delete' || e.key === 'Backspace') {
        if(document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            if(window.selectedCable) {
                removeCable(window.selectedCable);
                window.showToast('Connection deleted');
            } else if(window.selectMode && window.selectedNodes.size > 0) {
                window.deleteSelected();
            } else {
                const selected = document.querySelector('.node.selected');
                if(selected) { window.kill(selected.id); window.showToast("Node deleted"); }
            }
        }
    }
});

document.addEventListener('keyup', (e) => {
    if(e.code === 'Space') { spaceDown = false; viewport.style.cursor = 'default'; }
});

// One nav button per registry entry, so a new subject node shows up in the UI
// without touching index.html.
function buildSubjectNav() {
    const host = document.getElementById('subject-nav');
    if(!host) return;
    // Subjects share the category colour rather than each carrying its own —
    // a registry entry's nav.label still names it, but the hue says "subject".
    host.innerHTML = SUBJECT_TYPES.map(t =>
        `<button class="nav-btn" data-cat="subject"
            onpointerdown="createNode('${t}')">${SUBJECTS[t].nav.label}</button>`
    ).join('');
}

// ---------------------------------------------------------------------------
// USER PRESETS
//
// A user preset is just a saved workspace stored under a name. It uses the same
// serialize/restore path as Save/Load, so anything that loads also presets —
// no second format to keep in sync. Built-in presets (PRESETS) stay code;
// user presets live in localStorage.
// ---------------------------------------------------------------------------
const USER_PRESETS_KEY = 'user_presets';

function getUserPresets() {
    try { return JSON.parse(localStorage.getItem(USER_PRESETS_KEY)) || {}; }
    catch(e) { return {}; }
}
function setUserPresets(obj) {
    localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(obj));
}

// ---------------------------------------------------------------------------
// RANDOMIZE — build a whole coherent scene from nothing, dice-roll every field.
// ---------------------------------------------------------------------------
const rand = arr => arr[Math.floor(Math.random() * arr.length)];

// Pick a random assigned option (never the "unassigned" empty one).
function randomizeSelect(sel) {
    const opts = Array.from(sel.options).filter(o => o.value !== '' && !o.disabled);
    if(opts.length) sel.value = rand(opts).value;
}

function randomizeNodeInputs(nodeId) {
    const node = window.nodes[nodeId];
    if(!node) return;
    node.el.querySelectorAll('select').forEach(sel => {
        if(sel.id.startsWith('cam_adv_tgt_')) return;       // dynamic; wired separately
        if(sel.id.startsWith('cam_adv_act_')) return;       // leave the camera static
        if(sel.id.startsWith('mode_')) return;              // light mode handled below
        randomizeSelect(sel);
    });
    node.el.querySelectorAll('input[type="range"]').forEach(r => {
        const min = +r.min || 0, max = +r.max || 100;
        r.value = Math.round(min + Math.random() * (max - min));
    });
    // Focal length: a sane cinematic pick, not a random number up to 2000mm.
    const mmSl = node.el.querySelector('[id^="mm_sl_"]');
    const mmIn = node.el.querySelector('[id^="mm_in_"]');
    if(mmSl && mmIn) { const mm = rand([18, 24, 35, 50, 85, 135]); mmSl.value = mm; mmIn.value = mm; }
}

window.randomizeAll = function() {
    if(Object.keys(window.nodes).length > 0 &&
       !confirm('Randomize will replace the current canvas. Continue?')) return;

    if(presetTimer) { clearTimeout(presetTimer); presetTimer = null; }
    isRestoring = true;
    Object.keys(window.nodes).forEach(id => window.kill(id));
    clearAllCables();
    window.nodeIdCounter = 0;
    window.undoStack = []; window.redoStack = [];
    worldState = { x: 0, y: 0, zoom: 1 };
    window.updateWorld();

    // One random subject alongside the fixed set — sometimes a person, sometimes
    // a beast or a vehicle, so no two rolls look the same.
    const subject = rand(['character', ...SUBJECT_TYPES]);
    const layout = [
        ['scene', 40, 40], [subject, 40, 320], ['style', 40, 620],
        ['light', 360, 40], ['camera', 360, 320],
        ['colorg', 680, 40], ['shot', 680, 340],
        ['stack', 1000, 120], ['preview', 1320, 60],
    ];
    const ids = {};
    layout.forEach(([type, x, y]) => {
        window.createNode(type);
        const id = 'node_' + window.nodeIdCounter;
        window.nodes[id].el.style.left = x + 'px';
        window.nodes[id].el.style.top = y + 'px';
        (ids[type] = ids[type] || []).push(id);
    });

    // Deferred-init nodes (light panel, camera flavour) finish on a timeout, so
    // fill values and wire after that — same reason loadPreset waits.
    presetTimer = setTimeout(() => {
        presetTimer = null;

        // Light: coin-flip the mode, rebuild its panel, then randomize what's there.
        (ids.light || []).forEach(id => {
            const mode = document.getElementById(`mode_${id}`);
            if(mode) { mode.value = rand(['industrial', 'sunlight']); window.toggleLight(id); }
        });

        layout.forEach(([type]) => (ids[type] || []).forEach(randomizeNodeInputs));

        const stackId = ids.stack[0];
        const previewId = ids.preview[0];
        ['scene', subject, 'style', 'light', 'camera', 'colorg', 'shot']
            .forEach(t => (ids[t] || []).forEach(id => window.createCable(id, stackId)));
        window.createCable(stackId, previewId);

        updateCables();
        window.triggerUpdate();
        isRestoring = false;
        window.undoStack = []; window.redoStack = [];
        window.showToast('🎲 Randomized!');
    }, 60);
};

window.saveAsPreset = function() {
    if(Object.keys(window.nodes).length === 0) return window.showToast('Nothing to save yet');
    const name = (prompt('Preset name:') || '').trim();
    if(!name) return;
    const presets = getUserPresets();
    if(presets[name] && !confirm(`"${name}" already exists. Overwrite?`)) return;
    presets[name] = serializeWorkspace();
    setUserPresets(presets);
    buildPresetMenu();
    window.showToast(`Preset "${name}" saved`);
};

window.deleteUserPreset = function(name) {
    const presets = getUserPresets();
    if(!presets[name]) return;
    if(!confirm(`Delete preset "${name}"?`)) return;
    delete presets[name];
    setUserPresets(presets);
    buildPresetMenu();
    renderPresetManager();
    window.showToast(`Preset "${name}" deleted`);
};

// Built-in presets and user presets in one dropdown. Built-in values are the
// plain key; user values are prefixed so loadPresetConfirmed can tell them apart.
function buildPresetMenu() {
    const sel = document.getElementById('preset_sel');
    if(!sel) return;
    const builtins = Object.keys(PRESETS)
        .map(k => `<option value="${k}">${PRESETS[k].label}</option>`).join('');
    const users = Object.keys(getUserPresets());
    const userOpts = users.length
        ? `<optgroup label="My Presets">`
            + users.map(n => `<option value="user:${n}">${n}</option>`).join('')
            + `</optgroup>`
        : '';
    sel.innerHTML = '<option value="">-- Presets --</option>'
        + `<optgroup label="Built-in">${builtins}</optgroup>` + userOpts;
}

// Manager modal: save the current canvas, and delete existing user presets.
window.openPresetManager = function() {
    let modal = document.getElementById('preset-modal');
    if(!modal) {
        modal = document.createElement('div');
        modal.id = 'preset-modal'; modal.className = 'modal-sheet';
        modal.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);'
            + 'width:90vw; max-width:420px; max-height:80vh; overflow-y:auto; background:#1a1a1a;'
            + 'border:1px solid #444; border-radius:8px; z-index:3500; padding:20px;'
            + 'box-shadow:0 10px 30px rgba(0,0,0,0.8);';
        document.body.appendChild(modal);
    }
    modal.style.display = 'block';
    renderPresetManager();
};

function renderPresetManager() {
    const modal = document.getElementById('preset-modal');
    if(!modal || modal.style.display === 'none') return;
    const users = Object.keys(getUserPresets());
    modal.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;
             border-bottom:1px solid #333; padding-bottom:10px;">
            <h3 style="margin:0; color:#eee; font-size:1rem;">Presets</h3>
            <button onclick="document.getElementById('preset-modal').style.display='none'"
                style="background:none; border:none; color:#fff; cursor:pointer; font-size:1.4rem;
                min-width:44px; min-height:44px;">&times;</button>
        </div>
        <button class="btn-gen" style="background:var(--cat-output); margin-bottom:14px;"
            onpointerdown="saveAsPreset()">💾 Save current canvas as preset</button>
        <div style="font-size:0.6rem; color:#666; letter-spacing:0.12em; margin-bottom:6px;">BUILT-IN</div>
        ${Object.keys(PRESETS).map(k => `
            <div style="display:flex; gap:8px; align-items:center; padding:8px; background:#111;
                 border:1px solid #2a2a2a; border-radius:6px; margin-bottom:6px;">
                <span style="flex:1; color:#ddd; font-size:0.85rem;">${PRESETS[k].label}</span>
                <button class="btn-tool" style="flex:0 0 auto; min-width:64px;"
                    onpointerdown="loadPresetConfirmed('${k}'); document.getElementById('preset-modal').style.display='none';">Load</button>
            </div>`).join('')}
        <div style="font-size:0.6rem; color:#666; letter-spacing:0.12em; margin:14px 0 6px;">MY PRESETS</div>
        ${users.length ? users.map(n => `
            <div style="display:flex; gap:8px; align-items:center; padding:8px; background:#111;
                 border:1px solid #2a2a2a; border-radius:6px; margin-bottom:6px;">
                <span style="flex:1; color:#ddd; font-size:0.85rem; overflow:hidden; text-overflow:ellipsis;
                     white-space:nowrap;">${n}</span>
                <button class="btn-tool" style="flex:0 0 auto; min-width:64px;"
                    onpointerdown="loadPresetConfirmed('user:${n.replace(/'/g, "\\'")}'); document.getElementById('preset-modal').style.display='none';">Load</button>
                <button class="btn-tool" style="flex:0 0 auto; min-width:64px; color:#ff7777; border-color:#5a2020;"
                    onpointerdown="deleteUserPreset('${n.replace(/'/g, "\\'")}')">Delete</button>
            </div>`).join('')
        : '<div style="color:#666; font-size:0.8rem;">No saved presets yet.</div>'}
    `;
}

window.onload = () => {
    buildSubjectNav();
    buildPresetMenu();
    // Choosing a file action closes the phone overflow popover behind the modal.
    const fa = document.getElementById('file-actions');
    if(fa) fa.addEventListener('pointerdown', e => {
        if(e.target.closest('.nav-btn')) fa.classList.remove('open');
    });
    if(localStorage.getItem('scene_save')) {
        window.loadWorkspaceData(localStorage.getItem('scene_save'));
    } else {
        window.loadPreset('cyberpunk');
        window.showToast("Welcome! Loaded Cyberpunk Demo");
    }
}
