$ErrorActionPreference = 'Stop'
$src = 'c:\crud-unificado\manual de usuario\_repacked_temp.docx'
$dst = 'c:\crud-unificado\manual de usuario\Manual de Usuario.docx'
$wdFormat = 12

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $word.Documents.Open($src, $false, $true)
$doc.SaveAs([ref]$dst, [ref]$wdFormat)
$doc.Close($false)
$word.Quit()
Remove-Item $src -Force -ErrorAction SilentlyContinue
Write-Output "OK $((Get-Item $dst).Length) bytes"
