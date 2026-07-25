# LeeConmigo → Android (con Control Parental)

## 🚀 ¿No tienes PC? Compilá el APK desde el celular con GitHub Actions

Este es el camino recomendado si solo tenés el celular: no instalás nada,
todo lo compila GitHub en la nube y vos solo descargás el APK terminado.

1. Creá un repositorio en GitHub (desde el navegador del celular, en
   github.com, botón "New repository").
2. Subí el contenido de esta carpeta (`leeconmigo-android/`) al repo. Más
   fácil: en la página del repo, "Add file → Upload files", arrastrá/elegí
   todos los archivos y carpetas de este zip, y confirmá el commit. GitHub
   preserva la estructura de carpetas al subir así.
3. Andá a la pestaña **Actions** del repo. Vas a ver el workflow
   "Build APK" ya detectado (viene incluido en `.github/workflows/build-apk.yml`).
   Si no arrancó solo, tocá **Run workflow**.
4. Esperá unos 5-8 minutos a que termine (ícono verde ✅).
5. Entrá a esa ejecución terminada, bajá hasta **Artifacts**, y descargá
   **LeeConmigo-debug-apk** (te lo entrega como .zip conteniendo el .apk).
6. Ese archivo ya se descarga directo al celular. Abrilo desde tus
   Descargas, extraé el .apk del zip, tocalo para instalar (la primera vez
   Android te va a pedir permitir "orígenes desconocidos" para esa app —
   se activa una vez).

Cada vez que quieras un APK nuevo (por ejemplo si cambiás algo del panel
admin), solo tenés que subir los archivos modificados al repo (o commitear
desde Codespaces, ver abajo) y el workflow se vuelve a correr solo.

Este workflow arma el proyecto Android **desde cero en cada corrida**
(`npx cap add android` + el script `scripts/setup-android.sh`, que copia el
plugin nativo y parchea el Manifest/MainActivity automáticamente) — así que
no hace falta que vos generes ni edites la carpeta `android/` a mano.

> Nota: genera un **APK de debug**, perfecto para instalar y probar. Si más
> adelante querés un APK "release" firmado (para no tener que reinstalar si
> cambia el certificado), avisame y te agrego el paso de firma con un
> keystore guardado como *secret* del repo — no lo incluí por defecto para
> no complicar el primer build.

## 🖥️ Alternativa: GitHub Codespaces (VS Code en el navegador)

Si preferís tener una terminal real (por ejemplo para probar comandos o
depurar algo puntual) en vez de solo "subir y esperar":

1. En la página del repo en GitHub: botón verde **Code → Codespaces →
   Create codespace on main**. Se abre un VS Code completo en el navegador,
   corriendo en una máquina de GitHub (no en tu celular).
2. Se incluye un `.devcontainer/devcontainer.json` que intenta instalar
   Java + Node + Android SDK automáticamente al crear el Codespace. Si por
   algún motivo el SDK no quedó instalado (el feature de Android a veces
   varía), corré manualmente:
   ```bash
   bash scripts/install-android-sdk.sh
   source ~/.bashrc
   ```
3. Después, en la terminal del Codespace:
   ```bash
   npm install
   npx cap add android
   npx cap sync android
   bash scripts/setup-android.sh
   cd android
   ./gradlew assembleDebug
   ```
4. El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`.
   En el explorador de archivos de VS Code (panel izquierdo), buscá ese
   archivo, click derecho → **Download**. Se descarga al celular igual que
   cualquier descarga del navegador.

Los Codespaces gratuitos tienen un límite de horas mensuales (la cuenta
gratuita de GitHub incluye una buena cantidad), así que para uso ocasional
te alcanza de sobra.

---

---

## Qué trae este paquete
- `www/` → tu app actual (index.html, app.js, style.css) + 2 pantallas nuevas
  (`screen-redeem` y `screen-admin*`) y dos archivos JS nuevos:
  `app-blocker.js` (puente con el plugin nativo) y `parental.js` (lógica de
  canje y panel de administrador).
- `native-plugin/android/` → el plugin nativo en Kotlin que de verdad detecta
  y bloquea apps. Esto **no existe en la web**, solo funciona compilado como
  Android nativo.
- `.github/workflows/build-apk.yml` → compila el APK automáticamente en GitHub.
- `scripts/` → automatizan copiar el plugin y parchear Manifest/MainActivity.
- `capacitor.config.json`, `package.json` → para generar el proyecto Android.

## Referencia: pasos manuales (si en algún momento sí tenés Android Studio)

Todo esto ya lo hace solo el workflow de Actions y el script
`scripts/setup-android.sh` — dejalo acá solo como referencia si algún día
querés hacerlo a mano en una PC con Android Studio.

## 0. Requisitos
- Node.js 18+
- Android Studio (con JDK incluido) instalado
- Un **celular Android físico** para probar (Android 8.0+). El emulador no
  siempre reporta bien el "uso de apps", así que para esta función en
  particular, prueba en un dispositivo real.

## 1. Generar el proyecto Android
```bash
cd leeconmigo-android
npm install
npx cap add android
```
Esto crea la carpeta `android/` con un proyecto Gradle completo.

## 2. Copiar los archivos nativos del plugin
Copia estos 3 archivos:
```
native-plugin/android/AppBlockerPlugin.kt
native-plugin/android/MonitorService.kt
native-plugin/android/LockActivity.kt
```
dentro de:
```
android/app/src/main/java/com/leeconmigo/app/
```
(si tu `appId` en `capacitor.config.json` es distinto a `com.leeconmigo.app`,
crea esa misma ruta de carpetas y cambia la línea `package com.leeconmigo.app`
al inicio de cada archivo .kt para que coincida).

## 3. Registrar el plugin en MainActivity
Abre `android/app/src/main/java/com/leeconmigo/app/MainActivity.java`
y edítalo como se muestra en `native-plugin/android/MAIN-ACTIVITY-SNIPPET.java`
(agregar `registerPlugin(AppBlockerPlugin.class);` antes de `super.onCreate(...)`).

## 4. Agregar los permisos al Manifest
Abre `android/app/src/main/AndroidManifest.xml` y copia dentro las líneas de
`native-plugin/android/MANIFEST-ADDITIONS.xml` (permisos van fuera de
`<application>`, el `<service>` y la `<activity>` van dentro).

## 5. Sincronizar y abrir en Android Studio
```bash
npx cap sync android
npx cap open android
```
Deja que Gradle sincronice. Conecta el celular por USB (con depuración USB
activada) y dale ▶ Run.

## 6. Configurar el control parental (dentro de la app, ya instalada)
1. Entra a "🔒 Control parental" desde el dashboard.
2. La primera vez que escribas un PIN, ese PIN queda guardado (no hay PIN por
   defecto — el primero que ingreses se convierte en el PIN del adulto).
3. Aparecerá un aviso rojo pidiendo conceder permisos: toca "Conceder
   permisos" — te va a mandar dos veces a Ajustes de Android (Acceso a datos
   de uso, y Mostrar sobre otras apps). Actívalos ahí manualmente y regresa.
4. Marca las apps que quieres bloquear y define minutos/estrellas para cada
   una de las 2 opciones de canje.
5. Toca "Guardar cambios" — esto también arranca el servicio de vigilancia.

Desde ahí, el niño ve "🔓 Canjear estrellas" en el dashboard, elige la app y
el combo de tiempo/estrellas, y la app se desbloquea ese tiempo.

## 7. Sobre Google Play
**No recomiendo publicar esta función en Play Store.** Google exige que las
apps con acceso a estadísticas de uso + superposición declaren una categoría
especial ("Herramienta de control parental" certificada) y el proceso de
revisión es largo y estricto. Para uso familiar, generá el APK firmado
(Build > Generate Signed Bundle/APK en Android Studio) e instálalo
directamente en el celular del niño (sideload). Vas a necesitar activar
"Instalar apps de orígenes desconocidos" una vez en ese celular.

## 8. Limitaciones honestas de este MVP
- El servicio revisa la app en primer plano cada ~1.5s, así que hay un
  pequeño instante (1-2s) donde la app bloqueada se alcanza a ver antes de
  que aparezca la pantalla de bloqueo.
- Algunos fabricantes (Xiaomi, Huawei, algunos Samsung) matan servicios en
  segundo plano agresivamente para "ahorrar batería". Puede que tengas que
  desactivar la optimización de batería para LeeConmigo manualmente en
  Ajustes > Batería.
- Un niño con conocimientos técnicos (desinstalar la app, usar otro usuario
  de Android) podría eludirlo — esto no es un "Device Owner" con control
  total del dispositivo, es una app de bloqueo por superposición, que es el
  nivel que se puede lograr sin herramientas de gestión empresarial (MDM).
- Si quieres blindarlo más (evitar desinstalación, bloquear "Ajustes"),
  el siguiente paso sería convertirla en Device Admin / Device Owner, que
  es bastante más código y requiere aprovisionar el dispositivo distinto
  (fuera del alcance de este MVP, pero decime si te interesa y lo armamos).
