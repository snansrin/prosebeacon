# Leksivoraq

**Metnin izini sür. Kendi sesini bul.**

Türkçe ve İngilizce metinlerde cümle düzeyinde açıklanabilir üslup sinyalleri; anlamı korumaya odaklanan doğal, teknik, akademik ve havacılık üslubunda yapay zekâ destekli düzenleme.

> Bu sürümün analiz motoru bir **üslup sezgiseli**dir. Eğitilmiş veya kalibre edilmiş bir yapay zekâ dedektörü değildir. 0–100 endeksi yapay zekâ yazarlığı olasılığı ya da “metnin yüzde kaçı AI” ölçümü değildir. Ürün bu ayrımı arayüzde açıkça belirtir. Doğruluk yüzdesi iddia edilmez.

## Başlat

Node.js **22.13+** gereklidir. PDF ve Word ayrıştırıcılarını kilit dosyasıyla kur:

```sh
git clone https://github.com/snansrin/leksivoraq.git
cd leksivoraq
npm ci
npm start
```

[Yerel uygulama](http://127.0.0.1:3210) adresini aç. Analiz hemen çalışır. Metinler diske veya tarayıcı depolamasına kaydedilmez; sayfa yenilenince silinir. İndirilen rapor kaynak metni içerir.

## Yeniden yazma motoru

`.env.example` dosyasını `.env` olarak kopyala. PowerShell: `Copy-Item .env.example .env`. macOS/Linux: `cp .env.example .env`.

### Ollama / yerel

Ollama'yı resmi kaynağından kur, başlat ve bilgisayarına uygun çok dilli bir model indir. Örnek: `ollama pull qwen3:8b`. 8B modellerin RAM/VRAM gereksinimlerini kontrol et; daha küçük bir model de seçebilirsin.

```dotenv
AI_PROVIDER=ollama
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:8b
```

Sunucuyu yeniden başlat. Ollama kullanıldığında metin belirtilen Ollama adresine gönderilir. Yerel adres kullanıyorsan metin bu bilgisayarda kalır. Durum göstergesi Ollama servisine erişimi ve modelin indirilmiş olduğunu kontrol eder; üretim kalitesini garanti etmez.

Taşınabilir CLI kurulumunda `.env` içine `OLLAMA_EXECUTABLE` (ollama.exe tam yolu) ve `OLLAMA_MODELS` (model klasörü tam yolu) ekleyebilirsin. `npm start` servisi gerektiğinde otomatik başlatır; yalnızca yerel HTTP adresine bağlar ve bulut özelliklerini kapatır. Zaten çalışan bir Ollama servisine dokunmaz. Uygulamanın başlattığı servis normal Ctrl+C kapanışında kapatılır. Başlatma sırasında indirme yapılmaz. Bu bilgisayardaki yollar `.env` içinde kalır, GitHub'a gönderilmez.

8 GB VRAM için tek paralel istek, tek yüklü model, Flash Attention ve q8_0 KV cache kullanılır. Yeniden yazım 32K bağlam ve 8192 çıktı token sınırıyla çalışır; yavaş donanımda yerel istek en fazla beş dakika bekler. Çok uzun metinler veya genişleyen çıktı hâlâ bu sınırları aşabilir; hata halinde metni bölerek işle. İlk istek modeli belleğe yüklediği için daha uzun sürebilir.

### OpenAI / bulut

```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=your_server_side_key
OPENAI_MODEL=your_available_text_model
```

Hesabında erişebildiğin Chat Completions destekli modelin kimliğini yaz. API kullanımı sağlayıcının ücret ve veri işleme koşullarına tabidir. Anahtar yalnızca sunucuda tutulur, tarayıcıya gönderilmez. ChatGPT aboneliği bu uygulamaya otomatik API erişimi sağlamaz. Sunucuyu yeniden başlat.

Motor yapılandırılmamışsa uygulama sahte yeniden yazım üretmez; açık bir kurulum mesajı verir. API anahtarı veya çalışan Ollama olmadan gelişmiş yeniden yazma kullanılamaz.

## Özellikler

- Cümle aralıklarını kaynak metindeki karakter konumlarıyla koruyan TR/EN bölümleme.
- Düşük, orta ve yüksek sinyal; yüksek sinyaller kırmızı. Her cümleye tıklayınca gerekçesi.
- Kalıp ifadeler, tekrarlayan başlangıçlar, sözcük tekrarı, uzunluk ve ritim ölçüleri.
- Dört üslup, serbest talimat, virgülle ayrılmış korunacak terimler.
- Yeniden yazımda eksilen sayılar, kısaltmalar, URL'ler, köşeli parantezli atıflar ve terimler için kontrol; eklenen sayılar için uyarı. Bu kontrol semantik doğrulama değildir; birimler, özel adlar ve olumsuzluklar ayrıca insan tarafından incelenmelidir.
- Orijinal ve yeni metni yan yana inceleme, kopyalama, TXT ve JSON indirme.
- PDF, Word (.docx), TXT ve Markdown (.md) yükleme veya sürükleyip bırakma; düzenlenebilir metin önizlemesi.
- 20.000 karakterden uzun belgelerde bölüm seçimi; metin sessizce kesilmez. Yalnızca seçilen bölüm mevcut editöre aktarılır.
- 20.000 karakter sınırı, aynı kaynak isteği kontrolü, API parola seçeneği, zaman aşımı ve istek sınırlama.

## Test

```sh
npm run check
npm test
```

Testler gerçek HTTP sunucusunda giriş doğrulama, erişim denetimi, statik dosya sınırı ve istek kotasını; sahte sağlayıcı ile Ollama/OpenAI protokolü, hata yanıtları ve içerik koruma kontrolünü kapsar. CI Ubuntu ve Windows'ta Node 22/24 çalıştırır. Sahte sağlayıcı testleri canlı model kalitesini doğrulamaz.

[Gerçek yerel model testi](docs/LOCAL-VALIDATION.md), kullanılan donanımı, süreleri, örnek yanıtları ve gözlenen kalite sınırlarını ayrıca kaydeder. Windows'ta `Baslat.cmd` dosyası uygulamayı proje klasöründe başlatır.

## API

| Uç nokta | İşlev |
| --- | --- |
| `GET /api/health` | Sağlayıcı yapılandırması, anahtar içermez |
| `POST /api/analyze` | `{ "text": "...", "locale": "tr" }` |
| `POST /api/rewrite` | `{ "text": "...", "style": "aviation", "instruction": "...", "glossary": "ILS, TCAS" }` |
| `POST /api/import` | Ham dosya baytları; `Content-Type: application/octet-stream`, `X-File-Name: encodeURIComponent(filename)` |

Analiz/düzenleme gövdesi JSON; içe aktarma gövdesi ham dosya baytları olmalıdır. Parola ayarlıysa tüm API'lerde `X-App-Password` başlığı gerekir. Parola uygulamanın Kurulum bölümünde girilir ve sadece sayfanın belleğinde tutulur. Her IP için dakikada 30 POST, aynı anda 2 düzenleme sınırı vardır. Tek sunuculu basit korumadır; dağıtık kota değildir.

## PDF ve Word yükleme

Dosya yükle düğmesini kullan veya kaynak metin paneline bir dosya bırak. Metin önce önizlemede açılır; düzenleyip **Metni kullan** dediğinde mevcut editöre aktarılır. Önizlemeyi iptal etmek mevcut metni ve analizini değiştirmez.

- Biçimler: metin içeren PDF, DOCX, TXT, MD. Eski `.doc` dosyasını Word içinde `.docx` olarak kaydetmek gerekir. Makrolu Word, RTF, ODT ve diğer biçimler bu sürümde desteklenmez.
- Dosya sınırı **10 MB**; PDF sınırı **150 sayfa**; çıkarılan metin sınırı **500.000 karakter**. Bu sınırlar aşılırsa dosya reddedilir, sessizce kesilmez.
- Uzun metinler en fazla **20.000 karakterlik bölümlere** ayrılır. Önizlemede aktarılacak bölümü seç; her bölüm için ayrı analiz/düzenleme yap. Diğer bölümler otomatik işlenmez.
- Taranmış/görüntü PDF için yerleşik OCR yoktur. Seçilebilir metin bulunmazsa OCR gerektiği belirtilir; bazı sayfalarda metin yoksa uyarı gösterilir. Şifreli PDF için parolasız kopya gerekir.
- Görseller, sayfa tasarımı ve Word biçimlendirmesi aktarılmaz. PDF sütunları ve tabloların okuma sırası farklı olabilir; önizlemeyi kontrol et. TXT/MD için UTF-8 veya BOM içeren UTF-16 desteklenir.
- Dosyalar sunucu belleğinde okunur; uygulama diske yazmaz ve içe aktarırken modele göndermez. Yerel kurulumda bu sunucu senin bilgisayarındır. Barındırılan kurulumda dosya uygulama sunucusuna gider. Yeniden yazmaya basıldığında yalnızca editördeki metin seçili model sağlayıcısına gönderilir.
- Ayrıştırma ayrı bir worker thread içinde zaman/bellek sınırıyla çalışır. Aynı anda en fazla iki belge ayrıştırılır. DOCX arşivinin açılmış boyutu 50 MB, öğe sayısı 2048 ile sınırlıdır. PDF JavaScript'i çalıştırılmaz; DOCX çıktısı HTML yerine düz metindir.

Testler gerçek PDF/DOCX baytları, tablolar, Türkçe karakterler, boş/taranmış PDF, bozuk dosya, arşiv sınırı, büyük dosya, zaman aşımı, iptal, bölüm bütünlüğü ve yükleme API erişim kontrollerini kapsar.

## Dağıtım

Varsayılan yalnızca `127.0.0.1` dinler. Ağa açmak için `HOST=0.0.0.0` ve güçlü bir `APP_PASSWORD` gerekir. İnternete açarken HTTPS sonlandıran bir ters vekil ve uygun erişim denetimi kullan; tarayıcı panosu HTTPS veya localhost gerektirir. Bu repo kurulabilir bir ilk sürümdür; çok kiracılı SaaS üyeliği, ödeme, merkezi veritabanı ve yük testi içermez.

```sh
docker build -t leksivoraq .
docker run --rm -p 127.0.0.1:3210:3210 --env-file .env leksivoraq
```

Docker ağa bind ettiği için `.env` içinde `APP_PASSWORD` zorunludur. Konteynerin içindeki `127.0.0.1` host Ollama'ya ulaşmaz; Docker Desktop'ta `OLLAMA_URL=http://host.docker.internal:11434` kullan ve Ollama'nın erişilebilirliğini kendi ortamında yapılandır. Docker örneği bu oturumda çalıştırılmadı.

## Araştırma ve sonraki sürüm

[Mimari ve değerlendirme planı](docs/RESEARCH.md) mevcut motorun formülünü, bilinen sınırları ve gerçek bir dedektör için veri/kalibrasyon gereksinimlerini açıklar. Yapay zekâ metni “insan yazısıdır” garantisiyle yeniden etiketlenmez; düzenleme, dedektör puanını düşürmek üzere optimize edilmez.

Kaynaklar: [Liang ve diğerleri, GPT detectors are biased against non-native English writers](https://arxiv.org/abs/2304.02819), [OpenAI Chat Completions referansı](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create).

MIT lisansı. Ad için yapılan web/GitHub uygunluk kontrolü marka tescili araştırması değildir.
