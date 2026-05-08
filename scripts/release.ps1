param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Version
)

$ErrorActionPreference = "Stop"

function Show-Usage {
    Write-Host "Uso: .\release.ps1 <versão|patch|minor|major>"
    Write-Host "  Exemplos:"
    Write-Host "    .\release.ps1 1.2.0"
    Write-Host "    .\release.ps1 patch   # incrementa patch (0.1.0 -> 0.1.1)"
    Write-Host "    .\release.ps1 minor   # incrementa minor (0.1.0 -> 0.2.0)"
    Write-Host "    .\release.ps1 major   # incrementa major (0.1.0 -> 1.0.0)"
    exit 1
}

$Root = Split-Path -Parent $PSScriptRoot
$PkgPath = Join-Path $Root "package.json"
$TauriPath = Join-Path $Root "src-tauri\tauri.conf.json"

# Lê versão atual do package.json
$PkgContent = Get-Content $PkgPath -Raw
if ($PkgContent -notmatch '"version"\s*:\s*"(\d+)\.(\d+)\.(\d+)"') {
    Write-Error "Não foi possível encontrar versão em package.json"
    exit 1
}
$Current = $Matches[1] + "." + $Matches[2] + "." + $Matches[3]
[int]$Maj = $Matches[1]
[int]$Min = $Matches[2]
[int]$Pat = $Matches[3]

switch ($Version) {
    "patch" { $New = "$Maj.$Min.$($Pat + 1)" }
    "minor" { $New = "$Maj.$($Min + 1).0" }
    "major" { $New = "$($Maj + 1).0.0" }
    default {
        if ($Version -notmatch '^\d+\.\d+\.\d+$') {
            Write-Error "Versão inválida '$Version' (esperado X.Y.Z)"
            exit 1
        }
        $New = $Version
    }
}

Write-Host "Release: $Current -> $New"

# Verifica working tree limpa
$Status = git -C $Root status --porcelain
if ($Status) {
    Write-Error "Working tree tem mudanças não commitadas. Commit ou stash antes de continuar."
    exit 1
}

# Verifica tag inexistente
$Tags = git -C $Root tag
if ($Tags -contains "v$New") {
    Write-Error "Tag v$New já existe."
    exit 1
}

# Bump package.json
$PkgContent = $PkgContent -replace [regex]::Escape("`"version`": `"$Current`""), "`"version`": `"$New`""
Set-Content $PkgPath $PkgContent -NoNewline

# Bump tauri.conf.json
$TauriContent = Get-Content $TauriPath -Raw
$TauriContent = $TauriContent -replace [regex]::Escape("`"version`": `"$Current`""), "`"version`": `"$New`""
Set-Content $TauriPath $TauriContent -NoNewline

Write-Host "Versão atualizada em package.json e tauri.conf.json"

# Commit e tag
git -C $Root add $PkgPath $TauriPath
git -C $Root commit -m "chore: release v$New"
git -C $Root tag "v$New"

Write-Host "Commit e tag v$New criados."
Write-Host ""
Write-Host "Para publicar, execute:"
Write-Host "  git push; git push origin v$New"
