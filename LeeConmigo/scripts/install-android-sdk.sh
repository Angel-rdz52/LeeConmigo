#!/bin/bash
# scripts/install-android-sdk.sh
# Instala el Android SDK command-line tools dentro del Codespace, por si el
# feature del devcontainer no está disponible en tu cuenta. Úsalo así:
#   bash scripts/install-android-sdk.sh
#   source ~/.bashrc
set -e

CMDLINE_VERSION="11076708"
SDK_ROOT="$HOME/android-sdk"

sudo apt-get update -y
sudo apt-get install -y openjdk-17-jdk unzip wget

mkdir -p "$SDK_ROOT/cmdline-tools"
cd "$SDK_ROOT/cmdline-tools"
wget -q "https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_VERSION}_latest.zip" -O tools.zip
unzip -q tools.zip
rm tools.zip
mv cmdline-tools latest

{
  echo "export ANDROID_SDK_ROOT=$SDK_ROOT"
  echo "export ANDROID_HOME=$SDK_ROOT"
  echo "export PATH=\$PATH:$SDK_ROOT/cmdline-tools/latest/bin:$SDK_ROOT/platform-tools"
} >> "$HOME/.bashrc"

export ANDROID_SDK_ROOT=$SDK_ROOT
export PATH=$PATH:$SDK_ROOT/cmdline-tools/latest/bin

yes | sdkmanager --licenses > /dev/null
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

echo ""
echo "Listo. Cerrá y volvé a abrir la terminal (o corré 'source ~/.bashrc')"
echo "y después ya podés compilar con: cd android && ./gradlew assembleDebug"
