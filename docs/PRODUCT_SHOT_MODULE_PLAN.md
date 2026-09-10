# ScenePrompter — PRODUCT SHOT Modülü (Ürün Çekimi Stüdyo Kurulumları)

**Tarih:** 10 Eylül 2026
**Durum:** ✅ Uygulandı — tek geçişte tam kütüphane + mekanizma + testler. `npm test` iki pakette de yeşil (sıfır regresyon), headless görsel doğrulama yapıldı.

---

## Neden

ScenePrompter'ın LIGHT node'u sinematik bir *sahneyi* aydınlatmayı varsayar (`industrial` / `sunlight`). Ürün çekiminin dili farklıdır: ışık, **ürün yüzeyinin ışığa nasıl davrandığına** göre seçilen isimli bir reçetedir; kamera ayarı da **ürün boyutuna** göre değişir. Bu iki eşleşme hiçbir node'da ifade edilemiyordu.

## Araştırma — modülün veri tabanını oluşturan iki eksen

### 1. Yüzey davranışı → ışık reçetesi (`DB.productLightRecipes`)

| Yüzey (key) | Kurulum | Zemin | Gölge |
|---|---|---|---|
| `transparent` (cam, parfüm) | Dark Field | Black Acrylic | Reflection Instead of Shadow |
| `reflective` (mücevher, krom) | Light Tent Diffused | White Acrylic | Contact Shadow Only |
| `glossy` (kozmetik, kavisli plastik) | Gradient Reflection | Seamless White Sweep | Soft Diffused Shadow |
| `matte` (deri, seramik, karton) | Three-Point | Seamless White Sweep | Natural Grounded Shadow |
| `food` | Window Directional Soft | Weathered Wood | Soft Diffused Shadow |
| `apparel` | High Key Shadowless | Seamless White Sweep | Contact Shadow Only |
| `hardgoods` | Three-Point | Seamless Colored Sweep | Natural Grounded Shadow |

Şeffaf cisim yansıyan ışıkla değil *içinden geçen* ışıkla tanımlanır → dark/bright field. Yansıtıcı yüzey ayna gibi davranır → çevrenin tamamı difüzöre çevrilir (light tent). Kavisli parlak yüzey → tek süpürücü highlight (gradient reflection mapping).

### 2. Ürün boyutu → optik reçetesi (`DB.productOpticsRecipes`)

| Boyut (key) | Objektif | Diyafram | Mesafe |
|---|---|---|---|
| `miniature` (mücevher) | 100mm Macro | Focus-stacked | ~20cm |
| `small` (şişe, telefon) | 100mm Macro | f/8 | ~50cm |
| `medium` (çanta, ayakkabı) | 85mm Short Tele | f/8 | ~1.5m |
| `large` (mobilya) | 50mm Standard | f/11 | ~3m |
| `oversized` (araç, mekân) | 24mm (tilt-shift) | f/8 | ~6m+ |

Makro ve geniş açı büyük ürünlerde distorsiyon yapar; uzaktan zoom tercih edilir. Minyatürde tek karede yeterli alan derinliği yoktur → focus stacking.

`recommendFor(catName, sizeOverride)` bu iki tabloyu birleştirip 6 alanlık reçete döner. Her `DB.productCategories` kalemi kendi `{surface, size}` anahtarını taşır; `SIZE CLASS` alanı kategorinin ima ettiği boyutu geçersiz kılar.

---

## Mimari

**Tek node: `productshot`**, kategori **SOURCE** — `uielements` / `graphicdesign` ailesi (spatial panel yok, `mesh()` yok).

**Tek node, ÜÇ clause** — `SUBJECTS[x]`'in `phrase`/`action`/`audio` desenİ:

| Fonksiyon (`js/productshot.js`) | Clause | promptEngine kancası |
|---|---|---|
| `productShotPhrase(v)` | `subj` (`sArr`) | `buildComposition`, graphicDesign döngüsünün yanı |
| `productLightPhrase(v)` | `lit` | `litParts` dizisi (Light node'larıyla ortak) |
| `productOpticsPhrase(v)` | `cam` — **yalnız `!g.camera` iken** | camera bloğunun sonu, `cap()` ile |
| `productShotTags(v)` | Midjourney | `buildMidjourneyTags` |

**`lit` neden ayrı:** Sora/Veo onu kendi cümlesi yapar, Pika düşürür. `subj`'e gömülse üçü de bozulur.

**`cam` neden Camera'ya teslim:** Camera node `cam` clause'unun sahibi. İkisi birden yazarsa prompt çelişir → `lintScene` "Product Shot optics are ignored because a Camera node is connected" uyarısı basar, alanlar node'da kalır.

**`lit` refactor:** eski `g.lights.map(...)` bloğu bir `litParts` dizisi kuracak şekilde düzenlendi; Product Shot yokken çıktı byte-for-byte aynı (mevcut platform snapshot'ları bunu kilitliyor — sıfır regresyon doğrulandı).

### Öneri motoru — [Apply]

Kategori seçilince flavor satırının altında: `Suggested: Dark Field · black acrylic · reflection instead of shadow · 100mm macro · f/8 [Apply]`. `[Apply]` (`window.applyProductSetup`) altı `<select>`'i doldurur. Basılmazsa alanlar **unassigned kalır** (`''` = "hiçbir şey söyleme" kontratı).

---

## Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `js/db.js` | `productCategories` (~40, 7 grup, her biri `{surface,size,flavor}`), `productLightSetups` (18, 3 grup), + `productSurfaces/Backdrops/ShotStyles/Finish/Shadow/Mood/Props/Sizes/Lens/Dof/Distance/LightChar` dizileri, + `productLightRecipes` / `productOpticsRecipes` tabloları |
| `js/productshot.js` | **YENİ** — `colorpalette.js` şekli: `buildProductShotHTML`, `findProductCategory`, `findProductLightSetup`, `recommendFor`, `updateProductFlavor`, `applyProductSetup`, `readProductShot`, `productShot/Light/Optics Phrase`, `productShotTags` |
| `index.html` | `<script src="js/productshot.js">` (contentModules ↔ promptEngine arası) + SOURCE nav butonu |
| `js/app.js` | `CATEGORIES.source.types` += `'productshot'`; `createNode` dalı (colorpalette şekli); `PRESETS.productPerfume` |
| `js/promptEngine.js` | `collectInputs` (`g.productShot` + case); subject/lit/cam kancaları; `lintScene` uyarısı; `buildMidjourneyTags` |
| `tests/promptEngine.test.js` | kaynak listesine `js/productshot.js`; ~18 assertion |
| `tests/editor.test.js` | kaynak listesine `js/productshot.js`; ~8 assertion |

## Kapsam dışı (bilinçli)

LIGHT node'una "studio" modu · Material wrapper bağlantısı · 3D mesh · `randomizeAll` dahil etme — gerekçeler ana planda.

## Doğrulama

- `npm test` — 236 mevcut assertion sıfır regresyon + ~26 yeni. `lit` refactor behaviour-preserving (sunlight snapshot kilidi).
- Headless Chrome: node 5 bölümüyle taşmadan render oluyor, SOURCE renginde; `[Apply]` altı alanı dolduruyor, kalan alanlar unassigned.
- Save/load round-trip: tüm `pr_*` değerleri dönüyor.
