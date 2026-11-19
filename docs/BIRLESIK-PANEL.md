# Online Mutfak — birleşik panel

## Adresler ve giriş

- `https://natura.beyoglumutfagi.com/`: mevcut müşteri QR menüsü.
- `https://mutfak.beyoglumutfagi.com/`: tek yönetim paneli, giriş `/login`.
- Eski `natura.../admin` adresi yeni panele yönlenir. Kasa fişleri yeni panelde `/adisyon/<id>` olarak açılır; eski fiş bağlantıları aynı fişe yönlenir.
- `PANEL_URL` alan adı geçişini açar. Yerel kullanımda veya geçiş öncesinde boş bırakıldığında `/admin` çalışır.
- Ortak giriş hem Natura'daki mevcut yönetici/çalışan hesaplarını hem de eski sipariş hesaplarını mevcut parolalarıyla doğrular. Yönetici bütün bölümlere erişir. Kasiyer ve garson Siparişler/Yorumlar ekranlarını ve sipariş aksiyonlarını kullanır; API bağlantıları ve kullanıcı yönetimi yalnız yöneticidedir. Eski sipariş kullanıcılarının parola özetleri dönüştürülmez veya sıfırlanmaz. Normal sipariş kullanıcıları yalnız Siparişler/Yorumlar; eski sipariş yöneticisi ek olarak online Ayarlar bölümüne erişir. Bu hesaplara otomatik kafe/kasa/cari yetkisi verilmez. Online Sipariş Kullanıcıları bölümünde mevcut kayıtlar yönetilir.

## Uygulama yapısı

Natura ana uygulamadır. `online/` altında sipariş projesinin kaynakları, görselleri ve SQLite adaptörü bulunur. Kaynak sürüm: `uzermm/online-mutfak-sites-dokploy@08e5791`. Bu klasör `.git` veya gerçek sunucu anahtarı içermez.

Sipariş ve yorum arayüzleri, ortak sol menünün içinde aynı kökenden yüklenen kalıcı bir çalışma alanında açılır. Tek sunucu taraflı Natura oturumu iki modülde de doğrulanır; ikinci bir portal girişi yoktur. Çalışma alanı sekme geçişlerinde kaldırılmaz: sipariş kontrolü, zil ve etkin otomatik baskı sürer. Tarayıcı baskısı için kafe bilgisayarındaki mevcut Chrome sessiz baskı ilkesi ve varsayılan yazıcı kullanılmaya devam eder. Fiziksel yazıcı testi kafede yapılmalıdır.

`online/runtime.mjs` sunucu başladığında 15 saniyelik sipariş kontrolünü ve 5 saniyelik Telegram kuyruk kontrolünü başlatır. Aynı süreçte Next rotalarıyla aynı SQLite dosyası ve sorgu kilidi kullanılır. Web Push kullanıcıları ortak hesapların etkinlik durumuna göre eşitlenir. Her iki push göndericisi kendi VAPID anahtarını istek bazında kullanır; birbirinin anahtarını değiştirmez.

## Kalıcı veriler

İki farklı veri alanı korunur:

| Alan | İçerik |
| --- | --- |
| `/app/data` (`natura-data` volume) | Mevcut `natura.sqlite`, ürün fotoğrafları, kafe kullanıcıları, kasa/adisyon/cari kayıtları |
| `/app/online-data` (sipariş uygulamasının ayrıca doğrulanacak volume’u) | Mevcut `sites.sqlite`, `sites-data.key`, `web-push.key`, online yedekler |

`sites.sqlite` ile **aynı** `sites-data.key` birlikte bağlanmalıdır. Mevcut şifreli bağlantı verisi varken anahtar eksikse servis yeni anahtar üretip verileri kullanılamaz hale getirmek yerine hata verir. Boş yeni kurulumda anahtar otomatik üretilir. Eski portal kullanıcılarının parolaları ve etkinlikleri geri dönüş için korunur; ortak oturumdan erişim verilir.

## Dokploy geçişi

1. Mevcut iki uygulamanın kalıcı alanlarının geri döndürülebilir bir kopyasını alın. Kafe uygulamasının Compose proje/servis ve `natura_data` volume adını değiştirmeyin; boş bir kafe veritabanı oluşmamalı.
2. Mevcut `natura-menu` deposunu ve Dokploy’daki mevcut `menu` servisini kullanın; yeni depo, proje veya servis oluşturulmaz. Tek `compose.yaml` yeterlidir. Mevcut kafe alanının gerçek Docker adı `natura-data` olarak son ekran görüntüsüyle doğrulandı. Compose içindeki `natura_data` takma adı bu mevcut alana bağlanır. Sipariş uygulamasının ayrı volume adı kendi Mounts ekranından doğrulanıp `ONLINE_VOLUME_NAME` olarak yazılmalıdır; varsayılan değer yoktur. Bu ayrı alan `/app/online-data` altına bağlanır. `external: true` bu alan yoksa boş bir volume oluşturmak yerine dağıtımı durdurur. Önceden `compose.unified.yaml` eklenmişse uyumluluk için kalabilir; artık zorunlu değildir.
3. Mevcut `ADMIN_PASSWORD` ve **aynı `SESSION_SECRET`** korunur. İki kaynakta mevcut hesaplar ve parolalar korunur. Aynı kullanıcı adında kafe parolası kafe hesabını, farklı sipariş parolası online hesabı açar. Aynı parola iki kayıtta da doğrulanırsa her alanın mevcut yetkisi kendi geçerli oturumundan korunur; online yönetici olmak kafe yöneticiliği vermez. Aktarım kontrolü ortak kullanıcı adlarını ayrıca raporlar. Yeni değerler:

   ```dotenv
   APP_URL=https://natura.beyoglumutfagi.com
   MENU_URL=https://natura.beyoglumutfagi.com
   PANEL_URL=https://mutfak.beyoglumutfagi.com
   ONLINE_DATA_DIR=/app/online-data
   MENU_VOLUME_NAME=natura-data
   ONLINE_VOLUME_NAME=SIPARIS_UYGULAMASININ_MEVCUT_VOLUME_ADI
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
