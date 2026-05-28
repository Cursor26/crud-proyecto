Add-Type -AssemblyName System.IO.Compression.FileSystem
$ErrorActionPreference = 'Stop'

$docPath = 'c:\crud-unificado\manual de usuario\Manual de Usuario.docx'
$imgPath = 'c:\crud-unificado\manual de usuario\imagenes\fig-3-1-menu-rrhh.png'
$work = Join-Path $env:TEMP ('manual-docx-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $work | Out-Null

$zipCopy = Join-Path $work 'doc.zip'
Copy-Item $docPath $zipCopy -Force
[System.IO.Compression.ZipFile]::ExtractToDirectory($zipCopy, (Join-Path $work 'unpacked'))

$xml = Get-Content (Join-Path $work 'unpacked\word\document.xml') -Raw -Encoding UTF8
$marker = 'Carnet de identidad como identificador unico del empleado'
$caption = 'Figura 3-1. Menu Rec. Humanos con las pantallas del modulo RRHH.'
$idxMarker = $xml.IndexOf($marker)
$idxCaption = $xml.IndexOf($caption, $idxMarker)
if ($idxCaption -lt 0) { throw 'No se encontro Figura 3-1 en seccion 3.1' }

$chunk = $xml.Substring([Math]::Max(0, $idxCaption - 4000), [Math]::Min(4000, $idxCaption))
if ($chunk -notmatch 'r:embed="(rId\d+)"') { throw 'No se encontro rId de imagen' }
$rId = $Matches[1]

$rels = Get-Content (Join-Path $work 'unpacked\word\_rels\document.xml.rels') -Raw -Encoding UTF8
if ($rels -notmatch "Id=`"$rId`"[^>]+Target=`"([^`"]+)`"") { throw "No se encontro target para $rId" }
$target = $Matches[1] -replace '\.\./', ''
if ($target -notmatch '^word/') { $target = Join-Path 'word' $target }
$mediaPath = Join-Path $work ('unpacked\' + ($target -replace '/', '\'))
Copy-Item $imgPath $mediaPath -Force

$pack = Join-Path $work 'repacked.docx'
if (Test-Path $pack) { Remove-Item $pack -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory((Join-Path $work 'unpacked'), $pack)

Copy-Item $pack $docPath -Force
Remove-Item $work -Recurse -Force
Write-Output "OK Figura 3-1 actualizada en Manual de Usuario.docx (rId=$rId)"
