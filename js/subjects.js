// SUBJECT NODE REGISTRY
//
// Every "thing that appears in the scene and can be positioned" — animals,
// insects, birds, vehicles, crowds — is the same archetype:
//
//   fields -> UI  ·  phrase/action/audio -> prompt  ·  tags -> midjourney
//   mesh -> 3D preview  ·  name -> camera tracking target
//
// Defining one here gives you all of that. Adding a subject node used to mean
// editing 6 files by hand; now it means adding one entry below.
//
// Element ids are `<prefix>_<fieldKey>_<nodeId>` and MUST stay stable — saved
// workspaces address inputs by exactly that id.

// "Prowling / Stalking" -> "Prowling"      (the pair is a synonym; prose wants one)
const first = s => (s || '').split(' / ')[0];
// "Shaggy / Thick Fur" -> "Shaggy, Thick Fur"  (the pair is additive; prose wants both)
const commas = s => (s || '').replace(' / ', ', ');
const lc = s => (s || '').toLowerCase();

const SUBJECTS = {
    // ---------------------------------------------------------------- QUADRUPED
    quadruped: {
        title: 'QUADRUPED',
        nav: { label: '🐾 Quadruped', color: '#ffcc00' },
        prefix: 'quad',
        fields: [
            { key: 'spec', label: 'SPECIES', type: 'select', options: 'quadSpecies' },
            { key: 'cust', type: 'text', placeholder: 'Custom breed / name (optional)' },
            { key: 'size', label: 'SIZE', type: 'select', options: 'quadSize', default: 'Medium', half: true },
            { key: 'coat', label: 'COAT', type: 'select', options: 'quadCoat', half: true },
            { key: 'act', label: 'ACTION', type: 'select', options: 'quadAction' },
            { key: 'mood', label: 'TEMPERAMENT', type: 'select', options: 'quadMood' },
            { key: 'note', type: 'text', placeholder: 'Custom notes' },
        ],
        name: v => v.cust || v.spec || 'Animal',
        label: v => '🐾 ' + (v.cust || v.spec || 'ANIMAL'),
        phrase: (v, sp) => {
            const spec = lc(v.cust || v.spec) || 'animal';
            let s = `a ${lc(v.size)} ${lc(first(v.mood))} ${spec} with ${lc(commas(v.coat))}, positioned ${sp}`;
            if (v.note) s += `, ${v.note}`;
            return s;
        },
        action: v => `the ${lc(v.cust || v.spec) || 'animal'} is ${lc(first(v.act))}`,
        audio: v => {
            const a = lc(first(v.act)), out = [];
            if (a.includes('gallop') || a.includes('charg')) out.push('thundering hoofbeats');
            if (a.includes('snarl') || a.includes('fight')) out.push('aggressive growling');
            return out;
        },
        tags: v => [`${v.size} ${v.cust || v.spec}`, v.coat, v.act, first(v.mood), v.note],
        mesh: (v, THREE) => {
            const sizes = { 'Tiny': 0.4, 'Small': 0.7, 'Medium': 1.0, 'Large': 1.5, 'Massive': 2.3 };
            const moods = {
                'Aggressive': 0xaa3322, 'Feral / Wild': 0x774422, 'Majestic / Regal': 0xccaa44,
                'Wounded': 0x662222, 'Fearful / Skittish': 0x8899aa, 'Playful': 0xcc8855,
                'Calm': 0x997755, 'Loyal / Docile': 0x886644,
            };
            const g = new THREE.Group();
            const mat = new THREE.MeshStandardMaterial({ color: moods[v.mood] || 0x997755 });
            const body = new THREE.Mesh(new THREE.BoxGeometry(18, 7, 8), mat);
            body.position.y = 12; g.add(body);
            const neck = new THREE.Mesh(new THREE.BoxGeometry(5, 8, 5), mat);
            neck.position.set(9, 15, 0); neck.rotation.z = -0.5; g.add(neck);
            const head = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 5), mat);
            head.position.set(13, 18, 0); g.add(head);
            [[7, 3], [7, -3], [-7, 3], [-7, -3]].forEach(([lx, lz]) => {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1, 12, 8), mat);
                leg.position.set(lx, 6, lz); g.add(leg);
            });
            const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.4, 9, 6), mat);
            tail.position.set(-10, 13, 0); tail.rotation.z = 0.9; g.add(tail);
            g.scale.setScalar(sizes[v.size] || 1.0);
            return g;
        },
    },

    // ------------------------------------------------------------------- INSECT
    insect: {
        title: 'INSECT',
        nav: { label: '🐞 Insect', color: '#aaff55' },
        prefix: 'ins',
        fields: [
            { key: 'spec', label: 'SPECIES', type: 'select', options: 'insectSpecies' },
            { key: 'cust', type: 'text', placeholder: 'Custom species (optional)' },
            { key: 'scale', label: 'SCALE', type: 'select', options: 'insectScale', half: true },
            { key: 'count', label: 'COUNT', type: 'select', options: 'insectCount', half: true },
            { key: 'beh', label: 'BEHAVIOR', type: 'select', options: 'insectBehavior' },
            { key: 'surf', label: 'ON SURFACE', type: 'select', options: 'insectSurface' },
            { key: 'note', type: 'text', placeholder: 'Custom notes' },
        ],
        name: v => v.cust || v.spec || 'Insect',
        label: v => '🐞 ' + (v.cust || v.spec || 'INSECT')
            + (v.count && v.count !== 'Single Specimen' ? ` (${v.count})` : ''),
        phrase: (v, sp) => {
            const spec = lc(v.cust || v.spec) || 'insect';
            let s = `${insectNoun(lc(v.count), spec)} ${lc(v.surf)}, positioned ${sp}`;
            if (lc(v.scale).includes('macro')) s += ', shot in extreme macro detail';
            if (v.note) s += `, ${v.note}`;
            return s;
        },
        action: v => {
            const spec = lc(v.cust || v.spec) || 'insect';
            const many = /swarm|cluster|infestation|few/.test(lc(v.count));
            return `${many ? 'the ' + pluralize(spec) + ' are' : 'the ' + spec + ' is'} ${lc(v.beh)}`;
        },
        audio: v => {
            const b = lc(v.beh);
            return (b.includes('swarm') || b.includes('fly') || b.includes('hover'))
                ? ['buzzing insect wings'] : [];
        },
        tags: v => {
            const spec = v.cust || v.spec;
            const c = v.count;
            return [
                c === 'Single Specimen' ? spec
                    : c === 'A Few' ? `a few ${pluralize(spec)}` : `${c} of ${pluralize(spec)}`,
                v.beh, v.surf,
                lc(v.scale).includes('macro') ? 'extreme macro photography' : '',
                v.note,
            ];
        },
        mesh: (v, THREE) => {
            const scales = { 'Extreme Macro Close-up': 1.2, 'Life-size Detail': 0.55, 'Swarm / Distant Cloud': 0.35 };
            const s = scales[v.scale] || 0.6;
            const counts = { 'Massive Infestation': 12, 'Swarm': 8, 'Cluster': 4, 'A Few': 2 };
            const n = counts[v.count] || 1;
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0x223322 });
            const wingMat = new THREE.MeshStandardMaterial({
                color: 0xaaccdd, transparent: true, opacity: 0.4, side: THREE.DoubleSide,
            });
            const bug = () => {
                const b = new THREE.Group();
                const abdomen = new THREE.Mesh(new THREE.SphereGeometry(3, 10, 10), bodyMat);
                abdomen.position.x = -3; abdomen.scale.x = 1.6;
                const thorax = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 10), bodyMat);
                const head = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 10), bodyMat);
                head.position.x = 3;
                b.add(abdomen, thorax, head);
                const wl = new THREE.Mesh(new THREE.CircleGeometry(4, 12), wingMat);
                wl.position.set(0, 1, 3); wl.rotation.x = -0.6;
                const wr = new THREE.Mesh(new THREE.CircleGeometry(4, 12), wingMat);
                wr.position.set(0, 1, -3); wr.rotation.x = Math.PI + 0.6;
                b.add(wl, wr);
                b.scale.setScalar(s);
                return b;
            };
            const g = new THREE.Group();
            for (let i = 0; i < n; i++) {
                const b = bug();
                // Deterministic scatter — Math.random() would reshuffle the swarm
                // on every re-render.
                if (n === 1) b.position.set(0, 8, 0);
                else {
                    b.position.set((i * 73 % 40) - 20, 8 + ((i * 191 % 30) - 5), (i * 129 % 40) - 20);
                    b.rotation.y = i * 0.9;
                }
                g.add(b);
            }
            return g;
        },
    },

    // ------------------------------------------------------------------- FLYING
    flying: {
        title: 'FLYING',
        nav: { label: '🐦 Flying', color: '#88ddff' },
        prefix: 'fly',
        fields: [
            { key: 'spec', label: 'SPECIES', type: 'select', options: 'flySpecies' },
            { key: 'cust', type: 'text', placeholder: 'Custom species (optional)' },
            { key: 'count', label: 'COUNT', type: 'select', options: 'flyCount', half: true },
            { key: 'alt', label: 'ALTITUDE', type: 'select', options: 'flyAltitude', half: true },
            { key: 'act', label: 'ACTION', type: 'select', options: 'flyAction' },
            { key: 'note', type: 'text', placeholder: 'Custom notes' },
        ],
        name: v => v.cust || v.spec || 'Bird',
        label: v => '🐦 ' + (v.cust || v.spec || 'BIRD')
            + (v.count && v.count !== 'Single' ? ` (${v.count})` : ''),
        phrase: (v, sp) => {
            const spec = lc(v.cust || v.spec) || 'bird';
            const c = lc(v.count);
            const many = c !== 'single';
            let noun;
            if (c === 'single') noun = `a lone ${spec}`;
            else if (c === 'pair') noun = `a pair of ${pluralize(spec).toLowerCase()}`;
            else noun = `a ${c} of ${pluralize(spec).toLowerCase()}`;
            let s = `${noun} ${lc(v.alt)}, positioned ${sp}`;
            if (v.note) s += `, ${v.note}`;
            return s;
        },
        action: v => {
            const spec = lc(v.cust || v.spec) || 'bird';
            const many = lc(v.count) !== 'single';
            return `${many ? 'the ' + pluralize(spec) + ' are' : 'the ' + spec + ' is'} ${lc(first(v.act))}`;
        },
        audio: v => {
            const a = lc(v.act), c = lc(v.count), out = [];
            if (a.includes('flap') || a.includes('taking off')) out.push('beating wings');
            if (c.includes('flock') || c.includes('murmuration')) out.push('a chorus of distant calls');
            return out;
        },
        tags: v => [
            lc(v.count) === 'single' ? (v.cust || v.spec) : `${v.count} of ${pluralize(v.cust || v.spec)}`,
            v.act, v.alt, v.note,
        ],
        mesh: (v, THREE) => {
            const counts = { 'Massive Murmuration': 14, 'Large Flock': 9, 'Small Flock': 5, 'Pair': 2 };
            const n = counts[v.count] || 1;
            const alts = {
                'Ground Level': 4, 'Treetop': 30, 'Low Sky': 55, 'High Sky': 85,
                'Silhouetted Against Sun': 70,
            };
            const baseY = alts[v.alt] ?? 45;
            const mat = new THREE.MeshStandardMaterial({ color: 0x33383f });
            const bird = () => {
                const b = new THREE.Group();
                const body = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 10), mat);
                body.scale.set(1.8, 1, 1);
                b.add(body);
                // Wings as angled planes read as a bird silhouette from any angle.
                [1, -1].forEach(side => {
                    const w = new THREE.Mesh(
                        new THREE.PlaneGeometry(9, 3),
                        new THREE.MeshStandardMaterial({ color: 0x444a52, side: THREE.DoubleSide })
                    );
                    w.position.set(0, 1, side * 5);
                    w.rotation.x = side * 0.5;
                    b.add(w);
                });
                return b;
            };
            const g = new THREE.Group();
            for (let i = 0; i < n; i++) {
                const b = bird();
                if (n === 1) b.position.set(0, baseY, 0);
                else {
                    b.position.set((i * 61 % 50) - 25, baseY + ((i * 97 % 22) - 11), (i * 137 % 50) - 25);
                    b.rotation.y = i * 0.7;
                }
                g.add(b);
            }
            return g;
        },
    },

    // ------------------------------------------------------------------ VEHICLE
    vehicle: {
        title: 'VEHICLE',
        nav: { label: '🚗 Vehicle', color: '#ff8855' },
        prefix: 'veh',
        fields: [
            { key: 'spec', label: 'TYPE', type: 'select', options: 'vehSpecies' },
            { key: 'cust', type: 'text', placeholder: 'Custom model (e.g. 1969 Mustang)' },
            { key: 'era', label: 'ERA', type: 'select', options: 'vehEra', default: 'Modern', half: true },
            { key: 'cond', label: 'CONDITION', type: 'select', options: 'vehCondition', half: true },
            { key: 'act', label: 'ACTION', type: 'select', options: 'vehAction' },
            { key: 'note', type: 'text', placeholder: 'Custom notes (colour, damage...)' },
        ],
        name: v => v.cust || v.spec || 'Vehicle',
        label: v => '🚗 ' + (v.cust || v.spec || 'VEHICLE'),
        phrase: (v, sp) => {
            const spec = lc(v.cust || v.spec) || 'vehicle';
            let s = `a ${lc(first(v.cond))} ${lc(first(v.era))} ${spec}, positioned ${sp}`;
            if (v.note) s += `, ${v.note}`;
            return s;
        },
        action: v => `the ${lc(v.cust || v.spec) || 'vehicle'} is ${lc(first(v.act))}`,
        audio: v => {
            const a = lc(v.act), out = [];
            if (a.includes('speed') || a.includes('accelerat')) out.push('a roaring engine');
            if (a.includes('drift') || a.includes('brak')) out.push('screeching tyres');
            if (a.includes('crash')) out.push('tearing metal');
            if (a.includes('idl')) out.push('a low idling engine');
            return out;
        },
        tags: v => [v.cust || v.spec, first(v.era), v.cond, v.act, v.note],
        mesh: (v, THREE) => {
            const conds = {
                'Pristine': 0x3366cc, 'Dusty': 0x8a7f6a, 'Rusted': 0x8a4a2a,
                'Damaged': 0x555f66, 'Burning': 0xcc4411, 'Wrecked': 0x3a3a3a,
            };
            const g = new THREE.Group();
            const mat = new THREE.MeshStandardMaterial({ color: conds[v.cond] || 0x3366cc });
            const chassis = new THREE.Mesh(new THREE.BoxGeometry(26, 6, 11), mat);
            chassis.position.y = 7; g.add(chassis);
            const cabin = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 10), mat);
            cabin.position.set(-1, 13, 0); g.add(cabin);
            const tyre = new THREE.MeshStandardMaterial({ color: 0x111111 });
            [[8, 5.5], [8, -5.5], [-8, 5.5], [-8, -5.5]].forEach(([wx, wz]) => {
                const w = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 2, 12), tyre);
                w.rotation.x = Math.PI / 2;
                w.position.set(wx, 3.4, wz);
                g.add(w);
            });
            return g;
        },
    },

    // -------------------------------------------------------------------- CROWD
    crowd: {
        title: 'CROWD',
        nav: { label: '👥 Crowd', color: '#ffaadd' },
        prefix: 'crd',
        fields: [
            { key: 'dens', label: 'DENSITY', type: 'select', options: 'crowdDensity', default: 'Moderate' },
            { key: 'beh', label: 'BEHAVIOR', type: 'select', options: 'crowdBehavior' },
            { key: 'attire', label: 'ATTIRE', type: 'select', options: 'crowdAttire' },
            { key: 'note', type: 'text', placeholder: 'Custom notes' },
        ],
        name: () => 'Crowd',
        label: v => '👥 ' + (v.dens ? first(v.dens).toUpperCase() + ' CROWD' : 'CROWD'),
        phrase: (v, sp) => {
            let s = `a ${lc(first(v.dens))} crowd in ${lc(v.attire)}, positioned ${sp}`;
            if (v.note) s += `, ${v.note}`;
            return s;
        },
        action: v => `the crowd is ${lc(v.beh)}`,
        audio: v => {
            const b = lc(v.beh), out = [];
            if (b.includes('panic') || b.includes('flee') || b.includes('riot')) out.push('screaming and chaos');
            if (b.includes('celebrat') || b.includes('danc')) out.push('cheering and music');
            if (b.includes('protest')) out.push('rhythmic chanting');
            if (b.includes('commut') || b.includes('watch')) out.push('a murmur of many voices');
            return out;
        },
        tags: v => [`${first(v.dens)} crowd`, v.beh, v.attire, v.note],
        mesh: (v, THREE) => {
            const counts = {
                'Sparse (a handful)': 4, 'Moderate': 9, 'Dense': 16,
                'Packed': 24, 'Sea of People': 36,
            };
            const n = counts[v.dens] || 9;
            const g = new THREE.Group();
            const body = new THREE.MeshStandardMaterial({ color: 0x4a5a7a });
            const head = new THREE.MeshStandardMaterial({ color: 0xffccaa });
            // Spread widens with the count so a packed crowd reads as a mass.
            const spread = 14 + n * 1.5;
            for (let i = 0; i < n; i++) {
                const p = new THREE.Group();
                const t = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 11, 8), body);
                t.position.y = 5.5;
                const h = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 8), head);
                h.position.y = 13;
                p.add(t, h);
                p.position.set(
                    ((i * 89) % (spread * 2)) - spread,
                    0,
                    ((i * 151) % (spread * 2)) - spread
                );
                g.add(p);
            }
            return g;
        },
    },

    // ------------------------------------------------------------------ AQUATIC
    aquatic: {
        title: 'AQUATIC',
        nav: { label: '🐟 Aquatic', color: '#55ddcc' },
        prefix: 'aqu',
        fields: [
            { key: 'spec', label: 'SPECIES', type: 'select', options: 'aquSpecies' },
            { key: 'cust', type: 'text', placeholder: 'Custom species (optional)' },
            { key: 'count', label: 'COUNT', type: 'select', options: 'aquCount', half: true },
            { key: 'water', label: 'WATER', type: 'select', options: 'aquWater', half: true },
            { key: 'act', label: 'ACTION', type: 'select', options: 'aquAction' },
            { key: 'note', type: 'text', placeholder: 'Custom notes' },
        ],
        name: v => v.cust || v.spec || 'Fish',
        label: v => '🐟 ' + (v.cust || v.spec || 'AQUATIC')
            + (v.count && v.count !== 'Single' ? ` (${v.count})` : ''),
        phrase: (v, sp) => {
            const spec = lc(v.cust || v.spec) || 'fish';
            const c = lc(v.count);
            let noun;
            if (c === 'single') noun = `a lone ${spec}`;
            else if (c === 'a few') noun = `a few ${pluralize(spec).toLowerCase()}`;
            else noun = `a ${c} of ${pluralize(spec).toLowerCase()}`;
            let s = `${noun} in ${lc(v.water)} water, positioned ${sp}`;
            if (v.note) s += `, ${v.note}`;
            return s;
        },
        action: v => {
            const spec = lc(v.cust || v.spec) || 'fish';
            const many = lc(v.count) !== 'single';
            return `${many ? 'the ' + pluralize(spec) + ' are' : 'the ' + spec + ' is'} ${lc(first(v.act))}`;
        },
        audio: v => {
            const a = lc(v.act);
            return a.includes('breach') ? ['a heavy splash'] : ['muffled underwater ambience'];
        },
        tags: v => [
            lc(v.count) === 'single' ? (v.cust || v.spec) : `${v.count} of ${pluralize(v.cust || v.spec)}`,
            v.act, `${v.water} water`, v.note,
        ],
        mesh: (v, THREE) => {
            const counts = { 'Massive School': 16, 'School': 9, 'A Few': 3 };
            const n = counts[v.count] || 1;
            const waters = {
                'Crystal Clear Shallows': 0x66ddee, 'Sunlit Blue': 0x3399cc,
                'Murky Green': 0x557755, 'Deep Dark': 0x223344, 'Bioluminescent': 0x44ffcc,
            };
            const mat = new THREE.MeshStandardMaterial({ color: waters[v.water] || 0x3399cc });
            const fish = () => {
                const f = new THREE.Group();
                const body = new THREE.Mesh(new THREE.SphereGeometry(3, 10, 10), mat);
                body.scale.set(2.2, 1, 0.7);
                const tail = new THREE.Mesh(
                    new THREE.ConeGeometry(2.5, 5, 6),
                    new THREE.MeshStandardMaterial({ color: waters[v.water] || 0x3399cc, side: THREE.DoubleSide })
                );
                tail.rotation.z = Math.PI / 2;
                tail.position.x = -8;
                tail.scale.z = 0.4;
                f.add(body, tail);
                return f;
            };
            const g = new THREE.Group();
            for (let i = 0; i < n; i++) {
                const f = fish();
                if (n === 1) f.position.set(0, 14, 0);
                else {
                    f.position.set((i * 67 % 44) - 22, 14 + ((i * 113 % 24) - 12), (i * 149 % 44) - 22);
                    f.rotation.y = i * 0.5;
                }
                g.add(f);
            }
            return g;
        },
    },
};

// Read every field of a subject node straight off the DOM.
function readSubject(type, id) {
    const def = SUBJECTS[type];
    const v = {};
    def.fields.forEach(f => {
        v[f.key] = document.getElementById(`${def.prefix}_${f.key}_${id}`)?.value ?? '';
    });
    return v;
}

// Build the node body. Two consecutive `half: true` fields share a row.
function buildSubjectHTML(type, id) {
    const def = SUBJECTS[type];
    const opts = f => DB[f.options].map(o =>
        `<option ${f.default === o ? 'selected' : ''}>${o}</option>`).join('');
    const lbl = t => `<div style="font-size:0.6rem; color:#666">${t}</div>`;

    const field = (f, inRow) => {
        const eid = `${def.prefix}_${f.key}_${id}`;
        if (f.type === 'text') {
            return `<input type="text" class="obj-input" id="${eid}" placeholder="${f.placeholder || ''}"
                oninput="triggerUpdate()" style="margin-top:5px">`;
        }
        const sel = `${lbl(f.label)}<select id="${eid}" onchange="triggerUpdate()">${opts(f)}</select>`;
        return inRow ? `<div style="flex:1">${sel}</div>` : `<div style="margin-top:5px">${sel}</div>`;
    };

    let html = '';
    for (let i = 0; i < def.fields.length; i++) {
        const f = def.fields[i], next = def.fields[i + 1];
        if (f.half && next && next.half) {
            html += `<div style="display:flex; gap:5px; margin-top:5px">${field(f, true)}${field(next, true)}</div>`;
            i++;
        } else {
            html += field(f, false);
        }
    }
    return html + getSpatialContextHTML(id);
}

const SUBJECT_TYPES = Object.keys(SUBJECTS);
