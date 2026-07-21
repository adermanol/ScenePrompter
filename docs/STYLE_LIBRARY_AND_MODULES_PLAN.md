# ScenePrompter — Stil Kütüphanesi + UI Elements + Graphic Design Modülleri

**Tarih:** 19–21 Temmuz 2026
**Kaynak:** `devplan.txt` (108 satır)
**Durum:** ✅ Uygulandı — Faz 1 ve Faz 2 tek geçişte tamamlandı (106 stil ön-ayarı da dahil, ayrı bir "kalan 89 kalem" borcu kalmadı). Testler yazıldı, `npm test` iki paket için de yeşil. Commit bekliyor.

---

## 🎯 devplan.txt analizi

Dosya üç ayrı şey içeriyor:

1. **2 modül işareti** (satır 1-2): `ui elements module.` ve `graphic design module.` — nokta ile biten, madde listesinden ayrı iki başlık. Bunlar yeni node tipi talebi.
2. **106 stil ön-ayarı** (satır 3-108, 8 kategori) — bu, Fooocus/SDXL topluluğunun tanıdık `sdxl_styles_fooocus.json` listesiyle birebir aynı yapı (her biri kısa bir "stil adı" + arkasında standart bir prompt-fragment kalıbı olan, community-authored stil ön-ayarları).

### Kategorilere ayrıştırma (106 kalem, 8 grup)

| Grup | Aralık | Adet | Örnekler |
|---|---|---|---|
| **General** | 3-19 | 17 | 3D Model, Anime, Cinematic, Comic Book, Digital Art, Isometric, Line Art, Lowpoly, Neonpunk, Origami, Photographic, Pixel Art, Texture |
| **Ads / Commercial** | 20-28 | 9 | Advertising, Automotive, Corporate, Fashion Editorial, Food Photography, Luxury, Real Estate, Retail |
| **Art Movements** | 29-46 | 18 | Abstract Expressionism, Art Deco, Art Nouveau, Cubist, Expressionist, Impressionist, Pop Art, Renaissance, Surrealist, Watercolor |
| **Futuristic / Sci-Fi** | 47-56 | 10 | Biomechanical, Cybernetic, Cyberpunk Cityscape, Retro Futurism, Sci-Fi, Vaporwave |
| **Game Aesthetics** | 57-69 | 13 | Retro Arcade, RPG Fantasy, Strategy Game + **5 marka-özel isim** (Mario, Zelda, Pokemon, GTA, Minecraft, Streetfighter) |
| **Misc / Thematic** | 70-90 | 21 | Architectural, Dreamscape, Dystopian, Gothic, Grunge, Horror, Kawaii, Lovecraftian, Manga, Minimalist, Space, Stained Glass |
| **Papercraft** | 91-99 | 9 | Collage, Flat Papercut, Kirigami, Paper Mache, Paper Quilling, Shadow Box |
| **Photo Subgenre** | 100-108 | 9 | Film Noir, Glamour, HDR, iPhone Photographic, Long Exposure, Neon Noir, Silhouette, Tilt Shift |

Bu liste zaten **camBodies/camLenses** (kamera node'u) ve **`js/materials.js`**'in (Materyal modülü) kullandığı "familya → tip, optgroup + flavor metni" kalıbına birebir uyuyor — sıfırdan bir mekanizma icat etmeye gerek yok, kanıtlanmış deseni tekrar kullanacağız.

---

## 🏗️ Mimari — 3 parça

### 1. STYLE PRESET LIBRARY → mevcut STYLE node'a yeni bir alan

**Neden yeni node değil:** Style node zaten 8 alanlı (`sty_cin, sty_per, sty_art, sty_dir, sty_dp, sty_pal, sty_tex, sty_ref`, bkz. `js/app.js` style branch). 106 kalem yeni node değil, **tek bir optgroup'lu `<select>`** gerektiriyor — tıpkı Materyal modülünün `mat_type_${id}` alanının ~70-90 materyal tipini tek dropdown'da taşıması gibi (`js/materials.js:48-59`).

**DB yapısı** (`js/db.js`), grup etiketleri çok kelimeli olduğu için `materialTypes`'ın object-keyed yapısı yerine `{key, label, items}` dizisi:

```js
DB.stylePresets = [
  { key: 'general', label: 'General', items: [
      { name: 'Cinematic', flavor: 'cinematic film still, shallow depth of field, ...' },
      // 17 kalem
  ]},
  { key: 'ads', label: 'Ads / Commercial', items: [ /* 9 */ ] },
  { key: 'artMovements', label: 'Art Movements', items: [ /* 18 */ ] },
  { key: 'futuristic', label: 'Futuristic / Sci-Fi', items: [ /* 10 */ ] },
  { key: 'game', label: 'Game Aesthetics', items: [ /* 13 */ ] },
  { key: 'misc', label: 'Misc / Thematic', items: [ /* 21 */ ] },
  { key: 'papercraft', label: 'Papercraft', items: [ /* 9 */ ] },
  { key: 'photo', label: 'Photo Subgenre', items: [ /* 9 */ ] },
];
```

**Node değişikliği** (`js/app.js`, style branch) — yeni bir alan, `mat_type_${id}` ile birebir aynı optgroup+flavor mekaniği:

```js
${sectionHTML('PRESET LIBRARY')}
<select id="sty_preset_${id}" onchange="window.updateStylePresetFlavor('${id}'); triggerUpdate();">
  ${DB.stylePresets.map(g => `<optgroup label="${g.label}">` +
      g.items.map(it => `<option value="${it.name}" data-flavor="${it.flavor}">${it.name}</option>`).join('') +
    `</optgroup>`).join('')}
</select>
<div id="sty_preset_flav_${id}" style="font-size:0.6rem; color:#888;"></div>
```

`window.updateStylePresetFlavor` = `updateMatFlavor`'ın (`js/materials.js:105-112`) birebir kopyası.

**promptEngine entegrasyonu** (`js/promptEngine.js`) — mevcut style bloğuna (satır ~361-380) TEK satır ekleme, hem `buildComposition` hem `buildMidjourneyTags`'te aynı desen:

```js
const preset = findStylePreset(val(`sty_preset_${id}`));   // reverse-lookup, mat family lookup gibi
if (preset) arr.push(preset.flavor);
```

`findStylePreset(name)` — `readMaterial`'ın family reverse-lookup'ı (`js/materials.js:146-155`) ile aynı desen, `DB.stylePresets` üzerinde `.items` arıyor.

**Unassigned kontratı korunur:** alan boşsa (`''`), `preset` bulunamaz, `arr.push` çağrılmaz — motor hiçbir şey söylemez (proje genelindeki `.filter(Boolean)` disiplini).

---

### 2. UI ELEMENTS modülü — yeni, elle-yazılmış node (customloc deseni)

**Neden registry değil, customloc gibi elle-yazılmış:** SUBJECTS registry'sindeki her tip otomatik spatial-context paneli alır (sahne içinde *konumlanan* bir varlık olduğu varsayılır). Bir UI ekranı sahnede konumlanmaz — **kadrajın tamamı odur**, tıpkı `customloc`'un bir ortamın tamamını tanımlaması gibi. Bu yüzden `customloc` (`js/app.js`, customloc branch) kalıbını izliyoruz: elle yazılmış HTML, spatial panel yok, kendi `mesh()`'i yok (3D önizlemede atlanır — 2D kompozisyon kavramları için 3D temsil zorlama olur).

**Kategori:** SOURCE (customloc/scene ile aynı aile — "bu görüntü temelde nedir" sorusuna cevap veriyor, pozisyonlanan bir SUBJECT değil).

**Alanlar** (prefix `ui_`):

| Alan | DB dizisi | Kaç seçenek | Yarım satır |
|---|---|---|---|
| PLATFORM | `uiPlatform` | ~10 (Mobile App, Desktop, Web Dashboard, Smartwatch, Tablet, Smart TV, VR/AR, Automotive Dash, Kiosk, Smart-Home Panel) | ✓ |
| SCREEN TYPE | `uiScreenType` | ~18 (Onboarding, Login, Dashboard, Settings, E-commerce PDP, Checkout, Chat, Media Player, Form, Nav Menu, Card Feed, Modal, Notification, Data Table, Calendar, Map View, Search Results, Empty State) | ✓ |
| DESIGN LANGUAGE | `uiDesignLanguage` | ~12 (Material Design, iOS HIG, Neumorphism, Glassmorphism, Skeuomorphism, Flat Design, Brutalist Web, Cyberpunk HUD, Retro Terminal, Swiss Grid, Fluent, Claymorphism) | ✓ |
| COLOR MODE | `uiColorMode` | ~7 (Light, Dark, High-Contrast Accessible, Brand-Colored, Monochrome, Gradient-Heavy, Neon-Accented) | ✓ |
| LAYOUT DENSITY | `uiLayoutDensity` | ~7 (Spacious/Airy, Dense/Data-Heavy, Card Grid, Single-Column, Split-Pane, Sidebar+Content, Bento Grid) | — |
| STATE | `uiState` | ~7 (Default/Populated, Empty, Loading/Skeleton, Error, Success, Hover/Focus, Disabled) | — |
| CUSTOM NOTE | serbest metin | — | — |

**`phrase(v)`** (materialPhrase disiplini: her parça truthy-guard'lı, target-agnostic):
```
"a [colorMode] [platform] [screenType] interface, [designLanguage] design language,
 [layoutDensity] layout, showing a [state]"
```
Örnek: *"a dark mode mobile app onboarding flow interface, material design language, card-based grid layout, showing a default state"*

---

### 3. GRAPHIC DESIGN modülü — aynı desen (customloc + Materyal karışımı)

**Kategori:** SOURCE.

**Alanlar** (prefix `gd_`):

| Alan | DB dizisi | Kaç seçenek | Yarım satır |
|---|---|---|---|
| ARTIFACT TYPE | `gdArtifact` | ~14 (Poster, Album Cover, Book Cover, Logo, Business Card, Packaging Label, Magazine Spread, Billboard, Flyer, Icon Set, Brand Identity Board, Infographic, T-Shirt Design, Sticker Sheet) | ✓ |
| LAYOUT STYLE | `gdLayout` | ~7 (Grid-Based, Asymmetric, Centered/Symmetrical, Collage, Typographic Lockup, Negative-Space-Driven, Full-Bleed Image) | ✓ |
| TYPOGRAPHY | `gdTypography` | ~9 (Bold Sans Display, Elegant Serif Editorial, Hand-Lettered Script, Brutalist Mono, Art Deco Lettering, Graffiti Lettering, Minimalist Geometric, Vintage Condensed, Kinetic Type) | ✓ |
| COLOR PALETTE ROLE | `gdPalette` | ~8 (Duotone, High-Contrast B&W, Pastel, Corporate Brand Colors, Riso-Print Limited, Neon/Vibrant, Earthy/Organic, Monochrome+Accent) | ✓ |
| FINISH / MEDIUM | `gdFinish` | ~8 (Matte Print, Glossy Print, Screen-Printed Texture, Embossed/Foil-Stamped, Risograph, Digital-Flat, Vintage Halftone, Letterpress) | — |
| CUSTOM NOTE | serbest metin | — | — |

**`phrase(v)`** örneği: *"a poster, grid-based layout, bold sans-serif display typography, duotone palette, risograph finish"*

---

## 🔌 promptEngine.js — UI Elements & Graphic Design entegrasyonu

Bunlar SUBJECTS registry'sinde değil (spatial-context'leri yok), bu yüzden `collectInputs`'a **iki yeni switch case** eklenir (mevcut `case 'character':` / `case 'object':` yanına):

```js
case 'uielements': g.uiElements.push(n); break;
case 'graphicdesign': g.graphicDesign.push(n); break;
```

`buildComposition`'da, chars/subjects/objects döngülerinin yanına — **`sArr`'a katkı** (bunlar da "kadrajın konusu"):

```js
g.uiElements.forEach(n => { const p = uiElementsPhrase(readUiElements(n.id)); if (p) sArr.push(p); });
g.graphicDesign.forEach(n => { const p = graphicDesignPhrase(readGraphicDesign(n.id)); if (p) sArr.push(p); });
```

`buildMidjourneyTags`'de aynı iki döngü, `tags()` fonksiyonlarıyla.

**Neden bu iki modülü SUBJECT değil SOURCE kategorisine koyduk ama yine de `sArr`'a (subject dizisine) yazıyoruz:** Kategori rengi UI/nav gruplaması için; `sArr`'a yazma kararı ise *prompt cümlesinde nerede görüneceği* için — ikisi bağımsız. Bir UI ekranı sahnenin "konusu" olduğu için sArr'a gitmesi doğru, ama pozisyonlanabilir bir varlık olmadığı için SOURCE renginde kalması doğru.

---

---

### 4. COLOR PALETTE modülü — yeni node (materials.js deseni, ama sahne-geneli)

**Neden Materyal gibi wrapper değil:** Materyal bir HOST'a (karakter/obje/subject) takılan, tek objeyi etkileyen bir pass-through node. Renk paleti ise **sahne/çekim geneli bir karar** — tıpkı Color Grade gibi (tüm görüntüyü etkiler, tek objeye değil). Bu yüzden Color Grade ile birebir aynı bağlantı şeklini kullanıyor: `hasIn=false, hasOut=true`, doğrudan Stack'e bağlanıyor, wrapper mekaniği yok.

**Kategori:** GRADE (mor) — Color Grade/Composition/Material/Preview ailesi.

**Kütüphane yapısı** (`js/materials.js`'in `mat_type` optgroup+flavor deseni, artı her kalem için bir **renk swatch dizisi**):

```js
DB.colorPalettes = [
  { key: 'cinematic', label: 'Cinematic & Mood', items: [
      { name: 'Teal & Orange', flavor: 'a classic cinematic teal-and-orange grade...', swatch: ['#0b3d42','#1c6e73','#e8834a','#f2b26b'] },
      // ~8 kalem
  ]},
  { key: 'nature', label: 'Nature & Organic', items: [ /* ~8 */ ] },
  { key: 'neon', label: 'Neon & Synthetic', items: [ /* ~7 */ ] },
  { key: 'vintage', label: 'Vintage & Film', items: [ /* ~6 */ ] },
  { key: 'monochrome', label: 'Monochrome & Minimal', items: [ /* ~5 */ ] },
  { key: 'fantasy', label: 'Fantasy & Otherworldly', items: [ /* ~6 */ ] },
];
```
~40 kalem, 6 grup. `swatch` alanı hem dropdown altında küçük renk çipleri göstermek için (materials.js'in düz flavor metninden bir adım daha bilgilendirici) hem de ileride (Faz 2, opsiyonel) 3D önizlemeye sahne-geneli bir ton aktarımı için kullanılabilir — **v1 kapsamı dışı**, Color Grade de bugün 3D'ye dokunmuyor, Color Palette de aynı tutarlılıkla sadece prompt+tag üretir.

**Ek eksenler:** DOMINANCE (`palDominance`: Balanced/Warm-Dominant/Cool-Dominant/High-Contrast/Low-Contrast), SATURATION (`palSaturation`: Vivid/Natural/Desaturated/Near-Monochrome), ACCENT COLOR (serbest metin), CUSTOM NOTE.

**Entegrasyon:** `buildComposition`'ın mevcut `if (g.style || g.color || g.comp)` bloğu `g.colorPalette` ile genişler, `g.color`'ın hemen yanına yeni bir `if (g.colorPalette) { arr.push(paletteFlavor + dominance/saturation) }` eklenir — `colorg`'un bugün yaptığı işin birebir aynı deseni.

---

## ⚠️ Açık karar: Game Aesthetics kategorisindeki marka isimleri

`Game Mario`, `Game Zelda`, `Game Pokemon`, `Game Gta`, `Game Minecraft`, `Game Streetfighter`, ve gözden kaçan `Game Bubble Bobble` — **7 kalem** tescilli marka/karakter adı taşıyor. Bunlar `styleDirector` alanındaki (`Roger Deakins`, `Christopher Nolan`...) kişi-referanslarından **kategorik olarak farklı bir risk taşır** (marka/IP vs. bir yönetmenin üslup referansı).

**✅ Karar (kullanıcı onayladı, "Game Voxel Sandbox" fikri iyi):** Uygulama bu 7 kalemi jenerik betimleyicilere çevirir — görsel çağrışım flavor metninde korunur, sadece isim jenerikleşir:

| Orijinal | Jenerik ad |
|---|---|
| Game Mario | Game Cheerful Platformer Mascot |
| Game Zelda | Game Open-World Fantasy Adventure |
| Game Pokemon | Game Creature Collector |
| Game Gta | Game Open-World Crime Sim |
| Game Minecraft | **Game Voxel Sandbox** |
| Game Streetfighter | Game Arcade Brawler |
| Game Bubble Bobble | Game Cute Bubble Platformer |

Diğer 6 kalem (Cyberpunk Game, Fighting Game, Retro Arcade, Retro Game, RPG Fantasy, Strategy Game) zaten jenerik, dokunulmaz.

---

## 📅 Önerilen kapsam (Materyal modülüyle aynı disiplin: mekanizma + kullanılabilir çekirdek, sonra genişlet)

| Faz | İçerik | Efor |
|---|---|---|
| **1 — Mekanizma + Genel** | `DB.stylePresets` iskeleti (8 grup) + Style node'a alan + promptEngine kancası + testler. UI Elements, Graphic Design, Color Palette node'ları tam alan setiyle uçtan uca çalışır halde. | ✅ Tamamlandı |
| **2 — Kütüphaneyi doldur** | 106 stil ön-ayarının tamamı (Ads/Art Movements/Futuristic/Game/Misc/Papercraft/Photo dahil) tek geçişte yazıldı — ayrı bir faz olarak değil, Faz 1'le birlikte. | ✅ Tamamlandı (planlanandan erken) |

Sistem artık tam işlevsel: Style node'daki 106 kalemlik kütüphane, ~40 kalemlik Color Palette kütüphanesi, ve UI Elements / Graphic Design node'ları uçtan uca çalışıyor — hem cinematic prose (`buildComposition`) hem Midjourney tag (`buildMidjourneyTags`) yollarına bağlı.

---

## ✅ Doğrulama (tamamlandı)

- `tests/promptEngine.test.js`: stil preset seçilince flavor metninin prompt'a eklendiği; boşken hiçbir şey eklenmediği (unassigned kontratı); Color Palette'in flavor+dominance/saturation/accent/note kompozisyonu; UI Elements/Graphic Design node'larının `sArr`'a katkısı; hepsinin Midjourney tag'lerine doğru sızması; `findStylePreset`/`findColorPalette` reverse-lookup'ları. Toplam ~30 yeni assertion, sıfır regresyon.
- `tests/editor.test.js`: üç yeni node tipinin (`uielements`, `graphicdesign`, `colorpalette`) DOM'a doğru id konvansiyonuyla kurulduğu, doğru kategori/soket yapısına (`hasIn`/`hasOut`, `data-cat`) sahip olduğu, Style node'un 106 kalemlik preset alanının DOM'da var olduğu, ve üçünün save/load round-trip'i. Toplam 14 yeni assertion, sıfır regresyon.
- Headless Chrome ekran görüntüsü: nav çubuğunda UI Elements/Graphic Design (SOURCE, mavi) ve Color Palette'in komşusu Color Grade (GRADE, mor) butonlarının doğru kategori rengiyle render olduğu doğrulandı. Nav şeridi `overflow-x:auto` ile yatay kaydırmalı olduğu için tam genişlik ekran görüntüsünde bazı butonlar kaydırma alanının dışında kalıyor — bu bir hata değil, mevcut tasarımın parçası (DOM'da hepsi var, testlerle doğrulandı).

---

## Not: Bu oturumda keşfedilen, plandan önce bilinmesi gereken durum

Bu plan hazırlanırken, önceki bir oturumda (bu konuşmanın hafızasında olmayan bir bölümde) **Materyal modülünün zaten tam uygulandığı** (`1f048dc`) ve ayrıca **gerçek bir Higgsfield backend entegrasyonunun** (`backend/` klasörü, MCP client, `/api/generate`) uygulandığı (`9177256` ve öncesi 3 commit) tespit edildi. Yani `docs/SYSTEM_ROADMAP.md`'deki "Faz 6 açık, backend kararı gerekiyor" notu **artık güncel değil** — ayrı bir görev olarak roadmap'in senkronize edilmesi gerekiyor (bu planın kapsamı dışında, sadece not düşülüyor).
