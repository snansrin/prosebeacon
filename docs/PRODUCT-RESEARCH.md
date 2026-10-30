# ProseBeacon: ürün araştırması ve kapsam — 30 Ekim 2026

## İncelenen birincil kaynaklar

TextGuard'ın erişilebilen [algılama sayfası](https://textguard.ai/detection), metin yapıştırma/dosya yükleme ve anlamı korumaya yönelik yeniden yazımı birlikte sunuyor. Pazarlama ifadeleri, bu oturumda bağımsız olarak ölçülmüş doğruluk sonucu olarak kullanılmadı.

Turnitin'in [YZ raporu kılavuzu](https://guides.turnitin.com/hc/en-us/articles/22774058814093-Using-the-AI-Writing-Report), YZ göstergesini benzerlik puanından ayrı ele alıyor; hatalı sınıflandırma olasılığını ve insan incelemesi ihtiyacını açıklıyor. Güncel sayfada dil ve uzunluk koşulları ayrıca belirtiliyor. ProseBeacon'ın sınırları bu ticari ürünün sınırlarıyla aynı değildir.

[Turnitin'in benzerlik açıklaması](https://helpcenter.turnitin.com/hc/en-us/articles/27811925295501-Does-Turnitin-check-for-plagiarism-and-what-is-a-good-Similarity-score), eşleşme bulmanın intihal kararı olmadığını ve sonuçların kullanılan veri tabanının kapsamına bağlı olduğunu açıklıyor. ProseBeacon, Turnitin'in öğrenci havuzuna, arşivine veya lisanslı yayınlarına erişmez.

[Desklib model kartı](https://huggingface.co/desklib/ai-text-detector-v1.01), MIT lisanslı İngilizce sınıflandırıcıyı, DeBERTa-v3-large tabanını, maske ağırlıklı ortalama havuzlamayı ve tek logitli başlığı tanımlıyor. Belirtilen performans iddiaları bu projeye ait doğruluk ölçümü değildir. Modelin belgelenmiş dil kapsamı İngilizcedir; Türkçeye genişletilmez.

## Uygulanan ayrımlar

| İşlev | Uygulama | Sonucun anlamı |
| --- | --- | --- |
| Hızlı üslup kontrolü | TR/EN yerel örüntüler, tekrarlar ve ritim | Kalibre edilmemiş üslup endeksi |
| Eğitilmiş YZ sınıflandırıcı | Yerel Desklib DeBERTa modeli; CPU, safetensors | İngilizce model skoru; yazarlık kanıtı değil |
| Derin editoryal inceleme | Seçili dil modeli, cümle kimlikleri doğrulanmış JSON | İşaretli kelime kapsamı ve gerekçeler |
| Kaynak benzerliği | Kullanıcının eklediği en fazla 10 kaynakta normalleştirilmiş kelime dizisi eşleştirme | Yalnızca belirtilen kaynaklarda örtüşen kelime payı |
| Yeniden yazma | Altı üslup, özel talimat ve içerik koruma kontrolleri | İnsan incelemesine sunulan düzenleme taslağı |
| Ücretsiz kelime sayacı | Tarayıcıda Intl.Segmenter | Sözcük, karakter, cümle, paragraf ve süre tahminleri |
| Rapor | HTML ve tarayıcıdan yazdır/PDF | Çalıştırılmış kontrollerin kapsamı ve kaynak kanıtları |

Üç farklı motorun puanları ortalanmaz. Üslup endeksi, pencere sınıflandırıcı skoru ve işaretli kelime kapsamı aynı ölçüm değildir. Hiçbiri Turnitin veya TextGuard'ın o metne vereceği puanı tahmin ettiğini iddia etmez. Bu ürünlerle ticari bağlantı veya entegrasyon yoktur.

## Algoritma ve sınırlar

Benzerlik motoru noktalama dışındaki Unicode kelimeleri konumlarıyla çıkarır; NFKC ve seçilen dilin küçük harf dönüşümünü uygular. Kullanıcı 5, 8 veya 12 kelimelik en kısa eşleşme seçer. Aynı kelimeler birden fazla kaynakta bulunsa da genel payda bir kez sayılır. İstenirse çift tırnaklı alıntılar ve tanınan kaynakça başlığından sonraki bölüm pay/payda dışında bırakılır. Yakın atıf örüntüsü etiketi yalnızca inceleme yardımıdır. Semantik intihal, çeviri intihali veya tüm internet kapsamı iddiası yoktur. Çok tekrarlı girdilerde işlem bütçesi ve aday sınırı vardır.

Eğitilmiş sınıflandırıcı tüm gönderilen metni örtüşmeyen, en fazla 510 içerik token'lı pencerelerde okur; sessiz token kırpması uygulanmaz. Pencere skorları token sayısıyla ağırlıklandırılır. Bu toplama politikası ProseBeacon'ın uygulama tercihidir; bir belge yazarlığı olasılığı olarak kalibre edilmemiştir. 80 kelimeden kısa metinlerde ve Türkçe girdilerde sayısal model skoru üretilmez. Yerel uygulama kendi veri dağılımında etiketli bir değerlendirmeden geçirilmedi.

Dil modeli incelemesi tek seferde en fazla 64 cümle alır. Her cümle kimliği tam bir kez dönmelidir; eksik, tekrarlı veya geçersiz kayıtlar hata sayılır. Model gerekçeleri faydalı olabilir ama gerçek kökeni doğrulamaz. Kaynak metnin içine yazılmış talimatlar güvenilir komut kabul edilmez; bu istem kuralı tek başına biçimsel bir güvenlik garantisi değildir.

## Gelecek değerlendirme için kabul ölçütleri

Türkçe ve İngilizce için lisanslı/kökeni belgeli insan, makine ve karışık düzenleme verisi gerekir. Yazar, kaynak belge, konu ve üretici model ailesi eğitim/test arasında ayrılmalıdır. Yanlış pozitif oranı, PR-AUC, Brier skoru ve güvenilirlik grafikleri dil, alan ve uzunluk kırılımlarında raporlanmalıdır. Cümle vurgusu ayrıca cümle düzeyinde etiketlerle değerlendirilmelidir. Yazılım testlerinin geçmesi bu model kalite ölçümlerinin yerine geçmez.

## Belge üretimi ve kaynak araması

Word üretimi için [docx Packer](https://docx.js.org/api/classes/index.Packer.html), PDF için [PDFKit metin/font API'si](https://pdfkit.org/docs/text.html) kullanılır. Noto Sans, Türkçe karakterleri PDF içinde taşır. Kullanıcı metninden yeni belge oluşturulur; özgün belge düzenini koruyan bir Office editörü değildir.

[MediaWiki Search API](https://www.mediawiki.org/wiki/API:Search) ücretsiz Wikipedia özet araması, [Crossref REST API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/) akademik metadata adayları için kullanılır. Genel web için [Brave Web Search](https://api-dashboard.search.brave.com/app/documentation/web-search/get-started) veya kullanıcının kurduğu [SearXNG JSON API](https://docs.searxng.org/dev/search_api.html) yapılandırılabilir. Arama metni dış sağlayıcıya gider; arayüzde açık aktarım seçimi gerekir. Özet eşleşmesi tam sayfa doğrulaması değildir. Yalnızca kaynak/metadata referans taslağı verilir; modelin uydurduğu DOI veya yazar listeye eklenmez.

Kişiselleştirme, kullanıcı onaylı düzeltmelerin sürümlenmiş yerel hafızasına dayanır. İlgili örnekler düzenleme bağlamına alınır; model ağırlıkları otomatik güncellenmez. Kendi veri kümesinde doğrulanmış, dağıtıma uygun ağırlık eğitimi ayrı bir araştırma/değerlendirme işi olarak kalır.
