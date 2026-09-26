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

    // --- STYLE PRESET LIBRARY ---
    // Sourced from devplan.txt: the well-known Fooocus/SDXL community style-preset
    // list, 106 entries across 8 groups. One new field on the STYLE node
    // (sty_preset), optgroup+flavor picker exactly like DB.materialTypes.
    // 7 trademarked game-franchise names were genericized (see docs/
    // STYLE_LIBRARY_AND_MODULES_PLAN.md) — flavor text keeps the visual
    // association, the name doesn't reference the IP.
    stylePresets: [
        { key: 'general', label: 'General', items: [
            { name: '3D Model', flavor: 'professional 3D render, octane render, cinema4d, high detail, volumetric lighting, ray-traced reflections' },
            { name: 'Analog Film', flavor: 'analog film photograph, faded colors, grainy, vignette, Kodak film stock, nostalgic, subtle light leaks' },
            { name: 'Anime', flavor: 'anime artwork, anime style, key visual, vibrant, studio anime, sharp cel-shaded linework, highly detailed' },
            { name: 'Cinematic', flavor: 'cinematic film still, dramatic lighting, shallow depth of field, film grain, anamorphic lens flare, epic scale' },
            { name: 'Comic Book', flavor: 'comic book panel, bold ink outlines, halftone shading, dynamic action lines, vivid flat colors' },
            { name: 'Craft Clay', flavor: 'claymation style, stop-motion clay sculpture, visible fingerprints and tool marks, plasticine texture' },
            { name: 'Digital Art', flavor: 'digital painting, concept art, sharp focus, vibrant colors, intricate detail' },
            { name: 'Enhance', flavor: 'ultra-detailed, hyper-realistic, sharp focus, professional color grading, upscaled clarity, crisp texture' },
            { name: 'Fantasy Art', flavor: 'epic fantasy illustration, ethereal lighting, painterly detail, mythic atmosphere, rich saturated color' },
            { name: 'Isometric', flavor: 'isometric diorama, clean geometric shapes, 30-degree projection, miniature scale, soft studio lighting' },
            { name: 'Line Art', flavor: 'clean line art, minimal linework, high contrast black and white, no shading, vector-clean lines' },
            { name: 'Lowpoly', flavor: 'low-poly 3D render, faceted geometric surfaces, flat shading, minimal polygon count, stylized simplicity' },
            { name: 'Neonpunk', flavor: 'neon-punk aesthetic, cyberpunk neon glow, vibrant magenta and cyan lighting, glossy reflective surfaces, futuristic' },
            { name: 'Origami', flavor: 'origami paper-folded diorama, crisp geometric paper creases, soft studio shadows, papercraft texture' },
            { name: 'Photographic', flavor: 'professional photograph, DSLR quality, natural lighting, realistic skin and material texture, sharp focus' },
            { name: 'Pixel Art', flavor: 'pixel art, 16-bit sprite style, crisp pixel edges, limited color palette, retro game aesthetic' },
            { name: 'Texture', flavor: 'seamless texture study, macro close-up surface detail, tactile material rendering, even lighting' },
        ]},
        { key: 'ads', label: 'Ads / Commercial', items: [
            { name: 'Ads Advertising', flavor: 'commercial advertising photograph, polished studio lighting, product-hero composition, clean background, high-gloss finish' },
            { name: 'Ads Automotive', flavor: 'automotive advertisement, dramatic low-angle hero shot, glossy paint reflections, dynamic studio lighting, motion-ready composition' },
            { name: 'Ads Corporate', flavor: 'corporate advertising photograph, clean professional lighting, confident composition, modern brand aesthetic' },
            { name: 'Ads Fashion Editorial', flavor: 'high-fashion editorial photograph, dramatic studio lighting, striking pose, glossy magazine finish' },
            { name: 'Ads Food Photography', flavor: 'commercial food photography, appetizing styling, soft directional light, shallow depth of field, glistening texture' },
            { name: 'Ads Gourmet Food Photography', flavor: 'gourmet food photograph, fine-dining plating, moody directional lighting, rich texture detail, editorial food styling' },
            { name: 'Ads Luxury', flavor: 'luxury brand advertisement, opulent lighting, elegant minimal composition, premium material texture, refined color palette' },
            { name: 'Ads Real Estate', flavor: 'real estate advertising photograph, wide-angle interior shot, bright even lighting, immaculate staging, architectural clarity' },
            { name: 'Ads Retail', flavor: 'retail advertising photograph, bright commercial lighting, clean product display, inviting consumer-facing composition' },
        ]},
        { key: 'artMovements', label: 'Art Movements', items: [
            { name: 'Artstyle Abstract', flavor: 'abstract art, non-representational composition, expressive shapes and color fields, bold visual rhythm' },
            { name: 'Artstyle Abstract Expressionism', flavor: 'abstract expressionist painting, gestural brushwork, spontaneous energetic composition, raw emotional intensity' },
            { name: 'Artstyle Art Deco', flavor: 'art deco illustration, geometric symmetry, gold and black accents, streamlined elegant ornamentation' },
            { name: 'Artstyle Art Nouveau', flavor: 'art nouveau illustration, flowing organic linework, floral ornamentation, elegant decorative curves' },
            { name: 'Artstyle Constructivist', flavor: 'constructivist artwork, bold geometric propaganda-poster composition, red and black palette, dynamic diagonal lines' },
            { name: 'Artstyle Cubist', flavor: 'cubist painting, fragmented geometric perspective, multiple viewpoints, angular abstracted forms' },
            { name: 'Artstyle Expressionist', flavor: 'expressionist painting, distorted exaggerated forms, intense emotional color, raw brushwork' },
            { name: 'Artstyle Graffiti', flavor: 'graffiti street art, bold spray-paint texture, vibrant clashing colors, urban wall composition' },
            { name: 'Artstyle Hyperrealism', flavor: 'hyperrealistic painting, extreme fine detail, indistinguishable from photography, meticulous texture rendering' },
            { name: 'Artstyle Impressionist', flavor: 'impressionist painting, loose visible brushstrokes, soft natural light, atmospheric color blending' },
            { name: 'Artstyle Pointillism', flavor: 'pointillist painting, composed entirely of small distinct color dots, optical color blending, textured surface' },
            { name: 'Artstyle Pop Art', flavor: 'pop art illustration, bold flat colors, halftone dot pattern, high-contrast graphic composition' },
            { name: 'Artstyle Psychedelic', flavor: 'psychedelic art, swirling kaleidoscopic patterns, vivid clashing colors, hallucinatory visual distortion' },
            { name: 'Artstyle Renaissance', flavor: 'renaissance painting, classical composition, soft sfumato shading, rich earthen and gold palette' },
            { name: 'Artstyle Steampunk', flavor: 'steampunk illustration, brass and copper machinery, Victorian-industrial aesthetic, gears and steam' },
            { name: 'Artstyle Surrealist', flavor: 'surrealist painting, dreamlike impossible imagery, uncanny juxtaposition, soft hyper-real rendering' },
            { name: 'Artstyle Typography', flavor: 'typographic art composition, expressive lettering as primary visual subject, bold type-driven layout' },
            { name: 'Artstyle Watercolor', flavor: 'watercolor painting, soft bleeding pigment, translucent color washes, visible paper texture' },
        ]},
        { key: 'futuristic', label: 'Futuristic / Sci-Fi', items: [
            { name: 'Futuristic Biomechanical', flavor: 'biomechanical illustration, fused organic and mechanical forms, intricate tendon-like piping, dark metallic sheen' },
            { name: 'Futuristic Biomechanical Cyberpunk', flavor: 'biomechanical cyberpunk illustration, cybernetic flesh-and-machine fusion, neon-lit industrial grime' },
            { name: 'Futuristic Cybernetic', flavor: 'cybernetic illustration, sleek robotic augmentation, glowing circuitry lines, chrome and matte-black finish' },
            { name: 'Futuristic Cybernetic Robot', flavor: 'cybernetic robot illustration, articulated mechanical joints, glowing optical sensors, precision-engineered surface detail' },
            { name: 'Futuristic Cyberpunk Cityscape', flavor: 'cyberpunk cityscape, towering neon-lit skyscrapers, dense holographic signage, rain-slicked streets, moody atmosphere' },
            { name: 'Futuristic Futuristic', flavor: 'futuristic concept illustration, sleek minimalist forms, advanced technology aesthetic, cool ambient lighting' },
            { name: 'Futuristic Retro Cyberpunk', flavor: 'retro cyberpunk illustration, 1980s synth-wave neon palette, chunky analog-tech silhouettes' },
            { name: 'Futuristic Retro Futurism', flavor: 'retro-futurist illustration, mid-century vision of tomorrow, atomic-age optimism, streamlined chrome forms' },
            { name: 'Futuristic Sci Fi', flavor: 'science fiction illustration, advanced technology, sweeping futuristic architecture, dramatic atmospheric lighting' },
            { name: 'Futuristic Vaporwave', flavor: 'vaporwave aesthetic, pastel pink and cyan gradient, glitch-art elements, retro-digital grid horizon' },
        ]},
        { key: 'game', label: 'Game Aesthetics', items: [
            { name: 'Game Cute Bubble Platformer', flavor: 'cute retro platformer game art, bubble-shooter creature design, pastel candy-colored world, chibi proportions' },
            { name: 'Game Cyberpunk Game', flavor: 'cyberpunk video game concept art, neon-lit dystopian world, augmented-reality HUD overlay, stylized grit' },
            { name: 'Game Fighting Game', flavor: 'fighting game character art, dynamic combat pose, bold graphic outlines, high-energy action stance' },
            { name: 'Game Open-World Crime Sim', flavor: 'open-world crime-sim game art, gritty urban sprawl, cinematic third-person framing, sun-bleached city palette' },
            { name: 'Game Cheerful Platformer Mascot', flavor: 'cheerful platformer mascot game art, bright saturated primary colors, bold rounded character silhouette, playful world design' },
            { name: 'Game Voxel Sandbox', flavor: 'voxel sandbox game art, blocky cubic terrain, bright flat-shaded surfaces, procedurally-tiled world' },
            { name: 'Game Creature Collector', flavor: 'creature-collector game art, colorful stylized monster design, clean cel-shaded outlines, whimsical world palette' },
            { name: 'Game Retro Arcade', flavor: 'retro arcade game art, chunky low-resolution sprites, saturated primary colors, scanline CRT texture' },
            { name: 'Game Retro Game', flavor: 'retro video game art, 8-bit/16-bit era aesthetic, limited color palette, crisp pixel silhouettes' },
            { name: 'Game RPG Fantasy Game', flavor: 'fantasy RPG game concept art, richly detailed armor and weapons, painterly environment backdrop, heroic composition' },
            { name: 'Game Strategy Game', flavor: 'strategy game concept art, top-down tactical framing, detailed miniature-scale unit design, muted battlefield palette' },
            { name: 'Game Arcade Brawler', flavor: 'arcade fighting-game character art, exaggerated dynamic musculature, bold speed-line effects, high-contrast palette' },
            { name: 'Game Open-World Fantasy Adventure', flavor: 'open-world fantasy adventure game art, lush hand-painted landscape, exploratory third-person framing, mythic atmosphere' },
        ]},
        { key: 'misc', label: 'Misc / Thematic', items: [
            { name: 'Misc Architectural', flavor: 'architectural visualization, clean modern structural design, precise geometric lines, dramatic natural light' },
            { name: 'Misc Disco', flavor: 'disco-era illustration, glittering mirror-ball light, vibrant 1970s color palette, glamorous retro nightlife energy' },
            { name: 'Misc Dreamscape', flavor: 'dreamscape illustration, surreal floating elements, soft hazy atmosphere, impossible dreamlike geography' },
            { name: 'Misc Dystopian', flavor: 'dystopian illustration, bleak oppressive atmosphere, decayed monumental architecture, desaturated grim palette' },
            { name: 'Misc Fairy Tale', flavor: 'fairy-tale illustration, whimsical storybook charm, soft enchanted-forest lighting, gentle painterly detail' },
            { name: 'Misc Gothic', flavor: 'gothic illustration, dark ornate architecture, dramatic candlelit shadows, moody atmospheric grandeur' },
            { name: 'Misc Grunge', flavor: 'grunge aesthetic, distressed textured surfaces, muted gritty palette, raw unpolished edge' },
            { name: 'Misc Horror', flavor: 'horror illustration, unsettling dread-filled atmosphere, deep shadow, visceral unnerving detail' },
            { name: 'Misc Kawaii', flavor: 'kawaii illustration, adorable rounded shapes, pastel palette, oversized sparkling eyes, cheerful charm' },
            { name: 'Misc Lovecraftian', flavor: 'Lovecraftian cosmic horror illustration, incomprehensible eldritch form, oppressive abyssal atmosphere' },
            { name: 'Misc Macabre', flavor: 'macabre illustration, morbid unsettling imagery, dark theatrical shadow, gothic-horror undertone' },
            { name: 'Misc Manga', flavor: 'manga illustration, expressive black-and-white linework, dynamic screentone shading, sharp emotive character design' },
            { name: 'Misc Metropolis', flavor: 'sprawling metropolis illustration, dense futuristic skyline, dramatic scale, atmospheric urban haze' },
            { name: 'Misc Minimalist', flavor: 'minimalist illustration, sparse clean composition, generous negative space, restrained limited palette' },
            { name: 'Misc Monochrome', flavor: 'monochrome illustration, single-hue tonal range, strong value contrast, unified restrained palette' },
            { name: 'Misc Nautical', flavor: 'nautical illustration, weathered maritime textures, deep ocean-blue palette, coastal atmospheric light' },
            { name: 'Misc Space', flavor: 'deep-space illustration, cosmic nebula color, star-scattered void, awe-inspiring astronomical scale' },
            { name: 'Misc Stained Glass', flavor: 'stained-glass illustration, jewel-toned segmented panes, dark leaded outlines, luminous backlit color' },
            { name: 'Misc Techwear Fashion', flavor: 'techwear fashion illustration, utilitarian urban silhouette, matte technical fabric, muted tactical palette' },
            { name: 'Misc Tribal', flavor: 'tribal pattern illustration, bold geometric motifs, earthen natural palette, ancestral ornamental design' },
            { name: 'Misc Zentangle', flavor: 'zentangle illustration, intricate repetitive linework, meditative structured pattern, fine black-ink detail' },
        ]},
        { key: 'papercraft', label: 'Papercraft', items: [
            { name: 'Papercraft Collage', flavor: 'paper collage art, layered torn-paper textures, mixed-media composition, tactile handcrafted edges' },
            { name: 'Papercraft Flat Papercut', flavor: 'flat papercut illustration, crisp cut-paper silhouettes, single-layer graphic simplicity, soft drop shadow' },
            { name: 'Papercraft Kirigami', flavor: 'kirigami paper-cut sculpture, intricate folded and cut geometry, delicate structural paper art' },
            { name: 'Papercraft Paper Mache', flavor: 'papier-mâché sculpture, textured layered-paper surface, handcrafted sculptural form, matte painted finish' },
            { name: 'Papercraft Paper Quilling', flavor: 'paper quilling art, tightly coiled paper strips, intricate looping filigree patterns, delicate dimensional detail' },
            { name: 'Papercraft Papercut Collage', flavor: 'papercut collage illustration, layered cut-paper depth, soft directional shadow, tactile handcrafted composition' },
            { name: 'Papercraft Papercut Shadow Box', flavor: 'papercut shadow-box diorama, multi-layered depth, dramatic backlighting, intricate silhouette detail' },
            { name: 'Papercraft Stacked Papercut', flavor: 'stacked papercut illustration, multiple layered paper depths, soft cast shadows, dimensional relief effect' },
            { name: 'Papercraft Thick Layered Papercut', flavor: 'thick layered papercut art, bold dimensional paper relief, strong directional shadow, tactile sculptural depth' },
        ]},
        { key: 'photo', label: 'Photo Subgenre', items: [
            { name: 'Photo Alien', flavor: 'otherworldly photographic composition, extraterrestrial atmosphere, unnatural color cast, eerie sci-fi realism' },
            { name: 'Photo Film Noir', flavor: 'film noir photograph, stark high-contrast shadow, venetian-blind light pattern, moody monochrome atmosphere' },
            { name: 'Photo Glamour', flavor: 'glamour photograph, soft flattering studio light, polished retouched finish, elegant confident pose' },
            { name: 'Photo Hdr', flavor: 'HDR photograph, expanded dynamic range, vivid balanced highlight and shadow detail, hyper-clear texture' },
            { name: 'Photo Iphone Photographic', flavor: 'casual smartphone photograph, natural handheld framing, everyday lighting, authentic unposed feel' },
            { name: 'Photo Long Exposure', flavor: 'long-exposure photograph, smooth light-trail motion blur, silky flowing water or clouds, tripod-stable clarity' },
            { name: 'Photo Neon Noir', flavor: 'neon noir photograph, moody rain-slicked streets, saturated magenta and cyan neon glow, cinematic shadow' },
            { name: 'Photo Silhouette', flavor: 'silhouette photograph, subject in stark black outline, dramatic backlit horizon, minimal negative-space composition' },
            { name: 'Photo Tilt Shift', flavor: 'tilt-shift photograph, selective miniature-effect focus, exaggerated shallow depth of field, toy-like scale illusion' },
        ]},
    ],

    // --- COLOR PALETTE ---
    // A scene-wide colour scheme, connected like Color Grade (hasIn=false,
    // straight into Stack) — NOT a Material-style per-object wrapper.
    colorPalettes: [
        { key: 'cinematic', label: 'Cinematic & Mood', items: [
            { name: 'Teal & Orange', flavor: 'a classic cinematic teal-and-orange grade, cool blue-green shadows against warm skin-tone highlights', swatch: ['#0b3d42','#1c6e73','#e8834a','#f2b26b'] },
            { name: 'Blade Runner Neon', flavor: 'saturated magenta and cyan neon against deep charcoal shadow, rain-slicked reflective glow', swatch: ['#0a0a12','#ff2fb0','#20e6ff','#3a1a4d'] },
            { name: 'Film Noir Monochrome', flavor: 'a stark black-and-white palette, deep inky shadow, bright hard-edged highlight', swatch: ['#050505','#3a3a3a','#a8a8a8','#f5f5f5'] },
            { name: 'Golden Hour Warmth', flavor: 'warm golden and amber tones, soft honeyed light, gentle rose undertone', swatch: ['#f6c667','#e8944c','#d4653a','#7a3b2e'] },
            { name: 'Cold War Blue', flavor: 'desaturated steel-blue and gunmetal grey, clinical overcast light', swatch: ['#2b3a4a','#4c6478','#8a9aa8','#c8d2d8'] },
            { name: 'Sepia Nostalgia', flavor: 'a warm sepia-brown monochrome, faded antique photograph tone', swatch: ['#3b2a1a','#6b4a2e','#a87c4f','#d9bd93'] },
            { name: 'Blood Moon Crimson', flavor: 'deep crimson and rust-red dominance, dark smoky undertone', swatch: ['#1a0505','#5c0f14','#a11f22','#d94a3f'] },
            { name: 'Midnight Cobalt', flavor: 'a deep cobalt-blue night palette, faint silver moonlight accent', swatch: ['#050a1a','#132a52','#2c5aa0','#8fb8e8'] },
        ]},
        { key: 'nature', label: 'Nature & Organic', items: [
            { name: 'Autumn Harvest', flavor: 'warm russet, ochre and burnt-orange fall foliage tones', swatch: ['#7a3b1e','#b5651d','#d4913a','#e8c26b'] },
            { name: 'Forest Canopy', flavor: 'deep emerald and moss-green woodland palette, dappled amber light', swatch: ['#0f2818','#1f4d2e','#4a7a44','#a8c76a'] },
            { name: 'Desert Dusk', flavor: 'sun-baked terracotta and dusty rose, hazy amber twilight', swatch: ['#c97a4a','#d9986b','#e8b48a','#7a4a5c'] },
            { name: 'Coral Reef', flavor: 'vivid turquoise and coral-pink underwater palette, bright tropical clarity', swatch: ['#0a5c6b','#1fa8a3','#ff7f6b','#ffc17a'] },
            { name: 'Arctic Frost', flavor: 'a pale ice-blue and white palette, crisp cold clarity', swatch: ['#e8f4f8','#bcdce8','#7ab0c9','#3a5f70'] },
            { name: 'Volcanic Ash', flavor: 'charcoal grey and molten-orange contrast, smoky ember glow', swatch: ['#1a1a1a','#3d3d3d','#7a2e0f','#e8551a'] },
            { name: 'Spring Bloom', flavor: 'soft pastel pink and fresh green palette, gentle new-growth light', swatch: ['#f7d6e0','#c9e8b8','#8fc97a','#e89bb5'] },
            { name: 'Deep Ocean', flavor: 'abyssal navy and teal palette, faint bioluminescent accent', swatch: ['#02070f','#0a2438','#145c6b','#2eebc9'] },
        ]},
        { key: 'neon', label: 'Neon & Synthetic', items: [
            { name: 'Vaporwave Pastel', flavor: 'a pastel pink and cyan gradient with a soft synthetic glow', swatch: ['#ff9ecb','#c39bfa','#7ee8fc','#fef3c7'] },
            { name: 'Cyberpunk Magenta-Cyan', flavor: 'high-saturation magenta against electric cyan, hard synthetic contrast', swatch: ['#ff00aa','#00e5ff','#0a0014','#2d0a3d'] },
            { name: 'Synthwave Sunset', flavor: 'hot pink and deep purple gradient sky over a neon-grid horizon', swatch: ['#ff2d95','#8b2fc9','#3a1a6b','#ffb347'] },
            { name: 'Acid Rain Green', flavor: 'toxic acid-green against soot-black, industrial synthetic glow', swatch: ['#0a0f0a','#1f3d1a','#7aff2e','#c8ff9e'] },
            { name: 'Holographic Chrome', flavor: 'an iridescent silver and pastel-rainbow sheen, mirror-chrome highlight', swatch: ['#d8d8e0','#a8c8e8','#e8b8e8','#b8e8d0'] },
            { name: 'Retro Arcade Glow', flavor: 'saturated primary neon against black, CRT-glow palette', swatch: ['#000000','#ff2d2d','#2dff5c','#2d6fff','#fff02d'] },
            { name: 'Electric Violet', flavor: 'deep violet and hot-pink electric palette, glowing synthetic edge', swatch: ['#1a0033','#6b1fb3','#c92dff','#ff5cf0'] },
        ]},
        { key: 'vintage', label: 'Vintage & Film', items: [
            { name: 'Kodachrome Warmth', flavor: 'a richly saturated warm-toned film palette, deep reds and golden skin tones', swatch: ['#7a1f1f','#c9502e','#e8a13a','#3b2a1a'] },
            { name: 'Cross-Process Fade', flavor: 'shifted cross-processed color, greenish shadow and warm highlight', swatch: ['#4a5c2e','#8ca35c','#e8c96b','#c97a4a'] },
            { name: 'Bleach Bypass Steel', flavor: 'a desaturated steel palette with crushed contrast, silver-retained highlight', swatch: ['#1a1a1a','#4a4a4a','#8a8a8a','#d8d8d0'] },
            { name: 'Sepia Daguerreotype', flavor: 'an antique daguerreotype sepia-silver tone, soft faded vignette', swatch: ['#2a2018','#5c4632','#8f7355','#c9b493'] },
            { name: 'Technicolor Saturation', flavor: 'a hyper-saturated three-strip Technicolor palette, vivid primary richness', swatch: ['#c9142e','#1a6ec9','#e8b800','#1a8f4a'] },
            { name: 'Faded Polaroid', flavor: 'washed-out warm-yellow Polaroid tone, soft low-contrast haze', swatch: ['#e8d9a8','#c9b57a','#a8926b','#7a6a52'] },
        ]},
        { key: 'monochrome', label: 'Monochrome & Minimal', items: [
            { name: 'Charcoal Grayscale', flavor: 'a pure neutral greyscale, deep charcoal to soft silver range', swatch: ['#0d0d0d','#3a3a3a','#7a7a7a','#c9c9c9'] },
            { name: 'Ivory Minimalism', flavor: 'a warm ivory and bone-white palette, soft restrained shadow', swatch: ['#f5f0e6','#e0d8c5','#a89f8c','#5c564a'] },
            { name: 'High-Key White', flavor: 'a bright overexposed white-dominant palette, minimal soft shadow', swatch: ['#ffffff','#f0f0f0','#d8d8d8','#a8a8a8'] },
            { name: 'Low-Key Black', flavor: 'a dominant deep black with a single carved highlight', swatch: ['#000000','#1a1a1a','#3a3a3a','#8a8a8a'] },
            { name: 'Duotone Blue', flavor: 'a two-tone navy and pale-blue duotone, graphic minimal contrast', swatch: ['#0a1f3d','#1f4d7a','#7ab0d9','#e0eef7'] },
        ]},
        { key: 'fantasy', label: 'Fantasy & Otherworldly', items: [
            { name: 'Enchanted Emerald', flavor: 'deep emerald and jade palette, faint magical glow', swatch: ['#0a2818','#1f5c3a','#3ea36b','#8fd9a8'] },
            { name: 'Arcane Violet', flavor: 'a mystical violet and indigo palette, glowing arcane accent', swatch: ['#1a0a33','#4a1f7a','#8f3ec9','#c98fff'] },
            { name: 'Ember & Ash', flavor: 'smouldering ember-orange against ashen grey, dying-fire palette', swatch: ['#2a2420','#5c4a3a','#c9601a','#ff9e4a'] },
            { name: 'Celestial Gold', flavor: 'radiant gold and warm cream palette, divine luminous glow', swatch: ['#f7e2a0','#e8b84a','#c98f1a','#7a5c1a'] },
            { name: 'Void Black & Starlight', flavor: 'deep void-black with scattered silver starlight accent', swatch: ['#000005','#0a0a1a','#2a2a4a','#e8e8ff'] },
            { name: 'Rose Quartz Dream', flavor: 'a soft dusty-rose and lavender palette, gentle ethereal haze', swatch: ['#f2d9e0','#d9b8c9','#b899c9','#8f7ab3'] },
        ]},
    ],
    palDominance: ["Balanced", "Warm-Dominant", "Cool-Dominant", "High-Contrast", "Low-Contrast / Muted"],
    palSaturation: ["Vivid / Saturated", "Natural", "Desaturated", "Near-Monochrome"],

    // --- UI ELEMENTS ---
    uiPlatform: ["Mobile App", "Desktop App", "Web Dashboard", "Smartwatch", "Tablet", "Smart TV", "VR / AR Interface", "Automotive Dashboard", "Kiosk / POS", "Smart-Home Panel"],
    uiScreenType: ["Onboarding Flow", "Login / Auth", "Dashboard / Home", "Settings Panel", "E-commerce Product Page", "Checkout Flow", "Chat / Messaging", "Media Player", "Form / Input", "Navigation Menu", "Card Feed", "Modal / Dialog", "Notification / Toast", "Data Table", "Calendar / Scheduler", "Map View", "Search Results", "Profile Page"],
    uiDesignLanguage: ["Material Design", "iOS Human Interface", "Neumorphism", "Glassmorphism", "Skeuomorphism", "Flat Design", "Brutalist Web", "Cyberpunk HUD", "Retro Terminal / CLI", "Minimalist Swiss Grid", "Windows Fluent", "Claymorphism"],
    uiColorMode: ["Light Mode", "Dark Mode", "High-Contrast Accessible", "Brand-Colored", "Monochrome", "Gradient-Heavy", "Neon-Accented"],
    uiLayoutDensity: ["Spacious / Airy", "Dense / Data-Heavy", "Card-Based Grid", "Single-Column", "Split-Pane", "Sidebar + Content", "Bento Grid"],
    uiState: ["Default / Populated", "Empty State", "Loading / Skeleton", "Error State", "Success / Confirmation", "Hover / Focus State", "Disabled State"],

    // --- GRAPHIC DESIGN ---
    gdArtifact: ["Poster", "Album Cover", "Book Cover", "Logo", "Business Card", "Packaging Label", "Magazine Spread", "Billboard", "Flyer", "Icon Set", "Brand Identity Board", "Infographic", "T-Shirt Design", "Sticker Sheet"],
    gdLayout: ["Grid-Based", "Asymmetric", "Centered / Symmetrical", "Collage", "Typographic Lockup", "Negative-Space-Driven", "Full-Bleed Image"],
    gdTypography: ["Bold Sans-Serif Display", "Elegant Serif Editorial", "Hand-Lettered Script", "Brutalist Mono", "Art Deco Lettering", "Graffiti Lettering", "Minimalist Geometric", "Vintage Condensed", "Kinetic / Variable Type"],
    gdPalette: ["Duotone", "High-Contrast B&W", "Pastel", "Corporate Brand Colors", "Riso-Print Limited Palette", "Neon / Vibrant", "Earthy / Organic", "Monochrome + Accent"],
    gdFinish: ["Matte Print", "Glossy Print", "Screen-Printed Texture", "Embossed / Foil-Stamped", "Risograph", "Digital-Flat", "Vintage Halftone", "Letterpress"],

    // --- ASSET PACK (UI kits, icon sets, sticker packs, badges, patterns) ---
    // A SET/collection of N visually-consistent small graphics — distinct from
    // Graphic Design (one artifact) and UI Elements (one screen). The count and
    // the consistency descriptors (line weight, corner style, color mode) are
    // what make this a "pack" rather than a single image. optgroup+flavor picker,
    // same shape as DB.stylePresets / DB.colorPalettes.
    assetPackTypes: [
        { key: 'uikit', label: 'UI Kit', items: [
            { name: 'Mobile UI Component Kit', flavor: 'a cohesive set of mobile UI components — buttons, toggles, input fields, tab bars' },
            { name: 'Web Dashboard Icon Kit', flavor: 'a matched set of dashboard navigation and action icons' },
            { name: 'Cursor & Pointer Set', flavor: 'a set of cursor and pointer states for a desktop interface' },
            { name: 'Loading & Progress Indicator Set', flavor: 'a set of loading spinners and progress indicators' },
            { name: 'Onboarding Illustration Set', flavor: 'a set of onboarding-flow illustrations sharing one visual language' },
        ]},
        { key: 'icons', label: 'Icon Set', items: [
            { name: 'Weather Icon Set', flavor: 'a matched set of weather condition icons' },
            { name: 'Social Media Icon Set', flavor: 'a matched set of social platform icons' },
            { name: 'File Type Icon Set', flavor: 'a matched set of file-type icons' },
            { name: 'Productivity Tool Icon Set', flavor: 'a matched set of productivity and office tool icons' },
            { name: 'Food & Drink Icon Set', flavor: 'a matched set of food and beverage icons' },
            { name: 'Travel & Map Icon Set', flavor: 'a matched set of travel and map-pin icons' },
            { name: 'Fitness & Health Icon Set', flavor: 'a matched set of fitness and health icons' },
            { name: 'Finance & Payment Icon Set', flavor: 'a matched set of finance and payment icons' },
            { name: 'Settings & Gear Icon Set', flavor: 'a matched set of settings and configuration icons' },
        ]},
        { key: 'stickers', label: 'Sticker Pack', items: [
            { name: 'Kawaii Character Sticker Pack', flavor: 'a set of cute kawaii-style character stickers, consistent proportions' },
            { name: 'Die-Cut Vinyl Sticker Sheet', flavor: 'a sheet of die-cut vinyl stickers with a bold white border on each' },
            { name: 'Messaging App Sticker Pack', flavor: 'a set of expressive chat stickers sharing one mascot and palette' },
            { name: 'Nature & Plant Sticker Set', flavor: 'a set of botanical stickers with a shared linework style' },
            { name: 'Motivational Quote Sticker Set', flavor: 'a set of hand-lettered quote stickers sharing one type style' },
            { name: 'Holographic Sticker Pack', flavor: 'a set of stickers with an iridescent holographic finish' },
        ]},
        { key: 'badges', label: 'Badge / Avatar / Profile', items: [
            { name: 'Achievement Badge Set', flavor: 'a set of circular achievement/reward badges sharing one frame style' },
            { name: 'Rank & Tier Badge Set', flavor: 'a set of rank badges forming a clear visual progression' },
            { name: 'Avatar / Profile Icon Set', flavor: 'a set of profile avatar icons sharing one construction style' },
            { name: 'Emoji Set', flavor: 'a set of expressive emoji faces sharing one shape language' },
            { name: 'Mascot Expression Sheet', flavor: 'one mascot character drawn across a set of different expressions' },
        ]},
        { key: 'pattern', label: 'Pattern / Texture / Misc', items: [
            { name: 'Seamless Pattern Set', flavor: 'a set of seamless repeating patterns sharing one palette' },
            { name: 'Texture Swatch Set', flavor: 'a set of tileable surface texture swatches' },
            { name: 'Brand Logo Lockup Set', flavor: 'a set of logo lockup variations (horizontal, stacked, icon-only) for one brand' },
            { name: 'Game Item / Inventory Icon Set', flavor: 'a set of game inventory item icons sharing one render style' },
            { name: 'NFT / Trait Layer Set', flavor: 'a set of generative trait-layer graphics sharing one construction grid' },
        ]},
    ],
    assetPackCount: ["4", "6", "9", "12", "16", "20", "24", "36+"],
    assetArtStyle: ["Flat Vector", "Line / Outline", "Duotone", "Gradient Modern", "3D Isometric", "Clay / Soft 3D", "Hand-Drawn Doodle", "Pixel Art", "Glassmorphic", "Neumorphic", "Kawaii Chibi", "Retro Badge", "Watercolor", "Risograph"],
    assetLineWeight: ["Hairline", "Thin", "Medium", "Bold", "Duotone Fill + Line"],
    assetCorner: ["Sharp / Square", "Slightly Rounded", "Fully Rounded", "Pill-Shaped", "Circular"],
    assetColorMode: ["Single Color / Monochrome", "Two-Tone", "Full Color", "Brand Palette Match", "Pastel", "Neon / Vibrant", "Grayscale"],
    assetBackground: ["Transparent (PNG)", "White Rounded Card", "Circle Badge Chip", "Square Tile", "Die-Cut White Border", "Solid Color Background"],
    assetLayout: ["Grid Contact Sheet", "Individually Isolated", "Scattered Collage", "Single Row Strip"],
    assetFinish: ["Flat Matte", "Glossy Sticker Coating", "Embossed / Debossed", "Glitter", "Foil Accent", "Vinyl Textured"],

    // --- PRODUCT SHOT ---
    // Studio product photography as a first-class module. Two research axes drive
    // the "setup tuned to the product" promise:
    //   1. surface behaviour  -> lighting recipe   (DB.productLightRecipes)
    //   2. product size        -> optics recipe     (DB.productOpticsRecipes)
    // Every productCategories entry carries its own {surface, size} keys so
    // recommendFor() (js/productshot.js) can join both tables into one recipe.
    // optgroup+flavor picker, exactly like DB.stylePresets / DB.colorPalettes.
    productCategories: [
        { key: 'reflective', label: 'Reflective / Metallic', items: [
            { name: 'Fine Jewelry / Ring', surface: 'reflective', size: 'miniature', flavor: 'polished precious metal and faceted gemstones, mirror-bright micro-surfaces' },
            { name: 'Wristwatch', surface: 'reflective', size: 'small', flavor: 'brushed and polished steel case, curved sapphire crystal, metallic bracelet' },
            { name: 'Cutlery / Flatware', surface: 'reflective', size: 'small', flavor: 'mirror-polished stainless steel, long specular highlights' },
            { name: 'Chrome Hardware / Faucet', surface: 'reflective', size: 'medium', flavor: 'chrome-plated fixture, wraparound mirror reflections' },
            { name: 'Metal Cookware / Pan', surface: 'reflective', size: 'medium', flavor: 'stainless or copper cookware, broad curved reflective body' },
            { name: 'Aluminum Laptop / Device Shell', surface: 'reflective', size: 'small', flavor: 'anodized aluminum unibody, soft satin-metal sheen' },
        ]},
        { key: 'transparent', label: 'Transparent / Glass', items: [
            { name: 'Perfume Bottle', surface: 'transparent', size: 'small', flavor: 'faceted glass flacon, refractive and liquid-filled, heavy crystal base' },
            { name: 'Wine / Spirits Bottle', surface: 'transparent', size: 'small', flavor: 'coloured glass bottle, dark liquid, printed and foiled label' },
            { name: 'Drinkware / Glass Tumbler', surface: 'transparent', size: 'small', flavor: 'clear thin-walled glass, bright refractive edges' },
            { name: 'Serum / Dropper Bottle', surface: 'transparent', size: 'small', flavor: 'frosted or clear glass vial, translucent liquid, pipette cap' },
            { name: 'Eyewear / Sunglasses', surface: 'transparent', size: 'small', flavor: 'transparent lenses and glossy acetate frame, subtle tinted glass' },
            { name: 'Clear Plastic Packaging', surface: 'transparent', size: 'small', flavor: 'moulded transparent PET, soft internal reflections' },
        ]},
        { key: 'glossy', label: 'Glossy / Molded', items: [
            { name: 'Cosmetic Compact / Lipstick', surface: 'glossy', size: 'miniature', flavor: 'glossy lacquered case, curved reflective body, crisp brand foil' },
            { name: 'Skincare Jar / Tube', surface: 'glossy', size: 'small', flavor: 'smooth matte-to-glossy plastic, soft curved highlights' },
            { name: 'Smartphone', surface: 'glossy', size: 'small', flavor: 'glass front and back, polished metal frame, edge-lit reflections' },
            { name: 'Headphones / Earbuds', surface: 'glossy', size: 'small', flavor: 'moulded glossy plastic and soft-touch finish, compact curves' },
            { name: 'Small Appliance', surface: 'glossy', size: 'medium', flavor: 'glossy moulded housing, mixed plastic and chrome trim' },
            { name: 'Automotive Body Panel', surface: 'glossy', size: 'oversized', flavor: 'deep metallic clearcoat paint, sweeping reflective curves' },
        ]},
        { key: 'matte', label: 'Matte / Textured', items: [
            { name: 'Leather Goods / Wallet', surface: 'matte', size: 'small', flavor: 'grained leather, visible stitching, soft matte surface' },
            { name: 'Sneaker / Footwear', surface: 'matte', size: 'medium', flavor: 'mixed textile, suede and rubber, structured form' },
            { name: 'Ceramic Mug / Vase', surface: 'matte', size: 'small', flavor: 'matte glazed ceramic, subtle surface irregularity' },
            { name: 'Paper Packaging / Box', surface: 'matte', size: 'small', flavor: 'uncoated kraft or matte-laminate carton, crisp folded edges' },
            { name: 'Textile / Folded Fabric', surface: 'matte', size: 'medium', flavor: 'woven fabric, soft directional pile, gentle drape' },
            { name: 'Wooden Object / Utensil', surface: 'matte', size: 'small', flavor: 'oiled wood grain, warm matte finish' },
            { name: 'Book / Stationery', surface: 'matte', size: 'small', flavor: 'matte cover stock, clean printed type, sharp corners' },
        ]},
        { key: 'food', label: 'Food & Beverage', items: [
            { name: 'Plated Dish', surface: 'food', size: 'medium', flavor: 'freshly plated food, glistening sauce, natural steam and texture' },
            { name: 'Beverage in Glass', surface: 'food', size: 'small', flavor: 'poured drink with condensation, ice, backlit liquid glow' },
            { name: 'Packaged Snack / Bar', surface: 'food', size: 'small', flavor: 'foil or paper wrapper, product hero cut-open reveal' },
            { name: 'Fresh Produce', surface: 'food', size: 'small', flavor: 'raw fruit or vegetable, dewy skin, natural blemish detail' },
            { name: 'Baked Goods', surface: 'food', size: 'small', flavor: 'crumb texture, golden crust, soft flour dusting' },
            { name: 'Coffee / Hot Drink', surface: 'food', size: 'small', flavor: 'crema surface, rising steam, ceramic cup' },
        ]},
        { key: 'apparel', label: 'Apparel & Soft Goods', items: [
            { name: 'Garment (flat lay)', surface: 'apparel', size: 'medium', flavor: 'steamed garment laid flat, even weave, true fabric colour' },
            { name: 'Garment (on model)', surface: 'apparel', size: 'large', flavor: 'garment worn on a model, natural fall and fit' },
            { name: 'Garment (ghost mannequin)', surface: 'apparel', size: 'large', flavor: 'hollow-form garment holding its shape, invisible mannequin' },
            { name: 'Handbag / Accessory', surface: 'apparel', size: 'medium', flavor: 'structured bag holding form, hardware and grain detail' },
            { name: 'Hat / Headwear', surface: 'apparel', size: 'small', flavor: 'shaped headwear, crown and brim structure' },
            { name: 'Scarf / Soft Accessory', surface: 'apparel', size: 'medium', flavor: 'draped soft textile, flowing folds' },
        ]},
        { key: 'hardgoods', label: 'Large / Hard Goods', items: [
            { name: 'Sofa / Upholstered Furniture', surface: 'matte', size: 'large', flavor: 'upholstered frame, fabric texture, structural silhouette' },
            { name: 'Chair / Table', surface: 'matte', size: 'large', flavor: 'wood, metal or moulded form, clean structural lines' },
            { name: 'Large Appliance', surface: 'glossy', size: 'large', flavor: 'painted or stainless panel, tall boxy form, subtle reflections' },
            { name: 'Bicycle / Sports Equipment', surface: 'glossy', size: 'large', flavor: 'painted frame, mixed metal and rubber, open geometry' },
            { name: 'Furniture Set / Room Vignette', surface: 'matte', size: 'oversized', flavor: 'styled group of furniture in a set, cohesive palette' },
            { name: 'Vehicle (full)', surface: 'glossy', size: 'oversized', flavor: 'full car or motorcycle, metallic paint, chrome and glass' },
        ]},
    ],
    // 18 named lighting recipes. flavor is the sentence that lands verbatim in the
    // prompt's `lit` clause.
    productLightSetups: [
        { key: 'technical', label: 'Technical / E-commerce', items: [
            { name: 'Three-Point', flavor: 'lit with a classic three-point setup, a soft key at 45 degrees, a gentle fill opposite, and a rim light separating the product from the background' },
            { name: 'High Key Shadowless', flavor: 'lit high-key and almost shadowless, broad diffused light wrapping the product against a pure white background' },
            { name: 'Light Tent Diffused', flavor: 'lit inside a light tent, fully enveloping diffusion erasing hotspots and hard reflections on the surface' },
            { name: 'Bright Field Backlight', flavor: 'lit bright-field, a large illuminated white panel behind the product rendering the glass and edges as bright translucent tone' },
            { name: 'Dark Field', flavor: 'lit dark-field, twin strip softboxes raking from behind and the sides against a black ground so only the bright refractive edges of the glass glow' },
            { name: 'Ring Light Frontal', flavor: 'lit with an on-axis ring light, even frontal fill and a circular catchlight, minimal shadow' },
        ]},
        { key: 'commercial', label: 'Commercial / Hero', items: [
            { name: 'Clamshell', flavor: 'lit clamshell, one soft source high and one low filling from beneath, smooth gradient across the surface and a bright catchlight' },
            { name: 'Gradient Reflection', flavor: 'lit with gradient reflection mapping, a white-to-black card curved around the product casting one sweeping highlight that reveals its form' },
            { name: 'Two-Strip Edge', flavor: 'lit with two vertical strip softboxes at the sides, crisp parallel edge highlights defining the silhouette' },
            { name: 'Rim / Kicker Silhouette', flavor: 'lit mostly from behind with hard kicker lights, a bright outline carving the product off a dark background' },
            { name: 'Overhead Top-Light', flavor: 'lit from a single large overhead softbox, clean top-down highlight and a soft grounded shadow' },
            { name: 'Colored Gel Duotone', flavor: 'lit with two gelled sources of contrasting colour, a warm and a cool wash meeting across the product' },
        ]},
        { key: 'editorial', label: 'Editorial / Atmospheric', items: [
            { name: 'Low Key Chiaroscuro', flavor: 'lit low-key, a single hard source and deep falloff, dramatic sculpted shadow and one carved highlight' },
            { name: 'Window Directional Soft', flavor: 'lit as if by a large north-facing window, soft directional daylight and a long gentle shadow' },
            { name: 'Hard Sun Graphic Shadow', flavor: 'lit by a single hard undiffused source, a sharp graphic shadow thrown across the surface' },
            { name: 'Backlit Translucent Glow', flavor: 'lit from directly behind, the product glowing translucent with a warm halo of light around it' },
            { name: 'Splash Freeze Flash', flavor: 'lit with a short hard flash burst freezing liquid mid-splash, crisp droplets and motion' },
            { name: 'Practical In-Situ', flavor: 'lit by visible practical lights in the set, motivated ambient glow and natural falloff' },
        ]},
    ],
    productSurfaces: ["Seamless White Sweep", "Seamless Black Sweep", "Seamless Colored Sweep", "White Acrylic (reflective)", "Black Acrylic (reflective)", "Mirror Surface", "Polished Marble", "Raw Concrete", "Weathered Wood", "Linen / Fabric Drape", "Sand", "Water Surface", "Floating / Suspended in Air", "Raised Plinth / Pedestal", "Natural Stone Slab", "Glass Riser", "Gradient Backdrop", "In-Context Set Dressing"],
    productBackdrops: ["Pure White (#fff)", "Soft Grey Gradient", "Deep Black", "Brand Color Wash", "Warm Beige / Sand", "Cool Blue Studio", "Pastel Tone", "Textured Plaster Wall", "Blurred Lifestyle Bokeh", "Matching Tonal (product color)"],
    productPatterns: ["None / Plain", "Smooth Gradient", "Radial Gradient Spotlight", "Duotone Split", "Color Blocking", "Vertical Stripes", "Diagonal Stripes", "Polka Dots", "Grid / Graph Lines", "Halftone Dots", "Gingham / Checker", "Geometric Shapes", "Marble Veining", "Terrazzo Speckle", "Concrete / Plaster Texture", "Paper / Linen Texture", "Noise / Film Grain", "Organic Blob Shapes", "Wavy Ripple", "Confetti Scatter", "Abstract Brush Strokes"],
    productShotStyles: ["Hero Packshot", "E-commerce Cutout", "Three-Quarter Angle", "Straight-On Front", "Top-Down Flat Lay", "Knolling (aligned layout)", "Macro Detail Crop", "360 Turntable Frame", "Floating / Levitating", "Splash / Liquid Action", "Exploded / Disassembled View", "Group Lineup", "In-Use Lifestyle", "On-Model", "Ghost Mannequin", "Scale Reference", "Unboxing / Reveal", "Texture Study"],
    productFinish: ["As-is / Natural", "High-Gloss Retouched", "Matte Retouched", "Wet / Fresh Droplets", "Frosted / Chilled", "Dust-Free Clinical", "Softly Aged / Patina", "Powder / Ingredient Scatter", "Steam / Vapor", "Backlit Rim Glow"],
    productShadow: ["Contact Shadow Only", "Soft Diffused Shadow", "Hard Directional Shadow", "Long Dramatic Shadow", "No Shadow (floating)", "Natural Grounded Shadow", "Reflection Instead of Shadow", "Dappled / Gobo Shadow", "Double Shadow (two sources)"],
    productMood: ["Clean & Clinical", "Luxury & Opulent", "Warm & Inviting", "Bold & Graphic", "Natural & Organic", "Playful & Vibrant", "Moody & Dramatic", "Minimal & Editorial", "Tech & Futuristic"],
    productProps: ["None", "Ingredient / Raw Material", "Complementary Product", "Natural Elements (leaves, stone)", "Fabric / Textile", "Packaging Box", "Scattered Petals", "Water Droplets / Splash", "Geometric Blocks / Risers", "Hands Interacting", "Everyday Context Objects", "Seasonal Decor"],
    productSizes: ["Miniature (jewelry, coin)", "Small (bottle, phone, cosmetic)", "Medium (bag, shoe, cookware)", "Large (furniture, appliance)", "Oversized (vehicle, room set)"],
    productLens: ["100mm Macro", "85mm Short Tele", "50mm Standard", "35mm Wide-Normal", "24mm Wide (tilt-shift)", "120mm Tele", "70mm Normal", "Phone-style Wide"],
    productDof: ["f/2.8 — Shallow", "f/4 — Soft", "f/5.6 — Moderate", "f/8 — Balanced", "f/11 — Sharp", "f/16 — Deep", "Focus-stacked — Full sharpness"],
    productDistance: ["Extreme close (~20cm)", "Close (~50cm)", "Medium (~1.5m)", "Far (~3m)", "Very far (~6m+)", "Whatever frames the product"],
    productLightChar: ["Very Soft / Wrapped", "Soft Directional", "Crisp / Defined", "Hard / Punchy", "Even / Flat", "High-Contrast", "Warm (tungsten)", "Cool (daylight)"],
    // surface key -> {light, ground, shadow}. The lighting half of recommendFor().
    productLightRecipes: {
        transparent: { light: 'Dark Field',           ground: 'Black Acrylic (reflective)', shadow: 'Reflection Instead of Shadow' },
        reflective:  { light: 'Light Tent Diffused',   ground: 'White Acrylic (reflective)', shadow: 'Contact Shadow Only' },
        glossy:      { light: 'Gradient Reflection',   ground: 'Seamless White Sweep',       shadow: 'Soft Diffused Shadow' },
        matte:       { light: 'Three-Point',           ground: 'Seamless White Sweep',       shadow: 'Natural Grounded Shadow' },
        food:        { light: 'Window Directional Soft', ground: 'Weathered Wood',           shadow: 'Soft Diffused Shadow' },
        apparel:     { light: 'High Key Shadowless',   ground: 'Seamless White Sweep',       shadow: 'Contact Shadow Only' },
        hardgoods:   { light: 'Three-Point',           ground: 'Seamless Colored Sweep',     shadow: 'Natural Grounded Shadow' },
    },
    // size key -> {lens, dof, dist}. The optics half of recommendFor().
    productOpticsRecipes: {
        miniature: { lens: '100mm Macro',    dof: 'Focus-stacked — Full sharpness', dist: 'Extreme close (~20cm)' },
        small:     { lens: '100mm Macro',    dof: 'f/8 — Balanced',                 dist: 'Close (~50cm)' },
        medium:    { lens: '85mm Short Tele', dof: 'f/8 — Balanced',                dist: 'Medium (~1.5m)' },
        large:     { lens: '50mm Standard',  dof: 'f/11 — Sharp',                   dist: 'Far (~3m)' },
        oversized: { lens: '24mm Wide (tilt-shift)', dof: 'f/8 — Balanced',         dist: 'Very far (~6m+)' },
    },

    // --- SOUND DESIGN ---
    // Fills a gap that was already fully plumbed: buildComposition's `audio`
    // clause is consumed by Kling/Veo/Sora and the JSON export (js/promptEngine.js),
    // but nothing let a user deliberately author it — only a few SUBJECTS audio()
    // hooks and two hardcoded weather/action heuristics fed it. Tempo labels pair
    // real Italian tempo markings with an approximate BPM range; diegetic/
    // non-diegetic is genuine film sound-design vocabulary, not invented.
    sndGenre: ["Orchestral Cinematic", "Minimalist Piano", "Synthwave Electronic", "Tense Strings", "Ambient Drone", "Epic Trailer", "Lo-fi Chillhop", "Traditional Ethnic", "Jazz Noir", "Choral Sacred", "Industrial Glitch", "Acoustic Folk", "8-bit Chiptune", "Silence / No Score"],
    sndTempo: ["Very Slow (Largo, ~50 BPM)", "Slow (Adagio, ~65 BPM)", "Moderate (Andante, ~90 BPM)", "Walking (Moderato, ~110 BPM)", "Upbeat (Allegro, ~130 BPM)", "Fast (Vivace, ~160 BPM)", "Frantic (Presto, ~180+ BPM)"],
    sndInstrumentation: ["Full Orchestra", "Solo Piano", "String Quartet", "Synth Pads & Arps", "Taiko & Percussion", "Acoustic Guitar", "Brass Section", "Choir", "808s & Bass", "Music Box", "Didgeridoo & World", "Distorted Electric Guitar"],
    sndAmbient: ["City Traffic Hum", "Forest Birdsong", "Ocean Waves", "Rain on Windows", "Crowd Murmur", "Wind Howling", "Machinery Drone", "Campfire Crackle", "Underwater Muffle", "Empty Room Tone", "Space Vacuum Silence"],
    sndSfx: ["Footsteps on Gravel", "Glass Shattering", "Door Creak", "Gunshot Crack", "Thunder Clap", "Whoosh Transition", "Heartbeat Pulse", "Camera Shutter Click", "Radio Static", "Sword Clash"],
    sndDiegetic: ["Fully Diegetic (in-world only)", "Non-Diegetic Score Only", "Score Ducking Under Dialogue", "Score Swells at Climax"],
    sndMix: ["Intimate & Close", "Wide Cinematic Soundstage", "Muffled / Distant", "Distorted / Lo-fi", "Crystal Clear Studio", "Bass-Heavy Rumble", "ASMR Close-Mic"],
};
