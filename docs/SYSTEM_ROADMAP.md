# ScenePrompter — Sistem Gelişim Raporu

**Tarih:** 16–17 Temmuz 2026  
**Sürüm:** main @ db71b12 üzerinden analiz  
**Durum:** Faz 0 ✅ · Faz 1 ✅ (6/7) · Faz 2 🚧 · **Faz 3 ✅** · **Faz 4 ✅** · Faz 7 kısmen ✅

> **İlerleme notu (17.07):** Faz 0 ve Faz 1'in çoğu bitti. Faz 7'nin test altyapısı
> ve node registry maddeleri, hata avı ve node dalgası gerektirdiği için plandan
> öne çekildi. Aşağıdaki fazlarda ✅ işaretli maddeler tamamlandı.
>
> Yol boyunca planda olmayan 6 sessiz hata bulundu ve düzeltildi (undo tamamen
> no-op'tu, `restoreState` yanlış id üretiyordu, orphan SVG birikimi, vb.) —
> hepsi `tests/editor.test.js`'te regresyon testiyle kilitli.

---

## 🎯 Yönetici özeti

ScenePrompter, node tabanlı sinematik AI video prompt üretiminde sağlam bir çekirdeğe sahip. Onu "etkileyici demo"dan "her gün güvenilen profesyonel araç"a taşıyan şey üç eksen:

1. **Editör güveni** — undo/redo, çoklu kayıt, kırılmaz save
2. **İçerik derinliği** — node çeşitliliği ve prompt kalitesi
3. **Üretim döngüsü** — gerçek API entegrasyonu

### Mevcut durum (17.07 itibarıyla)
- ✅ **28 node tipi** — 7'si registry'den: Quadruped, Insect, Flying, Vehicle,
  Crowd, Aquatic, VFX (+ Custom Location)
- ✅ **9 hedef platform** — Runway, Kling, Veo, Luma, Midjourney + Sora, Pika,
  Hailuo, Generic
- ✅ **3D: through-the-lens + sürükle-konumlandır + gölgeler + hareket önizleme**
- ✅ **Undo/Redo** (50 adım) + çoklu seçim + hızlı ekleme paleti
- ✅ **Otomatik test** — `npm test`, 190+ assertion, jsdom
- ✅ **Node registry** — yeni özne node'u = 1 dosya (6 değil)
- ✅ **Prompt lint + karakter sayacı + JSON export + A/B/C varyantlar**
- ✅ **2 çalışan preset** (Cyberpunk, Noir)
- ❌ Çoklu kayıt slotu — Faz 5
- ❌ Gerçek API entegrasyonu — Faz 6
- ❌ Çevrimdışı (CDN bağımlılığı sürüyor) — tek kalan Faz 0 maddesi
- ❌ DOM = state — Faz 7.2

---

## 📋 Teknik borç — durum

| Sorun | Öncelik | Durum |
|-------|---------|-------|
| **Noir preset çalışmıyor** | 🔴 KRİTİK | ✅ Preset sistemi veri-güdümlü; Noir 8 node |
| **Undo/Redo yok** | 🔴 KRİTİK | ✅ 50 adım; ayrıca no-op olduğu ortaya çıkıp düzeltildi |
| **Yeni node = 6 dokunma noktası** | 🟠 YÜKSEK | ✅ Registry: 1 dosya |
| **Test yok** | 🟠 YÜKSEK | ✅ `npm test`, 100+ assertion |
| **Prompt dilbilgisi** | 🟡 ORTA | ✅ `polishPrompt()` + kaynak veri düzeltmeleri |
| **Save formatı versiyonsuz** | 🟡 ORTA | ✅ `version: 2`, v1 uyumlu |
| **Repo hijyeni** | 🟢 DÜŞÜK | ✅ fix.js + YSF planı silindi |
| **DOM = state** | 🟠 YÜKSEK | ❌ Sürüyor — Faz 7.2 |
| **CDN bağımlılığı** | 🟠 YÜKSEK | ❌ Sürüyor — tek kalan Faz 0 maddesi |

### Yol boyunca bulunan, planda olmayan hatalar (hepsi düzeltildi + testli)
1. **Undo tamamen no-op'tu** — snapshot mutasyondan sonra alınıyordu
2. **`restoreState` yanlış id üretiyordu** — `node_5` → `node_6`; kablolar hayalet
   node'lara bağlanıp SVG'de sonsuza dek birikiyordu
3. **`resetStack`** kabloları DOM'dan hiç silmiyordu
4. **`saveWorkspace`** undo geçmişini siliyordu
5. **`loadPreset`** bekleyen timeout'u iptal etmiyordu → çift kablo
6. **`kill()`** yeni `<g>` sarmalayıcıyı orphan bırakıyordu

---

## 📍 8 faz: Yol haritası

### Faz 0 — Stabilizasyon ✅ (Noir/dilbilgisi/temizlik bitti)

- [x] **Noir preset'i uygula** — preset sistemi veri-güdümlü hale getirildi
      (`PRESETS` tablosu). Noir 8 node: jaluzi gobo ışığı, 35mm Arricam, Zeiss
      Standard Speeds, Ilford HP5, dutch angle. Menü de tablodan üretiliyor.
- [x] **Dilbilgisi geçişi** — merkezi `polishPrompt()`: a/an uyumu
      (`a university`/`an hour` istisnalarıyla), `..`, `., `, `, .`, çift boşluk.
      Ayrıca kaynak hataları: `"Middle Age (41-60)"` → *"middle"* yerine
      *"middle-aged adult"*, `"Roger Deakins"` → *"Roger"* yerine tam ad,
      veo/kling'de *"Cinematic shot Shot on"* tekrarı.
- [x] **Yıkıcı işlemlere onay** — `loadPresetConfirmed()` + Load onayı.
      Onay UI katmanında; `loadPreset` saf ve test edilebilir kaldı.
- [x] **Save format versiyonu** — `version: 2`; sürümsüz v1 kayıtları hâlâ
      yükleniyor, gelecek sürümler reddediliyor. Testle kilitli.
- [x] **Repo temizliği** — `fix.js` (dosyaları yeniden yazan tek seferlik script,
      durması riskliydi) ve YSF Yachting planı silindi.
- [ ] **Three.js + Fonts yerelleştirme → gerçek PWA** — tek kalan Faz 0 maddesi.

---

### Faz 1 — Çekirdek editör UX ✅ 6/7

- [x] **Undo/Redo** (50 adım) — Ctrl+Z / Ctrl+Y + nav butonları
- [x] **Çoğaltma** (Ctrl+D) **+ çoklu seçim** (S ile mod, Ctrl+A, grup sil/çoğalt)
- [x] **Hızlı ekleme paleti** — Tab veya `+ Ekle`; aranabilir modal grid
- [x] **Kablo UX** — 26px dokunmatik hit alanı, sürüklerken geçerli soketler
      yeşil parlıyor, 48px yakalama, tıkla-seç + Del, long-press menü
- [x] **Mobil eşdeğerlik** — her kısayolun UI karşılığı var; long-press context
      menüler (node: çoğalt/seç/sil, kablo: sil)
- [ ] **Node ergonomisi** (katla, yeniden adlandır, renk etiket, not node'u)
- [ ] **Kısayol haritası** (`?`)

> ⚠️ Bu faz sırasında **undo'nun tamamen no-op olduğu** ortaya çıktı: snapshot'lar
> mutasyondan *sonra* alınıyordu, yani yığının tepesi hep mevcut durumdu. Toast
> "Geri alındı" diyor ama hiçbir şey değişmiyordu.

---

### Faz 2 — Node ekosistemi genişlemesi 🚧

- [x] **Node registry** (`js/subjects.js`) — ön koşul olarak öne çekildi. Tek kayıt
      → nav butonu, node UI, 3D mesh, kamera hedefi, bağlantı kuralları, 5
      platformda prompt, hızlı-ekle girdisi. `app.js` −169, `promptEngine.js` −75 satır.
- [x] 🐦 **Flying** — 16 tür, sürü sayısı, irtifa, uçuş aksiyonu
- [x] 🚗 **Vehicle** — 13 tip, dönem, durum, sürüş aksiyonu
- [x] 👥 **Crowd** — yoğunluk, davranış, kıyafet
- [x] 🐟 **Aquatic** — 11 tür, sürü, su berraklığı
- [x] 💥 **VFX** — 14 efekt, ölçek, renk, zamanlama
- [ ] 🎬 **Transition** — registry'ye UYMAZ: Sequence'te shot'lar *arasına* bağlanır,
      `updateSequence` + bağlantı modeli değişikliği gerekir
- [ ] 🎙 Dialogue — replik metni, ses tonu (özne değil; spatial'ı yok)
- [ ] 🎵 Audio — skor, tempo, enstrümantasyon (özne değil)
- [ ] ⚙️ Model Settings — platform parametreleri (Faz 3 adaptörleriyle birlikte)
- [ ] 🧰 Props — çoklu obje listesi tek node'da

> Registry sayesinde her yeni özne node'u ~20 dk. Kalan maddeler registry'ye
> uymuyor (spatial'ı olmayan veya sequence'e bağlanan node'lar) — kendi
> tasarımlarını gerektiriyorlar.

---

### Faz 3 — Prompt Engine 2.0 ✅

Motor artık bir boru hattı:
`collectInputs → buildComposition → platform adaptörü → lint → polish`

- [x] **Platform adaptörleri** — `buildComposition` grafı 8 nötr cümleciğe çevirir
      (shot, subj, act, env, cam, lit, sty, audio). Adaptörler DOM'a hiç dokunmaz;
      sadece bu cümlecikleri hedef modelin sevdiği sıraya dizer. Yeni platform =
      `PLATFORMS`'ta tek kayıt; stack'in dropdown'ı kendini ondan üretir.
- [x] **Yeni platformlar** — 🌀 Sora (tek akışkan pasaj), ⚡ Pika (350 karakter
      bütçesi; ışık/kamera/ses kasıtlı düşürülür), 🎞 Hailuo (köşeli parantezli
      kamera direktifleri), 📄 Generic (etiketli blok). Toplam 9 platform.
- [x] **Prompt lint** — gece sahne + öğlen güneşi · Clear hava + yağış atmosferi ·
      iç mekân + yağış · su altı + toz/ateş · B&W palet + renkli LUT ·
      geniş plan + makro böcek. Uyarı verir, grafı asla engellemez.
- [x] **Karakter sayacı** — platform limitine göre; %85'te sarı, limitte kırmızı.
- [x] **Yapılandırılmış dışa aktarım** (JSON butonu) — prompt, negative, 8 cümlecik,
      aspect/resolution/engine, uyarılar. Faz 6'nın POST edeceği şekil.
- [x] **Varyant üretici** (A/B/C butonu) — sabit sözcüksel dönüşümler, rastgele
      değil; üçü tekrarlanabilir ve karşılaştırılabilir.
- [x] **Test altyapısı** — öne çekildi. Faz 2'de yazılan snapshot'lar burada işe
      yaradı: **5 mevcut platform refactor sonrası birebir aynı çıktı verdi.**

> Bir test, sora'nın *"Wide shot, static camera of a wolf"* ürettiğini yakaladı —
> shot cümleciği kamera hareketini taşıdığı için "of" yanlış isme bağlanıyordu.

---

### Faz 4 — 3D önizleme pro ✅ (GLTF hariç)

- [x] **Through-the-lens** — kameranın gerçek focal length'iyle ikinci viewport.
      `fov = 2·atan(24 / (2·mm))` (24mm = S35 sensör yüksekliği).
- [x] **Çift yönlü bağlama** — 3D'de objeyi sürükle, en yakın spatial bucket'a
      yapışsın ve dropdown'lara geri yazılsın. `SPATIAL_BUCKETS` artık iki yönün
      de okuduğu tek tablo (önce iki yerde kopya sabitlerdi).
- [x] **Kamera hareket önizlemesi** — dolly in/out, orbit, follow; 3 saniye.
      Prompt'un kullandığı ADVANCED TRACKING ayarını okur.
- [x] **Işık kalitesi** — gölge haritaları açık; stüdyo ışıkları ve güneş gölge
      atıyor, yani gel rengi ve günün saati sahneye gerçekten düşüyor.
- [x] **Custom Location hacmi** — iç mekân/yeraltı üç duvar alır (dördüncü açık:
      kameranın durduğu yer); açık ortamlar wireframe hacim kalır.
- [ ] **Stilize GLTF modeller** — ikili varlık dosyası gerektiriyor; CDN maddesiyle
      birlikte ele alınmalı.

> Ekran görüntüsü, hiçbir birim testin bulamayacağı 3 hata yakaladı:
> **(1)** Hızlı Ekle modalı her açılışta açıktı (inline stilde `display` iki kez
> yazılmış, `flex` kazanıyordu). **(2)** Camera node'unun **spatial context'i
> yoktu** — ışık ve tüm özneler varken kamera orijine çakılıydı, lens görünümünü
> anlamsız kılıyordu. **(3)** Lens, kendi gövdesinin içinden bakıyordu (8×8×12
> siyah kutu tam lens konumunda).

---

### Faz 5 — Veri, kayıt, paylaşım (1 hafta)
**Amaç:** Tek oturumluk oyuncaktan proje aracına çevir.

- [ ] Çoklu proje slotu + IndexedDB (localStorage 5MB sınırı kalkar)
- [ ] Otomatik kayıt (30 sn'de bir + çökme kurtarması)
- [ ] Preset kütüphanesi (kullanıcı kaydı + 8–10 hazır)
- [ ] Paylaşılabilir link (lz-string URL fragment)
- [ ] .sceneprompt dosya uzantısı

---

### Faz 6 — Gerçek üretim entegrasyonu (2–4 hafta)
**Amaç:** "Uçtan uca" üretim döngüsü.

- [ ] API konnektörleri — Runway, Luma resmi API + Kling/Veo
- [ ] Üretim galerisi — video + prompt + graf snapshot eşleşmesi
- [ ] Maliyet tahmincisi
- [ ] Kuyruk, durum takibi, yeniden deneme
- [ ] ⚠️ **Mimari karar gerekli:** Anahtarlar istemcide mi (hızlı, kullanıcı yönetimi) yoksa proxy backend'de mi (merkezi, abonelik modeline uygun)?

---

### Faz 7 — Mimari modernizasyon (paralel, kademeli)
**Amaç:** Mevcut davranışı korurken kod kalitesi kat kat artsın.

1. [x] **Node registry** — özne node'ları için tamam (`js/subjects.js`).
       Sahne/kamera/ışık gibi özne olmayan node'lar hâlâ elle.
2. [ ] **State store** — node durumu DOM'dan bağımsız; undo/redo/test doğal oturur
       (undo şu an her eylemde tüm workspace'i serialize ediyor — çalışıyor ama kaba)
3. [ ] **ES Modules + Vite** — window.* yok, dev server, HMR
4. [x] **Test** — jsdom + düz Node scriptleri (Vitest yerine; sıfır bağımlılık,
       `npm test` ile çalışıyor). Playwright hâlâ açık.
5. [ ] **TypeScript** — db ve registry'den başlayarak kademeli
6. [ ] **CI + deploy** — GH Actions: test → build → Netlify/CF Pages otomatik

**Neden paralel?** Her adım tek başına diğer faz'larla bağımsız ve değer üretir.

---

## 📊 Takvim (önerilen sıralama)

| Hafta | Faz | İçerik | Kullanıcı etkisi |
|-------|-----|--------|------------------|
| 1 | 0 | Bug'lar, dilbilgisi, repo temizliği | Güven başlar |
| 2–3 | 1 | Undo, çoğaltma, palet, kablo UX | **En büyük sıçrama** |
| 4–5 | 7.1–7.2 | Registry + state store | Görünmez ama hızlanma |
| 5–6 | 2 | Flying, Vehicle, Crowd, VFX, Transition | Yaratıcı derinlik |
| 7–8 | 3 | Prompt Engine 2.0, testler | Çıktı kalitesi |
| 9 | 5 | Çoklu kayıt, preset, paylaşım | **Proje aracı statüsü** |
| 10–12 | 4 | Through-the-lens, çift yönlü 3D | Ayrışma noktası |
| 12–14 | 6 | API entegrasyonu | Uçtan uca |

**Varsayım:** Yarı zamanlı tek geliştirici. Tam zamanlı: yarısına iner.  
**Yayın:** Her sıra kendi başına yayınlanabilir; 14 hafta beklemeye gerek yok.

---

## 📈 Başarı ölçütleri

| Ölçüt | Bugün | Hedef |
|-------|-------|-------|
| Yeni node ekleme maliyeti | 6 dosya / ~2 saat | 1 dosya / ~20 dk |
| Geri alma | imkânsız | Ctrl+Z, ≥50 adım |
| Prompt engine testleri | 0 test | ≥40 snapshot |
| Kayıtlı proje sayısı | 1 slot | Sınırsız + otomatik |
| Hazır preset | 1 | ≥8 |
| Çevrimdışı | Hayır | Tam PWA |
| Desteklenen platform | 5 | 8–9 |
| Prompt hatası | Var (a/an, "..") | Lint = sıfır |

---

## ⚠️ Riskler

1. **DOM-state ayrıştırma riski** — en kırılgan refactor  
   *Önlem:* Strangler yaklaşımı, her adımda Playwright smoke testleri

2. **API volatility** — video platformlar hızlı değişiyor  
   *Önlem:* Adaptör mimarisi + "kendi anahtarını getir" modeli

3. **Kapsam kayması** — 3D pro fazı sonu olmayan kuyu olabilir  
   *Önlem:* Through-the-lens + sürükleme dışı her şey ayrı backlog

4. **Tek geliştirici yoğunluğu**  
   *Önlem:* Her faz kendi başına yayınlanabilir; yarım kalan bile değer bırakır

---

## 🚀 Sonraki adım

**Faz 0 başlamaya hazır.** Tahmini süre: 1 gün.

```
[ ] Noir preset uygula
[ ] Dilbilgisi geçişi (a/an, "..", virgüller)
[ ] Yıkıcı işlemlere onay
[ ] Save versiyonu
[ ] Repo temizliği
[ ] Three.js + Fonts yerelleştir
```

İstersen başlayabilirim.
