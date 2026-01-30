$ErrorActionPreference = "Stop"

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ROOT

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$cache = Get-Date -Format "yyyyMMddHHmmss"
$backupDir = Join-Path $ROOT "_backup_fix_$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

function Backup-File([string]$path) {
  if (!(Test-Path -LiteralPath $path)) { return }
  $rel = $path.Substring($ROOT.Length).TrimStart("\","/")
  $dest = Join-Path $backupDir $rel
  $destDir = Split-Path -Parent $dest
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  Copy-Item -Force -LiteralPath $path -Destination $dest
}

function Write-Utf8NoBom([string]$path, [string]$text) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $text, $utf8NoBom)
}

function Fix-Mojibake([string]$text) {
  $latin1 = [System.Text.Encoding]::GetEncoding(28591) # ISO-8859-1
  $utf8   = [System.Text.Encoding]::UTF8
  return $utf8.GetString($latin1.GetBytes($text))
}

function Maybe-Fix-MojibakeFile([string]$path) {
  if (!(Test-Path -LiteralPath $path)) { return $false }
  $orig = [System.IO.File]::ReadAllText($path)
  if ($orig -match "Ã.|Â|â") {
    $fixed = Fix-Mojibake $orig
    if ($fixed -ne $orig) {
      Backup-File $path
      Write-Utf8NoBom $path $fixed
      return $true
    }
  }
  return $false
}

function Normalize-Html([string]$html) {
  # 1) supprime un ancien header en dur si present
  $html = [regex]::Replace($html, '(?is)\s*<header[^>]*class=["''][^"'']*siteHeader[^"'']*["''][^>]*>.*?</header>\s*', "`r`n", 1)

  # 2) supprime anciens liens styles.css / dx-header.css
  $html = [regex]::Replace($html, '(?is)\s*<link[^>]+href=["''][^"'']*styles\.css[^"'']*["''][^>]*>\s*', "`r`n")
  $html = [regex]::Replace($html, '(?is)\s*<link[^>]+href=["''][^"'']*dx-header\.css[^"'']*["''][^>]*>\s*', "`r`n")

  $links = @"
<link rel="stylesheet" href="./styles.css?v=$cache" />
<link rel="stylesheet" href="./assets/css/dx-header.css?v=$cache" />
"@

  if ($html -match '(?is)<meta[^>]+name=["'']theme-color["''][^>]*>') {
    $rx = [regex]::new('(?is)(<meta[^>]+name=["'']theme-color["''][^>]*>\s*)')
    $html = $rx.Replace($html, { param($m) $m.Groups[1].Value + "`r`n`r`n" + $links + "`r`n" }, 1, 0)
  } else {
    $rx = [regex]::new('(?is)</head>')
    $html = $rx.Replace($html, "`r`n$links`r`n</head>", 1)
  }

  # 3) supprime anciens slots
  $html = [regex]::Replace($html, '(?is)\s*<div\s+id=["'']dx-header-slot["'']\s*></div>\s*', "`r`n")
  $html = [regex]::Replace($html, '(?is)\s*<div\s+id=["'']dx-header["'']\s*></div>\s*', "`r`n")

  # 4) ajoute UN slot apres <body>
  $rxBody = [regex]::new('(?is)(<body[^>]*>)')
  $html = $rxBody.Replace($html, { param($m) $m.Groups[1].Value + "`r`n`r`n  <div id=`"dx-header-slot`"></div>`r`n" }, 1, 0)

  # 5) supprime anciens scripts dx header
  $html = [regex]::Replace($html, '(?is)\s*<script[^>]+src=["''][^"'']*dx-include-header\.js[^"'']*["''][^>]*>\s*</script>\s*', "`r`n")
  $html = [regex]::Replace($html, '(?is)\s*<script[^>]+src=["''][^"'']*dx-header\.js[^"'']*["''][^>]*>\s*</script>\s*', "`r`n")

  $scripts = @"
<script src="./assets/js/dx-include-header.js?v=$cache"></script>
<script src="./assets/js/dx-header.js?v=$cache"></script>
"@

  # 6) reinjecte avant </body>
  $rxEnd = [regex]::new('(?is)</body>')
  $html = $rxEnd.Replace($html, "`r`n`r`n$scripts`r`n</body>", 1)

  # 7) clean newlines
  $html = [regex]::Replace($html, "(\r?\n){4,}", "`r`n`r`n`r`n")
  return $html
}

Write-Host "== DevisExpress974 FIX V3 ==" -ForegroundColor Cyan
Write-Host "Folder : $ROOT"
Write-Host "Backup : $backupDir"
Write-Host ""

# A) corrige encodage si besoin (header + include)
$hdr = Join-Path $ROOT "partials\header.html"
if (Maybe-Fix-MojibakeFile $hdr) { Write-Host "OK: fixed encoding -> partials/header.html" -ForegroundColor Green }

$inc = Join-Path $ROOT "assets\js\dx-include-header.js"
if (Test-Path -LiteralPath $inc) {
  $t = [System.IO.File]::ReadAllText($inc)
  $t2 = $t

  # force chemins relatifs + fallback
  $t2 = $t2 -replace "fetch\(\s*['""]\/partials\/header\.html", "fetch('./partials/header.html'"
  if ($t2 -notmatch "\.\/partials\/header\.html") {
    $t2 = $t2
  }

  # si l'ancien etait en mojibake, decode
  if ($t2 -match "Ã.|Â|â") { $t2 = Fix-Mojibake $t2 }

  if ($t2 -ne $t) {
    Backup-File $inc
    Write-Utf8NoBom $inc $t2
    Write-Host "OK: patch -> assets/js/dx-include-header.js" -ForegroundColor Green
  }
}

# B) normalise toutes les pages html (liens css/js relatifs + slot unique)
$changed = 0
Get-ChildItem -File -LiteralPath $ROOT -Filter "*.html" | ForEach-Object {
  $file = $_.FullName
  $orig = [System.IO.File]::ReadAllText($file)
  $new  = Normalize-Html $orig
  if ($new -match "Ã.|Â|â") { $new = Fix-Mojibake $new }

  if ($new -ne $orig) {
    Backup-File $file
    Write-Utf8NoBom $file $new
    $changed++
    Write-Host "OK: patch -> $($_.Name)" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host ("DONE: {0} html file(s) updated" -f $changed) -ForegroundColor Cyan
Write-Host "Next: reload browser with Ctrl+F5" -ForegroundColor Cyan
