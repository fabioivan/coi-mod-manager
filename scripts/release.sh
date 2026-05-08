#!/usr/bin/env bash
set -euo pipefail

usage() {
    echo "Uso: $0 <versão|patch|minor|major>"
    echo "  Exemplos:"
    echo "    $0 1.2.0"
    echo "    $0 patch   # incrementa patch (0.1.0 → 0.1.1)"
    echo "    $0 minor   # incrementa minor (0.1.0 → 0.2.0)"
    echo "    $0 major   # incrementa major (0.1.0 → 1.0.0)"
    exit 1
}

[ $# -eq 1 ] || usage

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG="$ROOT/package.json"
TAURI="$ROOT/src-tauri/tauri.conf.json"

# Lê versão atual do package.json
CURRENT=$(grep '"version"' "$PKG" | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/')
IFS='.' read -r MAJ MIN PAT <<< "$CURRENT"

case "$1" in
    patch) NEW="$MAJ.$MIN.$((PAT + 1))" ;;
    minor) NEW="$MAJ.$((MIN + 1)).0" ;;
    major) NEW="$((MAJ + 1)).0.0" ;;
    *)
        NEW="$1"
        [[ "$NEW" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Erro: versão inválida '$NEW' (esperado X.Y.Z)"; exit 1; }
        ;;
esac

echo "Release: $CURRENT → $NEW"

# Verifica working tree limpa
if ! git -C "$ROOT" diff --quiet || ! git -C "$ROOT" diff --cached --quiet; then
    echo "Erro: working tree tem mudanças não commitadas. Commit ou stash antes de continuar."
    exit 1
fi

# Verifica tag inexistente
if git -C "$ROOT" tag | grep -qx "v$NEW"; then
    echo "Erro: tag v$NEW já existe."
    exit 1
fi

# Bump package.json
sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW\"/" "$PKG"

# Bump tauri.conf.json
sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW\"/" "$TAURI"

echo "Versão atualizada em package.json e tauri.conf.json"

# Commit e tag
git -C "$ROOT" add "$PKG" "$TAURI"
git -C "$ROOT" commit -m "chore: release v$NEW"
git -C "$ROOT" tag "v$NEW"

echo "Commit e tag v$NEW criados."
echo ""
echo "Para publicar, execute:"
echo "  git push && git push origin v$NEW"
