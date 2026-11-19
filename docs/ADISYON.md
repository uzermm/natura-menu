# Masalar ve adisyon

Yönetim panelindeki **Masalar** sekmesi kasa ekranıdır. Yönetim paneli ilk açıldığında bu ekranın **Açık Masalar** bölümü gösterilir. İlk açılışta mevcut menü ve masa sayısı kullanılır; ürünleri tekrar tanımlamak gerekmez. Yeni tablolar mevcut SQLite dosyasına eklenir, menü ve işletme ayarları korunur.

## Hızlı sipariş ve açık hesaplar

Masalar içinde sırasıyla **Açık Masalar**, **Masalar** ve **Hızlı Sipariş** düğmeleri bulunur. Hızlı sipariş kasa satışı veya paket servis içindir; fiziksel masa seçilmez. Görselli ürün ekranı aynı şekilde açılır. Adisyonun altında **Hesap adı** alanına açıklama yazabilir, **Kasa satışı / Paket servis** türünü seçebilirsiniz.

Ürünler önce taslağa eklenir; **Siparişi onayla** ile hesap kaydedilir. Masa seçmek veya onaylanmamış ürün seçmek masayı aktif hale getirmez. Taslaktan çıkarken onaylama veya silme seçenekleri sunulur. Hesap adı sonraki ürün, ödeme ve cari işleminde birlikte kaydedilir; kaydet düğmesi veya geri dönmek de adı saklar. Ödenmeyen veya kısmen ödenen hesaplar **Açık masalar** içinde kendi adlarıyla görünür. Son ödeme/cari aktarımıyla kapatılan hesaplar listeden çıkar ve Kapanan adisyonlar içinde saklanır. Hesap adı bir açıklamadır; cari hesap oluşturmaz.

**Cari hesaplar**, **Kapanan adisyonlar** ve **Günlük kasa** sol menüdedir. Hızlı siparişler kasa yetkisindedir.

## Masa işlemleri

Açık masalarda süre son onaylanan ürün girişinden hesaplanır: 0–20 dakika yeşil, 20–45 dakika sarı, 45 dakika üzeri kırmızı. Yeni ürün veya adet artışı süreyi sıfırlar; ödeme, not ve adet azaltma sıfırlamaz. Boş masalar siyah dolgu/beyaz yazıdır. Bekleyen çağrı mor dolgu ve zil simgesiyle görünür. Mobilde yenile düğmesi ve renk açıklama yazıları gösterilmez; otomatik bağlantı ve renk hesaplama devam eder.

- Masaya dokunduğunuzda tam ekran sipariş alanı açılır: solda görselli kategoriler, ortada görselli ürünler, sağda sipariş ve ödeme alanı birlikte bulunur. Kategori ve ürün alanları kendi içlerinde bağımsız kayar; sayfanın tamamı hareket etmez.
- Ürüne dokunmak sipariş taslağındaki adedi artırır; aynı ürün, fiyat, porsiyon ve nota sahip seçimler tek satırda görünür. **Siparişi onayla** ürünleri masaya kaydeder. Porsiyonlu üründe seçenek ekranı açılır. Ürünün seçenek düğmesiyle adet ve not girilebilir. Telefonda ürünler ve siparişler aynı anda görünür.
- Adisyon panelinde yalnız sipariş listesi kayar; toplam ve işlem düğmeleri altta sabittir. Satırlar ürün, birim fiyat, adet ve tutarı kompakt gösterir. **Tutar ile ödeme** tutar girişini, **Hesabı kapat** ürün/adet seçimini açar; **Cariye** doğrudan cari aktarımıyla başlatır. Masa notu sipariş listesinin altında tek satırda düzenlenir ve siparişle birlikte kaydedilir; **Hesabı kapat** içinde %10/%20 indirim ve Kaldır seçenekleri bulunur; masa taşıma ve yazdırma alt düğmelerdedir.
- Siparişe eklenen ürünün adı ve fiyatı o anki haliyle saklanır. Sonraki menü fiyat değişikliği açık veya eski adisyonları değiştirmez. Ürün ekleme ekranı her açılışta güncel menüyü alır. Gönderim sırasında fiyat değişirse yeniden kontrol etmeniz istenir.
- Kasa ürün adedini değiştirebilir; iptal nedeni yazarak ürünü iptal edebilir. İptal kaydı silinmez. Yapılan ödemeden daha düşük bir hesaba yol açacak değişiklik reddedilir.
- %10 ve %20 indirim ürün ara toplamına uygulanır. Tekrar basmak indirimi katlamaz; mevcut indirimi değiştirir. **Kaldır** indirimi sıfırlar.
- **Taşı** boş veya dolu hedef masa seçtirir. Boş masaya tüm hesap taşınır. Dolu masada Masaları birleştir ile ürünler, ödenmiş adetler, ödemeler ve indirimler hedef hesapta birleşir; kaynak masa boşalır. Kaynak adisyonun birleştirme öncesi ürün/ödeme/not kaydı ve eski cari fiş bağlantıları korunur. Kaynak arşivi kapanan satış olarak sayılmaz; günlük tahsilat ikinci kez yazılmaz. Hedef hesap değişmişse işlem reddedilir. Birleşen notlar 500 karakteri aşarsa önce kısaltılması istenir.

## Ödeme ve cari

**Hesabı kapat** içinde tüm ödenmemiş ürünler mevcut adetleriyle seçili gelir. Adedi rakamın solundaki eksi ve sağındaki artı düğmeleriyle veya doğrudan yazarak değiştirin. Kısmi ödeme için adetleri azaltın; sıfır verilen ürün bu ödemeye alınmaz. Örneğin dört çaydan ikisi ödendiğinde iki çay altta pasif **Ödenen ürünler** bölümüne geçer; kalan iki çayla masa açık kalır. Son ürünlerin ödemesi kalan tutarı kapattığında masa kapanır. Ödenen adetler azaltılamaz veya iptal edilemez. İndirim ve önceki tutar ödemeleri ödenmemiş ürünlere orantılı yansıtılır; hesap kuruş bazında tutulur. Farklı çalışanlardan gelen aynı ürünler ekranda birlikte gösterilirken çalışan kayıtları korunur.

**Tutar ile ödeme** içinde **Nakit**, **Kredi kartı**, **Yemek kartı** veya **Cari hesap** seçip tutarı girin. Parçalı ödeme için kalan tutardan küçük bir tutar yazın. Birden fazla ödeme türü aynı adisyonda kullanılabilir. Yemek kartı firması not olarak kaydedilebilir.

Kredi kartı/yemek kartı, ayrı POS cihazında alınmış ödemenin kasa kaydıdır. Web uygulaması POS cihazından para çekmez. Cari aktarımı tahsilat sayılmaz; ilgili hesaba borç kaydı ekler. Kalan sıfırlandığında masayı kapatabilirsiniz. “Ödeme sonrası masayı kapat” seçeneği son ödeme ile kapatmayı tek işlemde yapar. Ödeme geçmişinden neden girerek ödeme türü düzeltilebilir veya para iadesi kaydedilebilir. Eski ödeme silinmez; karşı kayıt oluşur. İade net satış ve tahsilatı azaltır, kapanmış masa açılmaz. Ayrıntılar [Gün kapatma rehberinde](GUN-KAPAT.md).

**Cari hesaplar** bölümünde isim/telefon/notla hesap oluşturun. Hesap hareketindeki **Ürün ve fiş detayı**, bağlı adisyonun bütün ürün ve ödemelerini açar. **Tahsilat al**, cari bakiyesini düşürür ve günlük kasaya seçilen ödeme türüyle yansır. Pasif cari hesaplara yeni borç yazılamaz; mevcut borç tahsil edilebilir. Fiş kayıtları hesap pasife alındığında korunur.

Günlük kasa Türkiye saatiyle bugünkü nakit, kredi kartı, yemek kartı tahsilatlarını; cariye yeni aktarılan borçları; kapanan adisyon sayısını ve kapanan adisyonların indirimlerini gösterir. Cari tahsilatları nakit/kart/yemek kartı toplamına dahildir. Cariye yazılan tutarlar toplam tahsilata eklenmez.

## Ortak yönetim ekranı ve müşteri

Masa siparişleri için tek giriş `/admin` adresidir. Ayrı garson sayfası ve giriş ekranı kaldırıldı; İşletme ayarları içinden kasiyer ve garson rolleriyle çalışan eklenir. Kasiyer menü/işletme ayarlarını, açılış kasası düzenlemeyi, gün kapatmayı ve yeniden adisyon açmayı kullanamaz. Garson yalnız masa siparişi, ürün adedi/notu, çağrı karşılama kullanır. Mobilde solda tek sütun kategoriler, sağ üstte üç sütunlu resimli ürünler, sağ altta tek satırlık siparişler bulunur. Ürün adı, artı/eksi adet ve tutar aynı satırdadır. Sipariş listesine iki satır daha yer açmak için sağ alt bölüm mobilde 80 piksel yukarı genişletilmiştir; aynı anda görünen ürün sayısı ekranın yüksekliğine bağlıdır. Her bölüm bağımsız kayar; toplam, masa notu ve onay işlemleri yerinde kalır. Masaüstünde üç sütunlu çalışma alanı devam eder.


## Yazdırma ve yük

Adisyondaki **Yazdır**, yeni sekmede adisyonu açıp doğrudan tarayıcının yazdırma ekranını gösterir. Buradan A4 yazıcınızı veya Possify yazıcısını ve uygun kağıt boyutunu seçin. Varsayılan otomatik düzen seçilen kağıdın genişliğine uyar. **Önizle** ekranında isterseniz açıkça **A4** veya **Possify · 80 mm** düzenini seçip Yazdır’a basabilirsiniz. Ek program, bağlantı anahtarı veya yazdırma kuyruğu kurulumu gerekmez. Tarayıcıdaki üstbilgi/altbilgi seçeneğini kapatmanız ve termal yazıcı için 80 mm kağıdı seçmeniz önerilir.

Sunucuda Redis, websocket servisi, ek veritabanı veya sürekli çalışan rapor işi yoktur. Yönetim ekranı 15 saniyede küçük sürüm kontrolü yapar; veri değişmediyse 304 cevabıyla veri taşınmaz. Sekme görünmüyorsa kontroller durur. Ürün kataloğu sipariş ekleme açıldığında alınır; her kontrolde tekrar gönderilmez. Müşteri menüsü arka planda sipariş sorgusu yapmaz. Yazdırma yalnızca kullanıcı Yazdır düğmesine bastığında tarayıcıda yapılır. Yeni müşteri siparişleri yönetim panelindeki bildirim sayısına ve açılmışsa ses uyarısına dahildir.

Ödemeler, cari hareketleri ve masa işlemleri SQLite transaction ile kaydedilir. İstek anahtarı tekrar gönderilen ödemeyi ikinci kez yazmayı önler; adisyon sürümü çakışan cihaz işlemlerini reddeder. Denetim günlüğü `pos_events` tablosundadır. Zamanlanmış tam yedekleme çalışmaz. Gün kapatmada yalnız cari kayıtları ve bağlı fişler korunur; tek cari koruma dosyası yenilenir.

Günlük kasa, manuel gün kapatma ve cari dışı kayıtların temizlenmesi için [Gün kapatma rehberine](GUN-KAPAT.md) bakın. Sipariş taslakları aynı cihazda 12 saate kadar geri getirilebilir; eski güne ait taslaklar kendiliğinden gönderilmez.

19 Kasım 2026 düzeltmeleri ve doğrulama kapsamı: [Sistem düzeltmeleri](REVIEW-FIXES-2026-11-19.md).
