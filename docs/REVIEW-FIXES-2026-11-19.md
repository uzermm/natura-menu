# Sistem incelemesi sonrası düzeltmeler — 19 Kasım 2026

Uygulama sürümü: 1.1.0. Gerçek satış verileri üzerinde test işlemi yapılmadı.

## Ödeme ve sipariş

- Kesin reddedilmiş ödeme (400/403/409 gibi) düzenlenebilir hale gelir; eski istek kilidi kaldırılır. Sonucu belirsiz bağlantı hatasında aynı işlem numarası korunur.
- Kayıp ödeme yanıtı işlem numarasıyla sorgulanır; kayıt varsa ikinci tahsilat yapılmadan sonuç gösterilir. Henüz kayıt bulunamazsa kullanıcıya aynı isteği kontrol etme/yeniden gönderme seçeneği sunulur. Kullanıcıya bağlı bekleyen ödeme kaydı sayfa yenilemesinde de korunur.
- Tüm istemci isteklerinde süre sınırı vardır: okuma 10 saniye, gönderim 30 saniye. Finansal işlem sessizce yeni işlem numarasıyla tekrarlanmaz.
- Kampanya, geçerli ürün ve porsiyonun kasa ve müşteri sipariş fiyatına ortak uygulanır. Normal menü fiyatı veritabanında korunur; eski adisyon satırlarının fiyatı değişmez. Gizli, tükenmiş veya geçersiz kampanya uygulanmaz.
- Ürün notu satıra dokunarak açılır. Ödenmiş ürünün notu korunur; yalnız ödenmemiş kısım düzenlenir. Mobil not simgesi ve seçenek düğmesi görünür, artı/eksi alanları büyütüldü.
- Adisyonların tek işlemde kaydı, eşzamanlı sürüm kontrolü, kuruş bazlı parçalı ödeme, birleştirme ve ödenmiş adet koruması korunur.

## Kullanıcı ve yetki

- Başarılı girişler deneme sınırını tüketmez. Hatalı girişler aynı kullanıcı/IP için 8, aynı IP toplamında 40 denemeyle 15 dakika sınırlandırılır.
- Sipariş taslakları kullanıcıya bağlıdır. Eski ortak taslak alınmaz; çıkışta aktif sipariş taslağı temizlenir. Sonucu belirsiz ödeme kendi kullanıcısında kontrol edilmek üzere saklanır.
- Gün kapatma, açılış kasası düzenleme ve kapalı adisyonu yeniden açma yalnız yöneticiye açıktır.
- Garsonun finansal işlem, kasiyerin menü yönetimi ve işletme ayarları erişimi sunucuda da engellenir.

## Cari ve kasa

- Eski cari borcundan alınan doğrudan tahsilatın ödeme türü açık gün içinde düzeltilebilir. Kısmi veya tam tahsilat geri alma eklenmiştir. Her işlem neden ve çalışan bilgisiyle karşı kayıt oluşturur; eski kayıt silinmez.
- Tahsilatı geri alma müşterinin borcunu geri oluşturur ve ilgili ödeme yönteminin kasa toplamını azaltır; eski ürün satışını ikinci kez değiştirmez.
- Cari tahsilat, gün kimliğiyle korunur; önceki güne ait ekranla yeni güne kayıt girilmez.
- Cari hareketleri 60 kayıtlık sayfalarla ve kararlı tarih/kimlik imleciyle yüklenir. İlgili satırlar toplu okunur.
- Excel altı sayfalı kalır; akış halinde hazırlanır ve bağımsız salt okunur WAL görüntüsü kullanır. İndirme sırasında yeni satışlar yazılabilir. Aynı anda tek Excel hazırlanır; iptalde okuyucu kapatılır. Tahsilat düzeltmeleri de Excel'e eklenir.
- Gün kapatma açık/bekleyen masa veya siparişi engeller; cari kayıtları ve cari bağlantılı fişler korunur. Otomatik tam yedek veya zamanlanmış veri silme eklenmedi.

## Performans ve bakım

- POS sorguları ekrana göre daraltıldı. Açık/kapanmış adisyonlar satır, ödeme ve düzeltmeleriyle toplu okunur; cari bakiyelerde toplu hesaplama ve geçmiş için indeksler kullanılır.
- Karşılaştırmalı ayrı testte 35 açık/40 kapanmış adisyonun tam özeti 388 yerine 25 SQL hazırlama çağrısı kullandı. Bu ölçüm gerçek sunucu CPU/RAM testi değildir.
- Ürün, kategori, ayar, sıralama ve toplu fiyat işlemlerinde sürüm kontrolü eklendi. Toplu fiyat tekrar isteği ikinci zammı uygulamaz. Menü değişiklikleri canlı güncelleme sürümüne dahildir.
- İşletme ayarlarında yöneticiye özel Sistem durumu alanı: sürüm, işlem belleği, veritabanı boyutu, boş disk ve sınırlı son olay kaydı.
- Kullanılmayan yüklenmiş görseller elle temizlenebilir. Yalnız en az 7 günlük, beklenen WebP dosya adı biçimindeki, hiçbir üründe/kategoride kullanılmayan dosyalar silinir. Kullanılan, yeni veya sembolik bağlantı olan dosyalara dokunulmaz. Otomatik temizlik yoktur.
- ExcelJS'nin dolaylı uuid bağımlılığı düzeltilmiş 11.1.1 sürümüne alındı. Üretim paket denetimi sıfır güvenlik uyarısı verdi.
- Mevcut tek uygulama örneği + SQLite + WebP yapısı korundu; yeni sürekli çalışan hizmet eklenmedi.

## Fiş ve kontroller

- Fişte gerçek sipariş/tahsilat çalışanları gösterilir. İşlem tarihi ile yazdırma tarihi ayrıdır. Kâğıt seçimi cihazda hatırlanır; otomatik yazıcı tanıma iddiası kaldırıldı.
- Mevcut 62 teste ek finans, kampanya, not, sayfalama, temizlik, taslak ve Excel eşzamanlılık kontrolleri eklendi.
- GitHub kontrollerine gerçek tarayıcı senaryoları eklendi: ödeme çakışması/kayıp yanıt/yenileme, mobil 320–390 piksel ve masaüstü, rol erişimi, sürüm çakışması/toplu fiyat tekrarı, cari düzeltme/Excel, kampanya, fiş ve giriş sınırı.
- Linux Docker kontrol betikleri ortak kullanıcı girişi, yeni yetkiler ve sürüm kontrollerine uyarlandı.
- Fiziksel Possify kâğıt çıktısı ile gerçek telefonun kilit ekranına push teslimi otomasyonla doğrulanmış sayılmaz; bunlar gerçek cihaz kontrolü gerektirir.
