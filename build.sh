#!/usr/bin/env bash

set -e

cd "$(git rev-parse --show-toplevel)"

OUTPUT_DIRECTORY="dist"

echo "Cleaning build directory"
rm -rf $OUTPUT_DIRECTORY

echo "Installing dependencies"
npm ci

echo "Environment: production"
export NODE_ENV=production

echo "Building frontend (vite)"
npx vite build --mode production

echo "Building backend (esbuild)"
npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=$OUTPUT_DIRECTORY

echo "Build finished"