# ProseBeacon 0.2 doğrulama kaydı

30 Ekim 2026, Windows üzerinde yerel doğrulama. Kullanılan metinler sentetik deneme girdileridir; doğruluk veya insan/makine ayrımı benchmark'ı değildir.

- JavaScript sözdizimi kontrolü ve 53 otomatik test geçti. HTTP erişim/parola/kota, belge ayrıştırma sınırları, Unicode konumları, model protokolü, kaynak eşleşmesi, profil kayıtları ve dışa aktarma kapsandı.
- Üretim bağımlılıklarında `npm audit --omit=dev`: bilinen açık bulunmadı. Bu sonuç gelecekteki güvenlik durumunu garanti etmez.
- Qwen3:8b ile gerçek editoryal inceleme tarayıcıda tamamlandı. Türkçe girdide İngilizce sınıflandırıcı açıkça kapsam dışı kaldı.
- Gerçek yazım düzeltmesi, iki eksik cümle sınırını/noktalamasını ve küçük harfle başlayan cümleyi düzeltti; 12 pilot, 110.30 MHz ve [2] atfını korudu. Bu tek örnek genel anlam koruma garantisi değildir.
- Desklib safetensors dosyasının SHA-256 değeri doğrulandı. Gerçek İngilizce çıkarımı çalıştı. 4.170 karakterlik başka bir deneme iki token penceresinde işlendi; ilk konum 0, son konum 4.170 olarak doğrulandı. Model kalibrasyonu yapılmadı.
- Tarayıcıda 72 kelimelik deneme, eklenen bir kaynakla karşılaştırıldı: 16 eşleşen kelime ve %22,2 kaynak benzerliği gösterildi. Bu, internet genelinde intihal ölçümü değildir.
- Wikipedia ve Crossref gerçek internet çağrıları yanıt verdi. Arayüzde Wikipedia sonuçları aday kaynaklar ve özet eşleşmeleri olarak gösterildi. Genel web Brave/SearXNG adaptörleri kontrollü yanıtlarla test edildi; canlı genel web sağlayıcısı bu bilgisayarda yapılandırılmadı.
- Word belgesi tarayıcıdan başarıyla indirildi. DOCX ve PDF çıktıları yeniden okunarak Türkçe karakterler, sayılar, atıf ve çok sayfalı PDF'nin son paragrafı doğrulandı. Kaynak belgenin sayfa düzeni/görsellerini koruma kapsamda değildir.
- Tarayıcı hata/uyarı günlüğü kontrolde boştu. Docker ve OCR doğrulanmadı; OCR bu sürümde yoktur.

Türkçe için eğitilmiş dedektör doğruluğu, modelin kendi kendine ağırlık eğitimi, Turnitin veri tabanı erişimi veya bütün internet kapsamı iddia edilmez. Kişisel hafıza, onaylı örnekleri sonraki düzenleme bağlamına taşır.
