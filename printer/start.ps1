$ErrorActionPreference='Stop'
$nodePath=(Get-Command node).Source
Start-Process -FilePath $nodePath -ArgumentList ('"'+(Join-Path $PSScriptRoot 'bridge.mjs')+'"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
