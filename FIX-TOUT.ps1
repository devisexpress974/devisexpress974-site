# FIX-TOUT.ps1 (SAFE) — Normalise le header sur toutes les pages
$ErrorActionPreference = "Stop"

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ROOT

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$cache = Get-Date -Format "yyyyMMddHHmmss"   # force le refresh navigateur
$backupDir = Join-Path $ROOT "_backup_fix_$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

function Backup-File([string]$path) {
  $rel = $path.Substring($ROOT.Length).TrimStart("\","/")
  $dest = Join-Path $backupDir $rel
  $destDir = Split-Path -Parent $dest
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  Copy-Item -Force -LiteralPath $path -Destination $dest
}

function Normalize-Html([string]$html) {

  # 1) Supprime un ancien header "siteHeader" si présent (évite double header)
  $html = [regex]::Replace($html, '(?is)\s*<header[^>]*class=["''][^"'']*siteHeader[^"'']*["''][^>]*>.*?</header>\s*', "`r`n")

  # 2) Supprime TOUS les liens vers styles.css et dx-header.css (doublons)
  $html = [regex]::Replace($html, '(?is)\s*<link[^>]+href=["''][^"'']*styles\.css[^"'']*["''][^>]*>\s*', "`r`n")
  $html = [regex]::Replace($html, '(?is)\s*<link[^>]+href=["''][^"'']*dx-header\.css[^"'']*["''][^>]*>\s*', "`r`n")

  $links = @"
<link rel="stylesheet" href="/styles.css?v=$cache" />
<link rel="stylesheet" href="/assets/css/dx-header.css?v=$cache" />
"@

  # Injecte les links après theme-color si possible, sinon avant </head>
  if ($html -match '(?is)<meta[^>]+name=["'']theme-color["''][^>]*>') {
    $html = [regex]::Replace(
      $html,
      '(?is)(<meta[^>]+name=["'']theme-color["''][^>]*>\s*)',
      ('$1' + "`r`n" + $links + "`r`n"),
      1
    )
  } else {
    $html = [regex]::Replace($html, '(?is)</head>', ("`r`n" + $links + "`r`n</head>"), 1)
  }

  # 3) Supprime les anciens slots dx-header (doublons)
  $html = [regex]::Replace($html, '(?is)\s*<div\s+id=["'']dx-header-slot["'']\s*>\s*</div>\s*', "`r`n")
  $html = [regex]::Replace($html, '(?is)\s*<div\s+id=["'']dx-header["'']\s*>\s*</div>\s*', "`r`n")

  # 4) Ajoute UN SEUL slot juste après <body>
  $html = [regex]::Replace(
    $html,
    '(?is)(<body[^>]*>)',
    ('$1' + "`r`n  <div id=`"dx-header-slot`"></div>`r`n"),
    1
  )

  # 5) Supprime TOUS les scripts dx-include-header.js et dx-header.js (doublons)
  $html = [regex]::Replace($html, '(?is)\s*<script[^>]+src=["''][^"'']*dx-include-header\.js[^"'']*["''][^>]*>\s*</script>\s*', "`r`n")
  $html = [regex]::Replace($html, '(?is)\s*<script[^>]+src=["''][^"'']*dx-header\.js[^"'']*["''][^>]*>\s*</script>\s*', "`r`n")

  $scripts = @"
<script src="/assets/js/dx-include-header.js?v=$cache"></script>
<script src="/assets/js/dx-header.js?v=$cache"></script>
"@

  # 6) Ré-injecte juste avant </body>
  $html = [regex]::Replace($html, '(?is)</body>', ("`r`n" + $scripts + "`r`n</body>"), 1)

  # 7) Nettoyage léger
  $html = [regex]::Replace($html, "(\r?\n){4,}", "`r`n`r`n`r`n")

  return $html
}

Write-Host "== DevisExpress974 FIX SAFE ==" -ForegroundColor Cyan
Write-Host "Dossier: $ROOT"
Write-Host "Backup:  $backupDir"
Write-Host ""

$changed = 0
Get-ChildItem -File -LiteralPath $ROOT -Filter "*.html" | ForEach-Object {
  $file = $_.FullName
  $orig = Get-Content -Raw -LiteralPath $file
  $new  = Normalize-Html $orig

  if ($new -ne $orig) {
    Backup-File $file
    Set-Content -LiteralPath $file -Value $new -Encoding utf8
    $changed++
    Write-Host "OK: patch -> $($_.Name)" -ForegroundColor Green
  } else {
    Write-Host "OK: deja propre -> $($_.Name)" -ForegroundColor DarkGray
  }
}

Write-Host ""
Write-Host "=== Termine : $changed page(s) corrigee(s) ===" -ForegroundColor Cyan
Write-Host "Prochaine etape : GitHub Desktop -> Commit + Push (Netlify redeploie)" -ForegroundColor Cyan
