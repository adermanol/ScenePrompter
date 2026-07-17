# Tests

No build step, no framework — plain Node scripts. The app's `<script>` tags are
loaded into a jsdom window and driven directly.

## Çalıştırma

```bash
npm install          # only dep: jsdom (dev)
node tests/editor.test.js
node tests/promptEngine.test.js
```

Her iki dosya da başarısızlıkta exit code 1 döner, yani CI'a doğrudan bağlanabilir.

## editor.test.js

Kablo yaşam döngüsü ve undo/redo. Her testte hem **model** (`window.cables`)
hem de **DOM** (`<g class="cable-group">` sayısı) kontrol edilir — ikisinin
ayrışması bu projede tekrar eden bir hata sınıfı olduğu için.

Yakaladığı regresyonlar:

- `kill()` kabloyu diziden siliyor ama `<g>` DOM'da kalıyor → görünmez tıklanabilir alan
- `resetStack()` kabloları DOM'dan hiç silmiyordu → hayalet kablolar
- `restoreState()` node'ları yanlış id ile yeniden kuruyordu (`node_5` → `node_6`),
  kablolar hayalet node'lara bağlanıp DOM'da sonsuza dek birikiyordu
- `captureState()` mutasyondan *sonra* çağrılıyordu → undo tamamen no-op'tu
- `saveWorkspace()` undo geçmişini siliyordu

Ayrıca her `SUBJECTS` kaydının gerçekten mount olduğunu, alanlarının doğru id ile
DOM'a geldiğini ve save/load turunu sağlam atlattığını doğrular — bayat bir
eleman id'si tam olarak burada patlar.

## promptEngine.test.js

`updateStack()` çıktısının **birebir metnini** 5 platform için (Runway, Veo,
Kling, Luma, Midjourney) kilitler. Refactor kelimeyi değiştirirse test kırılır;
değişiklik kasıtlıysa beklenen string de onunla güncellenir.

Bu snapshot'lar `subjects.js` registry refactor'ünün eşdeğerliğini kanıtladı:
elle yazılmış quadruped/insect kodu kaldırıldı, çıktı harfi harfine aynı kaldı.

Registry bütünlük testleri de burada: her kaydın zorunlu alanları, `select`
alanlarının `DB`'de gerçekten var olması, ve prefix çakışması olmaması.

## Notlar

- `loadPreset()` kablolarını `setTimeout(50)` içinde kurar; testlerde
  `await preset()` bunu bekler.
- jsdom'da `THREE` yok, `preview` node'u 3D kurmaz — mesh fonksiyonları test
  kapsamı dışı (sadece varlıkları kontrol edilir).
- `eval` içindeki `const` bağlantıları dışarı sızmaz; testler `SUBJECTS`, `DB` ve
  `SUBJECT_TYPES`'ı eval sonrası açıkça dışa aktarır. Fonksiyon bildirimleri sızar.
