param(
    [string]$OutputRoot
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
if (-not $OutputRoot) {
    $OutputRoot = Join-Path $repo 'release'
}

$extensionRoot = Join-Path $repo 'extension'
$packagePath = Join-Path $extensionRoot 'package.json'
if (-not (Test-Path -LiteralPath $packagePath)) {
    throw "PureFlow extension package was not found at $packagePath"
}

Push-Location $extensionRoot
try {
    npm ci --no-audit --no-fund
    npm run check
    npm test
    npm run package
} finally {
    Pop-Location
}

$extensionVersion = (Get-Content -Raw -LiteralPath $packagePath | ConvertFrom-Json).version
$vsix = Join-Path $extensionRoot "pureflow-$extensionVersion.vsix"
if (-not (Test-Path -LiteralPath $vsix)) {
    throw "VSIX build did not produce $vsix"
}

$headers = @{ Accept = 'application/vnd.github+json'; 'User-Agent' = 'PureFlow-builder' }
$release = Invoke-RestMethod -Uri 'https://api.github.com/repos/VSCodium/vscodium/releases/latest' -Headers $headers
$archive = $release.assets | Where-Object name -EQ "VSCodium-win32-x64-$($release.tag_name).zip"
$checksum = $release.assets | Where-Object name -EQ "VSCodium-win32-x64-$($release.tag_name).zip.sha256"
if (-not $archive -or -not $checksum) {
    throw "The latest VSCodium release has no win32-x64 archive or checksum."
}

New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null
$downloads = Join-Path $OutputRoot '.downloads'
New-Item -ItemType Directory -Force -Path $downloads | Out-Null
$archivePath = Join-Path $downloads $archive.name
$checksumPath = Join-Path $downloads $checksum.name

if (-not (Test-Path -LiteralPath $archivePath)) {
    Invoke-WebRequest -Uri $archive.browser_download_url -OutFile $archivePath -Headers $headers
}
Invoke-WebRequest -Uri $checksum.browser_download_url -OutFile $checksumPath -Headers $headers

$expected = ((Get-Content -Raw -LiteralPath $checksumPath).Trim() -split '\s+')[0].ToLowerInvariant()
$actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $archivePath).Hash.ToLowerInvariant()
if ($actual -ne $expected) {
    throw "VSCodium checksum mismatch: expected $expected, got $actual"
}

$target = Join-Path $OutputRoot "PureFlow-win32-x64-$($release.tag_name)"
if (Test-Path -LiteralPath $target) {
    throw "$target already exists. Move it aside or choose another OutputRoot."
}

Expand-Archive -LiteralPath $archivePath -DestinationPath $target
$productPath = Join-Path $target 'resources\app\product.json'
if (-not (Test-Path -LiteralPath $productPath)) {
    throw "VSCodium product metadata was not found at $productPath"
}
$product = Get-Content -Raw -LiteralPath $productPath | ConvertFrom-Json
$product.nameShort = 'PureFlow'
$product.nameLong = 'PureFlow IDE'
$product | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $productPath -Encoding utf8

$data = Join-Path $target 'data'
$extensions = Join-Path $data 'extensions'
$settingsDir = Join-Path $data 'user-data\User'
New-Item -ItemType Directory -Force -Path $extensions, $settingsDir | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'settings.json') -Destination (Join-Path $settingsDir 'settings.json')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'PureFlow.cmd') -Destination (Join-Path $target 'PureFlow.cmd')
Copy-Item -LiteralPath (Join-Path $repo 'LICENSE') -Destination (Join-Path $target 'PUREFLOW-LICENSE.txt')

$codiumCli = Join-Path $target 'bin\codium.cmd'
if (-not (Test-Path -LiteralPath $codiumCli)) {
    throw "VSCodium CLI was not found at $codiumCli"
}

& $codiumCli --install-extension $vsix --extensions-dir $extensions --force
if ($LASTEXITCODE -ne 0) {
    throw "VSCodium could not install the PureFlow VSIX."
}

Write-Output "PureFlow portable distribution: $target"
Write-Output "Launch with: $(Join-Path $target 'PureFlow.cmd')"
