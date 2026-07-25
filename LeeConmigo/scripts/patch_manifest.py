import sys

path = sys.argv[1]
with open(path) as f:
    content = f.read()

if 'PACKAGE_USAGE_STATS' in content:
    print("Manifest ya parcheado, no se hace nada.")
    sys.exit(0)

if 'xmlns:tools=' not in content:
    content = content.replace('<manifest ', '<manifest xmlns:tools="http://schemas.android.com/tools" ', 1)

permisos = """
    <uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" tools:ignore="ProtectedPermissions" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" tools:ignore="QueryAllPackagesPermission" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
"""
content = content.replace('<application', permisos + '\n    <application', 1)

componentes = """
        <service
            android:name=".MonitorService"
            android:exported="false"
            android:foregroundServiceType="specialUse">
            <property
                android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
                android:value="Control parental LeeConmigo" />
        </service>

        <activity
            android:name=".LockActivity"
            android:exported="false"
            android:launchMode="singleTask"
            android:theme="@style/Theme.AppCompat.NoActionBar"
            android:excludeFromRecents="true" />
"""
content = content.replace('</application>', componentes + '    </application>', 1)

with open(path, 'w') as f:
    f.write(content)

print("AndroidManifest.xml parcheado correctamente.")
