# Natura Bistro — Dokploy kurulumu

Bu proje Next.js sunucusu, SQLite ve yerel WebP görsel depolaması kullanır. Harici veritabanı veya Supabase gerekmez. **Tek uygulama örneği** çalıştırın; aynı SQLite dosyasıyla birden fazla replika açmayın.

## 1. Alan adını yönlendirin

DNS sağlayıcınızda `natura.beyoglumutfagi.com` için sunucunuzun IPv4 adresine bir **A kaydı** ekleyin. IPv6 kullanmıyorsanız eski bir AAAA kaydı bırakmayın. Sunucuda 80 ve 443 portları erişilebilir olmalı. Cloudflare kullanıyorsanız ilk sertifika kurulumu sırasında DNS only kullanabilirsiniz.

## 2. Dokploy projesini oluşturun

1. Dokploy’da bir proje oluşturun: `Natura Menü`.
2. Proje içinde **Docker Compose** servisi oluşturun. Deployment Type **Docker Compose** olsun; `build` kullanan bu dosya için Docker Stack seçmeyin.
3. Source / Provider alanından GitHub’ı seçin. Depo: `uzermm/natura-menu`, dal: `main`.
4. Compose dosyası yolu: `compose.yaml` (bazı sürümlerde `./compose.yaml`).
5. Build Path soruluyorsa `/` seçin. Depo kökü kullanılmalı.

## 3. Gizli değerleri girin

Servisin **Environment** bölümüne şunları ekleyin:

```dotenv
ADMIN_PASSWORD=BURAYA_EN_AZ_12_KARAKTERLIK_BENZERSIZ_SIFRENIZ
SESSION_SECRET=BURAYA_RASTGELE_64_HEX_KARAKTER
```

Yer tutucuları gerçek değerlerle değiştirin. Şifre yöneticinizle uzun bir şifre oluşturabilirsiniz. Oturum anahtarı için sunucu terminalinde aşağıdaki komutu çalıştırıp çıktıyı **yalnız Dokploy Environment alanına** yapıştırın:

```sh
openssl rand -hex 32
```

Gerçek değerleri GitHub’a, ekran görüntüsüne veya sohbet mesajına eklemeyin. `SESSION_SECRET` kalıcı olmalıdır: değiştirmek tüm yönetici oturumlarını ve basılmış masa QR bağlantılarını geçersiz kılar. Admin panelinde Ayarlar → Yönetici şifresi bölümünden mevcut şifrenizi girerek şifrenizi değiştirebilirsiniz. Yeni şifre SQLite içinde rastgele tuzla scrypt özeti olarak saklanır; yeniden dağıtım ve yeniden başlatmalarda korunur. Diğer yönetici oturumları kapanır; masa QR kodları etkilenmez. Panelden şifre değiştirildikten sonra ADMIN_PASSWORD değeri giriş şifresini değiştirmez.

Alan adı `compose.yaml` içinde `APP_URL=https://natura.beyoglumutfagi.com` olarak hazırdır. Alan adı değişirse bu değeri de güncelleyin.

## 4. Alan adı ve HTTPS

Compose servisinin **Domains** bölümünden yeni alan adı ekleyin:

| Alan | Değer |
| --- | --- |
| Host / Domain | `natura.beyoglumutfagi.com` |
| Service Name | `menu` |
| Container Port | `3000` |
| Path | `/` |
| HTTPS | Açık |
| Certificate | Let's Encrypt |

Dokploy yönlendirme etiketlerini oluşturur. Sunucunun dışına ayrıca `3000` portunu açmanız gerekmez. Compose dosyası Dokploy’un mevcut `dokploy-network` ağına bağlanır.

**Deploy** düğmesine basın. İlk kurulumda paketler ve Next.js derlemesi nedeniyle birkaç dakika sürebilir. Loglarda sunucunun hazır olduğunu ve healthcheck’in başarılı olduğunu kontrol edin.

## 5. İlk kullanım

- Menü: `https://natura.beyoglumutfagi.com`
- Yönetim: `https://natura.beyoglumutfagi.com/admin`
- İlk giriş şifresi: Environment alanına yazdığınız `ADMIN_PASSWORD`. Daha sonra Ayarlar bölümünden değiştirebilirsiniz.
- İlk çalıştırmada kaynak menüdeki **9 kategori / 95 ürün**, fiyatlar ve görünürlük durumları SQLite’a bir defa aktarılır. Daha sonraki dağıtımlarda veriler yeniden yazılmaz.
- **İşletme ayarları:** Masa sayısı `35` olarak hazırdır. Masa sayısını `30` yaparsanız 1–30 aktif kalır; bu masaların mevcut QR kodları değişmez. 31–35 bağlantıları kullanım dışı kalır.
- Adres ve çalışma saatlerini doldurun.
- **İşletme ayarları → Kampanya banner’ı:** Banner’ı açın, menüden ürün seçin, varsa porsiyonunu belirleyin ve kampanya fiyatını girip kaydedin. Görsel ve normal fiyat menüden alınır. Menü fiyatı küçük ve üstü çizili, kampanya fiyatı büyük gösterilir. Banner kapalıysa üstte kutu veya boş alan kalmaz. Ürün gizlenir/tükenir veya kampanya fiyatı menü fiyatından düşük olmaktan çıkarsa banner otomatik gizlenir. Eski karşılama/duyuru alanları artık gösterilmez.
- Alerjen, porsiyon ve etiket bilgilerini ürün ürün mutfakla doğrulayın. Kaynakta bulunmayan alerjenler tahmin edilerek eklenmedi.
- **Masa QR kodları → Yazdır / PDF kaydet:** Masa kodlarını basın. Her kodda masa bilgisi doğrulaması vardır.
- **Garson çağrıları:** Paneli açık tutun ve **Ses aç** düğmesine bir kez basın. Panel çağrıları 5 saniyede bir kontrol eder. Ses için tarayıcının kullanıcı etkileşimi gerekir. Telefon ekranı kilitli / tarayıcı arka plandayken bildirim garantisi yoktur; servis sırasında paneli açık bir cihazda tutun.
- **Garson çağırma:** Müşteri düğmeye basar, açılan ekranda masa numarasını seçer ve çağrıyı onaylar. Masaya özel QR kod gerekmez. Seçenekler paneldeki masa sayısına göre 1’den başlar. Kullanım dışı masalar sunucuda da reddedilir; aynı masanın bekleyen çağrısı çoğaltılmaz. Mevcut masaya özel QR bağlantıları varsa masa seçimini önceden doldurabilir.

## 6. Kalıcı depolama ve güncellemeler

`natura_data` adlı Docker volume uygulamada `/app/data` yoluna bağlanır:

```text
/app/data/natura.sqlite       # Menü, ayarlar, çağrılar
/app/data/natura.sqlite-wal   # SQLite günlük dosyası (varsa)
/app/data/natura.sqlite-shm   # SQLite yardımcı dosyası (varsa)
/app/data/uploads/            # Sonradan yüklenen WebP görseller
/app/data/backups/            # Manuel yedekler
```

GitHub’a yeni sürüm yüklendiğinde Dokploy’dan yeniden Deploy yapın veya Auto Deploy açın. **Aynı Compose servisini ve volume’u kullanın.** `docker compose down -v` çalıştırmayın ve volume’u silmeyin. Servisi farklı adla yeniden oluşturmak yeni bir volume oluşturabilir; önce yedek alın.

Kaynak menü görselleri depodaki `public/menu/` içindedir. Yeni fotoğraflar otomatik olarak EXIF verileri kaldırılmış, yönü düzeltilmiş WebP’ye çevrilir; en çok 1000 px ana sürüm ve 480 px küçük sürüm oluşturulur. Gereksiz büyütme yapılmaz. Orijinal yüklemeler saklanmaz. Kayıplı WebP’de matematiksel olarak sıfır kayıp garanti edilmez; ayarlar görünür kaliteyi korumaya yöneliktir. Görsellerin dosya boyutu içeriğe göre değişir.

Ürüne özel eklenen 12 temsili görsel, mevcut veritabanında boş veya bilinen geçici görsel alanlarına otomatik ve bir defa uygulanır. Panelden yüklediğiniz farklı görseller, ürün fiyatları ve diğer ayarlar korunur. Görsel kayıtları için [üretilen görseller](generated-images.md) belgesine bakın.

## 7. Yedekleme

Dokploy’da çalışan `menu` konteynerinin terminalini açıp çalıştırın:

```sh
node scripts/backup.mjs
```

Bu komut SQLite’ın çevrimiçi yedekleme API’siyle tutarlı bir veritabanı kopyası ve yüklenen görselleri `/app/data/backups/TARIH/` altında oluşturur. Kaynak fotoğraflar GitHub’da bulunduğundan yedekte tekrar saklanmaz. Disk alanını kontrol edin; eski yedekler otomatik silinmez.

**Aynı sunucudaki kopya tek başına yeterli değildir.** Dokploy Volume Backups üzerinden `natura_data` volume’u için sunucu dışı S3 yedeği planlayın. Volume’un ham dosya yedeğini alırken yazmaları durdurun; çalışan veritabanının yalnız `.sqlite` dosyasını kopyalamayın. Üretilmiş tarihli yedek klasörü bağımsız ve tutarlıdır. Güvenli bir kopyayı ayrıca sunucu dışına indirin.

Geri yükleme:

1. Servisi durdurun; güncel verilerin ayrı yedeğini alın.
2. Volume içindeki `natura.sqlite`, `natura.sqlite-wal` ve `natura.sqlite-shm` dosyalarını mevcut durum yedeğine taşıyın.
3. Seçilen yedeğin `natura.sqlite` dosyasını `/app/data/natura.sqlite` konumuna, `uploads` klasörünü `/app/data/uploads` konumuna geri koyun.
4. Dosya sahibinin konteynerdeki `node` kullanıcısı (`uid 1000`) olduğundan emin olun.
5. Aynı `SESSION_SECRET` ile servisi başlatın; menüyü, giriş işlemini, bir görseli ve test masa çağrısını kontrol edin.

## Sorun giderme

- **502 / Bad Gateway:** `menu` konteyner loglarına, portun 3000 olmasına ve `dokploy-network` bağlantısına bakın.
- **Giriş yapılamıyor:** Panelden şifre değiştirdiyseniz en son belirlediğiniz şifreyi kullanın. İlk kurulumda `ADMIN_PASSWORD` en az 12 karakter; `SESSION_SECRET` en az 32 karakter olmalı. Örnek değerler kabul edilmez. Değişiklikten sonra yeniden Deploy yapın. HTTPS üzerinden giriş yapın.
- **Geçersiz istek kaynağı:** `APP_URL` ile tarayıcıda kullandığınız adres aynı olmalı. Alan adının önüne `www` eklemeyin.
- **Permission denied / SQLite yazılamıyor:** Volume `/app/data` yoluna bağlı mı ve `uid 1000` yazabiliyor mu kontrol edin.
- **QR geçersiz:** Anahtar değiştirilmiş veya masa sayısı azaltılmış olabilir. Panelden güncel QR kodunu alın.
- **Garson sesi yok:** Ses aç düğmesine basın, tarayıcı ses iznini ve cihazın sesini kontrol edin; paneli ön planda tutun.

Resmî kaynaklar: [Dokploy Docker Compose](https://docs.dokploy.com/docs/core/docker-compose), [Compose alan adları](https://docs.dokploy.com/docs/core/docker-compose/domains), [Volume yedekleri](https://docs.dokploy.com/docs/core/volume-backups), [Next.js sunucu dağıtımı](https://nextjs.org/docs/app/getting-started/deploying).
