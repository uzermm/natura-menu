$ErrorActionPreference='Stop'
if(!(Get-Command node -ErrorAction SilentlyContinue)){throw 'Önce nodejs.org adresinden Node.js 24 LTS kurun.'}
$url=Read-Host 'Site adresi (https://natura.beyoglumutfagi.com)'
if(!$url){$url='https://natura.beyoglumutfagi.com'}
$token=Read-Host 'Yönetim paneli > Masalar ve adisyon > Yazıcı bölümündeki bağlantı anahtarı'
Get-Printer | Select-Object Name | Format-Table
$printer=Read-Host 'Yukarıdaki listeden yazıcı adını aynen yazın'
if(!(Get-Printer -Name $printer -ErrorAction SilentlyContinue)){throw 'Yazıcı bulunamadı.'}
@{url=$url;token=$token;printer=$printer}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $PSScriptRoot 'config.local.json') -Encoding utf8
$nodePath=(Get-Command node).Source
$shell=New-Object -ComObject WScript.Shell
$shortcut=$shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Startup')) 'Natura Yazici.lnk'))
$shortcut.TargetPath=Join-Path $env:WINDIR 'System32/WindowsPowerShell/v1.0/powershell.exe'
$shortcut.Arguments='-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "'+(Join-Path $PSScriptRoot 'start.ps1')+'"'
$shortcut.WorkingDirectory=$PSScriptRoot
$shortcut.WindowStyle=7
$shortcut.Save()
Write-Host 'Kurulum tamamlandı. Yardımcı Windows oturumunda otomatik başlar. Şimdi başlatılıyor.'
Start-Process -FilePath $nodePath -ArgumentList ('"'+(Join-Path $PSScriptRoot 'bridge.mjs')+'"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
