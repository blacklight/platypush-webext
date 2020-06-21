#!/bin/bash

VERSION=$(cat package.json | grep -e '"version"\s*:\s*"' | head -1 | sed -r -e 's/.*"version"\s*:\s*"([^"]+).*/\1/')

rm -rf dist dist-zip
npm run build
touch dist/style.css
mkdir dist-zip
cd dist
zip -r ../dist-zip/platypush-v$VERSION.zip *
cd ..

