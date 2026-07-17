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

function updateStack(sid, nodes, cables) {
    const pSel = document.getElementById(`stack_plat_${sid}`);
    const platform = pSel ? pSel.value : 'cinematic';
    const inputs = cables.filter(c => c.to === sid);
    
    let sceneObj = null, styleObj = null, charObjs = [], objectObjs = [], lightObjs = [], camObj = null, renderObj = null;
    let shotObj = null, moveObj = null, atmosObj = null, colorObj = null, compObj = null, negObj = null;
    let subjectObjs = [], customLocObj = null;

    inputs.forEach(c => {
        const n = nodes[c.from];
        if(!n) return;
        // Anything defined in the SUBJECTS registry is scene content.
        if (SUBJECTS[n.type]) { subjectObjs.push(n); return; }
        switch(n.type) {
            case 'scene': sceneObj = n; break;
            case 'style': styleObj = n; break;
            case 'character': charObjs.push(n); break;
            case 'object': objectObjs.push(n); break;
            case 'customloc': customLocObj = n; break;
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

    if (platform === 'runway' || platform === 'kling' || platform === 'veo' || platform === 'luma') {
        let compShot = "", compSubj = "", compAct = "", compEnv = "", compCam = "", compLit = "", compSty = "", compAudio = "";

        if (shotObj || moveObj) {
            let sType = shotObj ? document.getElementById(`shot_type_${shotObj.id}`).value.split(' (')[0] : "medium shot";
            let sMove = moveObj ? document.getElementById(`cam_move_${moveObj.id}`).value : "static camera";
            compShot = `${sType.toLowerCase()}, ${sMove.toLowerCase()}`;
        }

        if (sceneObj) {
            const id = sceneObj.id;
            const loc = document.getElementById(`scn_loc_${id}`).value;
            const cust = document.getElementById(`scn_cust_${id}`).value;
            const time = document.getElementById(`scn_time_${id}`).value;
            const wea = document.getElementById(`scn_wea_${id}`).value;
            const mood = document.getElementById(`scn_mood_${id}`).value;
            
            compEnv = `set in a ${loc.toLowerCase().replace('interior: ', '').replace('exterior: ', '')}`;
            if (cust) compEnv += ` with ${cust}`;
            compEnv += ` during ${time.split(' ')[0].toLowerCase()}`;
            if (wea !== 'Clear') {
                compEnv += ` under ${wea.toLowerCase()} weather`;
                if(wea.includes('Rain') || wea.includes('Storm')) compAudio += "sound of heavy rain and distant thunder, ";
            }
            compLit += `The overall mood is ${mood.toLowerCase()}. `;
        }

        if (customLocObj) {
            const id = customLocObj.id;
            const lname = document.getElementById(`loc_name_${id}`).value.trim();
            const env = document.getElementById(`loc_env_${id}`).value;
            const arch = document.getElementById(`loc_arch_${id}`).value;
            const surf = document.getElementById(`loc_surf_${id}`).value;
            const scale = document.getElementById(`loc_scale_${id}`).value;
            const feat = document.getElementById(`loc_feat_${id}`).value.trim();
            const envNoun = {
                'Interior': 'interior space', 'Exterior': 'exterior environment',
                'Underground': 'underground space', 'Underwater': 'underwater environment',
                'Aerial / Sky': 'aerial vista', 'Outer Space': 'outer-space void',
                'Mixed Interior/Exterior': 'sprawling indoor-outdoor space'
            }[env] || 'environment';

            let adjs = [];
            if (scale) adjs.push(scale.split(' /')[0].toLowerCase());
            if (arch && arch !== 'Undefined') adjs.push(arch.split(' / ')[0].toLowerCase());
            const adjStr = adjs.length ? adjs.join(', ') + ' ' : '';

            let locPhrase = lname ? `a ${adjStr}${lname.toLowerCase()}` : `a ${adjStr}${envNoun}`;
            if (surf && surf !== 'Undefined') locPhrase += ` with ${surf.toLowerCase()} ground`;
            if (feat) locPhrase += `, featuring ${feat}`;

            compEnv = compEnv ? `${compEnv}, set within ${locPhrase}` : `set in ${locPhrase}`;
        }

        {
            let sArr = [], aArr = [];
            charObjs.forEach(c => {
                const id = c.id;
                const cname = document.getElementById(`chr_name_${id}`).value || "A person";
                const age = document.getElementById(`chr_age_${id}`).value.split(' ')[0].toLowerCase();
                const bld = document.getElementById(`chr_bld_${id}`).value.split(' ')[0].toLowerCase();
                const clo = document.getElementById(`chr_clo_${id}`).value.toLowerCase();
                const emo = document.getElementById(`chr_emo_${id}`).value.toLowerCase();
                const pos = document.getElementById(`chr_pos_${id}`).value.toLowerCase();
                const actEl = document.getElementById(`chr_act_${id}`);
                const act = actEl ? actEl.value.split(': ').pop().toLowerCase() : "";

                let s = `${cname}, a ${bld} ${age}, wearing ${clo}, positioned ${formatSpatial(id)}, showing expressions of ${emo}`;
                sArr.push(s);

                if (act) {
                    aArr.push(`${cname} is actively ${act}`);
                    if(act.includes('argument') || act.includes('dialog')) compAudio += "muffled speaking voices, ";
                    if(act.includes('chase') || act.includes('running')) compAudio += "heavy footsteps, fast breathing, ";
                } else if (pos) {
                    aArr.push(`${cname} is ${pos}`);
                }
            });

            // Every registry subject contributes the same three things.
            subjectObjs.forEach(sn => {
                const def = SUBJECTS[sn.type];
                const v = readSubject(sn.type, sn.id);
                sArr.push(def.phrase(v, formatSpatial(sn.id)));
                const act = def.action(v);
                if (act) aArr.push(act);
                (def.audio ? def.audio(v) : []).forEach(a => { compAudio += a + ", "; });
            });

            if (objectObjs.length > 0) {
                sArr.push(...objectObjs.map(o => document.getElementById(`val_${o.id}`).value).filter(v => v && v.trim()));
            }

            if (sArr.length > 0) {
                compSubj = sArr.join(' and ');
                compAct = aArr.join(' while ');
            }
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
                    return s;
                } else {
                    const t = document.getElementById(`time_${id}`).value;
                    return `lit by natural sunlight at ${t}:00`;
                }
            });
            compLit += lStrs.join(', ') + ". ";
        }

        if (atmosObj) {
            const id = atmosObj.id;
            const fx = document.getElementById(`atm_fx_${id}`).value.toLowerCase();
            compEnv += `, featuring ${fx} in the air`;
        }

        if (camObj) {
            const id = camObj.id;
            const cam = document.getElementById(`cam_${id}`).value;
            const lens = document.getElementById(`lens_${id}`).value;
            const mm = document.getElementById(`mm_in_${id}`).value;
            compCam = `Shot on ${cam} with a ${lens} ${mm}mm lens`;

            const advAct = document.getElementById(`cam_adv_act_${id}`)?.value || 'none';
            const advTgt = document.getElementById(`cam_adv_tgt_${id}`)?.value || '';
            const advDist = document.getElementById(`cam_adv_dist_${id}`)?.value || '';
            
            if (advAct !== 'none' && advTgt) {
                let actionStr = "";
                if (advAct === 'follow') actionStr = `following ${advTgt}`;
                else if (advAct === 'orbit') actionStr = `orbiting around ${advTgt}`;
                else if (advAct === 'dolly_in') actionStr = `dollying in towards ${advTgt}`;
                else if (advAct === 'dolly_out') actionStr = `dollying out from ${advTgt}`;
                else if (advAct === 'rack_focus') actionStr = `rack focusing onto ${advTgt}`;
                
                if (advDist) actionStr += `, maintaining a ${advDist}`;
                
                compCam += `. The camera is ${actionStr}`;
            }
        }

        if (styleObj || colorObj || compObj) {
            let styArr = [];
            if(styleObj) {
                styArr.push(`${document.getElementById(`sty_cin_${styleObj.id}`).value.toLowerCase()} style`);
                styArr.push(`directed by ${document.getElementById(`sty_dir_${styleObj.id}`).value.split(' ')[0]}`);
            }
            if(colorObj) {
                styArr.push(`${document.getElementById(`col_lut_${colorObj.id}`).value} color grading`);
            }
            if(compObj) {
                styArr.push(`${document.getElementById(`comp_rule_${compObj.id}`).value.toLowerCase()} composition`);
            }
            compSty = styArr.join(', ');
        }

        // --- ASSEMBLE BASED ON PLATFORM ---
        let finalArr = [];
        
        if (!compSubj && !compEnv) {
            prompt = "Connect Scene, Style, or Character nodes to generate a cinematic prompt.";
        } else {
            if (platform === 'veo') {
                // Veo favors literal, detailed realism and environmental context
                if(compEnv) finalArr.push(compEnv.charAt(0).toUpperCase() + compEnv.slice(1) + ".");
                if(compSubj) finalArr.push(compSubj + ".");
                if(compAct) finalArr.push(compAct + ".");
                if(compShot || compCam) finalArr.push(`${compShot ? compShot : 'Cinematic shot'} ${compCam ? compCam : ''}.`);
                if(compLit) finalArr.push(compLit);
                if(compAudio) finalArr.push(`Audio: ${compAudio.replace(/,\s*$/, "")}.`);
            } 
            else if (platform === 'kling') {
                // Kling favors action-heavy front-loaded prompts
                let s1 = "";
                if(compSubj) s1 += compSubj + " ";
                if(compAct) s1 += compAct;
                if(s1) finalArr.push(s1.trim() + ".");
                if(compEnv) finalArr.push(`The setting is ${compEnv.replace('set in a', 'a')}.`);
                if(compShot || compCam) finalArr.push(`${compShot ? compShot : 'Cinematic shot'} ${compCam ? compCam : ''}.`);
                if(compAudio) finalArr.push(`Soundtrack: ${compAudio.replace(/,\s*$/, "")}.`);
            }
            else if (platform === 'luma') {
                // Luma favors dynamic, highly descriptive adjectives
                let s1 = `Dynamic ${compShot ? compShot : 'cinematic sequence'} of `;
                if(compSubj) s1 += compSubj;
                if(compAct) s1 += ` ${compAct}`;
                finalArr.push(s1 + ".");
                if(compEnv) finalArr.push(`Environment is ${compEnv.replace('set in a', 'a')}.`);
                if(compSty) finalArr.push(`Visuals are breathtaking, ${compSty}.`);
            }
            else { // runway
                // Runway favors classic structural prompting: Shot > Subject > Action > Environment > Style
                let p = [];
                if(compShot) p.push(compShot);
                if(compSubj) p.push(compSubj);
                if(compAct) p.push(compAct);
                if(compEnv) p.push(compEnv);
                if(compLit) p.push(compLit.trim());
                if(compCam) p.push(compCam);
                if(compSty) p.push(compSty);
                finalArr.push(p.join(', ') + '.');
            }

            prompt = finalArr.join(' ');
        }

        if (negObj) {
            const id = negObj.id;
            const nval = document.getElementById(`neg_val_${id}`).value;
            if(nval) prompt += `\n\nNEGATIVE PROMPT: ${nval}`;
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

        if (customLocObj) {
            const id = customLocObj.id;
            const lname = document.getElementById(`loc_name_${id}`).value.trim();
            const arch = document.getElementById(`loc_arch_${id}`).value;
            const surf = document.getElementById(`loc_surf_${id}`).value;
            const scale = document.getElementById(`loc_scale_${id}`).value;
            const feat = document.getElementById(`loc_feat_${id}`).value.trim();
            if (lname) tags.push(lname);
            tags.push(document.getElementById(`loc_env_${id}`).value);
            if (arch && arch !== 'Undefined') tags.push(arch);
            if (surf && surf !== 'Undefined') tags.push(surf + " ground");
            tags.push(scale.split(' /')[0] + " scale");
            if (feat) tags.push(feat);
        }

        subjectObjs.forEach(sn => {
            const def = SUBJECTS[sn.type];
            const v = readSubject(sn.type, sn.id);
            (def.tags ? def.tags(v) : []).forEach(t => tags.push(t));
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

            const advAct = document.getElementById(`cam_adv_act_${id}`)?.value || 'none';
            const advTgt = document.getElementById(`cam_adv_tgt_${id}`)?.value || '';
            const advDist = document.getElementById(`cam_adv_dist_${id}`)?.value || '';
            
            if (advAct !== 'none' && advTgt) {
                let actionStr = "";
                if (advAct === 'follow') actionStr = `following ${advTgt}`;
                else if (advAct === 'orbit') actionStr = `orbiting around ${advTgt}`;
                else if (advAct === 'dolly_in') actionStr = `dollying in towards ${advTgt}`;
                else if (advAct === 'dolly_out') actionStr = `dollying out from ${advTgt}`;
                else if (advAct === 'rack_focus') actionStr = `rack focus to ${advTgt}`;
                
                if (advDist) actionStr += ` at ${advDist}`;
                
                tags.push("camera " + actionStr);
            }
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
