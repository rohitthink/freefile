#!/bin/bash
# Build FreeFile desktop app for the current platform.
# Prerequisites: Rust, Node.js, Python venv with dependencies.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCH=$(uname -m)
OS=$(uname -s)

# Determine Rust target triple
if [ "$OS" = "Darwin" ]; then
    if [ "$ARCH" = "arm64" ]; then
        TARGET="aarch64-apple-darwin"
    else
        TARGET="x86_64-apple-darwin"
    fi
elif [ "$OS" = "Linux" ]; then
    TARGET="x86_64-unknown-linux-gnu"
else
    echo "Unsupported OS: $OS"
    exit 1
fi

echo "=== FreeFile Desktop Build ==="
echo "Platform: $OS $ARCH ($TARGET)"
echo ""

# Step 1: Build Python backend sidecar
echo "Step 1/3: Building Python backend sidecar..."
cd "$ROOT"
source venv/bin/activate

pyinstaller --name freefile-backend \
    --onedir \
    --noconfirm \
    --clean \
    --hidden-import uvicorn.logging \
    --hidden-import uvicorn.protocols.http.auto \
    --hidden-import uvicorn.protocols.http.h11_impl \
    --hidden-import uvicorn.protocols.http.httptools_impl \
    --hidden-import uvicorn.protocols.websockets.auto \
    --hidden-import uvicorn.protocols.websockets.wsproto_impl \
    --hidden-import uvicorn.lifespan.on \
    --hidden-import uvicorn.lifespan.off \
    --hidden-import aiosqlite \
    --hidden-import multipart \
    --collect-all pdfplumber \
    --collect-all pikepdf \
    backend/cli.py 2>&1 | tail -5

# Copy sidecar to Tauri binaries
SIDECAR_SRC="$ROOT/dist/freefile-backend"
SIDECAR_DST="$ROOT/src-tauri/binaries/freefile-backend-$TARGET"

echo "Copying sidecar to $SIDECAR_DST..."
rm -rf "$SIDECAR_DST"
cp -r "$SIDECAR_SRC" "$SIDECAR_DST"

# Make the main executable executable
chmod +x "$SIDECAR_DST/freefile-backend"

echo ""

# Step 2: Build frontend static export
echo "Step 2/3: Building Next.js static export..."
cd "$ROOT/frontend"
npm run build 2>&1 | tail -3
echo ""

# Step 3: Build Tauri desktop app
echo "Step 3/3: Building Tauri desktop app..."
cd "$ROOT"
source "$HOME/.cargo/env"
npx tauri build 2>&1 | tail -10

echo ""
echo "=== Build complete! ==="
echo "Check: src-tauri/target/release/bundle/"
