Add-Type -AssemblyName System.IO.Compression.FileSystem
$ErrorActionPreference = 'Stop'

$docPath = 'c:\crud-unificado\manual de usuario\Manual de Usuario.docx'
$imgPath = 'c:\crud-unificado\manual de usuario\imagenes\fig-3-1-menu-rrhh.png'
$outPath = 'c:\crud-unificado\manual de usuario\_manual_fig31_fixed.docx'
$work = Join-Path $env:TEMP ('patch-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $work | Out-Null

Copy-Item $docPath (Join-Path $work 'in.zip') -Force
[System.IO.Compression.ZipFile]::ExtractToDirectory((Join-Path $work 'in.zip'), (Join-Path $work 'unpacked'))

$xml = Get-Content (Join-Path $work 'unpacked\word\document.xml') -Raw -Encoding UTF8
$idxCaption = $xml.IndexOf('Figura 3-1. Menu Rec. Humanos con las pantallas del modulo RRHH.', $xml.IndexOf('Carnet de identidad como identificador unico del empleado'))
if ($idxCaption -lt 0) { throw 'Figura 3-1 no encontrada' }
$chunk = $xml.Substring([Math]::Max(0, $idxCaption - 4000), [Math]::Min(4000, $idxCaption))
if ($chunk -notmatch 'r:embed="(rId\d+)"') { throw 'rId no encontrado' }
$rId = $Matches[1]

$rels = Get-Content (Join-Path $work 'unpacked\word\_rels\document.xml.rels') -Raw -Encoding UTF8
if ($rels -notmatch "Id=`"$rId`"[^>]+Target=`"([^`"]+)`"") { throw "target $rId" }
$target = ($Matches[1] -replace '\.\./', '') -replace '/', '\'
if ($target -notlike 'word\*') { $target = Join-Path 'word' $target }
Copy-Item $imgPath (Join-Path $work ('unpacked\' + $target)) -Force

if (Test-Path $outPath) { Remove-Item $outPath -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory((Join-Path $work 'unpacked'), $outPath)
Remove-Item $work -Recurse -Force

$ok = $false
for ($i = 0; $i -lt 20; $i++) {
  try {
    Copy-Item $outPath $docPath -Force
    $ok = $true
    break
  } catch {
    Start-Sleep -Milliseconds 1500
  }
}

if ($ok) {
  Remove-Item $outPath -Force -ErrorAction SilentlyContinue
  Remove-Item 'c:\crud-unificado\manual de usuario\_repacked_temp.docx' -Force -ErrorAction SilentlyContinue
  Remove-Item 'c:\crud-unificado\manual de usuario\_patch_only_fig31.ps1' -Force -ErrorAction SilentlyContinue
  Remove-Item 'c:\crud-unificado\manual de usuario\_save_fixed.ps1' -Force -ErrorAction SilentlyContinue
  Remove-Item 'c:\crud-unificado\manual de usuario\_patch_fig31_inplace.ps1' -Force -ErrorAction SilentlyContinue
  "OK Manual de Usuario.docx actualizado ($((Get-Item $docPath).Length) bytes)"
} else {
  "BLOQUEADO tras 30s. Fixed listo en: $outPath"
}
