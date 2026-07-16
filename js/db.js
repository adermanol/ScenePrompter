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
    insectSurface: ["On a Leaf", "On Human Skin", "On a Flower", "On Decaying Matter", "On a Spiderweb", "In Mid-air Flight", "On Bare Ground", "On Tree Bark", "On Water Surface"]
};
