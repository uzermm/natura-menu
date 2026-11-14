# Windows USB yazıcı kurulumu

Kasa bilgisayarında Possify/GP-U80250 yazıcısının Windows sürücüsü kurulu olmalı. Windows test sayfasını bastıktan sonra:

1. [Yazdırma yardımcısını ZIP olarak indirin](https://natura.beyoglumutfagi.com/downloads/natura-yazici.zip). Kalıcı bir klasöre çıkartın (ör. `C:\NaturaYazici`). Node.js 24 LTS kurun.
2. Yönetim panelinde **Masalar ve adisyon → Yazıcı → Bağlantı anahtarı oluştur** seçin.
3. Bu klasörde PowerShell açıp `powershell -ExecutionPolicy Bypass -File .\setup.ps1` çalıştırın. Site adresini, anahtarı ve Windows'taki yazıcı adını girin.
4. Windows yazdırma tercihlerinde 80 mm rulo kâğıdı ve otomatik kesiciyi seçin. Tarayıcıda adisyon açıp **Yazdır** seçin. Yardımcı 10 saniye içinde işi alır. Baskı iletişim kutusu açılmaz.

Yardımcı Windows başlangıcına eklenir ve gizli çalışır. Kullanıcı oturumu açık, bilgisayar ve yazıcı açık olmalıdır. Sunucudan kasa bilgisayarına port açılmaz. Yardımcı yalnız HTTPS üzerinden kuyruk kontrol eder. Site yönetici şifresini kullanmaz; sadece yazdırma yetkili anahtarı vardır. `config.local.json` dosyasını paylaşmayın.

Çıktı 80 mm kâğıt / yaklaşık 72 mm içerik genişliği içindir. Örnekteki gibi işletme adı, masa, Türkiye saati, adisyon numarası, adetli ürünler ve toplam bulunur. Türkçe karakterler Windows yazıcı sürücüsüyle çizilir. Fiziksel yazıcıda ilk baskıyla kenar boşluğu ve kesici ayarı kontrol edilmelidir.

**Sonuç belirsizse:** Bir iş yardımcı tarafından alındıktan sonra bağlantı veya elektrik kesilirse otomatik tekrar basılmaz. Panelde “Yardımcıya iletildi · sonucu bekleniyor” görülebilir. Önce kâğıdı ve Windows kuyruğunu kontrol edin; gerekirse adisyondan tekrar Yazdır seçin. “Windows yazıcısına gönderildi” durumu fiziksel kâğıdın çıktığını doğrulamaz.

**Durdurmak:** Görev Yöneticisi'nden bu klasördeki bridge.mjs işlemini kapatın. Otomatik başlatmayı kaldırmak için Windows Başlangıç klasöründeki “Natura Yazici” kısayolunu silin. Anahtar yenilenirse kurulum yeniden çalıştırılmalıdır. Aynı bilgisayarda yardımcının yalnız bir kopyasını çalıştırın.
