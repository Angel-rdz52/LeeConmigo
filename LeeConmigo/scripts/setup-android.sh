#!/bin/bash
# scripts/setup-android.sh
# Copia el plugin de control parental dentro del proyecto android/ generado
# por `npx cap add android`, y parchea Manifest + MainActivity automáticamente.
set -e

if [ ! -d "android" ]; then
  echo "ERROR: no existe la carpeta android/. Corre primero: npx cap add android"
  exit 1
fi

APPID=$(node -e "console.log(require('./capacitor.config.json').appId)")
PKG_PATH="android/app/src/main/java/$(echo "$APPID" | tr '.' '/')"
echo "appId: $APPID"
echo "Copiando plugin a: $PKG_PATH"

mkdir -p "$PKG_PATH"
cp native-plugin/android/AppBlockerPlugin.kt "$PKG_PATH/"
cp native-plugin/android/MonitorService.kt "$PKG_PATH/"
cp native-plugin/android/LockActivity.kt "$PKG_PATH/"

# Ajusta la declaración "package" si tu appId es distinto de com.leeconmigo.app
sed -i "s/^package com\.leeconmigo\.app/package $APPID/" "$PKG_PATH"/AppBlockerPlugin.kt "$PKG_PATH"/MonitorService.kt "$PKG_PATH"/LockActivity.kt

MAIN_ACTIVITY=$(find android/app/src/main/java -name "MainActivity.java" | head -n1)
if [ -z "$MAIN_ACTIVITY" ]; then
  echo "ERROR: no se encontró MainActivity.java"
  exit 1
fi
python3 scripts/patch_main_activity.py "$MAIN_ACTIVITY"

MANIFEST="android/app/src/main/AndroidManifest.xml"
python3 scripts/patch_manifest.py "$MANIFEST"

echo ""
echo "Listo. Ahora podés compilar con:"
echo "  cd android && ./gradlew assembleDebug"
