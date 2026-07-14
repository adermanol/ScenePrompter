function formatSpatial(id) {
    const d = document.getElementById(`depth_${id}`);
    const h = document.getElementById(`hpos_${id}`);
    const v = document.getElementById(`vpos_${id}`);
    if (!d || !h || !v) return "";
    
    const map = {
        extreme_fg: "in the extreme foreground", foreground: "in the foreground", midground: "in the middle ground",
        background: "in the background", far_bg: "far in the background", horizon: "at the horizon",
        far_left: "at the far left edge", camera_left: "camera-left", center: "in the center",
        camera_right: "camera-right", far_right: "at the far right edge",
        ground: "at ground level", eye_level: "at eye level", above: "elevated above eye level",
        overhead: "directly overhead", below: "sunken below eye level"
    };
    return `${map[d.value]}, ${map[h.value]}, ${map[v.value]}`;
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

function updateStack(sid, nodes, cables) {
    const pSel = document.getElementById(`stack_plat_${sid}`);
    const platform = pSel ? pSel.value : 'cinematic';
    const inputs = cables.filter(c => c.to === sid);
    
    let sceneObj = null, styleObj = null, charObjs = [], objectObjs = [], lightObjs = [], camObj = null, renderObj = null;
    let shotObj = null, moveObj = null, atmosObj = null, colorObj = null, compObj = null, negObj = null;

    inputs.forEach(c => {
        const n = nodes[c.from];
        if(!n) return;
        switch(n.type) {
            case 'scene': sceneObj = n; break;
            case 'style': styleObj = n; break;
            case 'character': charObjs.push(n); break;
            case 'object': objectObjs.push(n); break;
            case 'light': lightObjs.push(n); break;
            case 'camera': camObj = n; break;
            case 'render': renderObj = n; break;
            case 'shot': shotObj = n; break;
            case 'cammove': moveObj = n; break;
            case 'atmos': atmosObj = n; break;
            case 'colorg': colorObj = n; break;
            case 'comp': compObj = n; break;
            case 'neg': negObj = n; break;
        }
    });

    let prompt = "";

    if (platform === 'cinematic') {
        let sentences = [];
        if (sceneObj) {
            const id = sceneObj.id;
            const loc = document.getElementById(`scn_loc_${id}`).value;
            const cust = document.getElementById(`scn_cust_${id}`).value;
            const time = document.getElementById(`scn_time_${id}`).value;
            const wea = document.getElementById(`scn_wea_${id}`).value;
            const mood = document.getElementById(`scn_mood_${id}`).value;
            
            let sceneStr = `A cinematic shot of a ${loc.toLowerCase().replace('interior: ', '').replace('exterior: ', '')}`;
            if (cust) sceneStr += ` with ${cust}`;
            sceneStr += `, set during ${time.split(' ')[0].toLowerCase()}`;
            if (wea !== 'Clear') sceneStr += ` under ${wea.toLowerCase()} weather conditions`;
            sceneStr += `. The overall mood is ${mood.toLowerCase()}.`;
            sentences.push(sceneStr);
        }

        if (charObjs.length > 0) {
            charObjs.forEach(c => {
                const id = c.id;
                const cname = document.getElementById(`chr_name_${id}`).value || "A character";
                const age = document.getElementById(`chr_age_${id}`).value.split(' ')[0].toLowerCase();
                const bld = document.getElementById(`chr_bld_${id}`).value.split(' ')[0].toLowerCase();
                const clo = document.getElementById(`chr_clo_${id}`).value.toLowerCase();
                const emo = document.getElementById(`chr_emo_${id}`).value.toLowerCase();
                const pos = document.getElementById(`chr_pos_${id}`).value.toLowerCase();
                const actEl = document.getElementById(`chr_act_${id}`);
                const act = actEl ? actEl.value.split(': ').pop().toLowerCase() : "";
                const spat = formatSpatial(id);
                
                let s = `${cname}, a ${bld} ${age}, is positioned ${spat}. They are wearing ${clo} and are ${pos}`;
                if (act) s += `, engaged in ${act}`;
                s += `, showing expressions of ${emo}.`;
                sentences.push(s);
            });
        }

        if (objectObjs.length > 0) {
            let objStrs = objectObjs.map(o => {
                const val = document.getElementById(`val_${o.id}`).value || "An object";
                const spat = formatSpatial(o.id);
                return `${val} is visible ${spat}`;
            });
            sentences.push(objStrs.join('. ') + '.');
        }

        if (lightObjs.length > 0) {
            let lStrs = lightObjs.map(l => {
                const id = l.id;
                const mode = document.getElementById(`mode_${id}`).value;
                if(mode === 'industrial') {
                    const b = document.getElementById(`brand_${id}`).value;
                    const w = document.getElementById(`watt_${id}`).value;
                    const mod = document.getElementById(`lit_mod_${id}`).value;
                    const gel = document.getElementById(`lit_gel_${id}`).value;
                    let s = `illuminated by a ${w}W ${b} studio light`;
                    if(mod && mod !== 'Bare Bulb') s += ` with a ${mod.toLowerCase()}`;
                    if(gel && gel !== 'None') s += ` using a ${gel.toLowerCase()} gel`;
                    s += ` positioned ${formatSpatial(id)}`;
                    return s;
                } else {
                    const t = document.getElementById(`time_${id}`).value;
                    return `lit by natural sunlight at ${t}:00 coming from ${formatSpatial(id)}`;
                }
            });
            sentences.push(`The scene is ${lStrs.join(' and ')}.`);
        }

        if (atmosObj) {
            const id = atmosObj.id;
            const fx = document.getElementById(`atm_fx_${id}`).value.toLowerCase();
            const int = document.getElementById(`atm_int_${id}`).value;
            sentences.push(`The atmosphere features ${fx} at an intensity level of ${int} out of 10.`);
        }

        if (styleObj) {
            const id = styleObj.id;
            const cin = document.getElementById(`sty_cin_${id}`).value;
            const dir = document.getElementById(`sty_dir_${id}`).value;
            const pal = document.getElementById(`sty_pal_${id}`).value;
            sentences.push(`Shot in a ${cin.toLowerCase()} style, reminiscent of ${dir.split(' ')[0]}'s cinematography, featuring a ${pal.toLowerCase()} color palette.`);
        }

        if (colorObj) {
            const id = colorObj.id;
            const lut = document.getElementById(`col_lut_${id}`).value;
            const stk = document.getElementById(`col_stk_${id}`).value;
            sentences.push(`The image is color graded using a ${lut} look, emulating ${stk} film stock.`);
        }

        if (compObj) {
            const id = compObj.id;
            const rule = document.getElementById(`comp_rule_${id}`).value;
            sentences.push(`The composition follows the ${rule.toLowerCase()} principle.`);
        }

        if (shotObj || moveObj) {
            let sType = shotObj ? document.getElementById(`shot_type_${shotObj.id}`).value.split(' (')[0] : "shot";
            let sMove = moveObj ? document.getElementById(`cam_move_${moveObj.id}`).value : "static camera";
            sentences.push(`The sequence is filmed as a ${sType.toLowerCase()} featuring a ${sMove.toLowerCase()} movement.`);
        }
        
        if (camObj) {
            const id = camObj.id;
            const cam = document.getElementById(`cam_${id}`).value;
            const lens = document.getElementById(`lens_${id}`).value;
            const mm = document.getElementById(`mm_in_${id}`).value;
            const ap = document.getElementById(`cam_ap_${id}`)?.value || "f/2.8";
            const sh = document.getElementById(`cam_sh_${id}`)?.value.split(' ')[0] || "1/48";
            const iso = document.getElementById(`cam_iso_${id}`)?.value || "400";
            const fil = document.getElementById(`cam_fil_${id}`)?.value || "None";
            
            const camSel = document.getElementById(`cam_${id}`);
            const lensSel = document.getElementById(`lens_${id}`);
            const camFlav = camSel && camSel.options[camSel.selectedIndex] ? camSel.options[camSel.selectedIndex].getAttribute('data-flavor') : '';
            const lensFlav = lensSel && lensSel.options[lensSel.selectedIndex] ? lensSel.options[lensSel.selectedIndex].getAttribute('data-flavor') : '';

            let cStr = `Filmed on ${cam} with a ${lens} ${mm}mm lens at ${ap}, ${sh} shutter, ISO ${iso}.`;
            if (camFlav || lensFlav) {
                cStr += ` The camera and lens choice provides a look described as: ${[camFlav, lensFlav].filter(Boolean).join(' and ')}.`;
            }
            if(fil !== 'None') cStr += ` A ${fil} is applied.`;
            sentences.push(cStr);
        }

        if (sentences.length === 0) {
            prompt = "Connect Scene, Style, or Character nodes to generate a cinematic prompt.";
        } else {
            prompt = sentences.join(' ');
        }

        if (negObj) {
            const id = negObj.id;
            const nval = document.getElementById(`neg_val_${id}`).value;
            if(nval) prompt += `\\n\\nNEGATIVE PROMPT: ${nval}`;
        }

    } 
    else if (platform === 'midjourney') {
        let tags = [];
        
        if (sceneObj) {
            const id = sceneObj.id;
            tags.push(document.getElementById(`scn_loc_${id}`).value.replace('Interior: ','').replace('Exterior: ',''));
            const cust = document.getElementById(`scn_cust_${id}`).value;
            if(cust) tags.push(cust);
            tags.push(document.getElementById(`scn_time_${id}`).value.split(' ')[0]);
            tags.push(document.getElementById(`scn_wea_${id}`).value);
            tags.push(document.getElementById(`scn_mood_${id}`).value + " mood");
        }
        
        charObjs.forEach(c => {
            const id = c.id;
            tags.push(document.getElementById(`chr_name_${id}`).value || "person");
            tags.push(document.getElementById(`chr_age_${id}`).value.split(' ')[0]);
            tags.push(document.getElementById(`chr_bld_${id}`).value.split(' ')[0] + " build");
            tags.push("wearing " + document.getElementById(`chr_clo_${id}`).value);
            tags.push(document.getElementById(`chr_emo_${id}`).value + " expression");
            const actEl = document.getElementById(`chr_act_${id}`);
            if (actEl) tags.push(actEl.value.split(': ').pop());
        });

        objectObjs.forEach(o => {
            tags.push(document.getElementById(`val_${o.id}`).value);
        });

        if (atmosObj) {
            tags.push(document.getElementById(`atm_fx_${atmosObj.id}`).value);
        }

        if (styleObj) {
            const id = styleObj.id;
            tags.push(document.getElementById(`sty_cin_${id}`).value);
            tags.push("directed by " + document.getElementById(`sty_dir_${id}`).value);
            tags.push(document.getElementById(`sty_pal_${id}`).value + " colors");
        }

        if (colorObj) {
            tags.push(document.getElementById(`col_lut_${colorObj.id}`).value + " color grading");
            tags.push(document.getElementById(`col_stk_${colorObj.id}`).value + " film stock");
        }

        if (compObj) tags.push(document.getElementById(`comp_rule_${compObj.id}`).value);
        if (shotObj) tags.push(document.getElementById(`shot_type_${shotObj.id}`).value);
        if (moveObj) tags.push(document.getElementById(`cam_move_${moveObj.id}`).value);

        if (camObj) {
            const id = camObj.id;
            tags.push("shot on " + document.getElementById(`cam_${id}`).value);
            tags.push(document.getElementById(`lens_${id}`).value + " lens");
            tags.push(document.getElementById(`mm_in_${id}`).value + "mm");
            tags.push(document.getElementById(`cam_ap_${id}`)?.value);
            tags.push("ISO " + document.getElementById(`cam_iso_${id}`)?.value);
            const fil = document.getElementById(`cam_fil_${id}`)?.value;
            if (fil && fil !== 'None') tags.push(fil);
        }
        
        if (renderObj) {
            const id = renderObj.id;
            tags.push(document.getElementById(`eng_${id}`).value);
            tags.push(document.getElementById(`res_${id}`).value);
            const ratioMap = { "16:9": "--ar 16:9", "1:1": "--ar 1:1", "9:16": "--ar 9:16", "4:3": "--ar 4:3", "2.39:1": "--ar 239:100" };
            const ar = ratioMap[document.getElementById(`rat_${id}`).value] || "--ar 16:9";
            tags.push("--v 6.0 " + ar);
        }

        if (negObj) {
            const nval = document.getElementById(`neg_val_${negObj.id}`).value;
            if(nval) tags.push("--no " + nval.split(',').map(s=>s.trim()).join(', '));
        }

        if (tags.length === 0) {
            prompt = "Connect nodes to generate Midjourney tags.";
        } else {
            prompt = tags.filter(t => t && t.trim() !== "").join(', ');
        }
    }
    
    const targetTextarea = document.getElementById(`val_${sid}`);
    if(targetTextarea) targetTextarea.value = prompt;
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
