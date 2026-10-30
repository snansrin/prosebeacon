# Leksivoraq

**Metnin izini sür. Kendi sesini bul.**

Türkçe ve İngilizce metinlerde cümle düzeyinde açıklanabilir üslup sinyalleri; anlamı korumaya odaklanan doğal, teknik, akademik ve havacılık üslubunda yapay zekâ destekli düzenleme.

> Bu sürümün analiz motoru bir **üslup sezgiseli**dir. Eğitilmiş veya kalibre edilmiş bir yapay zekâ dedektörü değildir. 0–100 endeksi yapay zekâ yazarlığı olasılığı ya da “metnin yüzde kaçı AI” ölçümü değildir. Ürün bu ayrımı arayüzde açıkça belirtir. Doğruluk yüzdesi iddia edilmez.

## Başlat

Node.js **22+** gereklidir. Harici npm bağımlılığı ve kurulum adımı yoktur.

```sh
git clone https://github.com/snansrin/leksivoraq.git
cd leksivoraq
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
- UTF-8 TXT içe aktarma, mobil düzen, klavye odağı ve durum mesajları.
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

İstek gövdesi JSON olmalıdır. Parola ayarlıysa `X-App-Password` başlığı gerekir. Parola uygulamanın Kurulum bölümünde girilir ve sadece sayfanın belleğinde tutulur. Her IP için dakikada 30 POST, aynı anda 2 düzenleme sınırı vardır. Tek sunuculu basit korumadır; dağıtık kota değildir.

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
