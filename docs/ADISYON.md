# Masalar ve adisyon

Yönetim panelindeki **Masalar ve adisyon** sekmesi kasa ekranıdır. İlk açılışta mevcut menü ve masa sayısı kullanılır; ürünleri tekrar tanımlamak gerekmez. Yeni tablolar mevcut SQLite dosyasına eklenir, menü ve işletme ayarları korunur.

## Masa işlemleri

- Boş masaya dokunarak adisyon açın. **Ürün ekle** ile kategoriden/aramadan ürünü, porsiyonu, adedi ve ürün notunu seçip listeyi masaya gönderin.
- Siparişe eklenen ürünün adı ve fiyatı o anki haliyle saklanır. Sonraki menü fiyat değişikliği açık veya eski adisyonları değiştirmez. Ürün ekleme ekranı her açılışta güncel menüyü alır. Gönderim sırasında fiyat değişirse yeniden kontrol etmeniz istenir.
- Kasa ürün adedini değiştirebilir; iptal nedeni yazarak ürünü iptal edebilir. İptal kaydı silinmez. Yapılan ödemeden daha düşük bir hesaba yol açacak değişiklik reddedilir.
- %10 ve %20 indirim ürün ara toplamına uygulanır. Tekrar basmak indirimi katlamaz; mevcut indirimi değiştirir. **Kaldır** indirimi sıfırlar.
- **Masayı taşı** yalnız boş hedef masaları gösterir. Ürünler, indirim ve ödemeler aynı adisyonda korunur; kaynak masa boşalır. Dolu masaları birleştirme yapılmaz.

## Ödeme ve cari

**Nakit**, **Kredi kartı**, **Yemek kartı** veya **Cari hesap** seçip tutarı girin. Parçalı ödeme için kalan tutardan küçük bir tutar yazın. Birden fazla ödeme türü aynı adisyonda kullanılabilir. Yemek kartı firması not olarak kaydedilebilir.

Kredi kartı/yemek kartı, ayrı POS cihazında alınmış ödemenin kasa kaydıdır. Web uygulaması POS cihazından para çekmez. Cari aktarımı tahsilat sayılmaz; ilgili hesaba borç kaydı ekler. Kalan sıfırlandığında masayı kapatabilirsiniz. “Ödeme sonrası masayı kapat” seçeneği son ödeme ile kapatmayı tek işlemde yapar. Kapalı adisyonlar değiştirilmez; yanlış ödeme için bu sürümde iade/ödeme silme işlevi yoktur.

**Cari hesaplar** bölümünde isim/telefon/notla hesap oluşturun. Hesap hareketindeki **Ürün ve fiş detayı**, bağlı adisyonun bütün ürün ve ödemelerini açar. **Tahsilat al**, cari bakiyesini düşürür ve günlük kasaya seçilen ödeme türüyle yansır. Pasif cari hesaplara yeni borç yazılamaz; mevcut borç tahsil edilebilir. Fiş kayıtları hesap pasife alındığında korunur.

Günlük kasa Türkiye saatiyle bugünkü nakit, kredi kartı, yemek kartı tahsilatlarını; cariye yeni aktarılan borçları; kapanan adisyon sayısını ve kapanan adisyonların indirimlerini gösterir. Cari tahsilatları nakit/kart/yemek kartı toplamına dahildir. Cariye yazılan tutarlar toplam tahsilata eklenmez.

## Garson ve müşteri

**Garson hesapları** bölümünde her çalışan için ayrı kullanıcı adı ve en az 8 karakterli şifre oluşturun. Garson adresi `/garson`'dur. Garsonlar masa açar, ürün ve not ekler, müşteri siparişi onaylar/reddeder. Cari, kasa özeti, ödeme, indirim, ürün iptali ve masa taşıma kasa yetkisindedir. Kullanıcı adı sipariş satırı ve işlem günlüğünde saklanır; ileride performans raporuna temel oluşturur. Hesap güncellemesi mevcut oturumlarını geçersiz kılar.

Müşteri, menüde **Sipariş ver** düğmesiyle masa numarasını seçer. İstekler **Müşteri siparişleri** listesinde onay bekler. Masa seçimi müşteriye ait olduğu için kasa/garson masa ve ürünleri doğrular. Onaylanan istek, seçilen masanın açık adisyonuna eklenir veya masa boşsa yeni adisyon açar. Tekrar onaylamak ürünü iki kez eklemez. Müşteri başka masaların hesaplarını veya cari bilgilerini göremez. “Garson çağır” düğmesi önceki tercihe uygun olarak pasiftir.

## Yazdırma ve yük

Yazıcı bölümünden bağlantı anahtarı oluşturup [Windows yardımcısını kurun](../printer/README.md). Adisyondaki **Yazdır** USB yazıcı kuyruğuna iş ekler. **Önizle** ürün dökümünü 80 mm düzeninde açar; buradan tarayıcıyla da yazdırabilirsiniz. Fiziksel yazıcıda ilk baskı ve kesici ayarı kasa bilgisayarında kontrol edilmelidir.

Sunucuda Redis, websocket servisi, ek veritabanı veya sürekli çalışan rapor işi yoktur. Kasa/garson ekranı 15 saniyede küçük sürüm kontrolü yapar; veri değişmediyse 304 cevabıyla veri taşınmaz. Sekme görünmüyorsa kontroller durur. Ürün kataloğu sipariş ekleme açıldığında alınır; her kontrolde tekrar gönderilmez. Müşteri menüsü arka planda sipariş sorgusu yapmaz. Windows yardımcısı 10 saniyede indeksli kuyruk sorgusu yapar. Yeni müşteri siparişleri yönetim panelindeki bildirim sayısına ve açılmışsa ses uyarısına dahildir.

Ödemeler, cari hareketleri ve masa işlemleri SQLite transaction ile kaydedilir. İstek anahtarı tekrar gönderilen ödemeyi ikinci kez yazmayı önler; adisyon sürümü çakışan cihaz işlemlerini reddeder. Denetim günlüğü `pos_events` tablosundadır. Önceki yedekleme komutu yeni adisyon, cari ve çalışan tablolarını da içerir. Düzenli veritabanı yedeği alın.
