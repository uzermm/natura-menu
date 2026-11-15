# Günlük kasa, iade ve gün kapatma

Bu sürümde satış geçmişini her akşam yönetici temizler. Zamanlanmış görev, otomatik tam sistem yedeği veya ayrı bir servis yoktur. Verilerinizi kendi Excel arşivinize aldıktan sonra gün kapatabilirsiniz.

## Günlük kasa

Sol menüde **Günlük kasa** bölümünü açın.

- **Açılış kasası:** Günün başlangıcındaki nakit. Bir kez girilir; girilmezse hesaplama sıfır açılış kabul eder.
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
3. Açık hesap ve bekleyen sipariş sayısı sıfır olmalıdır. Silinecek adisyon ve korunacak cari bağlantılı adisyon sayısını kontrol edin.
4. Kasada saydığınız nakdi girin. Beklenen tutardan farklıysa fark nedenini yazın.
5. Onay alanına **GÜNÜ KAPAT** yazıp işlemi tamamlayın.

Gün özeti başka cihazda değişmişse yeniden kontrol etmeniz istenir. Açık hesap veya bekleyen sipariş varken silme yapılmaz. Cari koruma dosyası yazılamazsa da işlem durur ve satışlar silinmez. Kapatma isteğinin tekrarı yeni günün kayıtlarını tekrar temizlemez.

### Korunanlar

- Cari hesaplar, telefon/notlar, borç/alacak bakiyeleri ve bütün cari hareketleri.
- Cariye bağlı adisyonlar; ürün, ödeme, iade ve fiş detayları. Birleşmiş masalardan bağlı olan kayıtlar da korunur.
- Menü, kategoriler, ürün görselleri, işletme ayarları, yönetici şifresi ve çalışan kayıtları.

### Temizlenenler

- Cariyle bağlantısı olmayan tamamlanmış satışlar, satırlar, ödemeler ve iadeler.
- Günün kasa giriş/çıkışları ve açılış nakdi.
- Sonuçlanmış müşteri sipariş istekleri ve garson çağrıları.
- Korunan cari adisyonları dışında kalan işlem günlükleri ve eski istek içerikleri.

Yeni günün kasa toplamları ve Kapanan adisyonlar ekranı sıfırdan başlar. Saklanan cari fişler, Cari hesaplar içindeki **Ürün ve fiş detayı** üzerinden açılabilir; yeni günün satış listesine veya tahsilatına yeniden eklenmez.

Sayım ve fark bilgileri kapanış ekranında kontrol edilir; satış/kasa raporları gün kapatma sonrasında arşivlenmez. Excel aktarımınızı önce tamamlayın. Adisyon kimlikleri ve korunmuş kayıtların numaraları değiştirilmez.

## Yalnız cari koruması

Gün kapatılırken `/app/data/cari-koruma.json` adlı tek cari koruma dosyası yenilenir. Her gün ayrı klasör veya tam veritabanı yedeği oluşturulmaz. Dosya yalnız cari hesapları, hareketleri ve bağlı fişleri içerir; çalışan şifrelerini ve ilgisiz satışları içermez.

**Cari verilerini indir** düğmesiyle aynı içerik yönetici oturumunda indirilebilir. Cari verileri canlı veritabanında da korunur. Bu yerel dosya sunucu dışı yedek değildir; sunucu dışına aktarımı yönetici kendisi yapar. Bu sürümde içe aktarma ekranı yoktur.

Silinmiş işlemlerin gecikmiş ağ isteğiyle yeniden yazılmasını önlemek için 30 gün boyunca yalnız anonim istek kimlikleri tutulur; bu kayıtlarda satış içeriği veya tutar bulunmaz. SQLite boşalan alanı yeni kayıtlar için kullanır; gün kapatmada ağır bir veritabanı sıkıştırma işi çalıştırılmaz.

## Çalışanlar

**İşletme ayarları → Çalışanlar → Çalışan ekle** üzerinden ad, kullanıcı adı, şifre ve rol girilir. Roller: **Kasiyer**, **Garson**, **Mutfak**.

Bu sürümde bütün çalışan yetkileri boştur. Aktif kayıt veya rol seçimi giriş/işlem hakkı vermez. Eski garson giriş servisi ve eski oturumlar kabul edilmez. Şimdilik işlemleri yönetici yapar; ortak yetki sistemi ayrıca açılacaktır.

## Taslak kurtarma

Onaylanmamış ürünler, masa/satış türü, hesap adı ve notlar cihazda en fazla 12 saat saklanır. Sayfa yenilenince **Taslağı geri getir** veya **Taslağı sil** seçilir. Ürünler kendiliğinden gönderilmez.

Onay yanıtı kaybolmuşsa sistem işlem anahtarını kontrol eder. Sipariş sunucuda kayıtlıysa taslağı tekrar eklemek yerine kayıtlı hesabı açar. Fiyat değişmişse veya hesap kapanmışsa yeniden kontrol gerekir. Önceki güne ait taslak gün kapatma sonrasında otomatik gönderilmez; temizlenir. Taslaklar başka cihazlara aktarılmaz ve sürekli sunucuya yazılmaz.
