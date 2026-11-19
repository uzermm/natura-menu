# Online Mutfak — birleşik panel

## Adresler ve giriş

- `https://natura.beyoglumutfagi.com/`: mevcut müşteri QR menüsü.
- `https://mutfak.beyoglumutfagi.com/`: tek yönetim paneli, giriş `/login`.
- Eski `natura.../admin` adresi yeni panele yönlenir. Kasa fişleri yeni panelde `/adisyon/<id>` olarak açılır; eski fiş bağlantıları aynı fişe yönlenir.
- `PANEL_URL` alan adı geçişini açar. Yerel kullanımda veya geçiş öncesinde boş bırakıldığında `/admin` çalışır.
- Ortak giriş Natura'daki mevcut yönetici/çalışan hesaplarını kullanır. Yönetici bütün bölümlere erişir. Kasiyer ve garson Siparişler/Yorumlar ekranlarını ve sipariş aksiyonlarını kullanır; API bağlantıları ve kullanıcı yönetimi yalnız yöneticidedir. Eski portal hesapları ayrı giriş yapmaz; gerekirse yönetici bunları ortak Çalışanlar bölümünde oluşturur.

## Uygulama yapısı

Natura ana uygulamadır. `online/` altında sipariş projesinin kaynakları, görselleri ve SQLite adaptörü bulunur. Kaynak sürüm: `uzermm/online-mutfak-sites-dokploy@08e5791`. Bu klasör `.git` veya gerçek sunucu anahtarı içermez.

Sipariş ve yorum arayüzleri, ortak sol menünün içinde aynı kökenden yüklenen kalıcı bir çalışma alanında açılır. Tek sunucu taraflı Natura oturumu iki modülde de doğrulanır; ikinci bir portal girişi yoktur. Çalışma alanı sekme geçişlerinde kaldırılmaz: sipariş kontrolü, zil ve etkin otomatik baskı sürer. Tarayıcı baskısı için kafe bilgisayarındaki mevcut Chrome sessiz baskı ilkesi ve varsayılan yazıcı kullanılmaya devam eder. Fiziksel yazıcı testi kafede yapılmalıdır.

`online/runtime.mjs` sunucu başladığında 15 saniyelik sipariş kontrolünü ve 5 saniyelik Telegram kuyruk kontrolünü başlatır. Aynı süreçte Next rotalarıyla aynı SQLite dosyası ve sorgu kilidi kullanılır. Web Push kullanıcıları ortak hesapların etkinlik durumuna göre eşitlenir. Her iki push göndericisi kendi VAPID anahtarını istek bazında kullanır; birbirinin anahtarını değiştirmez.

## Kalıcı veriler

İki farklı veri alanı korunur:

| Alan | İçerik |
| --- | --- |
| `/app/data` | Mevcut `natura.sqlite`, ürün fotoğrafları, kafe kullanıcıları, kasa/adisyon/cari kayıtları |
| `/app/online-data` (`natura-data` volume) | Mevcut `sites.sqlite`, `sites-data.key`, `web-push.key`, online yedekler |

`sites.sqlite` ile **aynı** `sites-data.key` birlikte bağlanmalıdır. Mevcut şifreli bağlantı verisi varken anahtar eksikse servis yeni anahtar üretip verileri kullanılamaz hale getirmek yerine hata verir. Boş yeni kurulumda anahtar otomatik üretilir. Eski portal kullanıcılarının parolaları ve etkinlikleri geri dönüş için korunur; ortak oturumdan erişim verilir.

## Dokploy geçişi

1. Mevcut iki uygulamanın kalıcı alanlarının geri döndürülebilir bir kopyasını alın. Kafe uygulamasının Compose proje/servis ve `natura_data` volume adını değiştirmeyin; boş bir kafe veritabanı oluşmamalı.
2. Natura servisini bu depodaki birleşik sürümden derleyin. Compose'a `compose.yaml` ve ardından `compose.unified.yaml` ekleyin. İkinci dosya eski sipariş volume'unu **kopyalamadan** `/app/online-data` altına bağlar. `ONLINE_VOLUME_NAME`, Dokploy'un eski sipariş uygulamasında `/app/data` için gösterdiği gerçek Docker volume adıdır; `/app/data` adıyla karıştırmayın. Mevcut sipariş volume adı kullanıcı tarafından `natura-data` olarak doğrulandı; override dosyası bunu varsayılan olarak kullanır. `external: true` mevcut volume yoksa boş bir volume oluşturmak yerine dağıtımı durdurur.
3. Mevcut `ADMIN_PASSWORD` ve **aynı `SESSION_SECRET`** korunur. Ortak kullanıcılar mevcut Natura hesaplarıdır. Yeni değerler:

   ```dotenv
   APP_URL=https://natura.beyoglumutfagi.com
   MENU_URL=https://natura.beyoglumutfagi.com
   PANEL_URL=https://mutfak.beyoglumutfagi.com
   ONLINE_DATA_DIR=/app/online-data
   ONLINE_VOLUME_NAME=natura-data
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
