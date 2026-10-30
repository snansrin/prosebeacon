# ProseBeacon v0.3 — belgeyi bölmeden işleyen, her zaman hazır yerel akademik yazı motoru

Bu dal, bildirilen dört sorunun tamamını kök nedenleriyle çözer ve istenen yeni yetenekleri ekler. Tüm doğrulama kullanıcının gerçek belgesiyle (`TİK 4 RAPOR.docx`, 5,1 MB / 26 sayfa / 92.883 karakter) yapıldı; havacılık örnek metni kaldırıldı.

## 1) Bölüm bölüm yükleme kaldırıldı

- `lib/documents.mjs`: `MAX_FILE_BYTES` 10 MB → **50 MB**, `MAX_DOCUMENT_TEXT` 500.000 → **2.000.000**, `MAX_PDF_PAGES` 150 → **800**, worker zaman aşımı 25 sn → 120 sn, worker belleği 768 MB.
- `extractDocument` artık `parts` döndürmüyor; yanıt `whole: true` taşıyor. Arayüzde bölüm seçme akışı yok.
- Ölçüm: 5,1 MB DOCX **2,5 sn**'de tek parça (92.883 karakter).
- `lib/document-worker.mjs`: pdfjs-dist 6.x'in istediği `Promise.withResolvers` için shim eklendi; PDF içe aktarma Node 20'de de çalışıyor.

## 2) "Kırmızı metni seç + akademik üslup + yeniden çalıştır" artık çalışıyor

- Kök neden: `configuration().ready` yalnızca Ollama/OpenAI yapılandırıldığında true idi → 503 ve dönen fanlar.
- `lib/rewrite.mjs`: `builtin` sağlayıcı **her zaman hazır** (`prosebeacon-local-transform-v3`). Model yapılandırılmışsa önce model denenir; hata/kesik çıktı durumunda sessizce yerel motora düşer (502/503 yerine sonuç).
- `lib/transform.mjs`: sekme ve çok boşluklu kapak/form satırları korunur (hizalama bozulmaz); boşluk normalleştirmesi yalnızca boşluk karakterlerine uygulanır.
- `lib/preserve.mjs`: sözlük terimleri yalnızca kendi cümlelerini korur (tüm belgeyi donduran hata düzeldi); biçimsel boşluk farkları ve atıf yeniden sıralaması yanlış "anlam kaybı" alarmı üretmez.
- Arayüzde ayrıca **seçili bölümü yeniden yaz** akışı var: solda veya sağda seçim yap → yalnızca o bölüm dönüştürülür ve belgeye geri dikilir.
- Ölçüm (92.883 karakter): yeniden yazım **1,5 sn**, 56 cümle dönüştü, 28 cümle güvenlik için özgün hâline döndü, anlam koruma kaybı 0.

## 3) Yapay zekâ yüzdesi görünür

- Arayüzde büyük dairesel gösterge: yüzde, bant etiketi, güven aralığı, güven yüzdesi, okunabilirlik (Ateşman TR), kelime/cümle ve etken ağırlıkları.
- Gerçek belge sonucu: **%0,2 (düşük)**, aralık [0 – 7,2], güven %80, okunabilirlik 94 "çok kolay".

## 4) Yan yana, senkron kırmızı/yeşil karşılaştırma

- `lib/diff.mjs`: kelime düzeyi diff; sabır çapaları + **12 token'lık benzersiz pencere çapaları** + satır ortası bölme. Yinelemeli/büyük belgelerde doğrusal: 92.883 karakterde ~100 ms, iki yön de karakter karakter yeniden kuruluyor.
- Sol panel orijinal (kırmızı), sağ panel düzeltilmiş (yeşil). Bir değişiklik grubuna tıklamak karşı paneldeki eşleşeni vurgulayıp kaydırıyor; serbest seçim karakter konumlarıyla eşleniyor. "Kırmızı üstte · yeşil altta" görünümü her değişikliği alt alta gösteriyor.

## 5) Kaynakça ve kaynak doğrulama

- `lib/citations.mjs`: KAYNAKLAR bölümünü skorlayarak bulur (tablo başlığıyla karışmaz), girdileri ayrıştırır, metin içi atıflarla çapraz denetler. Gerçek belgede: **44 kaynak, 37 atıf, 7 atıfsız, 11 listede olmayan atıf, 22 DOI**. APA 7 / APA 7-TR / MLA 9 / Chicago / Vancouver / BibTeX + CSV/Markdown/BibTeX indirme ve panoya kopyalama.
- `lib/source-scan.mjs`: Crossref + OpenAlex üzerinde kaynak doğrulama (doğrulandı / düzeltilmeli / bulunamadı) ve atıfsız iddialar için öneri — önce belgenin kendi kaynakçasından, sonra dış kayıtta. SSE ile canlı ilerleme. Çevrimdışıysa kullanılabilir kısmi sonuç ve açık uyarı döner.
- Örnek doğrulama: Van Bemmelen iddiası → belge kaynakçasındaki Heaton & Fullen (2016) ile eşleşti; DOI'si 2017 tarihli kayıtla çelişen 2023 girdisi "düzeltilmeli" işaretlendi.

## Dil paketleri ve dayanaklar

- TR: 30 kural / 202 desen / 22 YZ işareti; EN: 12 kural / 133 desen / 23 işaret. Üsluplar: Yazım denetimi, Doğal, Akademik, Tez/rapor, Resmî yazışma, Teknik, İş, Haber.
- Resmî yazışma paketi RG 10.06.2020/31151 (CB Kararı 2646) maddelerinden; akademik/tez paketleri YÖK-enstitü tez kuralları ve APA 7 Türkiye uygulamasından; EN paketi APA 7, Chicago 17, Plain Language, EU Style Guide, GOV.UK'tan türetildi. Dayanak listesi `/api/health` içinde ve arayüzde gösteriliyor.

## Masaüstü simgesi (komut satırı gerekmez)

- `install.bat` (Windows): Node kontrolü, `npm install`, gizli başlatıcı (`ProseBeacon.vbs`) ve masaüstü kısayolu (`pb.ico`).
- `install.command` (macOS): `~/Applications/ProseBeacon.app` paketi (`pb.icns`).
- `install.sh` (Linux): `.desktop` kaydı + masaüstü kısayolu (`pb.png`).
- `tools/launch.js`: sunucuyu başlatır, health bekler, tarayıcıyı açar, kapanışta sunucuyu durdurur.
- `tools/make-icons.py`: bağımlılıksız PNG/ICO/ICNS üretimi (zlib+struct); simgeler `assets/` içinde.

## API eklemeleri

`POST /api/proofread`, `/api/transform`, `/api/compare`, `/api/citations` (+format indirmeleri), `/api/sources` (SSE), `/api/report`. `/api/health` artık motorları, dil paketlerini, dayanakları, üslupları ve sınırları döner. Kota: IP başına dakikada 120 POST, aynı anda 2 düzenleme, 3 belge ayrıştırma.

## Doğrulama

- `npm test`: **64 test, 0 hata** (diff yeniden kurma + doğrusallık, kaynakça algılama/biçimlendirme, belge numarası-atıf ayrımı, sekme koruması, yerel yeniden yazım ve model düşüşü, atıfsız iddia eşleştirme, çevrimdışı tarama, gerçek PDF/DOCX baytları, erişim ve kota).
- Gerçek belge uçtan uca (içe aktarma + analiz + yeniden yazım + kaynakça + yazım): **~5 sn**, hatasız.
- Sunucu `HOST=0.0.0.0 PORT=3210` ile canlı doğrulandı; `/`, `/app.js`, `/styles.css` ve tüm API uçları 200 döndü.

## Notlar

- Yapay zekâ yüzdesi bir olasılık tahminidir; yazarlık kanıtı veya Turnitin sonucu değildir (arayüzde ve README'de belirtilir).
- Kaynak doğrulama Crossref/OpenAlex kapsamıyla sınırlıdır; eşleşme olmaması özgünlük kanıtı değildir, ağ hatası "eşleşme yok" diye sunulmaz.

---

## Depoya gönderme (PR açma) komutları

Sandbox'ta `gh` CLI ve git kimlik bilgisi olmadığı için PR buradan açılamadı. Aşağıdaki komutları kendi makinenizde (veya kimlik bilgisi olan bir ortamda) çalıştırın:

```sh
cd prosebeacon
git add -A
git commit -m "v0.3: whole-document engine, always-ready local rewrite, synced diff, citation table, source verification, desktop installers"
git push -u origin feat/v0.3-engine-upgrade
gh pr create --base main --head feat/v0.3-engine-upgrade --title "ProseBeacon v0.3 — bölmesiz belge, her zaman hazır yerel motor, senkron karşılaştırma, kaynakça ve kaynak doğrulama" --body-file PR_BODY.md
```

`gh` yoksa: dalı gönderdikten sonra GitHub'da `feat/v0.3-engine-upgrade` → `main` için "Compare & pull request" deyip bu dosyayı açıklama olarak yapıştırın.
