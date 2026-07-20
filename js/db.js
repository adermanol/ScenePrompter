// --- UTILS ---
function kelvinToRgb(k) {
    let temp = k / 100;
    let r, g, b;
    if (temp <= 66) {
        r = 255;
        g = temp;
        g = 99.4708025861 * Math.log(g) - 161.1195681661;
        if (temp <= 19) b = 0;
        else {
            b = temp - 10;
            b = 138.5177312231 * Math.log(b) - 305.0447927307;
        }
    } else {
        r = temp - 60;
        r = 329.698727446 * Math.pow(r, -0.1332047592);
        g = temp - 60;
        g = 288.1221695283 * Math.pow(g, -0.0755148492);
        b = 255;
    }
    return `rgb(${Math.min(255,Math.max(0,r))},${Math.min(255,Math.max(0,g))},${Math.min(255,Math.max(0,b))})`;
}

function timeToRgb(hour) {
    if(hour >= 6 && hour < 10) return "rgb(255, 150, 50)";
    if(hour >= 10 && hour < 17) return "rgb(255, 255, 220)";
    if(hour >= 17 && hour < 20) return "rgb(255, 100, 50)";
    return "rgb(20, 30, 80)";
}

// --- CONFIG ---
const DB = {
    render: ["Unreal Engine 5", "Octane", "Redshift", "Nano Banana", "Midjourney"],
    ratio: ["16:9", "1:1", "9:16", "4:3", "2.39:1"],
    res: ["1080p", "4K", "8K"],
    camBodies: [
        { brand: "ARRI (Digital)", models: [
            { name: "Alexa 35", flavor: "17 stops dynamic range, smooth highlight roll-off, natural skin tones" },
            { name: "Alexa 65", flavor: "IMAX-level large format digital, extremely shallow depth of field" },
            { name: "Alexa LF", flavor: "Large format, organic and three-dimensional feel" },
            { name: "Alexa Mini LF", flavor: "Large format, versatile, smooth roll-off" },
            { name: "Alexa Mini", flavor: "Industry standard S35, highly cinematic" },
            { name: "Amira", flavor: "Documentary style, beautiful ARRI color science" }
        ]},
        { brand: "ARRI (Analog Film)", models: [
            { name: "Arriflex 416 (16mm)", flavor: "Classic 16mm film grain, organic, gritty" },
            { name: "Arricam LT (35mm)", flavor: "Classic 35mm Hollywood film look" },
            { name: "Arriflex 435 (35mm)", flavor: "High-speed 35mm film, intense motion" },
            { name: "Arriflex 765 (65mm)", flavor: "70mm film epic scale, insanely detailed" }
        ]},
        { brand: "RED Digital Cinema", models: [
            { name: "V-Raptor XL 8K VV", flavor: "Ultra high-res, clinically sharp, high contrast" },
            { name: "Monstro 8K VV", flavor: "Clean shadows, massive resolution, modern look" },
            { name: "Helium 8K S35", flavor: "Sharp S35, vibrant colors, very clean" },
            { name: "Gemini 5K S35", flavor: "Excellent low light, slightly softer than Helium" },
            { name: "Komodo-X", flavor: "Global shutter, fast motion without distortion" },
            { name: "Epic Dragon", flavor: "Classic RED gritty high-contrast look" }
        ]},
        { brand: "Sony Cinema Line", models: [
            { name: "Venice 2 (8K)", flavor: "Clean shadows, dual base ISO, smooth gradients" },
            { name: "Venice 1 (6K)", flavor: "Highly natural, popular in modern blockbusters" },
            { name: "Burano", flavor: "Versatile, extremely clean low light" },
            { name: "F65", flavor: "Vintage digital cinema, unique mechanical shutter feel" },
            { name: "FX9", flavor: "Modern documentary style, crisp" }
        ]},
        { brand: "Panavision", models: [
            { name: "Millennium DXL2", flavor: "8K with Light Iron color, warm and filmic digital" },
            { name: "Millennium XL2 (35mm)", flavor: "Classic Panavision 35mm film look" },
            { name: "System 65", flavor: "Epic 65mm format, massive scale" }
        ]},
        { brand: "IMAX", models: [
            { name: "IMAX MKIV (15/70mm)", flavor: "The absolute highest resolution film format, awe-inspiring" },
            { name: "IMAX MSM 9802", flavor: "15/70mm action camera, raw and epic" }
        ]},
        { brand: "Blackmagic Design", models: [
            { name: "URSA Cine 12K", flavor: "Massive resolution, soft film curve, non-bayer array" },
            { name: "Pocket Cinema Camera 6K Pro", flavor: "Film-like color science, very popular indie look" }
        ]},
        { brand: "Canon & Aaton", models: [
            { name: "EOS C700 FF", flavor: "Warm Canon skin tones, very cinematic" },
            { name: "EOS C300 Mark III", flavor: "DGO sensor, incredibly clean shadows" },
            { name: "Aaton Penelope (35mm)", flavor: "Handheld 35mm film, documentary feel" },
            { name: "Aaton XTR Prod (16mm)", flavor: "Raw, gritty 16mm analog feel" }
        ]}
    ],
    camLenses: [
        { brand: "Cooke Optics", models: [
            { name: "Cooke S8/i FF", flavor: "Modern full frame, warm 'Cooke Look', smooth bokeh" },
            { name: "Cooke S7/i FF", flavor: "Organic, romantic, highly flattering on skin" },
            { name: "Cooke S4/i", flavor: "The classic 'Cooke Look', golden warmth, gentle focus roll-off" },
            { name: "Cooke Panchro/i Classic", flavor: "Vintage warmth, beautiful flares, softer contrast" },
            { name: "Cooke Anamorphic/i", flavor: "Classic oval bokeh, organic distortion, warm flares" },
            { name: "Cooke Anamorphic/i SF", flavor: "Special Flair coating, heavy cinematic flares" }
        ]},
        { brand: "ARRI / Zeiss", models: [
            { name: "Master Primes", flavor: "Clinically sharp, zero distortion, perfect optics" },
            { name: "Signature Primes", flavor: "Smooth, organic, magnesium housing feel, subtle warmth" },
            { name: "Ultra Primes", flavor: "Punchy contrast, very sharp, classic modern cinema" },
            { name: "Supreme Primes", flavor: "Versatile, clean, gentle focus fall-off" },
            { name: "Zeiss Super Speeds", flavor: "Vintage 70s/80s, triangular bokeh, glowing highlights" },
            { name: "Zeiss Standard Speeds", flavor: "Vintage 'Taxi Driver' look, low contrast, character" }
        ]},
        { brand: "Panavision", models: [
            { name: "Primo Primes", flavor: "Classic Hollywood, sharp but gentle, smooth flares" },
            { name: "C-Series Anamorphic", flavor: "Legendary blue horizontal flares, soft oval bokeh" },
            { name: "G-Series Anamorphic", flavor: "Sharper anamorphic, classic Panavision character" },
            { name: "T-Series Anamorphic", flavor: "Modern high-contrast anamorphic, clean flares" },
            { name: "E-Series Anamorphic", flavor: "Aggressive blue flares, used in sci-fi classics" }
        ]},
        { brand: "Leica / Leitz", models: [
            { name: "Summilux-C", flavor: "High micro-contrast, subject pops out, creamy background" },
            { name: "Thalia", flavor: "Large format, organic, very circular bokeh" },
            { name: "Elsie", flavor: "Warm, smooth, pronounced fall-off" }
        ]},
        { brand: "Vintage / Specialty", models: [
            { name: "Canon K35 Primes", flavor: "Vintage 70s, golden flares, low contrast, magical" },
            { name: "Kowa Prominar Anamorphic", flavor: "Vintage Japanese, warm chaotic flares, soft edges" },
            { name: "Lomo Round-Front Anamorphic", flavor: "Russian vintage, chaotic flares, highly erratic" },
            { name: "Lomo Square-Front", flavor: "Extreme distortion, aggressive vintage character" },
            { name: "Atlas Orion Anamorphic", flavor: "Modern vintage blend, waterfall bokeh, classic streak" },
            { name: "Angénieux Optimo", flavor: "Soft 'French' aesthetic, warm, creamy" },
            { name: "Helios 44-2", flavor: "Swirly vortex bokeh, dreamy and confusing" },
            { name: "Petzval", flavor: "Extreme center sharpness, completely swirled edges" }
        ]}
    ],
    sceneLoc: ["Interior: Abandoned Warehouse", "Interior: Living Room", "Interior: Subway Station", "Exterior: City Street", "Exterior: Dense Forest", "Exterior: Desert", "Fantastic: Cyber City", "Fantastic: Space Station", "Historical: Medieval Castle", "Historical: Ancient Temple"],
    sceneTime: ["Pre-dawn (04:00-05:30)", "Golden Hour Morning (05:30-07:00)", "Morning (07:00-10:00)", "Noon (10:00-14:00)", "Afternoon (14:00-16:00)", "Golden Hour Evening (16:00-18:00)", "Twilight / Magic Hour (18:00-19:30)", "Night Moonlit (19:30-04:00)", "Night Dark (19:30-04:00)"],
    sceneWeather: ["Clear", "Partly Cloudy", "Heavy Rain", "Thunderstorm", "Snow Blizzard", "Dense Fog", "Light Haze", "Dust Storm"],
    sceneMood: ["Tense / Mysterious", "Dark / Ominous", "Melancholic", "Peaceful", "Joyful", "Epic / Triumphant", "Chaotic / Frantic", "Dreamlike", "Nightmarish"],
    sceneAction: ["Suspense: Sneaking", "Dialog: Argument", "Dialog: Intimate", "Action: Chase", "Action: Combat", "Emotional: Crying", "Daily: Walking", "Ritual: Ceremony"],
    styleCinematic: ["Film Noir", "Neo-noir", "Cyberpunk", "Steampunk", "Solarpunk", "Documentary", "High Fantasy", "Dark Fantasy", "Spaghetti Western"],
    stylePeriod: ["Ancient Era", "Medieval", "Victorian", "Roaring 20s", "1950s", "1980s", "1990s", "Present Day", "Near Future", "Far Future"],
    styleArt: ["Impressionism", "Expressionism", "Surrealism", "Pop Art", "Minimalism", "Art Deco", "Wabi-Sabi", "Synthwave"],
    styleDirector: ["Roger Deakins", "Christopher Nolan", "Quentin Tarantino", "Wes Anderson", "Stanley Kubrick", "David Fincher", "Wong Kar-wai", "Denis Villeneuve", "Tim Burton"],
    stylePalette: ["Teal and Orange", "Muted / Desaturated", "High Contrast B&W", "Sepia Tone", "Neon / Synthwave", "Pastel / Dreamy", "Earth Tones"],
    charAge: ["Baby (0-2)", "Child (3-12)", "Teenager (13-17)", "Young Adult (18-25)", "Adult (26-40)", "Middle Age (41-60)", "Senior (61-80)", "Elderly (80+)"],
    charBuild: ["Skinny", "Athletic / Muscular", "Average", "Chubby", "Heavy / Large", "Tall & Lanky", "Short & Stocky"],
    charClothing: ["Formal Suit / Dress", "Casual Streetwear", "Period Costume", "Sci-fi Armor", "Post-Apocalyptic Rags", "Hospital Gown", "Work Overalls"],
    charWear: ["Immaculate", "Slightly Worn", "Torn and Dirty", "Shredded / Bloodstained"],
    charEmotion: ["Anger", "Sadness", "Fear", "Joy", "Surprise", "Disgust", "Contempt", "Anticipation", "Confusion", "Controlled Fury", "Panic", "Awe"],
    charMicro: ["Jaw clenching", "Temple vein pulsing", "Slight lip quiver", "Eyes darting", "Nostrils flaring", "Tears welling", "Subtle smirk", "Blank stare"],
    charPosture: ["Standing straight", "Slouched / Defeated", "Confrontational / Weight fwd", "Crouching", "Sitting defensively", "Laying down"],
    charGesture: ["Clenched fists", "Pointing aggressively", "Hands in pockets", "Arms crossed", "Hands on hips", "Rubbing chin", "Hands raised in surrender"],
    charGait: ["Standing still", "Walking briskly", "Running frantically", "Limping", "Stumbling", "Marching"],
    shotType: ["Extreme Close-Up (ECU)", "Close-Up (CU)", "Medium Shot (MS)", "Medium Wide Shot (MWS)", "Wide Shot (WS)", "Extreme Wide Shot (EWS)", "Over the Shoulder (OTS)", "Point of View (POV)"],
    camMove: ["Static", "Pan", "Tilt", "Dolly In", "Dolly Out", "Tracking", "Crane Shot", "Steadicam", "Handheld", "Drone Shot"],
    atmos: ["Clear", "Light Haze", "Dense Fog", "Ground Fog", "Dust Particles", "Cinematic Smoke", "Volumetric Rays", "Rain", "Snow"],
    camIso: ["100", "200", "400", "800", "1600", "3200", "12800"],
    camAperture: ["f/1.2", "f/1.4", "f/2.0", "f/2.8", "f/4.0", "f/5.6", "f/8.0", "f/16.0", "f/22.0"],
    camShutter: ["1/24 (360°)", "1/48 (180° - Normal)", "1/96 (45° - Choppy)", "Long Exposure"],
    camFilter: ["None", "ProMist 1/4", "ProMist 1/8", "Polarizer", "ND Filter", "Streak Filter (Anamorphic)", "Star Filter"],
    lightBrand: ["Arri", "Aputure", "Nanlite", "Litepanels", "Astera", "Kino Flo"],
    lightMod: ["Bare Bulb", "Softbox", "Octabox", "Beauty Dish", "Fresnel", "Snoot", "Gobo (Blinds)"],
    lightGel: ["None", "CTO (Warm)", "CTB (Cool)", "Red", "Blue", "Green", "Magenta", "Cyan", "Yellow"],
    colLut: ["Teal & Orange", "Bleach Bypass", "Cross Process", "Day for Night", "Desaturated", "High Contrast", "Vintage"],
    colStock: ["Digital Clean", "Kodak Portra 400", "Kodak Gold 200", "Cinestill 800T", "Fujifilm Superia", "Ilford HP5 (B&W)", "Kodak Vision3 500T"],
    compRule: ["Rule of Thirds", "Golden Ratio", "Center Symmetry", "Frame within a Frame", "Leading Lines", "Dutch Angle"],

    // --- CUSTOM LOCATION ---
    locEnv: ["Interior", "Exterior", "Underground", "Underwater", "Aerial / Sky", "Outer Space", "Mixed Interior/Exterior"],
    locArch: ["Undefined", "Brutalist Concrete", "Gothic Stone", "Industrial / Factory", "Organic / Natural", "Art Deco", "Modernist Glass", "Ancient Ruins", "Futuristic / Sci-fi", "Rustic Wooden", "Slum / Shanty", "Baroque Ornate", "Minimalist"],
    locSurface: ["Undefined", "Wet Asphalt", "Dry Sand", "Lush Grass", "Polished Marble", "Thick Mud", "Fresh Snow", "Metal Grating", "Shallow Water", "Cracked Concrete", "Cobblestone", "Rich Soil", "Volcanic Rock"],
    locScale: ["Cramped / Claustrophobic", "Intimate", "Room-sized", "Spacious", "Vast / Cavernous", "Endless / Infinite Horizon"],

    // --- QUADRUPED (four-legged animals) ---
    quadSpecies: ["Dog", "Wolf", "Horse", "Lion", "Tiger", "Bear", "Deer / Stag", "Domestic Cat", "Elephant", "Bull / Cattle", "Fox", "Leopard", "Cheetah", "Rhinoceros", "Goat", "Boar", "Camel", "Bison"],
    quadSize: ["Tiny", "Small", "Medium", "Large", "Massive"],
    quadCoat: ["Sleek Fur", "Shaggy / Thick Fur", "Muddy / Matted", "Scarred / Battle-worn", "Wet / Dripping", "Groomed / Glossy", "Armored / Plated", "Mangy / Diseased"],
    quadAction: ["Standing Alert", "Prowling / Stalking", "Trotting", "Galloping", "Charging", "Leaping", "Resting / Lying Down", "Hunting", "Rearing Up", "Fighting / Clashing", "Grazing", "Snarling"],
    quadMood: ["Calm", "Aggressive", "Fearful / Skittish", "Playful", "Wounded", "Majestic / Regal", "Feral / Wild", "Loyal / Docile"],

    // --- INSECT ---
    insectSpecies: ["Butterfly", "Honeybee", "Ant", "Spider", "Beetle", "Dragonfly", "Moth", "Grasshopper", "Praying Mantis", "Firefly", "Wasp", "Ladybug", "Scorpion", "Centipede", "Cicada", "Locust", "Cockroach"],
    insectScale: ["Extreme Macro Close-up", "Life-size Detail", "Swarm / Distant Cloud"],
    insectCount: ["Single Specimen", "A Few", "Cluster", "Swarm", "Massive Infestation"],
    insectBehavior: ["Crawling", "Flying", "Hovering", "Swarming", "Feeding", "Building / Nesting", "Fighting", "Emerging / Metamorphosis", "Still / Camouflaged", "Skittering"],
    insectSurface: ["On a Leaf", "On Human Skin", "On a Flower", "On Decaying Matter", "On a Spiderweb", "In Mid-air Flight", "On Bare Ground", "On Tree Bark", "On Water Surface"],

    // --- FLYING (birds & winged creatures) ---
    flySpecies: ["Eagle", "Crow", "Raven", "Owl", "Hawk", "Falcon", "Seagull", "Sparrow", "Pigeon", "Vulture", "Heron", "Swan", "Flamingo", "Hummingbird", "Bat", "Dragon"],
    flyCount: ["Single", "Pair", "Small Flock", "Large Flock", "Massive Murmuration"],
    flyAltitude: ["Ground Level", "Treetop", "Low Sky", "High Sky", "Silhouetted Against Sun"],
    flyAction: ["Soaring", "Gliding", "Diving / Stooping", "Hovering", "Taking Off", "Landing", "Circling", "Perched", "Flapping Frantically"],

    // --- VEHICLE ---
    vehSpecies: ["Car", "Motorcycle", "Truck", "Van", "Bus", "Train", "Boat", "Ship", "Airplane", "Helicopter", "Bicycle", "Tank", "Spacecraft"],
    vehEra: ["Vintage / Classic", "1980s", "Modern", "Near-Future", "Futuristic"],
    vehCondition: ["Pristine", "Dusty", "Rusted", "Damaged", "Burning", "Wrecked"],
    vehAction: ["Parked", "Idling", "Cruising", "Speeding", "Accelerating", "Drifting", "Braking Hard", "Crashing"],

    // --- CROWD ---
    crowdDensity: ["Sparse (a handful)", "Moderate", "Dense", "Packed", "Sea of People"],
    crowdBehavior: ["Commuting", "Watching", "Celebrating", "Dancing", "Protesting", "Rioting", "Panicking", "Fleeing", "Praying"],
    crowdAttire: ["Modern Casual", "Business Attire", "Period Costume", "Uniforms", "Ragged Clothing", "Festival Dress", "Ceremonial Robes"],

    // --- AQUATIC ---
    aquSpecies: ["Fish", "Dolphin", "Shark", "Whale", "Octopus", "Jellyfish", "Sea Turtle", "Manta Ray", "Eel", "Crab", "Seal"],
    aquCount: ["Single", "A Few", "School", "Massive School"],
    aquWater: ["Crystal Clear Shallows", "Sunlit Blue", "Murky Green", "Deep Dark", "Bioluminescent"],
    aquAction: ["Swimming", "Gliding", "Hunting", "Breaching", "Drifting", "Darting Away", "Resting on Seabed"],

    // --- VFX ---
    vfxSpecies: ["Explosion", "Fire", "Billowing Smoke", "Magic / Arcane", "Lightning", "Flying Debris", "Sparks", "Shockwave", "Portal / Rift", "Energy Beam", "Shattering Glass", "Blood Splatter", "Steam Burst", "Embers"],
    vfxScale: ["Small", "Medium", "Large", "Massive", "Screen-filling"],
    vfxTiming: ["Just Ignited", "Mid-blast", "At Peak", "Dissipating", "Aftermath / Smouldering"],
    vfxColor: ["Natural", "Orange / Fiery", "Blue / Cold", "Green / Toxic", "Purple / Arcane", "White / Blinding", "Black / Oily"],

    // --- CAMERA (added) ---
    camFormat: ["Super 35", "Full Frame", "Large Format", "65mm", "16mm", "Anamorphic 2x", "VistaVision"],
    camFps: ["24 fps (standard)", "25 fps (PAL)", "48 fps", "60 fps", "120 fps (slow motion)", "240 fps (extreme slow-mo)", "12 fps (stop-motion feel)"],
    camFocus: ["Deep focus", "Shallow focus", "Split diopter", "Rack focus", "Soft focus", "Tilt-shift / miniature"],
    camAngle: ["Eye level", "Low angle", "High angle", "Bird's eye", "Worm's eye", "Dutch tilt", "Over-the-shoulder", "Top-down"],

    // --- CHARACTER (added) ---
    charHair: ["Short cropped hair", "Long flowing hair", "Buzz cut", "Slicked back hair", "Messy unkempt hair", "Curly hair", "Braided hair", "Ponytail", "Bald", "Wet matted hair", "Grey streaked hair"],
    charFacialHair: ["Clean shaven", "Light stubble", "Heavy stubble", "Full beard", "Moustache", "Goatee", "Long unkempt beard"],
    charFeature: ["Facial scar", "Full sleeve tattoos", "Face tattoo", "Wire-rim glasses", "Sunglasses", "Eyepatch", "Freckles", "Heavy makeup", "Blood on face", "Dirt-streaked skin", "Cybernetic implant", "Burn marks"],

    // --- STYLE (added) ---
    styleDp: ["Roger Deakins", "Emmanuel Lubezki", "Hoyte van Hoytema", "Robert Richardson", "Greig Fraser", "Rachel Morrison", "Bradford Young", "Christopher Doyle", "Vittorio Storaro", "Janusz Kamiński"],
    styleTexture: ["Clean digital", "Filmic and organic", "Gritty and grainy", "Painterly", "Glossy and polished", "Hazy and diffused", "Harsh and clinical", "Dreamlike and soft"],

    // --- COLOR GRADE (added) ---
    colContrast: ["Low / flat", "Natural", "Punchy", "Extreme / crushed blacks"],
    colSaturation: ["Desaturated", "Muted", "Natural", "Rich", "Hyper-saturated"],
    colGrain: ["None / clean", "Fine", "Moderate", "Heavy 16mm-style"],
    colHalation: ["Subtle halation", "Strong halation around highlights", "Anamorphic bloom", "Clean, no bloom"],
    colVignette: ["None", "Subtle", "Heavy"],

    // --- MATERIAL ---
    materialTypes: {
        organic: [
            { name: "Bioluminescent Coral", flavor: "Living reef surface, faintly glowing in deep blue-green", color: 0x22aa88, roughness: 0.65, metalness: 0.0, emissive: 0x00ffaa, emissiveIntensity: 0.4 },
            { name: "Dried Bone", flavor: "Sun-bleached skeletal surface, chalky and matte", color: 0xe8dcc8, roughness: 0.9, metalness: 0.0 },
            { name: "Ancient Amber", flavor: "Fossilised tree resin, warm translucent gold", color: 0xcc8822, roughness: 0.3, metalness: 0.05, opacity: 0.55 },
            { name: "Living Wood", flavor: "Bark and grain, damp and fibrous", color: 0x6b4226, roughness: 0.75, metalness: 0.0 },
            { name: "Petrified Stone", flavor: "Organic form turned mineral, dense and heavy", color: 0x8a7e6a, roughness: 0.8, metalness: 0.05 },
            { name: "Moss-Covered Rock", flavor: "Damp lichen over weathered stone", color: 0x4a6632, roughness: 0.85, metalness: 0.0 },
            { name: "Chitin Shell", flavor: "Insect exoskeleton, glossy and segmented", color: 0x3a2a1a, roughness: 0.35, metalness: 0.15 },
            { name: "Woven Sinew", flavor: "Braided tendon and fibre, taut and raw", color: 0x9a7a5a, roughness: 0.7, metalness: 0.0 },
            { name: "Calcified Coral", flavor: "Dead reef, white and brittle", color: 0xeee8dd, roughness: 0.8, metalness: 0.0 },
            { name: "Volcanic Pumice", flavor: "Porous, lightweight ignite rock", color: 0x555555, roughness: 0.95, metalness: 0.0 },
            { name: "Obsidian", flavor: "Volcanic glass, razor-sharp and deeply black", color: 0x111118, roughness: 0.08, metalness: 0.1 },
            { name: "Salt Crystal", flavor: "Translucent mineral crust, cubic and brittle", color: 0xeeeeff, roughness: 0.25, metalness: 0.0, opacity: 0.7 },
        ],
        synthetic: [
            { name: "Liquid Latex", flavor: "Wet rubber skin, stretchy and glossy", color: 0x222222, roughness: 0.15, metalness: 0.0 },
            { name: "Translucent Resin", flavor: "Poured polymer, smooth and partially see-through", color: 0xccaa77, roughness: 0.1, metalness: 0.0, opacity: 0.45 },
            { name: "Carbon Fibre Weave", flavor: "Crosshatch composite, lightweight and rigid", color: 0x1a1a1a, roughness: 0.3, metalness: 0.2 },
            { name: "Ceramic Glaze", flavor: "Kiln-fired, smooth and reflective with depth", color: 0xddccbb, roughness: 0.15, metalness: 0.05 },
            { name: "Cracked Porcelain", flavor: "Fine china fractured by age, pale and fragile", color: 0xf5f0e8, roughness: 0.25, metalness: 0.0 },
            { name: "Ballistic Nylon", flavor: "Military-grade woven fabric, matte and tough", color: 0x2a2a22, roughness: 0.85, metalness: 0.0 },
            { name: "Frosted Glass", flavor: "Sand-blasted transparency, diffused light", color: 0xddeeff, roughness: 0.4, metalness: 0.0, opacity: 0.35 },
            { name: "Vulcanised Rubber", flavor: "Industrial rubber, dense and slightly oily", color: 0x1a1a1a, roughness: 0.6, metalness: 0.0 },
            { name: "3D Printed PLA", flavor: "Layered filament lines, matte plastic feel", color: 0xcccccc, roughness: 0.7, metalness: 0.0 },
            { name: "Holographic Film", flavor: "Rainbow-shifting surface, iridescent and thin", color: 0xaaddff, roughness: 0.05, metalness: 0.3, emissive: 0x4488cc, emissiveIntensity: 0.15 },
            { name: "Concrete", flavor: "Poured and cured, industrial and raw", color: 0x888888, roughness: 0.9, metalness: 0.0 },
        ],
        metallic: [
            { name: "Liquid Chrome", flavor: "Mercury-like mirror surface, impossibly reflective", color: 0xcccccc, roughness: 0.02, metalness: 1.0 },
            { name: "Oxidized Copper Patina", flavor: "Verdigris green over warm copper, aged and dignified", color: 0x44aa88, roughness: 0.55, metalness: 0.7 },
            { name: "Brushed Titanium", flavor: "Aerospace-grade, fine directional grain", color: 0x8899aa, roughness: 0.35, metalness: 0.85 },
            { name: "Hammered Bronze", flavor: "Hand-forged, warm and textured with dimples", color: 0xaa7733, roughness: 0.5, metalness: 0.8 },
            { name: "Rusted Iron", flavor: "Corroded ferrous metal, flaking and rough", color: 0x8a4422, roughness: 0.85, metalness: 0.4 },
            { name: "Polished Gold", flavor: "24-karat mirror finish, warm and opulent", color: 0xffcc33, roughness: 0.05, metalness: 1.0 },
            { name: "Tarnished Silver", flavor: "Darkened noble metal, cloudy and uneven", color: 0x777788, roughness: 0.4, metalness: 0.75 },
            { name: "Cast Aluminium", flavor: "Lightweight, slightly pitted matte metal", color: 0xaaaaaa, roughness: 0.55, metalness: 0.6 },
            { name: "Damascene Steel", flavor: "Folded blade patterns, organic flowing lines in metal", color: 0x556666, roughness: 0.3, metalness: 0.9 },
            { name: "Blackened Steel", flavor: "Heat-treated dark metal, matte and menacing", color: 0x222228, roughness: 0.45, metalness: 0.8 },
            { name: "Anodized Aluminium", flavor: "Coloured oxide layer, smooth and modern", color: 0x3366aa, roughness: 0.2, metalness: 0.65 },
            { name: "Lead", flavor: "Dense, soft, dull grey metal with a toxic history", color: 0x555560, roughness: 0.6, metalness: 0.5 },
        ],
        energetic: [
            { name: "Contained Plasma Field", flavor: "Suspended ionized gas, pulsing and volatile", color: 0x4444ff, roughness: 0.1, metalness: 0.0, opacity: 0.6, emissive: 0x6644ff, emissiveIntensity: 1.2 },
            { name: "Crystallized Light", flavor: "Solid photons, impossibly bright and geometric", color: 0xffffff, roughness: 0.05, metalness: 0.1, opacity: 0.5, emissive: 0xffffcc, emissiveIntensity: 0.8 },
            { name: "Molten Lava", flavor: "Viscous magma, cracked black crust over glowing orange", color: 0xff4400, roughness: 0.7, metalness: 0.0, emissive: 0xff3300, emissiveIntensity: 1.0 },
            { name: "Frozen Lightning", flavor: "Branching electrical discharge locked in time", color: 0xaaddff, roughness: 0.1, metalness: 0.0, opacity: 0.65, emissive: 0x88ccff, emissiveIntensity: 0.6 },
            { name: "Dark Matter", flavor: "Light-absorbing void substance, edges distort space", color: 0x050508, roughness: 0.0, metalness: 0.0 },
            { name: "Radioactive Glow", flavor: "Sickly green Cherenkov radiation, dangerous and beautiful", color: 0x33aa33, roughness: 0.3, metalness: 0.0, emissive: 0x44ff44, emissiveIntensity: 0.9 },
            { name: "Starfield Nebula", flavor: "Deep-space gas cloud, swirling colours and pinpoint stars", color: 0x221144, roughness: 0.5, metalness: 0.0, opacity: 0.7, emissive: 0x442266, emissiveIntensity: 0.3 },
            { name: "Neon Gas", flavor: "Sealed tube glow, vibrant and buzzing", color: 0xff3366, roughness: 0.1, metalness: 0.0, opacity: 0.5, emissive: 0xff2255, emissiveIntensity: 0.7 },
            { name: "Arc Weld", flavor: "Blinding white-blue point source, spatter and sparks", color: 0xeeeeff, roughness: 0.2, metalness: 0.3, emissive: 0xccddff, emissiveIntensity: 1.5 },
        ],
    },
    matSubstance: ["Dense", "Viscous", "Porous", "Fibrous", "Granular", "Gelatinous", "Crystalline", "Powdery"],
    matTexture: ["Smooth", "Rough / Gritty", "Woven / Braided", "Scaled / Tiled", "Veined / Marbled", "Pitted / Cratered", "Ridged / Corrugated", "Organic / Fractal"],
    matFinish: ["Raw / Unfinished", "Matte", "Satin", "Glossy", "Mirror-Polished", "Brushed", "Hammered", "Weathered / Patina", "Wet / Slick"],
    matOpacity: ["Opaque", "Mostly Opaque", "Translucent", "Semi-Transparent", "Crystal-Clear"],
    matCondition: ["Pristine", "Slightly Worn", "Cracked / Fractured", "Corroded / Eroded", "Scorched / Charred", "Frozen / Frost-Covered", "Overgrown / Reclaimed", "Shattered / Fragmented"],
    matCharacter: ["Ancient / Sacred", "Industrial / Utilitarian", "Alien / Otherworldly", "Biological / Living", "Decaying / Dying", "Elegant / Refined", "Brutal / Raw", "Ethereal / Dreamlike"],
    matKinesthetic: ["Rigid / Immovable", "Slightly Yielding", "Viscous / Flowing", "Elastic / Springy", "Brittle / Shattering", "Undulating / Breathing", "Vibrating / Humming", "Weightless / Floating"],
    matEnergy: ["None", "Faint Inner Glow", "Pulsing Bioluminescence", "Crackling Electricity", "Smouldering Ember", "Radiant Aura", "Flickering Holographic", "Intense Plasma Burn"],
    matSynesthetic: [
        "hums with a faint resonant chime",
        "tastes of static and old copper",
        "smells of petrichor and distant ozone",
        "feels like a memory you can't quite place",
        "sounds like wind through a cathedral",
        "radiates a warmth that isn't thermal",
        "vibrates at a frequency just below hearing",
        "carries the weight of deep geological time",
        "shimmers like heat haze on summer asphalt",
        "whispers in a language older than speech",
        "pulses in sync with the viewer's heartbeat",
        "exudes the quiet of freshly fallen snow",
        "crackles with the promise of transformation",
        "resonates with the hum of distant machinery",
        "feels sharp even at a distance"
    ],
};
