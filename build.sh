#!/usr/bin/env bash

set -e

cd "$(dirname "$0")/.."

OUTPUT_DIRECTORY="dist"

echo "Environment: production"
export NODE_ENV="production"

echo "Cleaning build directory"
rm -rf $OUTPUT_DIRECTORY

echo "Installing dependencies"
npm install

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
