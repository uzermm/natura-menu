# Online Mutfak — birleşik panel

## Adresler ve giriş

- `https://natura.beyoglumutfagi.com/`: mevcut müşteri QR menüsü.
- `https://mutfak.beyoglumutfagi.com/`: tek yönetim paneli, giriş `/login`.
- Eski `natura.../admin` adresi yeni panele yönlenir. Kasa fişleri yeni panelde `/adisyon/<id>` olarak açılır; eski fiş bağlantıları aynı fişe yönlenir.
- `PANEL_URL` alan adı geçişini açar. Yerel kullanımda veya geçiş öncesinde boş bırakıldığında `/admin` çalışır.
- Ortak giriş, mevcut kafe ve online hesaplarının parolalarını korur. Ayarlar içinde tek Kullanıcılar bölümü bulunur: Admin tüm bölümlere, Kasiyer Ayarlar ve Menü Yönetimi dışındaki operasyonlara, Garson yalnız Masalar ve sipariş/adet işlemlerine, Mutfak yalnız online Siparişler ekranı ile Kabul Et/Hazırlandı işlemlerine erişir. Mutfak oturumu her ekran boyutunda sol menü ve alt durum bandı olmadan açılır. Eski online yöneticiler Admin, standart online kullanıcılar Mutfak olarak görünür; yönetici buradan rol değiştirebilir.

## Uygulama yapısı

Natura ana uygulamadır. `online/` altında sipariş projesinin kaynakları, görselleri ve SQLite adaptörü bulunur. Kaynak sürüm: `uzermm/online-mutfak-sites-dokploy@08e5791`. Bu klasör `.git` veya gerçek sunucu anahtarı içermez.

Sipariş ve yorum arayüzleri, ortak sol menünün içinde aynı kökenden yüklenen kalıcı bir çalışma alanında açılır. Tek sunucu taraflı Natura oturumu iki modülde de doğrulanır; ikinci bir portal girişi yoktur. Çalışma alanı sekme geçişlerinde kaldırılmaz: sipariş kontrolü, zil ve etkin otomatik baskı sürer. Tarayıcı baskısı için kafe bilgisayarındaki mevcut Chrome sessiz baskı ilkesi ve varsayılan yazıcı kullanılmaya devam eder. Fiziksel yazıcı testi kafede yapılmalıdır.

`online/runtime.mjs` sunucu başladığında 15 saniyelik sipariş kontrolünü ve 5 saniyelik Telegram kuyruk kontrolünü başlatır. Aynı süreçte Next rotalarıyla aynı SQLite dosyası ve sorgu kilidi kullanılır. Web Push kullanıcıları ortak hesapların etkinlik durumuna göre eşitlenir. Her iki push göndericisi kendi VAPID anahtarını istek bazında kullanır; birbirinin anahtarını değiştirmez.

## Kalıcı veriler

İki farklı veri alanı korunur:

| Alan | İçerik |
| --- | --- |
| `/app/data` (`natura-data` volume) | Mevcut `natura.sqlite`, ürün fotoğrafları, kafe kullanıcıları, kasa/adisyon/cari kayıtları |
| `/app/online-data` (`mutfak-data` volume) | Mevcut `sites.sqlite`, `sites-data.key`, `web-push.key`, online yedekler |

`sites.sqlite` ile **aynı** `sites-data.key` birlikte bağlanmalıdır. Mevcut şifreli bağlantı verisi varken anahtar eksikse servis yeni anahtar üretip verileri kullanılamaz hale getirmek yerine hata verir. Boş yeni kurulumda anahtar otomatik üretilir. Eski portal kullanıcılarının parolaları ve etkinlikleri geri dönüş için korunur; ortak oturumdan erişim verilir.

## Dokploy geçişi

1. Mevcut iki uygulamanın kalıcı alanlarının geri döndürülebilir bir kopyasını alın. Kafe uygulamasının Compose proje/servis ve `natura_data` volume adını değiştirmeyin; boş bir kafe veritabanı oluşmamalı.
2. Mevcut `natura-menu` deposunu ve Dokploy’daki mevcut `menu` servisini kullanın; yeni depo, proje veya servis oluşturulmaz. Tek `compose.yaml` yeterlidir. Mevcut kafe alanının gerçek Docker adı `natura-data` olarak son ekran görüntüsüyle doğrulandı. Compose içindeki `natura_data` takma adı bu mevcut alana bağlanır. Sipariş uygulamasının ayrı volume adı da kendi Mounts ekranıyla `mutfak-data` olarak doğrulandı. `ONLINE_VOLUME_NAME` varsayılan olarak bu mevcut alanı kullanır. Bu ayrı alan `/app/online-data` altına bağlanır. `external: true` bu alan yoksa boş bir volume oluşturmak yerine dağıtımı durdurur. Önceden `compose.unified.yaml` eklenmişse uyumluluk için kalabilir; artık zorunlu değildir.
3. Mevcut `ADMIN_PASSWORD` ve **aynı `SESSION_SECRET`** korunur. İki kaynakta mevcut hesaplar ve parolalar korunur. Aynı kullanıcı adında kafe parolası kafe hesabını, farklı sipariş parolası online hesabı açar. Aynı parola iki kayıtta da doğrulanırsa her alanın mevcut yetkisi kendi geçerli oturumundan korunur; online yönetici olmak kafe yöneticiliği vermez. Aktarım kontrolü ortak kullanıcı adlarını ayrıca raporlar. Yeni değerler:

   ```dotenv
   APP_URL=https://natura.beyoglumutfagi.com
   MENU_URL=https://natura.beyoglumutfagi.com
   PANEL_URL=https://mutfak.beyoglumutfagi.com
   ONLINE_DATA_DIR=/app/online-data
   MENU_VOLUME_NAME=natura-data
   ONLINE_VOLUME_NAME=mutfak-data
   TELEGRAM_BOT_TOKEN=MEVCUT_BOT_ANAHTARI
   TELEGRAM_CHAT_ID=-1003875674660
   ```

   Bot anahtarını mevcut sipariş servisinden Dokploy Environment alanına aktarın; GitHub'a veya sohbet içine koymayın.
4. Aynı sipariş verisine iki servis birden yazmamalı. Kısa geçiş sırasında eski sipariş servisini durdurun, volume'u birleşik servise bağlayıp birleşik servisi başlatın. Eski servisi ve volume'u silmeyin.
5. Cloudflare Tunnel'da **iki hostname'i aynı birleşik servisin 3000 portuna** yönlendirin. `natura` müşteri menüsünü, `mutfak` yönetim panelini sunucu tarafında ayırır. QR adresi değişmez.
6. Kontrol: QR menü, eski `/admin` yönlendirmesi, yönetici/çalışan girişi, Masalar/Kasa/Cari, üç restoran bağlantısı, Siparişler/Yorumlar ve ortak Ayarlar. Gerçek sipariş kabulü veya yorum yanıtı test için gönderilmez. Kafe bilgisayarında deneme fişi ve telefonda bildirim izni ayrıca doğrulanır.
7. Telefonun kafe ve online sipariş bildirimlerini yeni ortak oturumla tekrar etkinleştirin. PWA mevcut `mutfak` alanında güncellenir. Ortak kullanıcıdan çıkış iki bildirim aboneliğini de kapatır.

Geri dönüş: birleşik servisi durdurun; eski sipariş servisini aynı volume ve eski alan adı yönlendirmesiyle yeniden açın. Natura'nın önceki sürümünü mevcut kafe volume'u ile geri dağıtın. İki eski uygulamanın verileri farklı volume'larda kaldığı için tablo birleştirme veya geri alma SQL'i gerekmez.

## Kontroller

`node scripts/build-online.mjs`, `pnpm typecheck`, `pnpm test`, `pnpm build` çalıştırılır. Windows'ta Turbopack alt işlem sorunu yaşanırsa yerel yayın kontrolü `pnpm exec next build --webpack` ile yapılabilir. Linux Docker varsayılan derleme komutunu kullanır.

`tests/unified-panel.test.ts`, alan adı ayrımını, eski bağlantıları, CSRF kaynağını, ortak rol sınırlarını ve bildirim kullanıcılarının devre dışı kalmasını kontrol eder. Canlı veritabanı/Trendyol API'si testlerde kullanılmaz.

### Ortak sabit çerçeve

Sipariş portalının dar koyu yeşil sol menüsü bütün bölümlerde sabittir (masaüstü 88 px, mobil 72 px). Uber Eats/Trendyol Go bağlantı barı da bütün bölümlerde alt kenarda sabit kalır; gerçek son başarılı kontrol zamanından geçen süreyi gösterir. Aynı bağlantı barı iç sipariş ekranından kaldırılmıştır. Sekme geçişi sipariş çalışma alanını kapatmaz.

Kafe/QR menü ayarları ile online bağlantılar masaüstünde iki sütunda, mobilde alt alta görünür. Ortak durum bilgileri (15 dk hazırlama, bağlı hesap sayısı, otomatik baskı) sol menüden alt barın sağına taşınmıştır. Mobilde alt barın durum satırı sağa hizalanır; logo ve restoran güncellemeleri üst satırda solda kalır.

### Gerçek veri ve hesap koruması

`compose.yaml`, `REQUIRE_EXISTING_DATA=1` ile başlar. Kafe/cari veya sipariş dosyaları yoksa servis boş veritabanı oluşturarak başlamaz. `node scripts/check-unified-data.mjs` dosyaları salt okunur açar; bütünlük, ilişkiler, tablo kayıt adetleri ve ortak kullanıcı adlarını raporlar. `node scripts/backup-unified.mjs` iki SQLite dosyasını WAL destekli çevrimiçi yedekler; kafe fotoğraflarını ve sipariş anahtarlarını birlikte saklar. Bütün cari hesaplar, borç/alacak hareketleri, açık/kapalı adisyonlar, ödemeler, çalışanlar ve parola özetleri tam veritabanı kopyasında bulunur. Bu dosyalar gizli tutulmalı ve GitHub'a konmamalıdır. Ortamda tutulan mevcut `SESSION_SECRET` ve `ADMIN_PASSWORD` da Dokploy'da korunur.

Yerel ön izleme farklı test veritabanları kullanır. Canlı veriler yalnız gerçek volume'lar bağlanarak veya sunucudan bu yedekler güvenli biçimde alınarak gösterilebilir; `http://menu:3000` sunucunun iç Docker adresidir, yerel bilgisayardan dosya erişimi sağlamaz.

Müşteri QR menüsünden sipariş verme ve paneldeki Müşteri Siparişleri bölümü kaldırıldı. `/api/orders` ve `/api/pos/orders` rotaları yoktur. Garson çağrıları ile personelin masa/hızlı siparişleri ve Trendyol sipariş işlemleri devam eder. Eski QR istekleri bildirim üretmez veya gün kapatmayı engellemez; tarihsel veriler dağıtım sırasında silinmez.

Kullanıcı yönetimi `/api/admin/users` üzerinden yapılır. Eski ayrı çalışan/online kullanıcı arayüzleri kaldırıldı. `user_access` tablosu mevcut kimliklere uygulama rollerini bağlar; eski parola özetleri yalnız şifre değiştirildiğinde yenilenir. Ana yönetici silinemez, kullanıcı kendisini devre dışı bırakamaz. Rol değişimi her istekte kontrol edilir; iptal edilen veya silinen hesaplar bildirim alamaz.


## Sipariş, oturum ve bildirim güncellemesi — 19 Kasım 2026

- Trendyol sorgusu sunucuda ortak 15 saniyelik döngüyle sürer. Panel /api/online-events üzerinden yalnız değişiklik sinyali alır ve kayıtlı durumu hemen okur. Durum okuma yeni bir Trendyol sorgusu/yedekleme başlatmaz; otomatik online yedekleme arka plan döngüsünde saatlik sınırıyla korunur. Olay bağlantısı yoksa 15 saniyelik yedek sorgulama, sağlıklı bağlantıda 60 saniyelik kontrol kullanılır.
- Ekrana dönüş, pageshow ve internetin geri gelmesi online akışı yeniden bağlar. Takılı kalan durum okuması iptal edilir; mutasyonlar tekrar gönderilmez. Veri isteklerinin süre sınırı ve birleştirilmiş yenileme kuyruğu vardır.
- Oturum ömrü 12 saat olarak korunur. Kullanım sırasında 5 dakikada bir ve ekrana dönüşte /api/auth/session ile geçerli oturum yenilenir. Süresi dolmuş, pasifleştirilmiş veya silinmiş hesap yenilenemez. Yeni kök panel adresinde de 401 girişe yönlendirir. Telefonun işletim sistemi ekran kilitliyken tarayıcı bağlantısını uyutabilir; push bildirimleri ayrı servis üzerinden yürür.
- Kafe Yazdır/Önizle işlemleri mevcut panelde fiş penceresi açar. Fiş biçimi, kâğıt tercihi ve baskı çağrısı korunur. Fiş yalnız aynı kaynaktaki panelde çerçevelenebilir. Online otomatik baskı değişmez ve kafe ekranları açıkken de çalışır.
- Üstte tek Bildirimler düğmesi vardır. Uygulama sesi ve telefon bildirimi bu pencereden yönetilir. Admin/kasiyer iki bildirim kanalına, garson çağrı kanalına, mutfak online sipariş kanalına abone olur. Abonelikte servis kapsamı ve anahtar kontrol edilir. Bildirime basıldığında mevcut panel penceresi kullanılır.
- Mobil ayarlar İşletme / Kullanıcılar / Bağlantılar / Sistem bölümlerine ayrılır. Formlar bölüm geçişinde korunur. Masaüstünde mevcut iki sütun sürer.
- Operasyon başlıkları aynı yazı ailesi/ölçülerine yaklaştırıldı. Mobil form yazıları odaklanırken gereksiz yakınlaştırmayı önlemek için 16 pikseldir. Alt durum bandı tek satırda restoran logoları, güncellik süresi ve kısa göstergeleri korur. Bant saati 5 saniyede bir güncellenir. Müşteri menüsü operasyon akışına abone olmaz; görselleri boyutlandırılmış, tembel ve asenkron yüklenir.

Doğrulama: üretim derlemesi, 85 birim/entegrasyon testi, 15 tarayıcı senaryosu; beş genişlikte panel ve online ekran taşma kontrolü. Baskı çağrıları ve Trendyol aksiyonları yalıtılmış testlerde taklit edildi. Gerçek termal çıktı veya kilitli telefona fiziksel bildirim teslimi bu testlerde ölçülmedi.


## Mobil kaydırma düzeltmesi — 19 Kasım 2026

Bağlantılar sayfasında iç çerçevenin belge yüksekliği 2039 px, görünür çerçeve 1953 px idi. İçeride kalan 86 px kaydırma, ana sayfaya geçmeden hareketi yakalıyordu. İç gövdenin eski 68 px alt boşluğu kaldırıldı; tüm online görünümler kendi içerik yüksekliğini, görünüm adıyla ve yalnız değiştiğinde panele bildirir. Ana belge tek dikey kaydırma sahibidir. Ölçümde aynı 600 px hareket önceden yalnız iç alanı 86 px, düzeltmeden sonra ana sayfayı 600 px kaydırdı; iç kaydırma sıfır kaldı.

- Siparişler, Yorumlar ve Bağlantılar içerik yüksekliğiyle genişler; ekran boyu sabit iç kaydırma kullanılmaz.
- Ayar bölümleri mobilde üst başlığın altında sabitlenir. Bölüm/menü değişimi sayfa başına döner; menünün kapanış odağı sayfayı oynatmaz.
- Gizli sipariş görünümünün hesaplama ve kart çizimi durur; sipariş sorgusu, zil ve otomatik baskı sürer. Tekrarlanan durum mesajları ve değişmeyen kart HTML'si yeniden işlenmez.
- Yorum kartları sabit anahtarlarla güncellenir. Açık yanıt alanı ve yazılmış taslak filtreleme sırasında korunur.
- İlk açılışta istenen online görünüm, uygulama hazır olana kadar saklanır.
- Uzun online sayfalardaki sipariş detay penceresi telefonun görünür alanında açılır; kendi sınırlı detay kaydırmasını korur.

Doğrulama: üretim derlemesi, 85 birim/entegrasyon testi, dokunmatik kaydırma ve uzun sipariş detayı dahil 18 tarayıcı senaryosu; beş ekran genişliğinde tüm panel bölümlerinin taşma kontrolü. Gerçek sipariş, ödeme veya yorum gönderilmedi.
