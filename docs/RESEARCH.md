# Motor tasarımı ve değerlendirme planı

## Mevcut sistem: sürüm 0.1

Sunucu Node.js standart kütüphanesiyle HTTP ve yalnızca izin verilen üç statik dosyayı sunar. Analiz dış sağlayıcıya veri göndermez. `Intl.Segmenter` kaynak karakter aralıklarını korur. Tarayıcı sonuçları `textContent` ile işler; kullanıcı metni HTML olarak çalıştırılmaz. Harici font, analitik ve izleyici yoktur. Dış model isteği yalnızca yeniden yazma eyleminde yapılır. İçerik uygulama tarafından kalıcı kaydedilmez; bulut sağlayıcısının politikası ayrıca geçerlidir.

### Sinyal formülü

Her cümle sıfır puanla başlar. İngilizce/Türkçe kalıplaşmış geçiş/giriş eşleşmesi grup başına 28; soyut ifade grubu 18; en az dört cümlede ortalama en az sekiz sözcük ve uzunluk varyasyon katsayısı 0,2 altında ise 16; en az 12 sözcüklü cümlede benzersiz sözcük oranı 0,65 altında ise 20; ilk iki sözcük en az üç kez yinelenirse 24; en az 35 sözcük uzunluğunda ise 12 puan eklenir. Puan 100'de sınırlanır. Düşük <20, orta 20–44, yüksek ≥45. Metin endeksi sözcük sayısına göre ağırlıklı ortalamadır.

Bu ağırlıklar ve eşikler editoryal tasarım tercihidir; ampirik eğitim veya olasılık kalibrasyonu sonucu değildir. Kelime çeşitliliği Türkçe eklerinden, noktalama ve kısaltmalar cümle segmentasyonundan etkilenir. Alıntıların yazarlığı ayrı belirlenmez. Kırmızı bölüm yazarlık etiketi değildir. 80 kelimeden kısa metinler ayrıca uyarılır. 80 eşiği doğrulanmış güven eşiği değildir.

## Yeniden yazma

Kaynak, talimat ve üslup model isteminde ayrı alanlardır. Sistem talimatı anlam, sayı, terim, atıf, birim ve olumsuzluk koruması ister. Bu, istem enjeksiyonuna veya anlam kaymasına karşı kesin güvenlik sınırı değildir. Model çıktı olarak düz metin üretir. HTTP hataları, zaman aşımı, geçersiz/boş çıktı ve uzunluk nedeniyle kesilme açıkça başarısız sayılır. Çıktıdaki eksilen sayılar/kısaltmalar/atıflar ve eklenen sayılar yerel olarak karşılaştırılır. Öğe varlığı, geçtiği bağlamın veya tüm tekrarlarının korunduğunu kanıtlamaz. Özellikle havacılık içeriği insan uzman tarafından incelenmeden operasyonel kullanım için uygun sayılmaz.

## Gerçek dedektör için gerekli çalışma

1. İzinli ve kökeni belgelenmiş Türkçe/İngilizce insan metinleri; farklı model aileleri, insan+AI düzenleme ve çeviri örnekleri. Akademik, havacılık, teknik ve gündelik alanları ayrı tut. Kişisel veriyi çıkar; veri lisansını kaydet.
2. Yazar, kaynak belge, konu, zaman ve üretici model ailesi bazında ayrılmış eğitim/doğrulama/test kümeleri kur. Aynı kaynağın yeniden yazımlarını aynı bölmede tut; sentetik veri sızıntısını önle.
3. Basit n-gram taban çizgisi, çok dilli sınıflandırıcı ve istatistiksel modelleri karşılaştır. Bir LLM'nin “bence AI” cevabını gerçek etiket gibi kullanma. Token olasılığına erişmeden perplexity hesaplandığını iddia etme.
4. PR-AUC, ROC-AUC, insan metninde yanlış pozitif oranı, sabit düşük yanlış pozitif oranında duyarlılık, Brier skoru, güvenilirlik grafikleri ve bootstrap güven aralıkları raporla. Dil, alan, uzunluk ve ana dili farklı yazar grupları için ayrı sonuç göster.
5. Kalibrasyonu ayrılmış doğrulama kümesinde yap; dağılım dışı ve kısa metinlerde çekimser yanıt ver. Belge etiketlerini otomatik olarak bütün cümlelere taşımadan, cümle düzeyi köken etiketleriyle vurgu kalitesini ayrıca ölç.
6. Yeni model aileleri ve insan düzenlemesiyle kör test yap. Başarı ölçütleri önceden belirlenmeden “%99 doğru”, “tespit edilemez” veya insan yazarlığı garantisi yayınlama.

Bu çalışma yapılmadı. Repo içinde bunun yerine değerlendirilmemiş bir modelin indirilip doğruymuş gibi kullanılması tercih edilmedi. Mevcut otomatik testler yazılım davranışını ölçer; dedektör doğruluğunu ölçmez.

## Üretime giden yol

Çok kullanıcı için kimlik, kullanıcı bazlı kalıcı kota, güvenli gizli değer yönetimi, maliyet tavanı, kötüye kullanım ölçümü, yük testleri ve isteğe bağlı/silinir çalışma geçmişi gerekir. Kullanıcı metnini varsayılan olarak gözlemleme günlüklerine yazma. Model değerlendirmesinde sadakat, okuma kolaylığı, üslup uyumu ve teknik doğruluğu ayrı puanla; puan düşürmeye dayanan bir yeniden yazma döngüsü kurma.

## Kaynaklar

- [Liang et al., 2023](https://arxiv.org/abs/2304.02819): bazı dedektörlerin ana dili İngilizce olmayan yazarlar üzerindeki hata ve yeniden yazım kırılganlığı.
- [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create): uygulamanın kullandığı bulut protokolü.
- [Ollama Chat API](https://docs.ollama.com/api/chat): yerel sağlayıcının chat uç noktası.
