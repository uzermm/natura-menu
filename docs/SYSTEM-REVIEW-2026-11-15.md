# Natura Menü — sistem incelemesi

15 Kasım 2026 · İncelenen uygulama sürümü: `56d8a75`.

**Sonraki uygulama durumu:** Sharp 0.35.5 güncellemesi yapıldı; üretim bağımlılık denetimi sıfır uyarı verdi. Eski çalışan erişimi kapatıldı. Taslak kurtarma, ödeme türü düzeltme/iade, günlük kasa ve yöneticiyle gün kapatma eklendi. Çalışanlar kasiyer/garson/mutfak olarak kaydedilir fakat bütün yetkileri kapalıdır. İşletme tercihiyle otomatik tam yedekleme yapılmaz; gün kapatmada yalnız cari verileri korunur ve tek cari koruma dosyası yenilenir. Güncel kullanım [Gün kapatma rehberindedir](GUN-KAPAT.md). Aşağıdaki inceleme, belirtilen eski sürümün tarihsel bulgularını içerir.

İstenen beş değişiklik GitHub’a yüklendikten sonra kaynak kod, üretim bağımlılıkları, ödeme/veri akışları, Docker yapısı, yedekten dönüş ve mobil tasarım incelendi. Aşağıdaki öneriler henüz uygulanmış özellikler değildir. Sunucuya yönetici erişimi kullanılmadı; canlı veritabanına sipariş, ödeme veya çağrı yazılmadı. İşlem testleri ayrı test veritabanlarında yapıldı.

## Sonuç

Tek işletme ve tek uygulama örneği için mevcut Next.js + SQLite yapısını korumak mantıklı. Yeni bir veritabanı servisi veya sürekli çalışan ek hizmet eklemeyi gerektiren bir ölçüm çıkmadı. Ödeme işlemlerinin transaction içinde olması, tekrar gönderilen isteğin ikinci tahsilat oluşturmaması ve cihazlar arası sürüm kontrolü iyi temeller.

Öncelikli işler: görsel işleme bağımlılığının güvenlik güncellemesi, kaldırılan çalışan ekranından kalan giriş servisinin kapatılması, otomatik sunucu dışı yedek ve onaylanmamış siparişlerin kurtarılması. Restomenum’den tamamen geçmeden önce ödeme düzeltme/iade ve kasa mutabakatının eklenmesini öneriyorum.

## Bu sürümde tamamlananlar

- Dolu masaya taşıma, hesap birleştirme olarak çalışıyor. Ürünler, ödenmiş adetler, ödemeler ve indirimler hedef adisyonda korunuyor. Kaynak masa boşalıyor.
- Kaynak adisyonun önceki ürün/ödeme/not dökümü arşivleniyor; eski cari fiş bağlantısı korunuyor. Birleştirme kapanan satış veya yeni tahsilat olarak ikinci kez sayılmıyor. Eski fişte belgenin geçmiş kaydı olduğu belirtiliyor.
- Hedef adisyon seçildikten sonra değişirse birleştirme reddediliyor; aynı işlemi yeniden göndermek ikinci birleştirme yapmıyor.
- Mobil sipariş listesi 80 piksel, yaklaşık iki satır, yukarı genişletildi.
- Boş masalar mobil ve masaüstünde siyah dolgu/beyaz yazıyla gösteriliyor.
- Mobil yenile düğmesi ses düğmesinin yanına taşındı.
- Garson çağrısı olan boş veya dolu masa mor dolgu ve zil simgesiyle gösteriliyor. Boş masanın çağrısı Açık Masalar içinde de görünüyor. İlgilenildi, boş masada adisyon oluşturmadan çağrıyı kapatıyor. Ayrı çağrılar sekmesi kaldırıldı.

## Doğrulananlar ve kapsam sınırı

| Kontrol | Sonuç |
|---|---|
| TypeScript, yerel üretim derlemesi | Geçti; Windows’ta webpack ile |
| Birim testleri | 29 test geçti |
| Mobil/masaüstü işlem testi | Birleştirme, parçalı ödeme, notların korunması, çağrı renklendirme, çağrı karşılama ve yenile düğmesinin yeri geçti |
| GitHub Linux ve Docker kontrolleri | `56d8a75` için başarılı: [çalıştırma kaydı](https://github.com/uzermm/natura-menu/actions/runs/43716765582) |
| Canlı erişim | Menü ve sağlık kontrolü 200; girişsiz `/admin` giriş sayfasına yönlendiriyor; girişsiz `/api/pos` 401; kaldırılan `/garson` 404 |
| Üretim bağımlılık denetimi | `pnpm audit --prod`: doğrudan kullanılan Sharp sürümü için 3 yüksek seviyeli uyarı; kritik seviyede kayıt yok |
| Gerçek sunucu CPU/RAM, disk, yedek zamanlayıcısı | Sunucu yönetim erişimi olmadığı için doğrulanmadı |

Canlı sağlık yanıtında sürüm bilgisi yok. Bu nedenle canlı erişimin açık olması tek başına hangi Git commit’inin çalıştığını kanıtlamaz. Gerçek ödeme cihazından tahsilat, fiziksel yazıcı çıktısı ve gerçek kasa sayımı bu incelemenin parçası değildir.

## Öncelikli bulgular

### 1. Görsel işleme paketini güncelle — yüksek öncelik

Görsel yükleme uç noktası doğrudan `sharp` kullanıyor; kilit dosyasındaki bu doğrudan bağımlılık `0.34.5`. Denetimde üç yüksek seviyeli uyarı çıktı. Next.js’in kendi daha yeni Sharp kopyasının bulunması, yükleme kodunun kullandığı eski kopyayı düzeltmiyor.

Uyarılar ve düzeltilen alt sürümler: [libvips / 0.35.0](https://github.com/advisories/GHSA-f88m-g3jw-g9cj), [libheif / 0.35.4](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c), [librsvg / 0.35.5](https://github.com/advisories/GHSA-wq5f-xc86-pv6w). Bu üç kayıt için en az `0.35.5` gerekir; uygulanırken güncel uyumlu sürüm ayrıca kontrol edilmeli.

Görsel yüklemek yönetici girişi gerektiriyor; halka açık anonim dosya yükleme yok. Bu, erişimi sınırlar fakat bağımlılık güncellemesinin yerini tutmaz. Özellikle dosya biçimi kontrolünden önce metadata okunuyor; uzantı veya sonradan yapılan format kontrolü bütün çözücü risklerini ortadan kaldırmaz.

Öneri: doğrudan bağımlılığı güncelle, kilit dosyasını yenile, JPEG/PNG/WebP/AVIF dönüşüm ve Docker testlerini çalıştır, ardından üretim bağımlılık denetimini tekrar et. Haftalık bağımlılık denetimini GitHub kontrollerine ekle.

Kanıt: [yükleme kodu](../src/app/api/admin/upload/route.ts), [bağımlılıklar](../package.json), [kilit dosyası](../pnpm-lock.yaml).

### 2. Eski çalışan girişini sunucu tarafında da devre dışı bırak — yüksek öncelik

Garson sayfaları ve hesap yönetimi arayüzü kaldırılmış durumda. Ancak `/api/staff/login` hâlâ mevcut ve aktif eski çalışan hesabı doğru şifreyle oturum alabiliyor. Operatör kontrolü de bu oturumu kabul ediyor. Bu davranış ayrı test hesabıyla doğrulandı; şifresiz giriş veya yönetici yetkisi aşımı tespit edildiği anlamına gelmez.

Beklenmeyen tarafı, ekran kaldırılmış olsa bile eski bir hesabın API üzerinden açık masaları görmeye ve izinli sipariş işlemlerini yapmaya devam edebilmesi. Ödeme, cari, indirim ve birleştirme mevcut kontrolde yöneticiye özel.

Öneri: ortak kullanıcı/yetki sistemi hazırlanırken eski çalışan girişini ve eski oturumların kabulünü sunucuda kapat. Hesap kayıtlarını silmek gerekmez. Yeni sistemde Masalar, menü düzenleme, ödeme, indirim, iade ve rapor izinlerini ayrı tanımla; kullanıcıyı işlem günlüğüne yaz.

Kanıt: [çalışan girişi](../src/app/api/staff/login/route.ts), [operatör kontrolü](../src/lib/operator.ts), [POS izinleri](../src/app/api/pos/route.ts).

### 3. Otomatik sunucu dışı yedek ve geri dönüş planı — yüksek işletim önceliği

Mevcut yedek komutu SQLite’ın çevrimiçi yedekleme yöntemini kullanıyor ve yüklenen görselleri de kopyalıyor. Çalışan WAL veritabanından alınan yedeği ayrı klasöre geri yükledim: veritabanı bütünlük kontrolü, kalan bakiye, ödenmiş adetler, birleşen kaynak adisyon ve dosya hash’i doğrulandı.

Fakat bu komut kendiliğinden zamanlanmıyor; yedekler aynı veri volume’unda oluşuyor ve eski kopyalar otomatik temizlenmiyor. Dokploy üzerinde ayrıca kurulmuş bir sunucu dışı yedek işi olup olmadığını göremiyorum.

Öneri: veri kaybı hedefi seçilerek saatlik veritabanı yedeği, günlük yeni görsellerin sunucu dışına aktarımı ve saklama politikası kur. Örneğin kısa süreli saatlik kopyalar ile daha uzun günlük kopyaları ayır. Bütün görselleri çok sık tam kopyalamak yerine değişmeyen dosyaları tekrar taşımamak disk/ağ yükünü azaltır. Düzenli olarak ayrı bir ortama geri dönüş denemesi yap ve başarısız yedek bildirimini aç.

Kanıt: [yedek komutu](../scripts/backup.mjs), [kurulum/yedek belgesi](DOKPLOY.md), [kalıcı volume](../compose.yaml).

### 4. Onaylanmamış siparişi yenilemeden sonra kurtar — yüksek kullanım önceliği

Sipariş taslağı tarayıcının çalışma belleğinde tutuluyor. Ekrandaki geri düğmesinde onay/sil seçeneği var; fakat sayfa yenilendiğinde onaylanmamış seçimler kayboluyor. Bu davranış yeniden yükleme testiyle doğrulandı. Onaylanmış siparişler etkilenmedi.

Öneri: taslağı cihazda masa/hesap kimliği ve son düzenleme zamanı ile sakla. Sayfa yeniden açılınca otomatik sipariş göndermek yerine “Taslağı geri getir” seçeneği sun. Geri getirmede masa ve fiyatları sunucudan doğrula; gönderim anahtarını da koruyarak ağ kesintisinde ikinci sipariş oluşmasını önle. Bu çözüm sürekli sunucuya taslak yazmayı gerektirmez.

Kanıt: [sipariş taslağı](../src/components/pos-ticket-workspace.tsx), [istek anahtarı](../src/components/pos-panel.tsx).

### 5. Ödeme düzeltme/iade ve kasa mutabakatı ekle — gerçek kasa kullanımından önce

Ödemeler ve ürün iptalleri kayıt altında; ürün adedi ödenmiş adedin altına indirilemiyor. Ancak yanlış nakit/kart seçimi veya yanlış tahsilat için kontrollü ters kayıt/iade akışı bulunmuyor. Günlük özet tahsilatları gösteriyor; açılış kasası, gider, kasa çıkışı ve sayılan tutarla farkın açıklanması yok.

Öneri: ödeme silmek yerine asıl işleme bağlı ters kayıt, zorunlu neden ve kullanıcı kaydı kullan. Ardından vardiya açılış/kapanışı, nakit sayımı ve fark açıklaması ekle. İade ve indirim yetkileri ayrı olmalı. Günlük raporlar için tarih aralığı ve dışa aktarma eklenmeli; şu an kapanan adisyon listesi son 40 kayıtla sınırlı.

Ayrıca indirim tutarı mutlak para olarak saklanıyor. İndirimden sonra ürün eklenirse oran otomatik olarak yeni ürünlere genişlemiyor. Ödeme başladıktan sonra indirimi değiştirme kuralı açıkça belirlenmeli.

Kanıt: [işlem ve kasa hesapları](../src/lib/pos-core.ts), [ödeme penceresi](../src/components/pos-item-payment.tsx), [kasa ekranları](../src/components/pos-panel.tsx).

## Tasarım ve mobil kullanım

Yeni istenen 80 piksel büyütme, sipariş listesindeki iki satıra alan kazandırıyor. Karşılığında kısa telefonlarda üstteki görünür ürün sayısı azalıyor. Ölçülen görünüm:

| Ekran | Ürün bölümü | Sipariş bölümü | Tam görünen ürün | İşlem düğmeleri | Yatay taşma |
|---|---:|---:|---:|---|---|
| 320 × 600 | 219 px | 324 px | 6 | Görünür | Yok |
| 390 × 844 | 353 px | 434 px | 9 | Görünür | Yok |
| 768 × 1024 | 452 px | 515 px | 12 | Görünür | Yok |
| 844 × 390, yatay telefon | 103 px | 230 px | 0 tam kart | Görünür | Yok |

Yatay telefonda kartların bir bölümü görünüyor ve alan kaydırılabiliyor; fakat tek bir kartın tamamı aynı anda görünmüyor. Bu bir kullanım sorunu. Önerim, yüksekliği kısa ekranlarda ürünler ve adisyonu yan yana yerleştiren özel bir düzen. Dikey görünümde ise sabit iki satırlık büyütme yerine kullanıcı tarafından ayarlanabilir bölme ileride daha esnek olabilir.

Tek satırlık siparişler yoğunluğu düzeltti. Buna karşılık uzun ürün adları kesiliyor; ürün notları mobil satırda görünmüyor. Satırı büyütmeden, ürün adına dokunarak tam ad/not bilgisini göstermek yararlı olur. Artı/eksi düğmeleri yaklaşık 24 × 32 px, seçenek düğmesi 28 × 28 px: yoğun kullanımda yanlış dokunmayı azaltmak için görünümü fazla büyütmeden dokunma alanları iyileştirilmeli.

Boş/süreli/çağrılı masa renkleri farklı; çağrı yalnız renkle anlatılmıyor, zil de var. Ses tarayıcıda kullanıcı tarafından açılıyor; arka planda güvenilir push bildirimi olarak değerlendirilmemeli. Müşteri menüsündeki Garson çağır düğmesi önceki isteğe uygun olarak hâlâ pasif. Yeni masa entegrasyonu hazır fakat bunu değiştirmedi.

Kanıt: [ortak sipariş ekranı](../src/components/pos-ticket-workspace.tsx), [ürün kartları](../src/components/pos-product-card.tsx), [tek satır siparişler](../src/components/pos-order-lines.tsx), [müşteri menüsü](../src/components/menu.tsx).

## Performans ve sunucu yükü

SQLite, bellek içi sentetik veritabanında 35 açık masa ve artan kapanmış adisyon geçmişiyle ölçüldü. Her seviyede ısınma sonrası yedi özet sorgusu çalıştırıldı:

| Kapanmış adisyon | Ortanca sorgu | En yavaş örnek | Özet yanıtı |
|---:|---:|---:|---:|
| 1.000 | 7,53 ms | 11,21 ms | 48.739 bayt |
| 10.000 | 10,81 ms | 14,64 ms | 48.739 bayt |
| 50.000 | 22,13 ms | 31,75 ms | 48.739 bayt |

Bu sonuçlar yerel bilgisayardaki sentetik ölçümlerdir; gerçek sunucu, disk, eşzamanlı kullanıcı veya ağ kapasitesi testi değildir. Cari hareketler, çok uzun fişler ve gerçek veri dağılımı aynı olmayabilir.

Mevcut olumlu noktalar: WAL, foreign key ve bekleme süresi ayarları; fiş satırı/ödeme indeksleri; 15 saniyelik kontrol, POS için ETag/304; görünmeyen sekmede sorguların durması; menü kataloğunun her kontrolde yeniden gönderilmemesi; yerel WebP dosyalarının uzun süreli önbelleği.

Önerilen küçük iyileştirmeler:

1. POS ve çağrı kontrolünü ortak bir sürüm kontrolünde toplamak. Şu an açık bir yönetim sekmesinde iki ayrı 15 saniyelik kontrol var; boşta POS yanıtı küçük olsa da çağrı yanıtı her seferinde geliyor.
2. Kapanan 40 adisyonun bütün satır/ödemelerini ve cari özetini yalnız ilgili ekran açılınca istemek. Masalar görünümünde önce sadece gerekli açık hesaplar taşınabilir.
3. Günlük kapanış sorgusunu tarih aralığı ve uygun indeksle iyileştirmek; `datetime/substr` filtreli kapanan kayıt sorgusu geçmiş büyüdükçe daha fazla satır inceliyor.
4. İşlem günlüğü ve tekrar gönderim kayıtları için arşiv politikası belirlemek. İstek anahtarlarını düşünmeden silmek eski bir isteğin yeniden işlenmesine yol açabilir; saklama süresi işlem türüne göre tasarlanmalı.
5. Compose içinde CPU/RAM sınırı tanımlı değil. Gerçek RAM ve tepe kullanım ölçüldükten sonra sınır ve görsel yükleme eşzamanlılık limiti koymak. Gelişigüzel düşük bellek limiti uygulamayı kapatabilir.

Şimdilik Redis, ayrı kuyruk, websocket servisi veya PostgreSQL eklemeyi önermiyorum. Önce bu küçük düzenlemeler ve gerçek sunucu ölçümü daha uygun.

## Güvenlik ve işletim notları

- Yönetici şifresi scrypt ile saklanabiliyor; şifre değişimi eski yönetici oturumlarını geçersiz kılıyor. Oturum çerezlerinde üretimde HttpOnly, Secure ve SameSite var. Durum değiştiren isteklerde kaynak kontrolü ve şema doğrulaması uygulanıyor.
- Ham kart numarası işlenmiyor. Kart/yemek kartı seçimi harici cihazdan alınan ödemenin kayıt türü; uygulama banka cihazından tahsilat yapmıyor.
- Docker uygulaması root kullanıcıyla çalışmıyor; kalıcı volume, sağlık kontrolü ve dönen loglar tanımlı. Depoda takip edilen gerçek ortam dosyası/veritabanı görünmedi; `.env.example` takip ediliyor.
- Canlı yanıtlarda HSTS başlığı görülmedi; CSP içinde `unsafe-inline` ve `unsafe-eval` var. Uygulama davranışı test edilerek daha sıkı başlıklar/nonce kullanımı değerlendirilmeli. HSTS’nin bütün alt alanlara körlemesine uygulanmasını önermiyorum.
- Hız sınırlamasındaki IP anahtarı `x-forwarded-for` başlığının ilk değerinden geliyor. Proxy’nin bu başlığı güvenilir biçimde oluşturduğu sunucu ayarlarından doğrulanmalı; bu incelemede proxy yapılandırmasına erişilmedi.
- Görseller yeni UUID’lerle saklandığı için eski dosyalar zamanla birikiyor. Canlı referansları ve yedek saklama politikasını dikkate alan güvenli temizlik planı yararlı olur.
- İade, kritik yetki ve güvenlik uyarıları için uygulama seviyesinde bildirim/izleme eklenebilir. Sürüm numarası/commit bilgisinin sağlık yanıtında bulunması hangi sürümün çalıştığını ayırt etmeyi kolaylaştırır.

## Testlerin sonraki aşaması

GitHub’da birim testleri ve Linux/Docker işlem testleri var. Mobil tarayıcı kontrolleri bu çalışma sırasında yerel test aracıyla yapıldı; depodaki otomatik CI akışında tarayıcı testleri henüz yok. 320/390 piksel ekran, yatay telefon, ürün seçme/onay, bölünmüş ödeme, masa birleştirme ve çağrı karşılama için kalıcı tarayıcı testlerini CI’a taşımayı öneriyorum.

Restomenum’den geçişte önce bir süre aynı örnek hesapları iki sistemde karşılaştırıp nakit, kart, yemek kartı, cari ve indirim toplamlarının uyuşmasını görmek uygun olur. Yazıcıda A4 ve Possify için gerçek cihaz çıktısı ayrıca kontrol edilmeli. Bu inceleme fiziksel yazıcı veya gerçek banka işlemi testi yerine geçmez.

## Önerdiğim uygulama sırası

1. Sharp güvenlik güncellemesi ve eski çalışan erişiminin kapatılması.
2. Otomatik sunucu dışı yedek, saklama politikası ve geri dönüş denemesi.
3. Cihazda sipariş taslağı kurtarma ve yatay telefon düzeni.
4. Kontrollü ödeme düzeltme/iade, vardiya kapanışı ve kasa farkı.
5. Ortak kullanıcı/rol izinleri ve kullanıcı bazında işlem raporu.
6. Tarih aralıklı raporlar, daha küçük özet yanıtları ve kalıcı mobil tarayıcı testleri.
