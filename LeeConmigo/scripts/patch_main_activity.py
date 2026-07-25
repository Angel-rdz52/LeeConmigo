import re
import sys

path = sys.argv[1]
with open(path) as f:
    content = f.read()

if 'registerPlugin(AppBlockerPlugin.class)' in content:
    print("MainActivity ya parcheado, no se hace nada.")
    sys.exit(0)

nuevo, n = re.subn(
    r'(public class MainActivity extends BridgeActivity\s*\{)',
    r'\1\n    @Override\n    public void onCreate(android.os.Bundle savedInstanceState) {\n'
    r'        registerPlugin(AppBlockerPlugin.class);\n'
    r'        super.onCreate(savedInstanceState);\n'
    r'    }\n',
    content,
    count=1,
)

if n == 0:
    print("ADVERTENCIA: no se encontró la firma esperada de MainActivity. Edítalo a mano usando MAIN-ACTIVITY-SNIPPET.java como referencia.")
    sys.exit(1)

with open(path, 'w') as f:
    f.write(nuevo)

print("MainActivity.java parcheado correctamente.")
