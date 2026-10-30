# ProseBeacon

**Metnin izini sür. Kendi sesini bul.**

Türkçe ve İngilizce için yerel akademik yazı çalışma alanı: belgeyi **bölmeden** tamamını işler, yapay zekâ benzerliği yüzdesini görünür biçimde gösterir, kırmızı/yeşil senkron karşılaştırma sunar, kaynakçayı otomatik çıkarıp tabloya çevirir ve atıfları Crossref/OpenAlex üzerinde doğrular. Harici model kurulmasa da **yerel motor her zaman hazırdır**; hiçbir adım "çalışıyormuş gibi" yapmaz.

> Üç inceleme yöntemi ayrı gösterilir: TR/EN üslup sezgiseli, İngilizce Desklib sınıflandırıcısı ve dil modeli incelemesi. Skorlar yerel bir değerlendirme kümesinde kalibre edilmedi; yazarlık kanıtı veya Turnitin puanı değildir. Benzerlik yalnızca kullanıcının eklediği kaynaklarda aranır. Kaynak doğrulama Crossref/OpenAlex genel kayıtlarıyla sınırlıdır; eşleşme bulunmaması özgünlük kanıtı değildir.

## Kurulum (komut satırı bilgisi gerekmez)

| Sistem | Ne yapılır |
| --- | --- |
| Windows | `install.bat` dosyasına çift tıklayın. Masaüstüne **ProseBeacon** simgesi eklenir; simgeye çift tıklayınca tarayıcı kendiliğinden açılır. |
| macOS | `install.command` dosyasına çift tıklayın. `~/Applications/ProseBeacon.app` oluşturulur ve açılır. |
| Linux | `install.sh` çalıştırın. Uygulama menüsüne ve masaüstüne kısayol eklenir. |

Kurulum betikleri Node.js yoksa indirme sayfasını açar, paketleri kurar ve simgeyi `assets/pb.ico` / `pb.icns` / `pb.png` ile oluşturur. Elle kurmak isteyenler için:

```sh
git clone https://github.com/snansrin/prosebeacon.git
cd prosebeacon
npm ci          # Node.js 20.9 veya üzeri
npm start       # http://127.0.0.1:3210
```

Masaüstü simgesi `tools/launch.js` çalıştırıcısını çağırır: sunucuyu başlatır, `/api/health` yanıtını bekler, tarayıcıyı açar; kapatıldığında sunucuyu da durdurur. Analiz ve düzeltme metni diske otomatik kaydedilmez; yalnızca açıkça kaydettiğiniz terminoloji ve örnekler yerel profil dosyasında kalır.

## Yeniden yazma motoru: her zaman hazır

v0.3 ile yeniden yazma **harici modele bağlı değildir**. `prosebeacon-local-transform-v3` yerel motoru; TDK/Resmî Gazete/YÖK/APA kurallarını içeren dil paketleriyle yazım denetimi, üslup dönüşümü, cümle ritmi çeşitlendirme ve anlam koruma kontrolü yapar. Çevrimdışı çalışır, başlatma hatası vermez.

`.env.example` dosyasını `.env` olarak kopyalarsanız isteğe bağlı model sağlayıcıları eklenir:

```dotenv
AI_PROVIDER=ollama
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:8b
```

```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=your_server_side_key
OPENAI_MODEL=your_available_text_model
```

Model yapılandırılmışsa yeniden yazım önce modelle denenir; model yanıt vermezse, eksik ya da kesik çıktı üretirse ProseBeacon **sessizce yerel motora düşer** ve sonucu bununla üretir (503/502 ile karşılaşmazsınız). Anahtar yalnızca sunucuda tutulur, tarayıcıya gönderilmez. Ollama taşınabilir kurulumunda `OLLAMA_EXECUTABLE` ve `OLLAMA_MODELS` tam yolları `.env` içinde kalır; `npm start` servisi gerektiğinde başlatır ve Ctrl+C'de kapatır.

## Üsluplar

Yazım denetimi · Doğal · Akademik · Tez/rapor · Resmî yazışma · Teknik · İş yazışması · Haber dili.

Resmî yazışma paketi, *Resmî Yazışmalarda Uygulanacak Usul ve Esaslar Hakkında Yönetmelik* (RG 10.06.2020 / 31151, CB Kararı 2646) maddelerinden türetilmiştir: sayı/tarih/konu/ilgi biçimi, muhatap hitabı, kapanış hiyerarşisi ("rica ederim / arz ederim"), sayı yazımı (1.452, 10.545,72), kısaltma ilk-kullanım kuralı ve yabancı kelime kısıtı. Akademik/tez paketleri YÖK ve enstitü tez yazım kuralları ile APA 7 Türkiye uygulamasını ("vd.", (Yazar, Yıl), DOI biçimi) izler. İngilizce paketi APA 7, Chicago 17, Federal Plain Language, EU English Style Guide ve GOV.UK üslup kılavuzlarını kaynak alır.

## Özellikler

- **Bölmesiz belge işleme:** Word (.docx), PDF, TXT, MD — 50 MB'a ve 800 sayfaya kadar. Çıkarılan metin 2.000.000 karaktere kadar tek parça işlenir; "bölüm seç" akışı kaldırıldı.
- **Görünür yapay zekâ yüzdesi:** büyük gösterge, bant etiketi, güven aralığı, güven yüzdesi, okunabilirlik (Ateşman TR / Flesch benzeri EN) ve etken ağırlıkları.
- **Senkron karşılaştırma:** solda orijinal (kırmızı = silinen/hatalı), sağda düzeltilmiş (yeşil = yeni). Bir değişiklik grubuna tıklamak karşı paneldeki eşleşeni vurgular ve kaydırır; serbest metin seçimi de karakter konumlarıyla eşlenir. "Kırmızı üstte · yeşil altta" görünümü her değişikliği alt alta yazar.
- **Seçimi yeniden yaz:** sağ veya sol panelde metin seçip "seçili üslupla yeniden yaz" dendiğinde yalnızca o bölüm dönüştürülür ve belgeye geri dikilir.
- **Kaynakça motoru:** KAYNAKLAR bölümünü skorlayarak bulur (tablo başlıklarıyla karışmaz), girdileri ayrıştırır (yazar/yıl/başlık/kaynak/cilt/sayı/sayfa/DOI/URL), metin içi atıflarla çapraz denetler; APA 7, APA 7-TR, MLA 9, Chicago, Vancouver, BibTeX biçimlerinde kopyalanabilir tablo + CSV/Markdown/BibTeX indirme üretir.
- **Kaynak doğrulama:** her kaynak Crossref/OpenAlex üzerinde DOI veya başlıkla doğrulanır (doğrulandı / düzeltilmeli / bulunamadı); atıfsız sayısal iddialar için önce belgenin kendi kaynakçasından, olmazsa Crossref/OpenAlex'ten öneri getirir. İlerleme SSE ile canlı akar.
- **Açıklanabilir analiz:** cümle bazlı düşük/orta/yüksek sinyal ve gerekçeler; kalıp ifadeler, sözcük tekrarı, uzunluk ve ritim ölçüleri.
- **Yazım denetimi:** TDK yazım/noktalama, Resmî Gazete biçim kuralları ve AI-tipik kalıp işaretleri; otomatik düzeltme + sorun listesi (kural kimliği, dayanak, öneri).
- Anlam koruma kontrolü: sayılar, birimler, URL'ler, köşeli atıflar ve korunacak terimler birebir izlenir; korunamayan cümle özgün hâline döndürülür.
- Canlı kelime/karakter/cümle sayacı, DOCX/PDF/TXT/Markdown dışa aktarma, Markdown kaynak doğrulama raporu.
- İstek sınırlama, API parola seçeneği, aynı kaynak kontrolü, CSP ve same-origin zorunluluğu.

## Yapay zekâ benzerliği göstergesi

Gösterge bir **olasılık tahminidir**: yerel ensemble (kalıp yoğunluğu, burstiness, sözcük çeşitliliği, somut veri yoğunluğu, cümle uzunluğu dağılımı) yüzde, bant ve güven aralığı üretir. Yazarlık kanıtı, Turnitin puanı veya dedektör atlatma garantisi değildir; düzenleme "insan yazısıdır" iddiası üretmez.

## Yazım düzeltme ve kişisel hafıza

"Yazım denetimi" yerel motorla çalışır ve düzeltilmiş metni anında karşılaştırma paneline koyar. Son taslak elle düzenlenip **DOCX, PDF, TXT veya Markdown** indirilebilir; yeni dosyada kaynak belgenin görselleri, makroları ve sayfa düzeni korunmaz. PDF, Türkçe karakterler için SIL OFL lisanslı [Noto Sans](https://github.com/notofonts/noto-fonts) gömer; lisans `assets/fonts/OFL.txt` içindedir.

Terminoloji, üslup tercihi ve 50'ye kadar onaylı önce/sonra örneği `.prosebeacon-data/profile.json` içinde saklanabilir (`PROSEBEACON_DATA_DIR` ile taşınabilir). Klasör Git ve Docker bağlamı dışındadır; statik sunucudan okunamaz. Profil kullanıldığında en ilgili üç örnek isteğe eklenir; model ağırlıkları değişmez, arka plan eğitimi yoktur.

## İnternette cümle ve kaynak araması

Arama bölümüne 1–5 cümle girin (cümle başına en fazla 500 karakter). Varsayılan `SEARCH_PROVIDER=wikipedia` anahtarsız özet getirir; `crossref` bibliyografik metadata adayları verir. Genel web için `SEARCH_PROVIDER=brave` + `BRAVE_SEARCH_API_KEY` veya `searxng` + `SEARXNG_URL` gerekir. Sonuçlar **aday kaynaktır**; tam cümlenin özette bulunması ayrıca etiketlenir. Kaynak doğrulama sekmesinden bağımsızdır ve onun yerini tutmaz.

## Doğrulama

```sh
npm run check
npm test        # 64 test
```

Testler: kelime düzeyi diff'in iki yönünü de karakter karakter yeniden kurması, yinelemeli/büyük belgelerde doğrusallık, kaynakça algılama ve biçimlendirme, belge numarası/atif ayrımı, sekme hizalı kapak satırlarının korunması, yerel yeniden yazım ve model düşüşü, atıfsız iddia eşleştirme, çevrimdışı kaynak taraması, gerçek PDF/DOCX baytları, giriş doğrulama, erişim denetimi, istek kotası ve sahte sağlayıcı protokolleri. CI Ubuntu ve Windows'ta Node 20/22/24 çalıştırır.

[Gerçek yerel model testi](docs/LOCAL-VALIDATION.md) ve [v0.2 doğrulama kaydı](docs/VALIDATION-v0.2.md) önceki sürümlerin canlı model ölçümlerini saklar.

## API

| Uç nokta | İşlev |
| --- | --- |
| `GET /api/health` | Motorlar, dil paketleri, dayanaklar, üsluplar, sınırlar; anahtar içermez |
| `POST /api/analyze` | `{ "text": "…", "locale": "tr" }` → yüzde, bant, aralık, etkenler, okunabilirlik |
| `POST /api/proofread` | `{ "text": "…", "locale": "tr", "autoFix": true }` → sorun listesi + düzeltilmiş metin |
| `POST /api/transform` | `{ "text": "…", "style": "academic", "instruction": "…", "terms": [] }` |
| `POST /api/rewrite` | `{ "text": "…", "style": "thesis", "instruction": "…", "glossary": "InVEST" }` → metin + diff + kaynakça özeti; SSE isteğe bağlı |
| `POST /api/compare` | `{ "text": "…", "revised": "…" }` → kelime diff'i + istatistik |
| `POST /api/citations` | `{ "text": "…", "style": "apa7" }` → tablo; `format: csv|markdown|bibtex|text` indirme |
| `POST /api/sources` | `{ "text": "…", "maxReferences": 24, "maxClaims": 10 }` → SSE ilerleme + doğrulama |
| `POST /api/report` | Markdown rapor indirme |
| `POST /api/classify` | Eğitilmiş İngilizce model; `{ "text": "…", "locale": "en" }` |
| `POST /api/review` | 64 cümleye kadar editoryal inceleme; model yoksa yerel paket incelemesi |
| `POST /api/statistics` | `{ "text": "…", "locale": "tr" }` |
| `POST /api/export` | `{ "text": "…", "format": "docx" }` → ikili dosya; pdf/txt/markdown da desteklenir |
| `GET/POST /api/profile` | Profil okuma; settings/example/reset |
| `POST /api/search` | `{ "text": "1–5 cümle", "locale": "tr", "consent": true }` |
| `POST /api/similarity` | `{ "text": "…", "sources": [{ "title": "…", "text": "…" }] }` |
| `POST /api/import` | Ham dosya baytları; `Content-Type: application/octet-stream`, `X-File-Name: encodeURIComponent(filename)` |

Parola ayarlıysa tüm API'lerde `X-App-Password` başlığı gerekir. Her IP için dakikada 120 POST, aynı anda 2 düzenleme ve 3 belge ayrıştırma sınırı vardır.

## PDF ve Word yükleme

- Biçimler: metin içeren PDF, DOCX, TXT, MD. Eski `.doc` için Word'de `.docx` olarak kaydedin. Makrolu Word, RTF, ODT desteklenmez.
- Sınırlar: dosya **50 MB**, PDF **800 sayfa**, çıkarılan metin **2.000.000 karakter**. Aşılırsa dosya reddedilir, sessizce kesilmez. Bölümleme yoktur.
- Taranmış/görüntü PDF için OCR yoktur; seçilebilir metin yoksa OCR gerektiği söylenir, boş sayfalar uyarı olarak listelenir. Şifreli PDF için parolasız kopya gerekir.
- Görseller ve sayfa tasarımı aktarılmaz; PDF sütun/tablo okuma sırası farklı olabilir. Sekme hizalı kapak ve form satırları dönüştürme sırasında korunur.
- Ayrıştırma worker thread içinde zaman/bellek sınırıyla çalışır; DOCX arşivinin açılmış boyutu 50 MB ve 2048 öğe ile sınırlıdır. PDF JavaScript'i çalıştırılmaz.

## Dağıtım

Varsayılan yalnızca `127.0.0.1` dinler. Ağa açmak için `HOST=0.0.0.0` ve güçlü bir `APP_PASSWORD` gerekir; internete açarken HTTPS sonlandıran ters vekil kullanın.

```sh
docker build -t prosebeacon .
docker run --rm -p 127.0.0.1:3210:3210 --env-file .env prosebeacon
```

Docker ağa bind ettiği için `.env` içinde `APP_PASSWORD` zorunludur; konteyner içi `127.0.0.1` host Ollama'ya ulaşmaz (`OLLAMA_URL=http://host.docker.internal:11434`).

## Araştırma ve sonraki sürüm

[Mimari ve değerlendirme planı](docs/RESEARCH.md) ile [ürün araştırması](docs/PRODUCT-RESEARCH.md) motor formüllerini, bilinen sınırları ve kalibrasyon gereksinimlerini açıklar. Yapay zekâ metni "insan yazısıdır" garantisiyle yeniden etiketlenmez; düzenleme dedektör puanını düşürmek üzere optimize edilmez.

Kaynaklar: [Liang ve diğerleri, GPT detectors are biased against non-native English writers](https://arxiv.org/abs/2304.02819), [Crossref REST API](https://api.crossref.org), [OpenAlex API](https://api.openalex.org), [Resmî Yazışma Yönetmeliği](https://www.resmigazete.gov.tr/eskiler/2020/06/20200610-4.htm), [TDK Yazım Kuralları](https://tdk.gov.tr/icerik/yazim-kurallari/), [APA Style](https://apastyle.apa.org/).

MIT lisansı.
