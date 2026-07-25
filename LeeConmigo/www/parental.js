// parental.js
// Pantallas: Canjear estrellas (niño) y Control parental (admin con PIN).
// Depende de app-blocker.js (window.AppBlocker) y de window.LC expuesto por app.js.

const PIN_KEY = 'lc_admin_pin';
let appsSeleccionadasParaGuardar = []; // se arma al renderizar el panel admin

function pinGuardado() {
    return localStorage.getItem(PIN_KEY);
}

/* ================= CANJE (niño) ================= */

async function abrirRedeem() {
    LC.showScreen('redeem');
    const list = document.getElementById('redeem-app-list');
    const optionsBox = document.getElementById('redeem-options-box');
    optionsBox.classList.add('hidden');
    list.innerHTML = '<p class="text-xs text-slate-400">Cargando...</p>';

    const { apps } = await AppBlocker.getBlockedApps();

    if (!apps || apps.length === 0) {
        list.innerHTML = '<p class="text-sm text-slate-400 text-center py-6">Todavía no hay apps configuradas por un adulto en "Control parental".</p>';
        return;
    }

    list.innerHTML = '';
    apps.forEach(app => {
        const btn = document.createElement('button');
        btn.className = 'w-full flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition';
        btn.innerHTML = `<span class="font-semibold text-slate-700 text-sm">📱 ${app.label}</span><span class="text-xs text-indigo-600 font-bold">Ver opciones ›</span>`;
        btn.onclick = () => mostrarOpcionesDeCanje(app);
        list.appendChild(btn);
    });
}

function mostrarOpcionesDeCanje(app) {
    const optionsBox = document.getElementById('redeem-options-box');
    const optionsList = document.getElementById('redeem-options-list');
    const title = document.getElementById('redeem-options-title');
    title.innerText = `${app.label} — elige un tiempo:`;
    optionsList.innerHTML = '';

    (app.options || []).forEach(op => {
        const user = LC.getUser();
        const alcanza = (user.total_stars || 0) >= op.cost;
        const btn = document.createElement('button');
        btn.disabled = !alcanza;
        btn.className = `w-full p-3 rounded-xl font-bold text-sm flex items-center justify-between ${alcanza ? 'bg-amber-100 hover:bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`;
        btn.innerHTML = `<span>${op.minutes} min</span><span>⭐ ${op.cost}</span>`;
        btn.onclick = () => canjear(app, op);
        optionsList.appendChild(btn);
    });

    optionsBox.classList.remove('hidden');
}

async function canjear(app, opcion) {
    const user = LC.getUser();
    if ((user.total_stars || 0) < opcion.cost) return;

    user.total_stars -= opcion.cost;
    LC.saveUser();
    LC.refreshDashboard();

    await AppBlocker.unlockApp(app.packageName, opcion.minutes);
    alert(`🎉 ¡${app.label} desbloqueada por ${opcion.minutes} minutos!`);
    LC.showScreen('dashboard');
}

/* ================= CONTROL PARENTAL (admin) ================= */

function abrirAdminPin() {
    document.getElementById('admin-pin-input').value = '';
    LC.showScreen('adminPin');
}

function validarPin() {
    const ingresado = document.getElementById('admin-pin-input').value.trim();
    if (!ingresado) return;
    const guardado = pinGuardado();

    if (!guardado) {
        // Primera vez: el PIN ingresado se convierte en el PIN de control parental.
        localStorage.setItem(PIN_KEY, ingresado);
        abrirAdminPanel();
        return;
    }
    if (ingresado === guardado) {
        abrirAdminPanel();
    } else {
        alert('PIN incorrecto.');
    }
}

async function abrirAdminPanel() {
    LC.showScreen('admin');
    const warning = document.getElementById('admin-permission-warning');
    const ok = await AppBlocker.hasPermissions();
    warning.classList.toggle('hidden', ok);
    await renderAdminAppList();
}

async function renderAdminAppList() {
    const list = document.getElementById('admin-app-list');
    list.innerHTML = '<p class="text-xs text-slate-400">Cargando apps instaladas...</p>';

    const { apps: instaladas } = await AppBlocker.listInstalledApps();
    const { apps: yaBloqueadas } = await AppBlocker.getBlockedApps();
    const bloqueadasPorPaquete = Object.fromEntries((yaBloqueadas || []).map(a => [a.packageName, a]));

    list.innerHTML = '';
    appsSeleccionadasParaGuardar = [];

    instaladas.forEach(app => {
        const existente = bloqueadasPorPaquete[app.packageName];
        const activo = !!existente;
        const op1 = existente?.options?.[0] || { minutes: 30, cost: 15 };
        const op2 = existente?.options?.[1] || { minutes: 60, cost: 25 };

        const row = document.createElement('div');
        row.className = 'border border-slate-200 rounded-xl p-3';
        row.innerHTML = `
            <label class="flex items-center space-x-2 mb-2">
                <input type="checkbox" class="admin-app-check w-4 h-4" ${activo ? 'checked' : ''}>
                <span class="font-semibold text-sm text-slate-700">${app.label}</span>
            </label>
            <div class="grid grid-cols-2 gap-2 admin-app-options ${activo ? '' : 'hidden'}">
                <div class="flex items-center space-x-1">
                    <input type="number" min="5" class="op1-min w-14 px-2 py-1 border rounded text-xs" value="${op1.minutes}"> min /
                    <input type="number" min="1" class="op1-cost w-12 px-2 py-1 border rounded text-xs" value="${op1.cost}"> ⭐
                </div>
                <div class="flex items-center space-x-1">
                    <input type="number" min="5" class="op2-min w-14 px-2 py-1 border rounded text-xs" value="${op2.minutes}"> min /
                    <input type="number" min="1" class="op2-cost w-12 px-2 py-1 border rounded text-xs" value="${op2.cost}"> ⭐
                </div>
            </div>
        `;

        const checkbox = row.querySelector('.admin-app-check');
        const optionsBox = row.querySelector('.admin-app-options');
        checkbox.addEventListener('change', () => {
            optionsBox.classList.toggle('hidden', !checkbox.checked);
        });

        row.dataset.packageName = app.packageName;
        row.dataset.label = app.label;
        list.appendChild(row);
    });
}

async function guardarConfiguracionAdmin() {
    const rows = document.querySelectorAll('#admin-app-list > div');
    const resultado = [];

    rows.forEach(row => {
        const checked = row.querySelector('.admin-app-check').checked;
        if (!checked) return;
        resultado.push({
            packageName: row.dataset.packageName,
            label: row.dataset.label,
            options: [
                { minutes: Number(row.querySelector('.op1-min').value), cost: Number(row.querySelector('.op1-cost').value) },
                { minutes: Number(row.querySelector('.op2-min').value), cost: Number(row.querySelector('.op2-cost').value) },
            ]
        });
    });

    await AppBlocker.setBlockedApps(resultado);
    await AppBlocker.startMonitor();
    alert('✅ Lista de apps bloqueadas actualizada.');
}

/* ================= listeners ================= */

document.getElementById('btn-open-redeem')?.addEventListener('click', abrirRedeem);
document.getElementById('btn-redeem-back')?.addEventListener('click', () => LC.showScreen('dashboard'));

document.getElementById('btn-open-admin')?.addEventListener('click', abrirAdminPin);
document.getElementById('btn-admin-pin-cancel')?.addEventListener('click', () => LC.showScreen('dashboard'));
document.getElementById('btn-admin-pin-submit')?.addEventListener('click', validarPin);

document.getElementById('btn-admin-back')?.addEventListener('click', () => LC.showScreen('dashboard'));
document.getElementById('btn-admin-save')?.addEventListener('click', guardarConfiguracionAdmin);
document.getElementById('btn-request-permissions')?.addEventListener('click', async () => {
    await AppBlocker.requestPermissions();
    const ok = await AppBlocker.hasPermissions();
    document.getElementById('admin-permission-warning').classList.toggle('hidden', ok);
});
document.getElementById('btn-admin-change-pin')?.addEventListener('click', () => {
    const nuevo = document.getElementById('admin-new-pin').value.trim();
    if (!nuevo) return;
    localStorage.setItem(PIN_KEY, nuevo);
    document.getElementById('admin-new-pin').value = '';
    alert('PIN actualizado.');
});
