# Günlük kasa, iade ve gün kapatma

Bu sürümde satış geçmişini her akşam yönetici temizler. Zamanlanmış görev, otomatik tam sistem yedeği veya ayrı bir servis yoktur. Verilerinizi kendi Excel arşivinize aldıktan sonra gün kapatabilirsiniz.

## Günlük kasa

Sol menüde **Günlük kasa** bölümünü açın.

- **Açılış kasası kartı:** Üst kartlarda para dökümü ve altında toplamı görünür. İlk hazır döküm 2 × 100 TL, 4 × 50 TL, 5 × 20 TL, 10 × 10 TL ve 10 × 5 TL; toplam **650 TL**. Karttaki kalemle adetleri değiştirip kaydedin.
- Kaydedilen döküm değiştirilene kadar sabit kalır; gün kapatıldığında da korunur ve yeni günün açılış nakdine otomatik uygulanır. Her gün yeniden açılış girmek gerekmez. Bugün önceden kaydedilmiş bir açılış varsa tutarı korunur; kalemle düzenlendiğinde hem bugün hem sonraki günler için yeni döküm kaydedilir.
- **Kasa girişi / Kasa çıkışı:** Satış dışı nakit hareketi. Tutar ve açıklama gerekir.
- **Kasada beklenen nakit:** Açılış + net nakit tahsilat + giriş − çıkış.
- Kart ve yemek kartı, harici cihazda yapılan tahsilatın kaydıdır.

Gün, takvim gece yarısında otomatik sıfırlanmaz. Yönetici kapatana kadar aynı dönem devam eder. İlk geçişte o takvim gününün mevcut kayıtları yeni dönem hesabına alınır.

## Ödeme düzeltme ve iade

Açık adisyonda **Hesabı kapat** penceresindeki **Ödeme geçmişi ve iade** alanını kullanın. Kapalı adisyonda **Ödemeler / İade** düğmesini açın.

**Türünü düzelt**, aynı tutarı farklı ödeme türüne veya farklı cariye taşır. Eski ödeme silinmez: karşı kayıt ve yeni ödeme oluşur. Yalnız açık günün ödemelerinde yapılabilir. Zorunlu neden girilir.

**İade kaydet**, iade edilen tutarı net satıştan ve net tahsilattan düşer. Kapanmış masa yeniden açılmaz. Kayıttaki tutar kadar parayı nakit veya harici cihaz üzerinden ayrıca iade etmeniz gerekir. İade, ürünlerin stok hareketini veya adedini değiştirmez; parasal karşı kayıttır.

Cari ödemesinin iadesi ilgili hesabın borcunu azaltır. Önceden tahsil edilmiş bir cariye iade, hesapta alacak bakiyesi oluşturabilir; bu hareket cari dökümünde korunur. Cari iadesi nakit tahsilat olarak sayılmaz.

İade edilebilir tutarın üzerinde işlem yapılamaz. Para iadesi veya tür düzeltmesi için neden zorunludur. Bağlantı yanıtı kesilirse **tekrar kontrol et** düğmesi aynı işlem anahtarıyla çalışır; yeniden tahsilat/iade yazmaz. Sonucu kontrol etmeden yeni işlem başlatmayın.

## Gün kapat

1. Açık masaları ve hızlı siparişleri tamamlayın. Kalan tutarı tahsil edin veya cariye aktarın; hesabı kapatın. Onay bekleyen müşteri siparişlerini sonuçlandırın.
2. **Günlük kasa → Gün kapat** düğmesine basın.
3. Açık masa/hızlı sipariş ve bekleyen müşteri siparişi sayısı sıfır olmalıdır. Cari içindeki açık ürün hesapları bu engelin dışında tutulur ve korunur. Silinecek adisyon ve korunacak cari bağlantılı adisyon sayısını kontrol edin.
4. Kasada saydığınız nakdi girin. Beklenen tutardan farklıysa fark nedenini yazın.
5. Onay alanına **GÜNÜ KAPAT** yazıp işlemi tamamlayın.

Gün özeti başka cihazda değişmişse yeniden kontrol etmeniz istenir. Açık masa/hızlı sipariş veya bekleyen müşteri siparişi varken silme yapılmaz. Cari koruma dosyası yazılamazsa da işlem durur ve satışlar silinmez. Kapatma isteğinin tekrarı yeni günün kayıtlarını tekrar temizlemez.

## Cari siparişleri

Cari kartının sağ üstündeki kalem, ad/işletme adı, telefon, not ve aktiflik bilgisini düzenler. Aynı penceredeki **Cariyi sil** işlemi ayrıca onay ister. Borç/alacak bakiyesi veya açık cari adisyonu varken silinemez. Silinen kart listeden kaldırılır; eski hesap hareketleri ve bağlı fişler korunur. Geçmiş bir cari ödemesine sonradan iade yapılırsa oluşan bakiye görünür kalması için kart pasif olarak tekrar listelenir.

Cari hesap kartı, masalarda kullanılan sipariş ekranını açar. Onaylanan ürünler cariye bağlı açık adisyonda saklanır; yeniden girildiğinde aynı ürünler ve ödenmemiş adetler görünür. Yeni ürünler bu hesaba eklenir. Nakit, kredi kartı veya yemek kartıyla ürün/adet ya da tutar üzerinden ödeme alınabilir. Tam ödeme ve hesap kapatmadan sonra yeni ürün girişi yeni bir cari adisyonu başlatır; geçmiş fişler korunur.

Toplam cari bakiyesi, eski borç hareketleriyle doğrudan girilen cari siparişinin kalan tutarını birlikte içerir. **Hareketler** bölümünde düzenleme, toplam bakiye için tahsilat ve geçmiş fişlere erişim bulunur. Buradan alınan tahsilat önce eski aktarılmış borca, sonra açık cari siparişine uygulanır; aynı tahsilat kasaya iki kez yazılmaz. Eski tutar ödemelerinde ürün/adet ayrımı bulunmadığından, eski fişlerin ürünleri özgün halleriyle ve fişten kalan borçla gösterilir; ürünlere tahmini ödenmiş adet atanmaz.

Açık cari siparişi gün kapatıldığında da ürün, fiyat, not ve kısmi ödemeleriyle saklanır. Yeni gün bu cariye eklenen ürünler güncel menü fiyatıyla eklenir; önceki ürünün kaydedilmiş fiyatı değişmez. Cari hesap bakiyesi sıfırlanmaz.

### Korunanlar

- Cari hesaplar, telefon/notlar, borç/alacak bakiyeleri ve bütün cari hareketleri.
- Cariye bağlı adisyonlar; ürün, ödeme, iade ve fiş detayları. Birleşmiş masalardan bağlı olan kayıtlar da korunur.
- Menü, kategoriler, ürün görselleri, işletme ayarları, yönetici şifresi ve çalışan kayıtları.

### Temizlenenler

- Cariyle bağlantısı olmayan tamamlanmış satışlar, satırlar, ödemeler ve iadeler.
- Günün kasa giriş/çıkışları. Sabit açılış dökümü korunur.
- Sonuçlanmış müşteri sipariş istekleri ve garson çağrıları.
- Korunan cari adisyonları dışında kalan işlem günlükleri ve eski istek içerikleri.

Yeni günün satış ve tahsilat toplamları ve Kapanan adisyonlar ekranı sıfırdan başlar; beklenen nakit sabit açılış kasasıyla başlar. Saklanan cari fişler, Cari hesaplar içindeki **Ürün ve fiş detayı** üzerinden açılabilir; yeni günün satış listesine veya tahsilatına yeniden eklenmez.

Sayım ve fark bilgileri kapanış ekranında kontrol edilir; satış/kasa raporları gün kapatma sonrasında arşivlenmez. Excel aktarımınızı önce tamamlayın. Adisyon kimlikleri ve korunmuş kayıtların numaraları değiştirilmez.

## Yalnız cari koruması

Gün kapatılırken `/app/data/cari-koruma.json` adlı tek cari koruma dosyası yenilenir. Her gün ayrı klasör veya tam veritabanı yedeği oluşturulmaz. Dosya yalnız cari hesapları, hareketleri ve bağlı fişleri içerir; çalışan şifrelerini ve ilgisiz satışları içermez.

**Cari Excel indir** düğmesi, cari bakiyelerini, hareketlerini, fişleri, ürün detaylarını, ödemeleri ve iade/düzeltmeleri ayrı sayfalarda içeren `.xlsx` dosyası indirir. Parasal değerler sayıdır; telefon numaraları baştaki sıfırları korunarak metin olarak saklanır. Excel dökümü uygulama içine geri yükleme dosyası değildir. Cari verileri canlı veritabanında da korunur. Bu yerel dosya sunucu dışı yedek değildir; sunucu dışına aktarımı yönetici kendisi yapar. Bu sürümde içe aktarma ekranı yoktur.

Silinmiş işlemlerin gecikmiş ağ isteğiyle yeniden yazılmasını önlemek için 30 gün boyunca yalnız anonim istek kimlikleri tutulur; bu kayıtlarda satış içeriği veya tutar bulunmaz. SQLite boşalan alanı yeni kayıtlar için kullanır; gün kapatmada ağır bir veritabanı sıkıştırma işi çalıştırılmaz.

## Çalışanlar

**İşletme ayarları → Çalışanlar → Çalışan ekle** üzerinden ad, kullanıcı adı, şifre ve rol girilir. Roller: **Kasiyer**, **Garson**.

**Yönetici:** Bütün bölümler ve çalışan/şifre ayarları açıktır.

**Kasiyer:** İşletme ayarları dışında bütün bölümler açıktır. İşletme ayarlarını, çalışanları ve yönetici şifresini değiştiremez.

**Garson:** Masaları ve müşteri siparişlerini görür; masa siparişi ekler, masa notunu değiştirir, garson çağrısını sonuçlandırır ve müşteri siparişini onaylar/reddeder. Onaylanmamış taslaktaki adetleri değiştirebilir. Onaylanmış ürünü iptal etme/değiştirme, ödeme, indirim, taşıma/birleştirme, cari, hızlı satış, rapor, yazdırma ve menü yönetimi kapalıdır.

Giriş, `/admin/login` ekranındaki **Çalışan** seçeneğinden kullanıcı adı ve şifreyle yapılır. Ayrı garson ekranı yoktur. Yetkiler sunucuda da denetlenir. Çalışanın şifresi, rolü veya aktifliği değişince önceki oturumu geçersizleşir. Eski Mutfak kayıtları giriş yapamaz; iki rolden birine geçirilmelidir.

## Taslak kurtarma

Onaylanmamış ürünler, masa/satış türü, hesap adı ve notlar cihazda en fazla 12 saat saklanır. Sayfa yenilenince **Taslağı geri getir** veya **Taslağı sil** seçilir. Ürünler kendiliğinden gönderilmez.

Onay yanıtı kaybolmuşsa sistem işlem anahtarını kontrol eder. Sipariş sunucuda kayıtlıysa taslağı tekrar eklemek yerine kayıtlı hesabı açar. Fiyat değişmişse veya hesap kapanmışsa yeniden kontrol gerekir. Önceki güne ait taslak gün kapatma sonrasında otomatik gönderilmez; temizlenir. Taslaklar başka cihazlara aktarılmaz ve sürekli sunucuya yazılmaz.

## Uygulamayı yükleme

Sol menüde **Masalar → Hızlı Sipariş** ayrı bir sayfadır. İşlem onaylanmadan gerçek satış açılmaz; ödenmemiş hızlı satışlar Açık Masalar içinde kalır.

Giriş ve yönetim ekranındaki indirme simgesiyle uygulamayı yükleyin. Chrome/Edge üzerinde yükleme istemi, Safari üzerinde Paylaş → Ana Ekrana Ekle kullanılabilir. Uygulama yönetim ekranıyla açılır. Siparişler ve ödemeler internet bağlantısı gerektirir; özel veriler çevrimdışı önbelleğe alınmaz ve arkaplanda sipariş tekrar gönderimi yapılmaz.
