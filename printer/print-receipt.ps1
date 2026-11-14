param([Parameter(Mandatory=$true)][string]$ReceiptPath,[string]$PrinterName='')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$receipt=Get-Content -LiteralPath $ReceiptPath -Raw -Encoding UTF8 | ConvertFrom-Json
$ticket=$receipt.ticket
$culture=[Globalization.CultureInfo]::GetCultureInfo('tr-TR')
function Money($cents){return ([double]$cents/100).ToString('N2',$culture)}
$rows=[Collections.Generic.List[object]]::new()
function Row([string]$text,[string]$right='', [string]$style='normal'){$rows.Add(@{text=$text;right=$right;style=$style})}
Row $receipt.business '' 'heading'
Row ('Masa '+$ticket.table_number) '' 'heading'
$date=[DateTimeOffset]::Parse($receipt.printed_at).ToOffset([TimeSpan]::FromHours(3))
Row ($date.ToString('dd MMMM yyyy dddd HH:mm',$culture)) '' 'center'
Row ('Adisyon No: '+$ticket.number) '' 'bold'
Row 'ÜRÜN' 'TUTAR (TL)' 'bold'
Row '' '' 'line'
foreach($line in $ticket.lines){if($line.voided_at){continue};$name=([string]$line.quantity+'x '+$line.name);if($line.variant){$name+=' / '+$line.variant};Row $name (Money ($line.quantity*$line.unit_price)) 'normal';if($line.note){Row ('Not: '+$line.note) '' 'small'}}
Row '' '' 'line'
if($ticket.discount -gt 0){Row 'Ara toplam' (Money $ticket.subtotal);Row 'İndirim' ('-'+(Money $ticket.discount))}
Row 'Toplam:' (Money $ticket.total) 'total'
$labels=@{cash='Nakit';card='Kredi kartı';meal_card='Yemek kartı';account='Cari hesap'}
foreach($payment in $ticket.payments){$name=$labels[$payment.method];if($payment.account_name){$name+=' / '+$payment.account_name};Row $name (Money $payment.amount) 'small'}
if($ticket.paid -gt 0){Row 'Kalan:' (Money $ticket.remaining) 'bold'}
if($ticket.note){Row ('Masa notu: '+$ticket.note) '' 'small'}
Row ('Çalışan: '+$receipt.requested_by) '' 'center'
Row 'BİZİ TERCİH ETTİĞİNİZ İÇİN TEŞEKKÜR EDERİZ!' '' 'center'
Row 'Adisyon / Hesap dökümü' '' 'smallcenter'
$document=[Drawing.Printing.PrintDocument]::new()
if($PrinterName){$document.PrinterSettings.PrinterName=$PrinterName}
if(!$document.PrinterSettings.IsValid){throw 'Windows yazıcısı bulunamadı. Kurulumdaki yazıcı adını kontrol edin.'}
$document.PrintController=[Drawing.Printing.StandardPrintController]::new()
$document.DocumentName=('Natura Adisyon '+$ticket.number)
$document.DefaultPageSettings.Margins=[Drawing.Printing.Margins]::new(8,8,8,12)
$fonts=@{normal=[Drawing.Font]::new('Arial',10,[Drawing.FontStyle]::Regular);bold=[Drawing.Font]::new('Arial',10,[Drawing.FontStyle]::Bold);heading=[Drawing.Font]::new('Arial',17,[Drawing.FontStyle]::Bold);total=[Drawing.Font]::new('Arial',17,[Drawing.FontStyle]::Bold);small=[Drawing.Font]::new('Arial',8,[Drawing.FontStyle]::Regular);center=[Drawing.Font]::new('Arial',9,[Drawing.FontStyle]::Bold);smallcenter=[Drawing.Font]::new('Arial',8,[Drawing.FontStyle]::Regular)}
$measure=$document.PrinterSettings.CreateMeasurementGraphics()
$height=30
foreach($row in $rows){if($row.style -eq 'line'){$height+=5;continue};$available=283;if($row.right){$available-=82};$size=$measure.MeasureString([string]$row.text,$fonts[$row.style],[int]$available);$height+=$size.Height+5}
$measure.Dispose()
if($height -gt 32000){throw 'Adisyon tek rulo sayfasına sığmıyor. Ürün sayısını kontrol edin.'}
$document.DefaultPageSettings.PaperSize=[Drawing.Printing.PaperSize]::new('Natura 80mm',315,[Math]::Max(250,[int][Math]::Ceiling($height)))
$document.add_PrintPage({param($sender,$args)
 $g=$args.Graphics;$x=[single]$args.MarginBounds.Left;$y=[single]$args.MarginBounds.Top;$width=[single][Math]::Min(283,$args.MarginBounds.Width)
 foreach($row in $rows){
  if($row.style -eq 'line'){$g.DrawLine([Drawing.Pens]::Black,$x,$y,($x+$width),$y);$y+=5;continue}
  $font=$fonts[$row.style];$available=$width;if($row.right){$available-=82}
  $size=$g.MeasureString([string]$row.text,$font,[int]$available)
  $format=[Drawing.StringFormat]::new();if($row.style -in @('heading','center','smallcenter')){$format.Alignment=[Drawing.StringAlignment]::Center}
  $rect=[Drawing.RectangleF]::new($x,$y,$available,([single]$size.Height+4));$g.DrawString([string]$row.text,$font,[Drawing.Brushes]::Black,$rect,$format)
  if($row.right){$rightFormat=[Drawing.StringFormat]::new();$rightFormat.Alignment=[Drawing.StringAlignment]::Far;$g.DrawString([string]$row.right,$font,[Drawing.Brushes]::Black,[Drawing.RectangleF]::new(($x+$width-85),$y,85,60),$rightFormat);$rightFormat.Dispose()}
  $y+=[single]$size.Height+5;$format.Dispose()
 }
 $args.HasMorePages=$false
})
try{$document.Print()}finally{$document.Dispose();foreach($font in $fonts.Values){$font.Dispose()}}
