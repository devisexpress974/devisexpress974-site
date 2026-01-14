\
# Applique automatiquement le header DX à toutes les pages .html
# Usage (dans le dossier du site) :
#   powershell -ExecutionPolicy Bypass -File .\apply_header.ps1

$root = Get-Location

$cssLine  = '<link rel="stylesheet" href="assets/css/dx-header.css">'
$jsLine1  = '<script defer src="assets/js/dx-header.js"></script>'
$jsLine2  = '<script defer src="assets/js/dx-include-header.js"></script>'
$slotLine = '<div id="dx-header-slot"></div>'

Get-ChildItem -Path $root -Filter *.html -Recurse | ForEach-Object {
  $path = $_.FullName
  $content = Get-Content -Path $path -Raw

  # 1) Injecter les liens dans <head> si absent
  if ($content -notmatch 'dx-header\.css') {
    if ($content -match '(?is)</head>') {
      $inject = $cssLine + "`r`n" + $jsLine1 + "`r`n" + $jsLine2 + "`r`n"
      $content = [regex]::Replace($content, '(?is)</head>', $inject + '</head>', 1)
    }
  }

  # 2) Ajouter le slot juste après <body ...> si absent
  if ($content -notmatch 'id="dx-header-slot"') {
    if ($content -match '(?is)<body[^>]*>') {
      $content = [regex]::Replace(
        $content,
        '(?is)(<body[^>]*>)',
        '$1' + "`r`n" + $slotLine,
        1
      )
    }
  }

  Set-Content -Path $path -Value $content -Encoding UTF8
}

Write-Host "OK : header DX appliqué aux pages HTML."
