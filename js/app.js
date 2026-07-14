// Standard script mode, DB and promptEngine are loaded globally.

window.nodeIdCounter = 0;
window.nodes = {}; 
window.cables = [];

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
    if(!spaceDown && (e.target.closest('.node-content') || e.target.closest('.top-nav'))) return;
    if(spaceDown || e.target === viewport || e.target.classList.contains('grid-layer')) {
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

function getSpatialContextHTML(id) {
    return `
    <details class="spatial-panel">
        <summary>📍 SPATIAL CONTEXT</summary>
        <div class="spatial-grid">
            <div style="font-size:0.6rem; color:#666">DEPTH</div>
            <select id="depth_${id}" onchange="triggerUpdate()">
                <option value="extreme_fg">Extreme Foreground</option>
                <option value="foreground" selected>Foreground</option>
                <option value="midground">Midground</option>
                <option value="background">Background</option>
                <option value="far_bg">Far Background</option>
                <option value="horizon">Horizon</option>
            </select>
            <div style="font-size:0.6rem; color:#666">HORIZONTAL</div>
            <select id="hpos_${id}" onchange="triggerUpdate()">
                <option value="far_left">Far Left</option>
                <option value="camera_left">Camera-Left</option>
                <option value="center" selected>Center</option>
                <option value="camera_right">Camera-Right</option>
                <option value="far_right">Far Right</option>
            </select>
            <div style="font-size:0.6rem; color:#666">VERTICAL</div>
            <select id="vpos_${id}" onchange="triggerUpdate()">
                <option value="ground">Ground Level</option>
                <option value="eye_level" selected>Eye Level</option>
                <option value="above">Above</option>
                <option value="overhead">Overhead</option>
                <option value="below">Below (Sunken)</option>
            </select>
        </div>
    </details>`;
}

window.createNode = function(type) {
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
            <select id="scn_loc_${id}" onchange="triggerUpdate()">${DB.sceneLoc.map(o=>`<option>${o}</option>`).join('')}</select>
            <input type="text" class="obj-input" id="scn_cust_${id}" placeholder="Custom details (e.g. broken glass)" oninput="triggerUpdate()" style="margin-top:5px">
            
            <div style="font-size:0.6rem; color:#666; margin-top:5px">TIME OF DAY</div>
            <select id="scn_time_${id}" onchange="triggerUpdate()">${DB.sceneTime.map(o=>`<option>${o}</option>`).join('')}</select>
            
            <div style="display:flex; gap:5px; margin-top:5px">
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">WEATHER</div><select id="scn_wea_${id}" onchange="triggerUpdate()">${DB.sceneWeather.map(o=>`<option>${o}</option>`).join('')}</select></div>
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">MOOD</div><select id="scn_mood_${id}" onchange="triggerUpdate()">${DB.sceneMood.map(o=>`<option>${o}</option>`).join('')}</select></div>
            </div>
            
            <div style="font-size:0.6rem; color:#666; margin-top:5px">DENSITY (1-10)</div>
            <input type="range" id="scn_den_${id}" min="1" max="10" value="3" oninput="triggerUpdate()">
        `;
    }
    else if (type === 'style') {
        title = "STYLE"; hasIn = false; hasOut = true;
        content = `
            <div style="font-size:0.6rem; color:#666">CINEMATIC STYLE</div>
            <select id="sty_cin_${id}" onchange="triggerUpdate()">${DB.styleCinematic.map(o=>`<option>${o}</option>`).join('')}</select>
            
            <div style="display:flex; gap:5px; margin-top:5px">
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">PERIOD</div><select id="sty_per_${id}" onchange="triggerUpdate()">${DB.stylePeriod.map(o=>`<option>${o}</option>`).join('')}</select></div>
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">ART MOVEMENT</div><select id="sty_art_${id}" onchange="triggerUpdate()">${DB.styleArt.map(o=>`<option>${o}</option>`).join('')}</select></div>
            </div>
            
            <div style="font-size:0.6rem; color:#666; margin-top:5px">DIRECTOR REF</div>
            <select id="sty_dir_${id}" onchange="triggerUpdate()">${DB.styleDirector.map(o=>`<option>${o}</option>`).join('')}</select>
            
            <div style="font-size:0.6rem; color:#666; margin-top:5px">COLOR PALETTE</div>
            <select id="sty_pal_${id}" onchange="triggerUpdate()">${DB.stylePalette.map(o=>`<option>${o}</option>`).join('')}</select>
        `;
    }
    else if (type === 'character') {
        title = "CHARACTER"; hasIn = false; hasOut = true;
        content = `
            <input type="text" class="obj-input" id="chr_name_${id}" placeholder="Character Name/Role" oninput="triggerUpdate()">
            <div style="display:flex; gap:5px; margin-top:5px">
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">AGE</div><select id="chr_age_${id}" onchange="triggerUpdate()">${DB.charAge.map(o=>`<option>${o}</option>`).join('')}</select></div>
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">BUILD</div><select id="chr_bld_${id}" onchange="triggerUpdate()">${DB.charBuild.map(o=>`<option>${o}</option>`).join('')}</select></div>
            </div>
            <div style="font-size:0.6rem; color:#666; margin-top:5px">CLOTHING</div>
            <select id="chr_clo_${id}" onchange="triggerUpdate()">${DB.charClothing.map(o=>`<option>${o}</option>`).join('')}</select>
            <div style="font-size:0.6rem; color:#666; margin-top:5px">WEAR LEVEL</div>
            <select id="chr_wear_${id}" onchange="triggerUpdate()">${DB.charWear.map(o=>`<option>${o}</option>`).join('')}</select>
            <hr style="border:0; border-top:1px solid #333; margin:10px 0">
            <div style="font-size:0.6rem; color:#666">EMOTION</div>
            <select id="chr_emo_${id}" onchange="triggerUpdate()">${DB.charEmotion.map(o=>`<option>${o}</option>`).join('')}</select>
            <div style="font-size:0.6rem; color:#666; margin-top:5px">MICRO-EXPRESSION</div>
            <select id="chr_mic_${id}" onchange="triggerUpdate()">${DB.charMicro.map(o=>`<option>${o}</option>`).join('')}</select>
            <hr style="border:0; border-top:1px solid #333; margin:10px 0">
            <div style="font-size:0.6rem; color:#666">POSTURE</div>
            <select id="chr_pos_${id}" onchange="triggerUpdate()">${DB.charPosture.map(o=>`<option>${o}</option>`).join('')}</select>
            <div style="display:flex; gap:5px; margin-top:5px">
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">GESTURE</div><select id="chr_ges_${id}" onchange="triggerUpdate()">${DB.charGesture.map(o=>`<option>${o}</option>`).join('')}</select></div>
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">GAIT</div><select id="chr_gait_${id}" onchange="triggerUpdate()">${DB.charGait.map(o=>`<option>${o}</option>`).join('')}</select></div>
            </div>
            <div style="font-size:0.6rem; color:#666; margin-top:5px">ACTION TYPE</div>
            <select id="chr_act_${id}" onchange="triggerUpdate()">${DB.sceneAction.map(o=>`<option>${o}</option>`).join('')}</select>
            <input type="text" class="obj-input" id="chr_cust_${id}" placeholder="Custom action notes" oninput="triggerUpdate()" style="margin-top:5px">
            ${getSpatialContextHTML(id)}
        `;
    }
    else if (type === 'shot') {
        hasIn = false; hasOut = true; title = "SHOT TYPE";
        content = `<div style="font-size:0.6rem; color:#666">SHOT FRAMING</div>
            <select id="shot_type_${id}" onchange="triggerUpdate()">${DB.shotType.map(o=>`<option>${o}</option>`).join('')}</select>`;
    }
    else if (type === 'cammove') {
        hasIn = false; hasOut = true; title = "CAMERA MOVEMENT";
        content = `<div style="font-size:0.6rem; color:#666">MOVEMENT / RIG</div>
            <select id="cam_move_${id}" onchange="triggerUpdate()">${DB.camMove.map(o=>`<option>${o}</option>`).join('')}</select>`;
    }
    else if (type === 'atmos') {
        hasIn = false; hasOut = true; title = "ATMOSPHERE";
        content = `<div style="font-size:0.6rem; color:#666">ENVIRONMENT EFFECTS</div>
            <select id="atm_fx_${id}" onchange="triggerUpdate()">${DB.atmos.map(o=>`<option>${o}</option>`).join('')}</select>
            <div style="font-size:0.6rem; color:#666; margin-top:5px">INTENSITY (1-10)</div>
            <input type="range" id="atm_int_${id}" min="1" max="10" value="5" oninput="triggerUpdate()">`;
    }
    else if (type === 'colorg') {
        hasIn = false; hasOut = true; title = "COLOR GRADE";
        content = `<div style="font-size:0.6rem; color:#666">LUT / LOOK</div>
            <select id="col_lut_${id}" onchange="triggerUpdate()">${DB.colLut.map(o=>`<option>${o}</option>`).join('')}</select>
            <div style="font-size:0.6rem; color:#666; margin-top:5px">FILM STOCK</div>
            <select id="col_stk_${id}" onchange="triggerUpdate()">${DB.colStock.map(o=>`<option>${o}</option>`).join('')}</select>`;
    }
    else if (type === 'comp') {
        hasIn = false; hasOut = true; title = "COMPOSITION";
        content = `<div style="font-size:0.6rem; color:#666">COMPOSITION RULE</div>
            <select id="comp_rule_${id}" onchange="triggerUpdate()">${DB.compRule.map(o=>`<option>${o}</option>`).join('')}</select>`;
    }
    else if (type === 'neg') {
        hasIn = false; hasOut = true; title = "NEGATIVE PROMPT";
        content = `<div style="font-size:0.6rem; color:#666">EXCLUDE FROM SCENE</div>
            <textarea id="neg_val_${id}" rows="3" placeholder="ugly, deformed, noise..." oninput="triggerUpdate()" style="width:100%; padding:4px; background:#111; color:#eee; border:1px solid #333; border-radius:4px; font-size:0.75rem; margin-top:2px; resize:none;"></textarea>`;
    }
    else if (type === 'render') {
        hasIn = false;
        content = `<div style="font-size:0.6rem; color:#666">ENGINE</div>
            <select id="eng_${id}" onchange="triggerUpdate()">${DB.render.map(r=>`<option>${r}</option>`).join('')}</select>
            <div style="display:flex; gap:5px; margin-top:5px">
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">RATIO</div><select id="rat_${id}" onchange="triggerUpdate()">${DB.ratio.map(r=>`<option>${r}</option>`).join('')}</select></div>
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">RES</div><select id="res_${id}" onchange="triggerUpdate()">${DB.res.map(r=>`<option>${r}</option>`).join('')}</select></div>
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
        
        let camOptions = DB.camBodies.map(brand => 
            `<optgroup label="${brand.brand}">` + 
            brand.models.map(m => `<option value="${m.name}" data-flavor="${m.flavor}">${m.name}</option>`).join('') + 
            `</optgroup>`
        ).join('');
        
        let lensOptions = DB.camLenses.map(brand => 
            `<optgroup label="${brand.brand}">` + 
            brand.models.map(m => `<option value="${m.name}" data-flavor="${m.flavor}">${m.name}</option>`).join('') + 
            `</optgroup>`
        ).join('');

        content = `<div style="font-size:0.6rem; color:#666">BODY</div>
            <select id="cam_${id}" onchange="updateCamFlavor('${id}'); triggerUpdate();">${camOptions}</select>
            <div id="cam_flav_${id}" style="font-size:0.55rem; color:var(--accent); margin-top:2px; font-style:italic; line-height:1.2;"></div>
            
            <div style="font-size:0.6rem; color:#666; margin-top:5px">LENS SERIES</div>
            <select id="lens_${id}" onchange="updateCamFlavor('${id}'); triggerUpdate();">${lensOptions}</select>
            <div id="lens_flav_${id}" style="font-size:0.55rem; color:var(--accent); margin-top:2px; font-style:italic; line-height:1.2;"></div>

            <div style="font-size:0.6rem; color:#666; margin-top:5px;">FOCAL LENGTH (mm)</div>
            <div style="display:flex; align-items:center; gap:5px;">
                <input type="number" id="mm_in_${id}" min="2" max="2000" value="50" style="width:50px; text-align:center;" oninput="syncCam('${id}', this.value)">
                <input type="range" id="mm_sl_${id}" min="2" max="2000" value="50" oninput="syncCam('${id}', this.value)">
            </div>
            <div style="display:flex; gap:5px; margin-top:5px">
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">APERTURE</div><select id="cam_ap_${id}" onchange="triggerUpdate()">${DB.camAperture.map(o=>`<option>${o}</option>`).join('')}</select></div>
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">SHUTTER</div><select id="cam_sh_${id}" onchange="triggerUpdate()">${DB.camShutter.map(o=>`<option>${o}</option>`).join('')}</select></div>
            </div>
            <div style="display:flex; gap:5px; margin-top:5px">
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">ISO</div><select id="cam_iso_${id}" onchange="triggerUpdate()">${DB.camIso.map(o=>`<option>${o}</option>`).join('')}</select></div>
                <div style="flex:1"><div style="font-size:0.6rem; color:#666">FILTER</div><select id="cam_fil_${id}" onchange="triggerUpdate()">${DB.camFilter.map(o=>`<option>${o}</option>`).join('')}</select></div>
            </div>`;
        setTimeout(() => { if(window.updateCamFlavor) window.updateCamFlavor(id); }, 0);
    }
    else if (type === 'object') {
        hasIn = false; title = "OBJECT";
        content = `<input type="text" class="obj-input" id="val_${id}" placeholder="OBJECT NAME" oninput="triggerUpdate()">${getSpatialContextHTML(id)}`;
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
        el.style.width = '350px'; el.style.height = '320px';
        content = `
            <div class="viewport-3d" id="v3d_${id}">
                <div id="three_${id}" style="width:100%; height:100%;"></div>
            </div>
            <div style="text-align:center; font-size:0.6rem; color:#666">Three.js Engine</div>
        `;
        setTimeout(() => initThreePreview(id), 50);
    }
    else if (type === 'stack') {
        hasIn = true; hasOut = true; title = "PROMPT STACK";
        content = `
            <select id="stack_plat_${id}" onchange="triggerUpdate()" style="width:100%; margin-bottom:5px; background:#111; color:#eee; border:1px solid #333; padding:5px; border-radius:4px; font-size:0.75rem; font-weight:bold;">
                <option value="runway">🎬 Runway Gen-3/4 (Cinematic)</option>
                <option value="kling">🐉 Kling (High Motion / Audio)</option>
                <option value="veo">🎥 Google Veo (Realism)</option>
                <option value="luma">✨ Luma Dream Machine (Dynamic)</option>
                <option value="midjourney">🚀 Midjourney (Tags)</option>
            </select>
            <textarea id="val_${id}" class="stack-output" readonly></textarea>
            <div class="stack-tools">
                <button class="btn-tool" onpointerdown="resetStack('${id}')">RESET</button>
                <button class="btn-tool" onpointerdown="copyStack('${id}')">COPY</button>
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

    el.innerHTML = `
        ${hasIn ? `<div class="socket-wrapper in" data-node="${id}"><div class="socket"></div></div>` : ''}
        <div class="node-header" onpointerdown="nodeDrag(event, '${id}')">
            <span>${title}</span>
            <span class="close-btn" onpointerdown="event.stopPropagation()" onclick="kill('${id}')">×</span>
        </div>
        <div class="node-content">${content}</div>
        ${hasOut ? `<div class="socket-wrapper out" onpointerdown="sockDown(event, '${id}')"><div class="socket"></div></div>` : ''}
    `;

    world.appendChild(el);
    window.nodes[id] = { id, type, el, zoom: 1 };
    new ResizeObserver(() => updateCables()).observe(el);
}

window.toggleLight = function(id) {
    const mode = document.getElementById(`mode_${id}`).value;
    const div = document.getElementById(`cont_${id}`);
    if(mode === 'industrial') {
        div.innerHTML = `
            <div style="font-size:0.6rem; color:#666">FIXTURE</div>
            <select id="brand_${id}" onchange="triggerUpdate()"><option>Arri</option><option>Aputure</option><option>Nanlite</option></select>
            <div class="slider-row"><span>W</span><input type="range" id="watt_${id}" min="0" max="2000" value="1000" oninput="triggerUpdate()"></div>
            <div class="slider-row"><span>K</span><input type="range" id="kel_${id}" min="2000" max="10000" value="5600" oninput="triggerUpdate()"></div>
            <div style="font-size:0.6rem; color:#666; margin-top:5px">MODIFIER</div>
            <select id="lit_mod_${id}" onchange="triggerUpdate()">${DB.lightMod.map(o=>`<option>${o}</option>`).join('')}</select>
            <div style="font-size:0.6rem; color:#666; margin-top:5px">COLOR GEL</div>
            <select id="lit_gel_${id}" onchange="triggerUpdate()">${DB.lightGel.map(o=>`<option>${o}</option>`).join('')}</select>
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
    if(camSel && camFlav) {
        const opt = camSel.options[camSel.selectedIndex];
        camFlav.innerText = "💡 " + opt.getAttribute('data-flavor');
    }
    if(lensSel && lensFlav) {
        const opt = lensSel.options[lensSel.selectedIndex];
        lensFlav.innerText = "💡 " + opt.getAttribute('data-flavor');
    }
}

window.triggerUpdate = function() {
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
            svgLayer.appendChild(c.path);
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

let activeCable = null;
window.sockDown = function(e, id) {
    e.stopPropagation(); 
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svgLayer.appendChild(path); 
    activeCable = { from: id, path };
    document.addEventListener('pointermove', cabMove); 
    document.addEventListener('pointerup', cabUp);
}

function cabMove(e) {
    if(!activeCable) return;
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
    if (dstType === 'preview') return ['position', 'character', 'object', 'light', 'stack'].includes(srcType);
    if (dstType === 'position') return ['character', 'object', 'light', 'camera'].includes(srcType);
    return false;
}

function cabUp(e) { 
    if(!activeCable) return;
    const targetEl = document.elementFromPoint(e.clientX, e.clientY);
    const wrapperIn = targetEl ? targetEl.closest('.socket-wrapper.in') : null;
    
    if (wrapperIn) {
        const toId = wrapperIn.getAttribute('data-node');
        if (toId && activeCable.from !== toId) {
            const srcNode = window.nodes[activeCable.from];
            const dstNode = window.nodes[toId];
            
            if (srcNode && dstNode && !isValidConnection(srcNode.type, dstNode.type)) {
                const nEl = document.getElementById(dstNode.id);
                nEl.style.boxShadow = "0 0 15px red";
                setTimeout(() => { nEl.style.boxShadow = "none"; }, 400);
            } else {
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                svgLayer.appendChild(path);
                const nc = { from: activeCable.from, to: toId, path };
                path.addEventListener('dblclick', () => { 
                    path.remove(); window.cables = window.cables.filter(c => c !== nc); window.triggerUpdate(); 
                });
                window.cables.push(nc);
                updateCables(); 
                window.triggerUpdate();
            }
        }
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
    });
}

function drawCurve(path, x1, y1, x2, y2) {
    const mid = (x1+x2)/2;
    path.setAttribute('d', `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`);
}

window.kill = function(id) { 
    if(window.nodes[id]) {
        if(window.nodes[id].resizeObs) window.nodes[id].resizeObs.disconnect();
        window.nodes[id].el.remove(); 
        delete window.nodes[id]; 
        window.cables = window.cables.filter(c => {
            if(c.from === id || c.to === id){
                c.path.remove(); return false;
            } 
            return true;
        }); 
        window.triggerUpdate(); 
        window.updateMinimap();
    }
}

// SAVE & LOAD
window.saveWorkspace = function() {
    const data = { nodes: {}, cables: [] };
    for(let id in window.nodes) {
        const n = window.nodes[id];
        const state = {};
        n.el.querySelectorAll('input, select, textarea').forEach(el => {
            if(el.id) state[el.id] = el.type === 'checkbox' ? el.checked : el.value;
        });
        data.nodes[id] = { type: n.type, x: n.el.style.left, y: n.el.style.top, zoom: n.zoom, state };
    }
    data.cables = window.cables.map(c => ({ from: c.from, to: c.to }));
    localStorage.setItem('scene_save', JSON.stringify(data));
    window.showToast("Workspace Saved!");
}

window.loadWorkspace = function() {
    const str = localStorage.getItem('scene_save');
    if(!str) return window.showToast("No save found!");
    const data = JSON.parse(str);
    Object.keys(window.nodes).forEach(id => window.kill(id));
    
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
    
    data.cables.forEach(c => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        svgLayer.appendChild(path);
        const nc = { from: c.from, to: c.to, path };
        path.addEventListener('dblclick', () => { 
            path.remove(); window.cables = window.cables.filter(cb => cb !== nc); window.triggerUpdate(); 
        });
        window.cables.push(nc);
    });
    
    updateCables(); window.triggerUpdate(); window.updateMinimap();
    window.showToast("Workspace Loaded!");
}

window.loadPreset = function(name) {
    if(!name) return;
    Object.keys(window.nodes).forEach(id => window.kill(id));
    window.nodeIdCounter = 0; window.cables = [];
    worldState = { x: 0, y: 0, zoom: 1 };
    window.updateWorld();

    if (name === 'cyberpunk') {
        window.createNode('scene'); let scn = window.nodes['node_1']; scn.el.style.left = '100px'; scn.el.style.top = '100px';
        document.getElementById('scn_loc_node_1').value = 'Fantastic: Cyber City';
        document.getElementById('scn_time_node_1').value = 'Night Dark (19:30-04:00)';
        document.getElementById('scn_wea_node_1').value = 'Heavy Rain';
        
        window.createNode('character'); let chr = window.nodes['node_2']; chr.el.style.left = '100px'; chr.el.style.top = '400px';
        document.getElementById('chr_name_node_2').value = 'Hacker';
        document.getElementById('chr_clo_node_2').value = 'Casual Streetwear';

        window.createNode('style'); let sty = window.nodes['node_3']; sty.el.style.left = '100px'; sty.el.style.top = '800px';
        document.getElementById('sty_cin_node_3').value = 'Cyberpunk';
        document.getElementById('sty_pal_node_3').value = 'Neon / Synthwave';

        window.createNode('colorg'); let col = window.nodes['node_4']; col.el.style.left = '450px'; col.el.style.top = '600px';
        document.getElementById('col_lut_node_4').value = 'Teal & Orange';
        document.getElementById('col_stk_node_4').value = 'Cinestill 800T';

        window.createNode('stack'); let stk = window.nodes['node_5']; stk.el.style.left = '800px'; stk.el.style.top = '300px';
        
        setTimeout(() => {
            const conn = (f, t) => {
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                svgLayer.appendChild(path);
                const nc = { from: f, to: t, path };
                path.addEventListener('dblclick', () => { path.remove(); window.cables = window.cables.filter(cb => cb !== nc); window.triggerUpdate(); });
                window.cables.push(nc);
            };
            conn('node_1', 'node_5'); conn('node_2', 'node_5'); conn('node_3', 'node_5'); conn('node_4', 'node_5');
            updateCables(); window.triggerUpdate(); window.updateMinimap();
            window.showToast("Cyberpunk Preset Loaded");
        }, 50);
    }
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
window.resetStack = function(id) { window.cables = window.cables.filter(c => c.to !== id); updateCables(); window.triggerUpdate(); }
window.copyStack = function(id) { 
    const ta = document.getElementById(`val_${id}`);
    if(!ta) return;
    ta.select(); ta.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(ta.value).then(() => { window.showToast("Copied to clipboard!"); });
}
window.openHistory = openHistory;
window.clearHistory = clearHistory;
window.exportHistory = exportHistory;
window.sendToAPI = sendToAPI;

// THREE.JS PREVIEW LOGIC
window.initThreePreview = function(id) {
    const container = document.getElementById(`three_${id}`);
    if(!container || !window.THREE) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth/container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const grid = new THREE.GridHelper(200, 20);
    scene.add(grid);

    camera.position.set(0, 50, 150);
    camera.lookAt(0,0,0);

    const orbit = new THREE.OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;

    window.threePreviews[id] = { scene, camera, renderer, orbit, objects: [] };

    const animate = function() {
        requestAnimationFrame(animate);
        orbit.update();
        renderer.render(scene, camera);
    };
    animate();
}

window.updateThreePreview = function(pid) {
    const preview = window.threePreviews[pid];
    if(!preview) return;

    preview.objects.forEach(obj => preview.scene.remove(obj));
    preview.objects = [];
    preview.scene.background = new THREE.Color(0x1a1a1a);

    const inputs = window.cables.filter(c => c.to === pid);

    const getSpatialCoords = (id) => {
        let x=0, y=0, z=0;
        const h = document.getElementById(`sp_h_${id}`)?.value || 'Center';
        const v = document.getElementById(`sp_v_${id}`)?.value || 'Ground';
        const d = document.getElementById(`sp_d_${id}`)?.value || 'Midground';
        
        if(h === 'Left') x = -40; else if(h === 'Right') x = 40;
        if(v === 'Eye Level') y = 25; else if(v === 'High Angle / Overhead') y = 60;
        if(d === 'Foreground') z = 40; else if(d === 'Background') z = -40;
        return {x, y, z};
    };

    const renderNodeIn3D = (node, customCoords = null) => {
        const coords = customCoords || getSpatialCoords(node.id);
        const {x, y, z} = coords;

        if (node.type === 'character') {
            const geo = new THREE.CapsuleGeometry(6, 15, 4, 8);
            const mat = new THREE.MeshStandardMaterial({color: 0x3388ff});
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, y + 15, z);
            preview.scene.add(mesh);
            preview.objects.push(mesh);
        }
        else if (node.type === 'object') {
            const geo = new THREE.BoxGeometry(10, 10, 10);
            const mat = new THREE.MeshStandardMaterial({color: 0xaaaaaa});
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, y + 5, z);
            preview.scene.add(mesh);
            preview.objects.push(mesh);
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
            const pl = new THREE.PointLight(color, intensity, 300);
            pl.position.set(x, y + 20, z);
            const sphere = new THREE.Mesh(new THREE.SphereGeometry(3), new THREE.MeshBasicMaterial({color: color}));
            sphere.position.copy(pl.position);
            preview.scene.add(pl); preview.scene.add(sphere);
            preview.objects.push(pl, sphere);
        }
        else if (node.type === 'camera') {
            const mm = parseFloat(document.getElementById(`mm_in_${node.id}`)?.value || 50);
            const fov = 2 * Math.atan(24 / (2 * mm)) * (180 / Math.PI);
            preview.camera.fov = fov;
            preview.camera.updateProjectionMatrix();
        }
        else if (node.type === 'scene') {
            const time = document.getElementById(`scn_time_${node.id}`)?.value || "";
            if (time.includes("Night")) {
                preview.scene.background = new THREE.Color(0x050510);
            } else if (time.includes("Golden Hour")) {
                preview.scene.background = new THREE.Color(0xcc5522);
                const dl = new THREE.DirectionalLight(0xffaa55, 1);
                dl.position.set(-50, 20, 50);
                preview.scene.add(dl);
                preview.objects.push(dl);
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
    if(e.code === 'Space' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault(); spaceDown = true; viewport.style.cursor = 'grab';
    }
    if(e.key === 'Delete' || e.key === 'Backspace') {
        if(document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            const selected = document.querySelector('.node.selected');
            if(selected) { window.kill(selected.id); window.showToast("Node deleted"); }
        }
    }
});

document.addEventListener('keyup', (e) => {
    if(e.code === 'Space') { spaceDown = false; viewport.style.cursor = 'default'; }
});

window.onload = () => {
    if(localStorage.getItem('scene_save')) {
        window.loadWorkspace();
    } else {
        window.loadPreset('cyberpunk');
        window.showToast("Welcome! Loaded Cyberpunk Demo");
    }
}
