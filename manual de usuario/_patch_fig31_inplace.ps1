Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$ErrorActionPreference = 'Stop'

$docPath = 'c:\crud-unificado\manual de usuario\Manual de Usuario.docx'
$imgPath = 'c:\crud-unificado\manual de usuario\imagenes\fig-3-1-menu-rrhh.png'
$work = Join-Path $env:TEMP ('manual-read-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $work | Out-Null
$zipCopy = Join-Path $work 'doc.zip'
Copy-Item $docPath $zipCopy -Force
[System.IO.Compression.ZipFile]::ExtractToDirectory($zipCopy, (Join-Path $work 'unpacked'))

$xml = Get-Content (Join-Path $work 'unpacked\word\document.xml') -Raw -Encoding UTF8
$marker = 'Carnet de identidad como identificador unico del empleado'
$caption = 'Figura 3-1. Menu Rec. Humanos con las pantallas del modulo RRHH.'
$idxCaption = $xml.IndexOf($caption, $xml.IndexOf($marker))
if ($idxCaption -lt 0) { throw 'No se encontro Figura 3-1' }
$chunk = $xml.Substring([Math]::Max(0, $idxCaption - 4000), [Math]::Min(4000, $idxCaption))
if ($chunk -notmatch 'r:embed="(rId\d+)"') { throw 'No se encontro rId' }
$rId = $Matches[1]

$rels = Get-Content (Join-Path $work 'unpacked\word\_rels\document.xml.rels') -Raw -Encoding UTF8
if ($rels -notmatch "Id=`"$rId`"[^>]+Target=`"([^`"]+)`"") { throw "No target para $rId" }
$target = ($Matches[1] -replace '\.\./', '') -replace '/', '\'
if ($target -notlike 'word\*') { $target = Join-Path 'word' $target }
$entryName = $target -replace '\\', '/'

$share = [System.IO.FileShare]::ReadWrite -bor [System.IO.FileShare]::Delete
$fs = [System.IO.File]::Open($docPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::ReadWrite, $share)
try {
  $zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Update, $false)
  $entry = $zip.GetEntry($entryName)
  if (-not $entry) { throw "Entrada zip no encontrada: $entryName" }
  $entry.Delete()
  $newEntry = $zip.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
  $in = [System.IO.File]::OpenRead($imgPath)
  $out = $newEntry.Open()
  try { $in.CopyTo($out) } finally { $in.Close(); $out.Close() }
  $zip.Dispose()
} finally { $fs.Close() }

Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item 'c:\crud-unificado\manual de usuario\_repacked_temp.docx' -Force -ErrorAction SilentlyContinue
Remove-Item 'c:\crud-unificado\manual de usuario\_fix_fig31.ps1' -Force -ErrorAction SilentlyContinue
Write-Output "OK Figura 3-1 parcheada in-place ($entryName)"
