# Yerel model doğrulaması — 30 Ekim 2026

Bu bilgisayarda Ollama **0.40.13** taşınabilir CLI ve **Qwen3 8B Q4_K_M** kuruldu. Resmî Windows paketinin SHA-256 değeri yayımlanan sağlama toplamıyla karşılaştırıldı: `7afa38624fa62ee5d8293422d0ab084c1bb4603134c7f4dafce11a033b57cc19`.

Kurulum 32 GB RAM ve 8 GB VRAM'li NVIDIA RTX 4070 Laptop GPU üzerinde denendi. Yerel servis yalnızca `127.0.0.1:11434` dinler. Otomatik başlatılan serviste bulut özellikleri kapalıdır. İndirilen model ve makineye özel `.env` GitHub'a eklenmez.

## Gerçek modelle denenen akış

- Servis erişimi ve modelin indirilmiş olması `/api/health` üzerinden doğrulandı.
- Uygulamanın `/api/rewrite` uç noktasına doğal, teknik, akademik ve havacılık üsluplarında gerçek istekler gönderildi.
- Her istekte boş olmayan, kaynaktan farklı bir çıktı alındı. Bu sentetik örnekte `ILS`, `110.30`, `MHz`, `200`, `ft`, `[12]` ve `24` korundu; yeni sayı görülmedi.
- Model bellekteyken son dört istek yaklaşık **4,6–8,7 saniye** sürdü. İlk soğuk yüklemede önceki deneme yaklaşık **64 saniye** sürdü. Bunlar tek örneğe ait gözlemdir; hız garantisi veya yük testi değildir.
- Ollama süreç bilgisi GPU belleği kullanımını doğruladı. Modelin tamamının GPU'da tutulduğu iddia edilmez.
- 21 otomatik yazılım testi geçti. Yerel motor entegrasyonu GitHub Actions üzerinde Windows/Linux ve Node 22/24 kontrolünden geçti.

[Sentetik kaynak ve gerçek model yanıtları](local-smoke-test.json) inceleme için saklanır. Bu dosya kullanıcıya ait bir belge içermez.

## Sınırlar

Bu bir bağlantı ve işlev testi; kapsamlı dil kalitesi veya anlam sadakati değerlendirmesi değildir. Bazı çıktılarda ağır anlatım ve Türkçe ek uyumu sorunları gözlendi. Sayı/terim kontrolünün başarılı olması, bütün anlamın doğru kaldığını kanıtlamaz. Yayınlanacak metin insan tarafından düzenlenmelidir. Dedektör doğruluğu bu testte ölçülmedi; analiz motoru hâlâ kalibre edilmemiş yerel üslup kurallarını kullanır.

## Bu bilgisayarda yeniden başlatma

Proje klasöründeki `Baslat.cmd` dosyasını çalıştır veya `npm start` kullan. Ardından `http://127.0.0.1:3210` adresini aç. Mevcut `.env`, bu çalışma alanındaki taşınabilir Ollama ve model klasörlerine bağlıdır; bu klasörleri taşırsan yolları güncelle. Başlatma sırasında model yeniden indirilmez.
