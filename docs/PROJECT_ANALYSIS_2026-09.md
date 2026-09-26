# ScenePrompter — Proje Analizi ve Sonraki Adım Planı

**Tarih:** 26 Eylül 2026
**Kapsam:** `main` + unmerged `feat/product-shot-module` dalı üzerinden tam kod tabanı taraması.
**Eşlik eden dosya:** `CLAUDE.md` (kök dizin) — bu oturumda yazıldı, gelecekteki
Claude Code oturumları için mimari/konvansiyon özeti. Bu rapor onun "neden
böyle, nerede zayıf" analizi.

---

## 1. Yönetici özeti

ScenePrompter, build aracı olmayan, saf `<script>` etiketleriyle çalışan tek
sayfalık bir node-editör. Çekirdek (prompt motoru + editör mekaniği) **gerçekten
sağlam**: 360+ assertion'lı test paketi, veri-güdümlü preset/registry mimarisi,
9 platform adaptörü, düşünülmüş mobil dokunmatik UX. Zayıf noktalar iki
kategoride toplanıyor: **(a)** `js/app.js`'in tek dosyada 2700+ satıra, ~100
fonksiyona büyümüş olması (kod sağlığı, `docs/SYSTEM_ROADMAP.md` Faz 7'de zaten
tespit edilmiş ama başlanmamış), **(b)** birkaç somut, düşük-riskli hata
(service worker cache listesi eksik + yanlış fallback, `feat/product-shot-module`
dalının main'e hiç birleşmemiş olması). Aşağıda hepsi kanıtlarıyla.

---

## 2. UI analizi

### Güçlü yönler

- **Kategori renk sistemi tutarlı**: `CATEGORIES` (`js/app.js:142-149`) tek
  kaynak — nav butonu, node başlık rayı, çıkış soketi ve quick-add paleti hep
  aynı tablodan boyanıyor. Renk körlüğü riski düşük: nav butonlarındaki
  renk-şeridi tek başına renge dayansa da, her node başlığında ayrıca **metin**
  eyebrow'u var (`SOURCE`/`SUBJECT`/... — `js/app.js:575`), yani kategori asla
  sadece renkle iletilmiyor.
- **Tap-to-connect** kablo bağlama (sürükleme zorunlu değil) + 26px dokunmatik
  hit alanı (`css/style.css:65-69`) — hem masaüstü hem mobil için gerçek bir
  erişilebilirlik kazancı.
- **Onboarding kartı** tek seferlik, `localStorage.sp_onboarded` ile — iyi bir
  varsayılan (`js/app.js:2681-2694`).
- **Minimap** + Tidy/Fit — büyüyen graf'ta yön bulmayı çözüyor.

### Zayıf yönler

| Bulgu | Kanıt | Etki |
|---|---|---|
| **Nav çubuğu artık taşıyor.** `index.html` içinde 23 ayrı `createNode(...)` çağrısı var (nav + quick-add + preset butonları dahil); SOURCE grubu tek başına 7 node tipine çıktı (Scene/Location/Style/Render/UI Elements/Graphic Design/Product Shot). `.top-nav` `overflow-x:auto` (`css/style.css:231-236`) — kaydırma çubuğu gizli, kaydırılabilir olduğuna dair hiçbir görsel ipucu yok. Kullanıcı sağda daha fazla buton olduğunu bilmiyor. | `css/style.css:231` | Masaüstünde bazı node tipleri keşfedilemiyor; tek çıkış yolu aramayı bilerek Quick Add'a (Tab) gitmek. |
| **Klavye odağı görünmez.** Tüm `select`/`input`/`textarea` için global `outline: none` (`css/style.css:137`), yerine geçen bir `:focus`/`:focus-visible` stili yok. | `css/style.css:137` | Klavye/switch-access kullanıcısı hangi alanda olduğunu göremiyor — gerçek bir erişilebilirlik eksiği. |
| **Tablet aralığı (641–900px) tanımsız.** İki breakpoint var: `max-width:900px` (sadece marka yazısını gizler) ve `max-width:640px` (telefon deneyiminin tamamı: alt aksiyon çubuğu, tam-genişlik node, quick-add-öncelikli akış). Aradaki bant masaüstü deneyimini (uzun, kaydırmalı nav) dokunmatik birincil girdiyle (iPad vb.) birleştiriyor. | `css/style.css:301, 309` | iPad/orta boy tablet kullanıcısı ne masaüstü ne telefon deneyimini tam alıyor. |
| **106+40+122 kalemlik dropdown'lar** (Style Preset, Color Palette, Product Category) optgroup'larla düzenli ama font 0.6-0.68rem — masaüstünde okunur, telefonda `min-height:44px; font-size:16px` kuralı (`css/style.css:345`) zaten devrede, iyi. | — | Bulgu değil, doğrulama. |

---

## 3. Fonksiyonellik / pratiklik analizi

### Güçlü yönler

- **Prompt motoru** 8 nötr cümlecik → 9 platform adaptörü ayrımı gerçekten iyi
  tasarlanmış: yeni platform eklemek `PLATFORMS` tablosuna bir kayıt (bkz.
  `CLAUDE.md`). `lintScene` hiçbir zaman üretimi bloklamıyor, sadece uyarıyor.
- **Node registry** (`SUBJECTS`) + hand-built modül deseni (`colorpalette.js`,
  `productshot.js`...) yeni içerik eklemeyi gerçekten ~20 dk'ya indirmiş —
  `docs/SYSTEM_ROADMAP.md`'nin kendi hedefi buydu ve tutmuş.
- **JSON export + A/B/C varyant** üretimi — gerçek bir üretim iş akışına
  bağlanmaya hazır çıktı şekli.

### Zayıf yönler

| Bulgu | Kanıt | Etki |
|---|---|---|
| **`feat/product-shot-module` main'e birleşmemiş.** Son iki commit (`3107403`, `1b77d88`) bu dalda; `main` onları görmüyor. | `git log main..feat/product-shot-module` | Kullanıcı `main`'i çalıştırırsa Product Shot node'u **yok**. |
| **Tek kayıt slotu.** `localStorage.scene_save` — tek anahtar, boot'ta otomatik yükleniyor (`js/app.js:2706-2707`), ama çoklu proje / versiyon geçmişi yok. "History" modalı da graf durumu değil, **düz metin prompt geçmişi** (`js/promptEngine.js:853-876`, son 50 prompt) — eski bir sahneye geri dönmenin yolu yok, sadece eski prompt metnini kopyalayabiliyorsunuz. | `js/promptEngine.js:855` | Kullanıcı yanlışlıkla graf'ı bozarsa/Load ile üzerine yazarsa geri dönüş yok (Undo hariç, o da oturum ömürlü). |
| **Preset kütüphanesi içerik derinliğinin gerisinde.** 3 hazır preset (Cyberpunk, Noir, Product—Perfume) var; ama UI Elements, Graphic Design, Color Palette gibi büyük yeni modülleri gösteren tek bir preset yok. Yeni kullanıcı bu modüllerin var olduğunu nav'da görmezse keşfetmeyebilir. | `js/app.js` `PRESETS` | Yeni içeriğin keşfedilebilirliği düşük. |
| **Kök dizinde README.md yok.** Proje `docs/` altında 4 iyi yazılmış tasarım notu tutuyor ama tek bir giriş noktası (ne bu, nasıl çalıştırılır, hangi dosyaya bakılır) yok — bu boşluğu şimdi `CLAUDE.md` dolduruyor ama o ajan-odaklı; insan katkıda bulunan/kullanıcı için ayrı, kısa bir `README.md` hâlâ eksik. | — | Yeni katkıda bulunan/ileride "bu proje ne" sorusuna cevap yok. |
| **Backend bridge dokümante değil.** `backend/server.js` yorumları iyi ama hangi portu dinlediği, `higgsfield auth login`'in önce çalıştırılması gerektiği, sadece localhost'ta çalıştığı hiçbir yerde kullanıcıya (README/UI) anlatılmıyor. | `backend/server.js:1-8` | "Send to Generator" butonu backend koşmuyorsa sessizce/anlaşılmaz hata verir. |

---

## 4. Masaüstü / mobil uyumluluk

Bu, projenin **en olgun** tarafı — 6 ayrı "mobile UX" commit'i (`d793419` →
`8b96944`) özenli bir iş çıkarmış: safe-area insetleri, 44px dokunmatik hedefler,
alt aksiyon çubuğu, bottom-sheet modallar, tam-genişlik node'lar, tap-to-connect.
Buna rağmen iki somut hata var:

| Bulgu | Kanıt | Etki |
|---|---|---|
| **Service worker cache listesi bayat.** `CORE` dizisi (`sw.js:8-19`) sadece `db.js, subjects.js, promptEngine.js, app.js`'i listeliyor — `materials.js`, `colorpalette.js`, `contentModules.js`, **`productshot.js`** yok. Bunlar ilk çevrimiçi ziyarette runtime-cache'e düşüyor (`sw.js:38-41`), ama... | `sw.js:8-19` | PWA yükledikten sonra hiç çevrimiçi tam sayfa yenilemesi yapmamış bir kullanıcıda eksik kalabilir. |
| **Fetch fallback'i her başarısız isteği `index.html`'e çeviriyor.** `catch(() => caches.match('./index.html'))` (`sw.js:38-41`) sadece sayfa navigasyonu için doğru; bir `<script src="js/productshot.js">` isteği çevrimdışıyken cache'te yoksa ve ağ da yoksa, tarayıcı bu isteğe **HTML içeriğini JS olarak** alır → parse hatası, sayfa hiç çalışmaz. | `sw.js:38-41` | Çevrimdışı + eksik cache kombinasyonunda **tüm uygulama beyaz ekran** verebilir. Düşük olasılık (bir kez online ziyaret sonrası düzeliyor) ama gerçek bir kırılganlık. |
| **`CACHE = 'sceneprompter-v1'` hiç bump edilmemiş** (`sw.js:3`), yeni dosyalar eklenmesine rağmen. Sürüm bump'ı olmadan `install` event'i tekrar tetiklenmiyor. | `sw.js:3` | Yukarıdaki iki maddeyi büyütüyor — mevcut yüklü kullanıcılar yeni `CORE` listesini hiç almıyor. |
| **Backend bridge yalnızca masaüstü/localhost.** Mobilde yüklü PWA `localhost:3001`'e erişemez. | `backend/server.js` | Mobilde "Send to Generator" hiç çalışmaz — bu bir tasarım kısıtı, ama hiçbir yerde kullanıcıya söylenmiyor (buton muhtemelen sessizce/ağ hatasıyla başarısız oluyor). |

---

## 5. Optimize edilebilecek / geliştirilebilecek noktalar — öncelik sıralı

### 🔴 P0 — düşük efor, gerçek hata

1. **`sw.js` düzelt:** `CORE` listesine 4 eksik dosyayı ekle, `CACHE` sürümünü
   bump'la, fetch handler'da fallback'i yalnızca `req.mode === 'navigate'`
   isteklerine daralt (script/asset istekleri için `caches.match(req)` boşsa
   direkt network hatasını geçir).
2. **`feat/product-shot-module` → `main`'e PR/merge et** (ya da bilinçli olarak
   bekletiliyorsa bunu bir yere not düş) — şu an kullanıcı `main`'de Product
   Shot'u göremiyor.

### 🟠 P1 — kullanıcı deneyimi

3. Nav taşmasına görsel ipucu ekle (kenar gradyanı/ok) **veya** masaüstünde de
   node-oluşturmayı Quick Add'e kaydır, üst çubuğu sadece en sık kullanılan
   5-6 tipe indir.
4. `outline:none`'ı kaldır, yerine görünür bir `:focus-visible` halkası koy.
5. Kök dizine kısa bir `README.md` — ne olduğu, nasıl çalıştırılacağı
   (`npm test`, backend adımı), `docs/` ve `CLAUDE.md`'ye link.
6. 641-900px aralığı için bilinçli bir karar: ya telefon deneyimini bu aralığa
   da çek, ya da tablet'e özel ince ayar yap — şu an "arada kalmış" durumda.

### 🟡 P2 — mimari / ölçek (roadmap'te zaten var, önceliklendirme önerisi)

7. `js/app.js`'i bölmeye başla (cable/drag engine, presets, quick-add, minimap
   ayrı dosyalara) — `docs/SYSTEM_ROADMAP.md` Faz 7.3. En yüksek uzun-vadeli
   kaldıraç, çünkü tek dosyadaki ~100 fonksiyon her yeni özelliği daha
   pahalılaştırıyor.
8. Undo/redo şu an her adımda **tüm workspace'i** serialize ediyor (Faz 7.2,
   "kaba" diye zaten işaretli) — büyük grafiklerde (50+ node) gecikme
   yaratacak bir tavan; state-store'a geçiş bunu çözer.
9. Basit bir CI (GH Actions: push/PR'da `npm test` + `backend` testi) — şu an
   testler yalnızca elle çalıştırılıyor.

### 🟢 P3 — içerik / cila

10. `docs/SYSTEM_ROADMAP.md`'yi güncelle veya emekliye ayır — Temmuz'dan beri
    "yapılmadı" dediği PWA/test/preset maddelerinin çoğu artık yapıldı; olduğu
    gibi kalırsa yanıltıcı.
11. UI Elements / Graphic Design / Color Palette / Product Shot'ı sergileyen
    1-2 yeni hazır preset ekle — yeni modüllerin keşfedilebilirliğini artırır.
12. `backend/README` küçük bir kurulum notu (port, `higgsfield auth login`
    önkoşulu, sadece localhost).

---

## 6. Sonraki adım planı

Önerilen sıra — her madde bağımsız yayınlanabilir, birbirine bağımlı değil:

```
[ ] 1. sw.js düzelt (CORE listesi + cache bump + fetch fallback daraltma)
[ ] 2. feat/product-shot-module → main PR/merge
[ ] 3. Kök README.md yaz
[ ] 4. Nav taşma ipucu + :focus-visible stili (küçük CSS/JS, hızlı kazanım)
[ ] 5. SYSTEM_ROADMAP.md'yi güncelle (bu raporla birlikte tek bir "durum" kaynağı olsun)
[ ] 6. app.js bölme işine başla (cable/drag engine ilk aday — en izole parça)
```

İlk üç madde bugün, tek oturumda bitecek boyutta. 4-5 küçük ek oturumlar. 6.
madde kendi planını (mimari kararlarla) hak ediyor — istersen ayrı bir plan
mode oturumunda ele alalım.
