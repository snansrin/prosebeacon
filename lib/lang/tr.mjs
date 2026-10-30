// Türkçe dil paketi — akademik yazım, resmî yazışma ve TDK yazım kuralları.
// Kaynaklar (authorities) aşağıda listelenir; her kural kaynağına bağlıdır.

export const authorities = [
  {
    id: 'RG-31151',
    title: 'Resmî Yazışmalarda Uygulanacak Usul ve Esaslar Hakkında Yönetmelik',
    issuer: 'Cumhurbaşkanlığı (Karar Sayısı: 2646, 09.06.2020)',
    published: 'Resmî Gazete 10.06.2020 / 31151',
    url: 'https://www.resmigazete.gov.tr/eskiler/2020/06/20200610-4.htm'
  },
  {
    id: 'TDK-YK',
    title: 'Türk Dil Kurumu Yazım Kılavuzu ve Türkçe Sözlük (güncel yayım)',
    issuer: 'Türk Dil Kurumu',
    url: 'https://tdk.gov.tr/icerik/yazim-kurallari/'
  },
  {
    id: 'TDK-NOK',
    title: 'TDK Noktalama İşaretleri (kesme işareti, tırnak, virgül, nokta kullanımı)',
    issuer: 'Türk Dil Kurumu',
    url: 'https://tdk.gov.tr/icerik/noktalama-isaretleri/'
  },
  {
    id: 'MEVZUAT-HAZIRLAMA',
    title: 'Mevzuat Hazırlama Usul ve Esasları Hakkında Yönetmelik (2005/9986)',
    issuer: 'Başbakanlık / Cumhurbaşkanlığı',
    url: 'https://www.mevzuat.gov.tr/'
  },
  {
    id: 'YOK-TEZ',
    title: 'YÖK Tez Yazım Kılavuzları ve üniversite enstitü tez yazım kuralları (APA 7 Türkiye uygulaması)',
    issuer: 'Yükseköğretim Kurulu / Üniversite Enstitüleri',
    url: 'https://www.yok.gov.tr/'
  },
  {
    id: 'APA7-TR',
    title: 'APA 7 sürümünün Türkçe uyarlaması: "vd." kısaltması, (Yazar, Yıl) deseni, DOI biçimi',
    issuer: 'American Psychological Association / Türkiye uygulaması',
    url: 'https://apastyle.apa.org/'
  }
];

// MADDE 16/8: "Belge, Türk Dil Kurumu tarafından hazırlanan Yazım Kılavuzu ve
// Türkçe Sözlük'ün güncel yayımı esas alınarak ... yazılır."
// Aşağıdaki kurallar bu hükme dayanır.

const A = { RG: 'RG-31151', TDK: 'TDK-YK', NOK: 'TDK-NOK', AKA: 'YOK-TEZ', APA: 'APA7-TR', MEV: 'MEVZUAT-HAZIRLAMA' };

// Yüksek güvenli, otomatik düzeltilebilir kurallar. `fix` null dönerse yalnızca uyarı verilir.
export const rules = [
  // ── Yazım (TDK) ──────────────────────────────────────────────────────────
  { id: 'TDK-001', category: 'yazım', severity: 'error', authority: A.TDK, autoFix: true, register: 'all',
    title: 'Ayrı yazılan birleşik kelimeler',
    patterns: [
      [/(?<![\p{L}\p{N}_])herşey(?![\p{L}\p{N}_])/giu, 'her şey'], [/(?<![\p{L}\p{N}_])birşey(?![\p{L}\p{N}_])/giu, 'bir şey'], [/(?<![\p{L}\p{N}_])hiçbirşey(?![\p{L}\p{N}_])/giu, 'hiçbir şey'],
      [/(?<![\p{L}\p{N}_])herhangi birşey(?![\p{L}\p{N}_])/giu, 'herhangi bir şey'], [/(?<![\p{L}\p{N}_])yanyana(?![\p{L}\p{N}_])/giu, 'yan yana'], [/(?<![\p{L}\p{N}_])birbiri(?![\p{L}\p{N}_])/giu, 'birbiri'],
      [/(?<![\p{L}\p{N}_])ozaman(?![\p{L}\p{N}_])/giu, 'o zaman'], [/(?<![\p{L}\p{N}_])buarada(?![\p{L}\p{N}_])/giu, 'bu arada'],
      [/(?<![\p{L}\p{N}_])şuan(?![\p{L}\p{N}_])/giu, 'şu an'], [/(?<![\p{L}\p{N}_])şimdiye kadar(?![\p{L}\p{N}_])/giu, 'şimdiye kadar'], [/(?<![\p{L}\p{N}_])birazcık(?![\p{L}\p{N}_])/giu, 'biraz'],
      [/(?<![\p{L}\p{N}_])başyapıt(?![\p{L}\p{N}_])/giu, 'başyapıt'], [/(?<![\p{L}\p{N}_])yalnış(?![\p{L}\p{N}_])/giu, 'yanlış'], [/(?<![\p{L}\p{N}_])yanlız(?![\p{L}\p{N}_])/giu, 'yalnız'],
      [/(?<![\p{L}\p{N}_])herkez(?![\p{L}\p{N}_])/giu, 'herkes'], [/(?<![\p{L}\p{N}_])şöför(?![\p{L}\p{N}_])/giu, 'şoför'], [/(?<![\p{L}\p{N}_])orjinal(?![\p{L}\p{N}_])/giu, 'orijinal'],
      [/(?<![\p{L}\p{N}_])entellektüel(?![\p{L}\p{N}_])/giu, 'entelektüel'], [/(?<![\p{L}\p{N}_])ünvan(?![\p{L}\p{N}_])/giu, 'unvan'], [/(?<![\p{L}\p{N}_])makina(?![\p{L}\p{N}_])/giu, 'makine'],
      [/(?<![\p{L}\p{N}_])döküman(?![\p{L}\p{N}_])/giu, 'doküman'], [/(?<![\p{L}\p{N}_])proffesör(?![\p{L}\p{N}_])/giu, 'profesör'], [/(?<![\p{L}\p{N}_])materyel(?![\p{L}\p{N}_])/giu, 'materyal'],
      [/(?<![\p{L}\p{N}_])sarmısak(?![\p{L}\p{N}_])/giu, 'sarımsak'], [/(?<![\p{L}\p{N}_])maydanozgiller(?![\p{L}\p{N}_])/giu, 'maydanozgiller'],
      [/(?<![\p{L}\p{N}_])organızasyon(?![\p{L}\p{N}_])/giu, 'organizasyon'], [/(?<![\p{L}\p{N}_])parsiyel(?![\p{L}\p{N}_])/giu, 'parsiyel'],
      [/(?<![\p{L}\p{N}_])herhangibir(?![\p{L}\p{N}_])/giu, 'herhangi bir'], [/(?<![\p{L}\p{N}_])birkaçı(?![\p{L}\p{N}_])/giu, 'birkaçı'], [/(?<![\p{L}\p{N}_])şeyden(?![\p{L}\p{N}_])/giu, 'şeyden'],
      [/(?<![\p{L}\p{N}_])kaynakca(?![\p{L}\p{N}_])/giu, 'kaynakça'], [/(?<![\p{L}\p{N}_])iliskin(?![\p{L}\p{N}_])/giu, 'ilişkin'],
      [/(?<![\p{L}\p{N}_])mekan(?![\p{L}\p{N}_])/giu, 'mekân'], [/(?<![\p{L}\p{N}_])kainat(?![\p{L}\p{N}_])/giu, 'kâinat'],
      [/(?<![\p{L}\p{N}_])halen(?![\p{L}\p{N}_])/giu, 'halen'],
      [/(?<![\p{L}\p{N}_])varolan(?![\p{L}\p{N}_])/giu, 'var olan'], [/(?<![\p{L}\p{N}_])sözkonusu(?![\p{L}\p{N}_])/giu, 'söz konusu'], [/(?<![\p{L}\p{N}_])önkoşul(?![\p{L}\p{N}_])/giu, 'ön koşul'],
      [/(?<![\p{L}\p{N}_])işbirliği(?![\p{L}\p{N}_])/giu, 'iş birliği'], [/(?<![\p{L}\p{N}_])İşbirliği(?![\p{L}\p{N}_])/giu, 'İş birliği'], [/(?<![\p{L}\p{N}_])yeralan(?![\p{L}\p{N}_])/giu, 'yer alan'],
      [/(?<![\p{L}\p{N}_])gerçekleştirmektedir(?![\p{L}\p{N}_])/giu, 'gerçekleştirmektedir']
    ] },
  { id: 'TDK-002', category: 'yazım', severity: 'error', authority: A.TDK, autoFix: true, register: 'all',
    title: '"de/da" bağlacı ayrı, bulunma hâl eki bitişik yazılır',
    patterns: [
      [/(?<![\p{L}\p{N}_])öyleki(?![\p{L}\p{N}_])/giu, 'öyle ki'], [/(?<![\p{L}\p{N}_])böyleki(?![\p{L}\p{N}_])/giu, 'böyle ki'], [/(?<![\p{L}\p{N}_])şöyleki(?![\p{L}\p{N}_])/giu, 'şöyle ki'],
      [/(?<![\p{L}\p{N}_])nasılki(?![\p{L}\p{N}_])/giu, 'nasıl ki'], [/(?<![\p{L}\p{N}_])mademki(?![\p{L}\p{N}_])/giu, 'madem ki'], [/(?<![\p{L}\p{N}_])halbuki(?![\p{L}\p{N}_])/giu, 'halbuki'],
      [/(?<![\p{L}\p{N}_])ya da da(?![\p{L}\p{N}_])/giu, 'ya da'], [/(?<![\p{L}\p{N}_])de de(?![\p{L}\p{N}_])/giu, 'de']
    ] },
  { id: 'TDK-003', category: 'yazım', severity: 'error', authority: A.NOK, autoFix: true, register: 'all',
    title: 'Özel ada ve sayıya gelen ek kesme işaretiyle ayrılır',
    // Yalnızca yüksek güvenli biçimler: büyük harfle başlayan özel ad + hâl eki, ve yıl + ek.
    patterns: [
      [/(?<![\p{L}\p{N}_])(Türkiye|Ankara|İstanbul|İzmir|Bursa|Antalya|Adana|Konya|Gaziantep|Trabzon|Samsun|Dikmen|Göksu|Yenimahalle|Çankaya|Keçiören)(da|de|ta|te|dan|den|nın|nin|nun|nün|ya|ye|yı|yi|yu|yü|nda|nde)(?![\p{L}\p{N}_])/gu,
        (_, base, suffix) => `${base}'${suffix}`],
      [/(?<![\p{L}\p{N}_])(19\d{2}|20\d{2})(da|de|ta|te|dan|den|nın|nin|nun|nün|ya|ye|yı|yi|yu|yü|nda|nde|ncı|nci|nu|nü)(?![\p{L}\p{N}_])/gu,
        (_, year, suffix) => `${year}'${suffix}`],
      [/(?<![\p{L}\p{N}_])(TBMM|TDK|YÖK|TÜBİTAK|ÇŞB|OGM|DSİ|THY|TC|ABD|AB|NATO|NDVI|LAI|InVEST)(da|de|ta|te|dan|den|nın|nin|nun|nün|ya|ye|yı|yi|yu|yü|nda|nde)(?![\p{L}\p{N}_])/gu,
        (_, base, suffix) => `${base}'${suffix}`]
    ] },
  { id: 'TDK-004', category: 'yazım', severity: 'error', authority: A.TDK, autoFix: true, register: 'all',
    title: 'Soru eki "mı/mi/mu/mü" ayrı yazılır',
    patterns: [
      [/(?<![\p{L}\p{N}_])([\p{L}]{2,}(?:yor|dı|di|du|dü|muş|miş|muş|ecek|acak|meli|malı|ken|sa|se|ız|iz|sınız|siniz|nız|niz|r|ar|er))(m[ıiuü])(?![\p{L}\p{N}_])/gu,
        (_, verb, particle) => `${verb} ${particle}`],
      [/(?<![\p{L}\p{N}_])(var|yok|doğru|güzel|iyi|kötü|kolay|zor|tamam|hazır|bitti|oldu|geldi|gitti|yaptı|dedi)(m[ıiuü])(?![\p{L}\p{N}_])/gu,
        (_, base, particle) => `${base} ${particle}`]
    ] },
  { id: 'TDK-005', category: 'yazım', severity: 'error', authority: A.TDK, autoFix: true, register: 'all',
    title: 'Konuşma dili kısaltmaları yazı dilinde kullanılmaz',
    patterns: [
      [/(?<![\p{L}\p{N}_])gidicek(?![\p{L}\p{N}_])/giu, 'gidecek'], [/(?<![\p{L}\p{N}_])yapıcak(?![\p{L}\p{N}_])/giu, 'yapacak'], [/(?<![\p{L}\p{N}_])alıcam(?![\p{L}\p{N}_])/giu, 'alacağım'],
      [/(?<![\p{L}\p{N}_])gelicek(?![\p{L}\p{N}_])/giu, 'gelecek'], [/(?<![\p{L}\p{N}_])olucak(?![\p{L}\p{N}_])/giu, 'olacak'], [/(?<![\p{L}\p{N}_])vericez(?![\p{L}\p{N}_])/giu, 'vereceğiz'],
      [/(?<![\p{L}\p{N}_])geliyo(?![\p{L}\p{N}_])/giu, 'geliyor'], [/(?<![\p{L}\p{N}_])oluyo(?![\p{L}\p{N}_])/giu, 'oluyor'], [/(?<![\p{L}\p{N}_])yapıyo(?![\p{L}\p{N}_])/giu, 'yapıyor'],
      [/(?<![\p{L}\p{N}_])etmiyo(?![\p{L}\p{N}_])/giu, 'etmiyor'], [/(?<![\p{L}\p{N}_])söylüycem(?![\p{L}\p{N}_])/giu, 'söyleyeceğim'], [/(?<![\p{L}\p{N}_])napıyorsun(?![\p{L}\p{N}_])/giu, 'ne yapıyorsun'],
      [/(?<![\p{L}\p{N}_])kişi başı(?![\p{L}\p{N}_])/giu, 'kişi başına'], [/(?<![\p{L}\p{N}_])önümüzdeki günlerde(?![\p{L}\p{N}_])/giu, 'önümüzdeki günlerde'],
      [/(?<![\p{L}\p{N}_])veşaire(?![\p{L}\p{N}_])/giu, 'vesaire'], [/(?<![\p{L}\p{N}_])ilaveten(?![\p{L}\p{N}_])/giu, 'ilaveten']
    ] },
  { id: 'TDK-006', category: 'yazım', severity: 'warning', authority: A.TDK, autoFix: false, register: 'all',
    title: 'Büyük harf kullanımı: "I/İ" ve "ı/i" karışıklığı',
    patterns: [[/(?<![\p{L}\p{N}_])ISTANBUL(?![\p{L}\p{N}_])/gu, 'İSTANBUL'], [/(?<![\p{L}\p{N}_])IZMIR(?![\p{L}\p{N}_])/gu, 'İZMİR'], [/(?<![\p{L}\p{N}_])IDARE(?![\p{L}\p{N}_])/gu, 'İDARE'], [/(?<![\p{L}\p{N}_])İSTANBUL(?=[a-zçğıöşü])/gu, 'İstanbul']] },
  // ── Sayı, tarih, ölçü (Resmî Yazışma Yönetmeliği MADDE 12 ve 16) ─────────
  { id: 'RG-012', category: 'tarih', severity: 'error', authority: A.RG, autoFix: true, register: ['official', 'academic', 'thesis'],
    title: 'Tarih gün.ay.yıl biçiminde ve rakamla yazılır (MADDE 12)',
    patterns: [
      [/(?<![\p{L}\p{N}_])(20\d{2}|19\d{2})-(\d{2})-(\d{2})(?![\p{L}\p{N}_])/gu, (_, year, month, day) => `${day}.${month}.${year}`],
      [/(?<![\p{L}\p{N}_])(\d{1,2})\/(\d{1,2})\/(20\d{2}|19\d{2})(?![\p{L}\p{N}_])/gu, (_, day, month, year) => `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`]
    ] },
  { id: 'RG-016-7', category: 'sayı', severity: 'warning', authority: A.RG, autoFix: false, register: ['official', 'academic', 'thesis'],
    title: 'Dört ve daha çok haneli sayılar üçlü gruplara ayrılır, kesirler virgülle yazılır (MADDE 16/7)',
    patterns: [[/(?<![.\d:/\w])(\d{1,3}(?:,\d{3})+)(?:\.(\d+))?(?![.\d\w])/gu, null]] },
  { id: 'RG-016-11', category: 'kısaltma', severity: 'error', authority: A.RG, autoFix: false, register: 'all',
    title: 'Kısaltma ilk geçtiği yerde açık biçimiyle birlikte yazılır (MADDE 16/11)',
    patterns: [] },
  { id: 'RG-016-8', category: 'yabancı söz', severity: 'warning', authority: A.RG, autoFix: false, register: ['official'],
    title: 'Zorunlu olmayan yabancı kelime kullanılmaz; kullanıldıysa anlamı parantez içinde belirtilir (MADDE 16/8)',
    patterns: [] },
  // ── Noktalama ────────────────────────────────────────────────────────────
  { id: 'NOK-001', category: 'noktalama', severity: 'error', authority: A.NOK, autoFix: true, register: 'all',
    // Form/alignment lines ("Tez Danışmanı      : ...") keep their spacing.
    lineGuard: /[^\S\n]{3,}:/u,
    title: 'Noktalama işaretinden önce boşluk bırakılmaz, sonra bir boşluk bırakılır (MADDE 16/3)',
    patterns: [
      // Combined: removes the space before the mark and adds the missing one after it.
      [/[^\S\n]*([,;:!?])(?=[^\s\d"'”’)\]….,;:!?<>=+%\-*/\\|#^~`{])/gu, '$1 '],
      [/[^\S\n]+([,.;:!?])/gu, '$1'],
      // Noktadan sonra boşluk: bilimsel ad kısaltmalarına (Mattf., Endl., L., A.B.Jacks.) dokunulmaz.
      [/(?<!\p{Lu}\p{Ll}{0,4})\.(?=[a-zçğıöşü])/gu, '. '],
      [/(?<!\p{Lu}\p{Ll}{0,4})(?<!\p{Lu})\.(?=[A-ZÇĞİÖŞÜ])/gu, '. '],
      [/[ ]{2,4}(?=\S)/gu, ' '],
      [/,,+/gu, ','], [/;;+/gu, ';'], [/::+/gu, ':'], [/!!+/gu, '!'], [/\?\?+/gu, '?'],
      [/\(\s+/gu, '('], [/[^\S\n]+\)/gu, ')']
    ] },
  { id: 'NOK-002', category: 'noktalama', severity: 'warning', authority: A.NOK, autoFix: true, register: 'all',
    title: 'Türkçe tırnak işareti kullanılır',
    patterns: [[/"([^"\n]{1,400})"/gu, (_, inner) => `“${inner}”`]] },
  { id: 'NOK-003', category: 'noktalama', severity: 'error', authority: A.NOK, autoFix: true, register: 'all',
    title: 'Virgülden sonra büyük harfle cümle sürdürülmez; noktalı virgül tercih edilir',
    patterns: [[/,\s+(?=[A-ZÇĞİÖŞÜ][a-zçğıöşü])/gu, null]] },
  { id: 'NOK-004', category: 'noktalama', severity: 'error', authority: A.NOK, autoFix: true, register: 'all',
    title: 'Yinelenen sözcükler',
    patterns: [
      [/(?<![\p{L}\p{N}_])(ve|ile|bir|bu|o|için|daha|çok|ancak|ayrıca|sonra|the|and|of|a|to)\s+\1(?![\p{L}\p{N}_])/giu, '$1'],
      [/(?<![\p{L}\p{N}_])([\p{L}]{3,})\s+\1(?![\p{L}\p{N}_])/giu, '$1']
    ] },
  // ── Akademik üslup ───────────────────────────────────────────────────────
  { id: 'AKA-001', category: 'üslup', severity: 'warning', authority: A.AKA, autoFix: true, register: ['academic', 'thesis'],
    title: 'Akademik metinde birinci tekil şahıs ve konuşma dili kullanılmaz',
    patterns: [
      [/(?<![\p{L}\p{N}_])bence(?![\p{L}\p{N}_])/giu, 'Bu çalışmaya göre'], [/(?<![\p{L}\p{N}_])bana göre(?![\p{L}\p{N}_])/giu, 'Değerlendirildiğinde'],
      [/(?<![\p{L}\p{N}_])bizim görüşümüze göre(?![\p{L}\p{N}_])/giu, 'Değerlendirildiğinde'], [/(?<![\p{L}\p{N}_])biz yaptık(?![\p{L}\p{N}_])/giu, 'yapılmıştır'],
      [/(?<![\p{L}\p{N}_])yaptım(?![\p{L}\p{N}_])/giu, 'yapılmıştır'], [/(?<![\p{L}\p{N}_])yaptık(?![\p{L}\p{N}_])/giu, 'yapılmıştır'], [/(?<![\p{L}\p{N}_])düşünüyorum(?![\p{L}\p{N}_])/giu, 'değerlendirilmektedir'],
      [/(?<![\p{L}\p{N}_])gördüm(?![\p{L}\p{N}_])/giu, 'gözlemlenmiştir'], [/(?<![\p{L}\p{N}_])buldum(?![\p{L}\p{N}_])/giu, 'bulunmuştur'], [/(?<![\p{L}\p{N}_])sanıyorum(?![\p{L}\p{N}_])/giu, 'değerlendirilmektedir'],
      [/(?<![\p{L}\p{N}_])bildiğim kadarıyla(?![\p{L}\p{N}_])/giu, 'Literatürde'], [/(?<![\p{L}\p{N}_])(?<!her )(?<!Her )şey(?![\p{L}\p{N}_])/giu, 'unsur'], [/(?<![\p{L}\p{N}_])şeyler(?![\p{L}\p{N}_])/giu, 'unsurlar'],
[/(?<![\p{L}\p{N}_])bir sürü(?![\p{L}\p{N}_])/giu, 'çok sayıda'], [/(?<![\p{L}\p{N}_])tonla(?![\p{L}\p{N}_])/giu, 'çok sayıda'],
      [/(?<![\p{L}\p{N}_])acayip(?![\p{L}\p{N}_])/giu, 'belirgin'], [/(?<![\p{L}\p{N}_])süper(?![\p{L}\p{N}_])/giu, 'yüksek'], [/(?<![\p{L}\p{N}_])harika(?![\p{L}\p{N}_])/giu, 'dikkat çekici'],
      [/(?<![\p{L}\p{N}_])gayet(?![\p{L}\p{N}_])/giu, 'oldukça'], [/(?<![\p{L}\p{N}_])epey(?![\p{L}\p{N}_])/giu, 'önemli ölçüde'], [/(?<![\p{L}\p{N}_])bayağı(?![\p{L}\p{N}_])/giu, 'önemli ölçüde'],
      [/(?<![\p{L}\p{N}_])falan(?![\p{L}\p{N}_])/giu, 'benzeri'], [/(?<![\p{L}\p{N}_])filan(?![\p{L}\p{N}_])/giu, 'benzeri'],
      [/(?<![\p{L}\p{N}_])vesaire(?![\p{L}\p{N}_])/giu, 'vb.'], [/(?<![\p{L}\p{N}_])v.b.(?![\p{L}\p{N}_])/giu, 'vb.']
    ] },
  { id: 'AKA-002', category: 'üslup', severity: 'warning', authority: A.AKA, autoFix: false, register: ['academic', 'thesis'],
    title: 'Kesinlik iddiaları ihtiyat diliyle (hedge) yumuşatılır',
    patterns: [
      [/(?<![\p{L}\p{N}_])kesinlikle(?![\p{L}\p{N}_])/giu, null], [/(?<![\p{L}\p{N}_])kuşkusuz(?![\p{L}\p{N}_])/giu, null], [/(?<![\p{L}\p{N}_])şüphesiz(?![\p{L}\p{N}_])/giu, null],
      [/(?<![\p{L}\p{N}_])her zaman(?![\p{L}\p{N}_])/giu, null], [/(?<![\p{L}\p{N}_])asla(?![\p{L}\p{N}_])/giu, null], [/(?<![\p{L}\p{N}_])kanıtlanmıştır ki(?![\p{L}\p{N}_])/giu, null],
      [/(?<![\p{L}\p{N}_])%100(?![\p{L}\p{N}_])/giu, null], [/(?<![\p{L}\p{N}_])tamamen kanıtlamaktadır(?![\p{L}\p{N}_])/giu, null]
    ] },
  { id: 'AKA-003', category: 'atıf', severity: 'error', authority: A.APA, autoFix: true, register: ['academic', 'thesis'],
    title: 'Metin içi atıf APA 7 Türkçe biçiminde yazılır: yazar adı ile yıl arasında virgül bulunur',
    patterns: [
      [/\(([^()]{2,120}?(?:vd|ark|et al)\.?)\s+((?:19|20)\d{2}[a-z]?)\)/giu, '($1, $2)'],
      [/\(([A-ZÇĞİÖŞÜ][^();,]{2,60}?)\s+((?:19|20)\d{2}[a-z]?)\)/gu, '($1, $2)'],
      [/\(([^()]{2,120}?)\s*;\s*((?:19|20)\d{2}[a-z]?)\)/gu, '($1, $2)'],
      [/(?<![\p{L}\p{N}_])et al(?=\s|[,;)])/giu, 'et al.'],
      [/(?<![\p{L}\p{N}_])vd(?=\s+(?:19|20)\d{2})/gu, 'vd.,'],
      [/(?<![\p{L}\p{N}_])ark(?=\s+(?:19|20)\d{2})/gu, 'ark.,']
    ] },
  { id: 'AKA-004', category: 'üslup', severity: 'info', authority: A.AKA, autoFix: false, register: ['academic', 'thesis'],
    title: 'Sürekli "-ilmektedir" kullanımı metni tekdüzeleştirir',
    patterns: [[/(?<![\p{L}\p{N}_])(?:ilmektedir|ılmaktadır|ilmektedir|ilmektedir)(?![\p{L}\p{N}_])/giu, null]] },
  { id: 'AKA-005', category: 'üslup', severity: 'warning', authority: A.AKA, autoFix: true, register: ['academic', 'thesis'],
    title: 'Gereksiz söz kalabalığı (pleonasm) sadeleştirilir',
    patterns: [
      [/(?<![\p{L}\p{N}_])örneğin gibi(?![\p{L}\p{N}_])/giu, 'örneğin'], [/(?<![\p{L}\p{N}_])yaklaşık olarak civarında(?![\p{L}\p{N}_])/giu, 'yaklaşık'],
      [/(?<![\p{L}\p{N}_])karşılıklı iş birliği(?![\p{L}\p{N}_])/giu, 'iş birliği'], [/(?<![\p{L}\p{N}_])önceden planlanmış(?![\p{L}\p{N}_])/giu, 'planlanmış'],
      [/(?<![\p{L}\p{N}_])şu anda halihazırda(?![\p{L}\p{N}_])/giu, 'halihazırda'], [/(?<![\p{L}\p{N}_])hâlihazırda mevcut(?![\p{L}\p{N}_])/giu, 'mevcut'],
      [/(?<![\p{L}\p{N}_])tamamen bitmiş(?![\p{L}\p{N}_])/giu, 'tamamlanmış'], [/(?<![\p{L}\p{N}_])aşağı yukarı yaklaşık(?![\p{L}\p{N}_])/giu, 'yaklaşık'],
      [/(?<![\p{L}\p{N}_])endüstriyel sanayi(?![\p{L}\p{N}_])/giu, 'sanayi'], [/(?<![\p{L}\p{N}_])gerçek hayatta fiilen(?![\p{L}\p{N}_])/giu, 'fiilen'],
      [/(?<![\p{L}\p{N}_])kendi kişisel görüşüm(?![\p{L}\p{N}_])/giu, 'kişisel görüşüm'], [/(?<![\p{L}\p{N}_])ilk olarak öncelikle(?![\p{L}\p{N}_])/giu, 'öncelikle'],
      [/(?<![\p{L}\p{N}_])sebep olan neden(?![\p{L}\p{N}_])/giu, 'neden'], [/(?<![\p{L}\p{N}_])konusunda hakkında(?![\p{L}\p{N}_])/giu, 'hakkında'],
      [/(?<![\p{L}\p{N}_])bir arada birlikte(?![\p{L}\p{N}_])/giu, 'birlikte'], [/(?<![\p{L}\p{N}_])tekrar yeniden(?![\p{L}\p{N}_])/giu, 'yeniden'],
      [/(?<![\p{L}\p{N}_])dolayı dolayı(?![\p{L}\p{N}_])/giu, 'dolayı'], [/(?<![\p{L}\p{N}_])özellikle başta(?![\p{L}\p{N}_])/giu, 'özellikle'],
      [/(?<![\p{L}\p{N}_])en azından asgari(?![\p{L}\p{N}_])/giu, 'asgari'], [/(?<![\p{L}\p{N}_])toplam olarak bütünü(?![\p{L}\p{N}_])/giu, 'bütünü'],
      [/(?<![\p{L}\p{N}_])hususunda konusunda(?![\p{L}\p{N}_])/giu, 'konusunda'], [/(?<![\p{L}\p{N}_])belirtmek gerekir ki(?![\p{L}\p{N}_])/giu, null],
      [/(?<![\p{L}\p{N}_])şunu belirtmek gerekir ki(?![\p{L}\p{N}_])/giu, null], [/(?<![\p{L}\p{N}_])değinmek gerekirse(?![\p{L}\p{N}_])/giu, null]
    ] },
  { id: 'AKA-006', category: 'üslup', severity: 'warning', authority: A.AKA, autoFix: true, register: ['academic', 'thesis', 'official', 'business'],
    title: 'Yapay zekâ metinlerinde sık görülen kalıplaşmış ifadeler',
    patterns: [
      [/(?<![\p{L}\p{N}_])günümüz(?:ün)? (?:hızla )?değişen dünyasında(?![\p{L}\p{N}_])/giu, 'Son yıllarda'],
      [/(?<![\p{L}\p{N}_])günümüz dünyasında(?![\p{L}\p{N}_])/giu, 'Günümüzde'],
      [/(?<![\p{L}\p{N}_])günümüzün hızla gelişen(?![\p{L}\p{N}_])/giu, 'Gelişen'],
      [/(?<![\p{L}\p{N}_])dijital çağ(?:da|ın)(?![\p{L}\p{N}_])/giu, 'Günümüzde'],
      [/(?<![\p{L}\p{N}_])yadsınamaz bir gerçektir(?![\p{L}\p{N}_])/giu, 'bilinen bir durumdur'],
      [/(?<![\p{L}\p{N}_])önemli bir rol (?:oynamaktadır|oynar)(?![\p{L}\p{N}_])/giu, 'etkilidir'],
      [/(?<![\p{L}\p{N}_])kritik bir rol (?:oynamaktadır|oynar)(?![\p{L}\p{N}_])/giu, 'belirleyicidir'],
      [/(?<![\p{L}\p{N}_])kilit bir rol (?:üstlenmektedir|oynamaktadır)(?![\p{L}\p{N}_])/giu, 'belirleyicidir'],
      [/(?<![\p{L}\p{N}_])hayati (?:bir )?öneme sahiptir(?![\p{L}\p{N}_])/giu, 'önemlidir'],
      [/(?<![\p{L}\p{N}_])büyük önem (?:taşımaktadır|arz etmektedir)(?![\p{L}\p{N}_])/giu, 'önemlidir'],
      [/(?<![\p{L}\p{N}_])önem arz etmektedir(?![\p{L}\p{N}_])/giu, 'önemlidir'],
      [/(?<![\p{L}\p{N}_])kapsamlı bir şekilde(?![\p{L}\p{N}_])/giu, 'ayrıntılı biçimde'],
      [/(?<![\p{L}\p{N}_])çeşitli açılardan(?![\p{L}\p{N}_])/giu, 'farklı yönlerden'],
      [/(?<![\p{L}\p{N}_])her geçen gün artan(?![\p{L}\p{N}_])/giu, 'artan'],
      [/(?<![\p{L}\p{N}_])giderek artan bir şekilde(?![\p{L}\p{N}_])/giu, 'giderek artan'],
      [/(?<![\p{L}\p{N}_])bu bağlamda(?![\p{L}\p{N}_])/giu, 'Bu çerçevede'],
      [/(?<![\p{L}\p{N}_])bu doğrultuda(?![\p{L}\p{N}_])/giu, 'Bu yönde'],
      [/(?<![\p{L}\p{N}_])göz önünde bulundurulduğunda(?![\p{L}\p{N}_])/giu, 'dikkate alındığında'],
      [/(?<![\p{L}\p{N}_])göz önüne alındığında(?![\p{L}\p{N}_])/giu, 'dikkate alındığında'],
      [/(?<![\p{L}\p{N}_])ışık tutmaktadır(?![\p{L}\p{N}_])/giu, 'katkı sunmaktadır'],
      [/(?<![\p{L}\p{N}_])mercek altına (?:almak|almaktadır)(?![\p{L}\p{N}_])/giu, 'incelemektedir'],
      [/(?<![\p{L}\p{N}_])zengin bir mozaik(?![\p{L}\p{N}_])/giu, 'çeşitlilik'],
      [/(?<![\p{L}\p{N}_])eşsiz bir deneyim(?![\p{L}\p{N}_])/giu, 'özgün bir deneyim'],
      [/(?<![\p{L}\p{N}_])çığır açan(?![\p{L}\p{N}_])/giu, 'önemli'],
      [/(?<![\p{L}\p{N}_])ezber bozan(?![\p{L}\p{N}_])/giu, 'yeni'],
      [/(?<![\p{L}\p{N}_])paradigma değişimi(?![\p{L}\p{N}_])/giu, 'yaklaşım değişikliği'],
      [/(?<![\p{L}\p{N}_])dikkat çekmektedir(?![\p{L}\p{N}_])/giu, 'görülmektedir'],
      [/(?<![\p{L}\p{N}_])öne çıkmaktadır(?![\p{L}\p{N}_])/giu, 'belirginleşmektedir'],
      [/(?<![\p{L}\p{N}_])üzerinde durulması gerekmektedir(?![\p{L}\p{N}_])/giu, 'önemlidir'],
      [/(?<![\p{L}\p{N}_])değerlendirilmesi gerekmek(?![\p{L}\p{N}_])/giu, 'değerlendirilmesi uygundur'],
      [/(?<![\p{L}\p{N}_])şüphe götürmez(?![\p{L}\p{N}_])/giu, 'açıktır'],
      [/(?<![\p{L}\p{N}_])sonuç olarak(?:,)?(?![\p{L}\p{N}_])/giu, 'Sonuç olarak'],
      [/(?<![\p{L}\p{N}_])netice itibarıyla(?![\p{L}\p{N}_])/giu, 'Sonuç olarak'],
      [/(?<![\p{L}\p{N}_])hayatımızın vazgeçilmez bir parçası(?![\p{L}\p{N}_])/giu, 'yaygın bir uygulama']
    ] },
  // ── Resmî yazışma (MADDE 10–24) ────────────────────────────────────────
  { id: 'RG-010', category: 'resmî', severity: 'error', authority: A.RG, autoFix: false, register: ['official'],
    title: 'Başlık: "T.C." / idare adı büyük harf / birim adı ilk harfleri büyük (MADDE 10)',
    patterns: [[/^\s*T\.?C\.?\s*$/gimu, 'T.C.']] },
  { id: 'RG-011', category: 'resmî', severity: 'error', authority: A.RG, autoFix: false, register: ['official'],
    title: 'Sayı yan başlığı "Sayı:" biçiminde ve E/Z/O + teşkilat numarası + dosya planı + kayıt numarası içerir (MADDE 11)',
    patterns: [[/(?<![\p{L}\p{N}_])(?:Say[iı]|SAYI)\s*:/gu, 'Sayı:']] },
  { id: 'RG-013', category: 'resmî', severity: 'warning', authority: A.RG, autoFix: false, register: ['official'],
    title: 'Konu satırı kelimelerin baş harfleri büyük, sonuna noktalama işareti konmadan yazılır (MADDE 13)',
    patterns: [] },
  { id: 'RG-014', category: 'resmî', severity: 'warning', authority: A.RG, autoFix: false, register: ['official'],
    title: 'Muhatap büyük harflerle ve yönelme hâl ekiyle yazılır; gerçek kişide "Sayın Ad SOYAD" kullanılır (MADDE 14)',
    patterns: [[/(?<![\p{L}\p{N}_])DAĞITIM YERLERINE(?![\p{L}\p{N}_])/gu, 'DAĞITIM YERLERİNE'], [/(?<![\p{L}\p{N}_])CUMHURBAŞKANI YARDIMCISINA(?![\p{L}\p{N}_])/gu, 'CUMHURBAŞKANI YARDIMCISINA']] },
  { id: 'RG-015', category: 'resmî', severity: 'error', authority: A.RG, autoFix: true, register: ['official'],
    title: 'İlgi "… tarihli ve … sayılı …" biçiminde yazılır ve sonuna nokta konur (MADDE 15)',
    patterns: [
      [/(?<![\p{L}\p{N}_])İlgi\s*:\s*/gu, 'İlgi: '],
      [/(?<![\p{L}\p{N}_])((?:19|20)\d{2})\s*tarih(?:li)?\s+(\d+)\s*sa(?:yı|yılı)(?![\p{L}\p{N}_])/giu, '$1 tarihli ve $2 sayılı']
    ] },
  { id: 'RG-016-12', category: 'resmî', severity: 'error', authority: A.RG, autoFix: false, register: ['official'],
    title: 'Kapanış: alt makama "… rica ederim.", üst/aynı düzey makama "… arz ederim.", dağıtımlı yazıda "… arz ve rica ederim." (MADDE 16/12)',
    patterns: [
      [/(?<![\p{L}\p{N}_])Bilgilerinizi rica ederim(?![\p{L}\p{N}_])/giu, 'Bilgilerinizi rica ederim.'],
      [/(?<![\p{L}\p{N}_])Gereğini rica ederim(?![\p{L}\p{N}_])/giu, 'Gereğini rica ederim.'],
      [/(?<![\p{L}\p{N}_])Gereğini arz ederim(?![\p{L}\p{N}_])/giu, 'Gereğini arz ederim.']
    ] },
  { id: 'RG-017', category: 'resmî', severity: 'warning', authority: A.RG, autoFix: false, register: ['official'],
    title: 'İmza bölümü: ad ilk harfi büyük, SOYAD büyük harf, unvan alt satırda (MADDE 17)',
    patterns: [] },
  { id: 'RG-018', category: 'resmî', severity: 'warning', authority: A.RG, autoFix: false, register: ['official'],
    title: 'Ek bölümü "Ek:" başlığıyla imzadan sonra yazılır; birden çok ek numaralandırılır (MADDE 18)',
    patterns: [[/(?<![\p{L}\p{N}_])Ek\s*:\s*/gu, 'Ek: ']] },
  { id: 'RG-019', category: 'resmî', severity: 'warning', authority: A.RG, autoFix: false, register: ['official'],
    title: 'Dağıtım "Gereği:" ve "Bilgi:" olarak ayrılır (MADDE 19)',
    patterns: [] },
  { id: 'RG-007', category: 'resmî', severity: 'info', authority: A.RG, autoFix: false, register: ['official', 'thesis'],
    title: 'Yazı tipi ve punto: Times New Roman 12 veya Arial 11; yazı alanı üst/sol/sağ 1,5 cm (MADDE 7–8)',
    patterns: [] }
];

// Kalıp ifadeler ve ağırlıkları — YZ olasılık motoru ve üslup dönüştürme motoru kullanır.
export const aiMarkers = [
  { re: /günümüz(?:ün)? (?:hızla )?(?:değişen|gelişen) dünyasında/giu, label: 'Kalıplaşmış giriş', weight: 30 },
  { re: /günümüz dünyasında|dijital çağda|modern dünyada/giu, label: 'Genelleyici giriş', weight: 22 },
  { re: /büyük önem (?:taşımaktadır|arz etmektedir)|önem arz etmektedir/giu, label: 'Kalıplaşmış önem vurgusu', weight: 26 },
  { re: /önemli bir rol oynamak(?:ta)?dır|kritik bir rol|kilit bir rol/giu, label: 'Kalıplaşmış rol ifadesi', weight: 26 },
  { re: /yadsınamaz (?:bir gerçek|bir durumdur)|şüphe götürmez|kuşkusuzdur/giu, label: 'Dayanaksız kesinlik', weight: 24 },
  { re: /bu bağlamda|bu doğrultuda|bu çerçevede|bu minvalde/giu, label: 'Kalıplaşmış bağlaç', weight: 12 },
  { re: /bununla birlikte|buna karşın|öte yandan|diğer taraftan/giu, label: 'Kalıplaşmış karşıtlık bağlacı', weight: 10 },
  { re: /sonuç olarak|netice itibarıyla|sonuç itibarıyla/giu, label: 'Kalıplaşmış sonuç bağlacı', weight: 12 },
  { re: /kapsamlı bir şekilde|detaylı bir biçimde|derinlemesine/giu, label: 'Genel ve soyut ifade', weight: 16 },
  { re: /çeşitli açılardan|farklı boyutlarıyla|çok yönlü/giu, label: 'Genel ve soyut ifade', weight: 14 },
  { re: /göz önünde bulundur(?:ulduğunda|arak)|dikkate alındığında/giu, label: 'Kalıplaşmış çerçeve', weight: 12 },
  { re: /ışık tutmakta|mercek altına|odaklanmakta(?:dır)?/giu, label: 'Kalıplaşmış mecaz', weight: 16 },
  { re: /zengin bir mozaik|eşsiz bir deneyim|hayatımızın vazgeçilmez/giu, label: 'Kalıplaşmış mecaz', weight: 28 },
  { re: /çığır açan|ezber bozan|paradigma değişimi|devrim niteliğinde/giu, label: 'Abartılı yenilik ifadesi', weight: 24 },
  { re: /her geçen gün (?:artan|gelişen)|giderek artan bir şekilde/giu, label: 'Kalıplaşmış değişim ifadesi', weight: 20 },
  { re: /sürdürülebilir bir gelecek|daha yaşanabilir|ortak bir zemin/giu, label: 'Kalıplaşmış kapanış', weight: 22 },
  { re: /belirtmek gerekir ki|şunu ifade etmek gerekir|değinmek gerekmek/giu, label: 'Kalıplaşmış metadiskur', weight: 14 },
  { re: /üç (?:temel|ana) (?:başlık|faktör|unsur)/giu, label: 'Üçlü liste kalıbı', weight: 18 },
  { re: /hem [^.]{3,60} hem de [^.]{3,60} açısından/giu, label: 'Kalıplaşmış ikili yapı', weight: 10 },
  { re: /bu durum[,.]? (?:birçok|çeşitli|farklı)/giu, label: 'Genelleyici geçiş', weight: 12 },
  { re: /(?<![\p{L}\p{N}_])dikkat çekmektedir(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])öne çıkmaktadır(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])vurgulanmaktadır(?![\p{L}\p{N}_])/giu, label: 'Pasif değerlendirme kalıbı', weight: 10 },
  { re: /literatürde (?:önemli|dikkat çekici) bir (?:boşluk|yer)/giu, label: 'Kalıplaşmış literatür ifadesi', weight: 16 }
];

// Üslup (register) tanımları: yeniden yazma motorunun kullandığı talimat + dönüşüm bankası.
export const registers = {
  natural: {
    label: 'Doğal',
    prompt: 'Sade, akıcı ve insana özgü bir anlatım kur. Cümle uzunluklarını değiştir, aynı bağlacı üst üste kullanma, kalıplaşmış giriş ve kapanışlardan kaçın.',
    transformations: { simplify: true, varyRhythm: true, removeCliches: true },
    avoid: ['günümüz dünyasında', 'büyük önem taşımaktadır', 'sonuç olarak', 'bu bağlamda']
  },
  academic: {
    label: 'Akademik',
    prompt: 'Akademik ve ölçülü yaz: edilgen/kişisiz anlatım, ihtiyat dili (hedge), kanıta dayalı fiiller (belirlenmiştir, saptanmıştır, değerlendirilmektedir). Kaynak, sayı, birim ve atıfları aynen koru; yeni bulgu, kaynak veya iddia ekleme.',
    transformations: { impersonal: true, nominalise: true, hedge: true, formalConnectives: true, citationNormalise: true },
    connectives: ['Buna göre', 'Bu çerçevede', 'Ayrıca', 'Bunun yanında', 'Öte yandan', 'Buna karşılık', 'Dolayısıyla', 'Bu nedenle', 'Söz konusu', 'Nitekim'],
    verbs: { informal: /göstermektedir|belirtmektedir|söylemektedir/giu, formal: ['ortaya koymaktadır', 'göstermektedir', 'belirtmektedir', 'işaret etmektedir'] },
    avoid: ['bence', 'bana göre', 'şey', 'çok fazla', 'bir sürü']
  },
  thesis: {
    label: 'Tez / rapor',
    prompt: 'Tez ve rapor diliyle yaz: bölüm göndermeleri (Bölüm 3, Tablo 2.1, Şekil 1.4) korunur; yöntem, bulgu ve değerlendirme ayrımı net tutulur; ölçü birimleri ve sayısal değerler değiştirilmez. YÖK/enstitü tez yazım kurallarına uygun, kişisiz ve ihtiyatlı bir anlatım kullan.',
    transformations: { impersonal: true, nominalise: true, hedge: true, keepStructure: true, citationNormalise: true },
    connectives: ['Bu kapsamda', 'Söz konusu', 'Buna ek olarak', 'Elde edilen bulgular', 'Bu doğrultuda', 'Bununla birlikte'],
    avoid: ['bence', 'şey', 'süper', 'acayip']
  },
  official: {
    label: 'Resmî yazışma',
    prompt: 'Resmî Yazışmalarda Uygulanacak Usul ve Esaslar Hakkında Yönetmelik (RG 10.06.2020/31151) diline uygun yaz: kısa, özlü, kişisiz cümleler; "ilgi" atfı "… tarihli ve … sayılı" biçiminde; kapanış hiyerarşiye göre "rica ederim/arz ederim"; yabancı kelime zorunlu olmadıkça kullanılmaz, kullanılırsa parantez içinde Türkçe karşılığı verilir; sayılar MADDE 16/7 biçiminde yazılır.',
    transformations: { officialStructure: true, formalConnectives: true, numberFormat: true, noForeign: true, keepStructure: true },
    connectives: ['İlgi', 'Bu çerçevede', 'Söz konusu', 'Ayrıca', 'Buna göre', 'Diğer taraftan'],
    closings: { subordinate: 'Gereğini rica ederim.', superior: 'Gereğini arz ederim.', both: 'Gereğini arz ve rica ederim.', person: 'Saygılarımla.' },
    avoid: ['şey', 'falan', 'süper', 'acayip', 'bence', 'kesinlikle']
  },
  technical: {
    label: 'Teknik',
    prompt: 'Teknik, açık ve kesin yaz. Alan terimlerini, ölçü birimlerini, standart ve model adlarını aynen koru; belirsizlik ve tahminleri işaretleyerek ayır.',
    transformations: { precise: true, keepTerms: true, varyRhythm: true },
    avoid: ['yaklaşık olarak civarında', 'büyük ölçüde']
  },
  business: {
    label: 'İş yazışması',
    prompt: 'Profesyonel iş yazışması üslubu: kısa paragraflar, eyleme dönük dil, saygılı ve net ifadeler. Kaynakta olmayan taahhüt, tarih, fiyat veya garanti ekleme.',
    transformations: { concise: true, actionOriented: true, varyRhythm: true },
    avoid: ['yadsınamaz', 'çığır açan', 'paradigma']
  },
  journalistic: {
    label: 'Haber dili',
    prompt: 'Haber diliyle yaz: kısa cümle, etkin özne, somut ayrıntı. İddia ile doğrulanmış olguyu ayır; başlık, alıntı veya tanık uydurma.',
    transformations: { concise: true, activeVoice: true, varyRhythm: true },
    avoid: ['bu bağlamda', 'kapsamlı bir şekilde']
  },
  proofread: {
    label: 'Yazım düzelt',
    prompt: 'Yalnızca yazım, noktalama, ek uyumu ve biçim hatalarını düzelt. Cümle yapısını, anlamı, sayıları, atıfları ve üslubu değiştirme.',
    transformations: { proofreadOnly: true },
    avoid: []
  }
};

// Türkçe işlev sözcükleri (YZ olasılık motoru için dağılım profili).
export const functionWords = ['bir', 've', 'bu', 'için', 'ile', 'da', 'de', 'ki', 'mi', 'daha', 'çok', 'gibi', 'kadar', 'ancak', 'ayrıca', 'sonra', 'olarak', 'olan', 'var', 'yok', 'en', 'hem', 'ya', 'veya', 'ama', 'fakat', 'çünkü', 'göre', 'kadar', 'üzere', 'dolayı', 'nedeniyle', 'bakımından', 'açısından', 'üzerine', 'boyunca', 'arasında', 'karşın'];

export const stopwords = new Set(['bir', 've', 'bu', 'şu', 'o', 'için', 'ile', 'de', 'da', 'ki', 'mi', 'mı', 'mu', 'mü', 'daha', 'çok', 'gibi', 'kadar', 'ancak', 'ayrıca', 'sonra', 'olarak', 'olan', 'var', 'yok', 'en', 'hem', 'ya', 'veya', 'ama', 'fakat', 'çünkü', 'göre', 'üzere', 'dolayı', 'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'with', 'on', 'is', 'are', 'was', 'were', 'be', 'been', 'as', 'at', 'by', 'from', 'that', 'this', 'it']);

// Yabancı kelime denetimi (MADDE 16/8): sık kullanılan ve Türkçe karşılığı olan sözler.
export const foreignTerms = [
  ['feedback', 'geri bildirim'], ['deadline', 'son tarih'], ['meeting', 'toplantı'], ['report', 'rapor'],
  ['management', 'yönetim'], ['performance', 'performans'], ['design', 'tasarım'], ['project', 'proje'],
  ['analysis', 'analiz'], ['data', 'veri'], ['model', 'model'], ['software', 'yazılım'], ['hardware', 'donanım'],
  ['online', 'çevrim içi'], ['offline', 'çevrim dışı'], ['update', 'güncelleme'], ['check', 'denetim'],
  ['output', 'çıktı'], ['input', 'girdi'], ['workflow', 'iş akışı'], ['benchmark', 'kıyaslama ölçütü'],
  ['trend', 'eğilim'], ['scenario', 'senaryo'], ['indicator', 'gösterge'], ['parameter', 'parametre'],
  ['optimize', 'en iyilemek'], ['maximize', 'azami düzeye çıkarmak'], ['minimize', 'asgariye indirmek'],
  ['implement', 'uygulamak'], ['monitor', 'izlemek'], ['evaluate', 'değerlendirmek'], ['sustainable', 'sürdürülebilir'],
  ['carbon footprint', 'karbon ayak izi'], ['green infrastructure', 'yeşil altyapı'], ['ecosystem service', 'ekosistem hizmeti']
];

export const pack = {
  locale: 'tr',
  name: 'Türkçe akademik ve resmî yazım paketi',
  version: '2026.10',
  authorities,
  rules,
  aiMarkers,
  registers,
  functionWords,
  stopwords,
  foreignTerms,
  // Cümle başlangıçlarını çeşitlendirmek için dönüşümlü bağlaç grupları.
  connectiveGroups: [
    ['Ayrıca', 'Bunun yanında', 'Buna ek olarak', 'Ek olarak'],
    ['Ancak', 'Bununla birlikte', 'Öte yandan', 'Buna karşın'],
    ['Bu nedenle', 'Dolayısıyla', 'Bu çerçevede', 'Buna göre'],
    ['Sonuç olarak', 'Genel olarak değerlendirildiğinde', 'Bütün bu bulgular birlikte ele alındığında', 'Nitekim'],
    ['Örneğin', 'Bu kapsamda', 'Somut olarak', 'Nitekim']
  ],
  hedges: ['değerlendirilmektedir', 'öngörülmektedir', 'düşünülmektedir', 'olasıdır', 'görülmektedir', 'işaret etmektedir'],
  formalVerbs: ['belirlenmiştir', 'saptanmıştır', 'ortaya konmuştur', 'tespit edilmiştir', 'değerlendirilmiştir', 'gözlemlenmiştir', 'hesaplanmıştır', 'ölçülmüştür', 'incelenmiştir']
};

export default pack;
