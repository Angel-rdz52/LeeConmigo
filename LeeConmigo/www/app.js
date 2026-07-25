// app.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://hxwtajinbdrumqjgzmnt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Rf57XQKZhl0jJ_aF3LZmRQ_04Yr-ij9';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentStory = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let startTime = 0;
let utterance = null;

const screens = {
    login: document.getElementById('screen-login'),
    dashboard: document.getElementById('screen-dashboard'),
    reading: document.getElementById('screen-reading'),
    questions: document.getElementById('screen-questions'),
    results: document.getElementById('screen-results'),
    redeem: document.getElementById('screen-redeem'),
    adminPin: document.getElementById('screen-admin-pin'),
    admin: document.getElementById('screen-admin')
};
// Se expone para que parental.js pueda cambiar de pantalla y leer/guardar al usuario actual.
window.LC = {
    getUser: () => currentUser,
    saveUser: () => localStorage.setItem('lee_conmigo_user_local', JSON.stringify(currentUser)),
    showScreen,
    refreshDashboard: () => updateDashboardUi()
};

function showScreen(screenName) {
    Object.keys(screens).forEach(key => {
        const screen = screens[key];
        if (screen) {
            screen.classList.remove('screen-active');
            screen.classList.add('screen-hidden');
        }
    });
    if (screens[screenName]) {
        screens[screenName].classList.remove('screen-hidden');
        screens[screenName].classList.add('screen-active');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('lee_conmigo_user_local');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        if (!currentUser.saved_themes) {
            currentUser.saved_themes = [];
        }
        updateDashboardUi();
        showScreen('dashboard');
    }
});

const btnStart = document.getElementById('btn-start');
if (btnStart) {
    btnStart.addEventListener('click', () => {
        const nameInput = document.getElementById('input-name');
        const name = nameInput ? nameInput.value.trim() : '';
        const genderSelect = document.getElementById('input-gender'); 
        const gender = genderSelect ? genderSelect.value : 'hombre';

        if (!name) {
            alert("Por favor, ingresa un nombre.");
            return;
        }

        currentUser = {
            name: name,
            gender: gender,
            current_level: 1,
            total_stars: 0,
            success_streak: 0,
            fail_streak: 0,
            saved_themes: []
        };

        localStorage.setItem('lee_conmigo_user_local', JSON.stringify(currentUser));
        updateDashboardUi();
        showScreen('dashboard');
    });
}

function updateDashboardUi() {
    if (!currentUser) return;
    
    const avatarIcon = currentUser.gender === 'mujer' ? '👧' : '👦';
    const dashNameElement = document.getElementById('dash-name');
    if (dashNameElement) {
        dashNameElement.innerText = `${avatarIcon} Hola, ${currentUser.name}`;
    }

    const dashLevel = document.getElementById('dash-level');
    const dashStars = document.getElementById('dash-stars');
    if (dashLevel) dashLevel.innerText = currentUser.current_level;
    if (dashStars) dashStars.innerText = currentUser.total_stars;

    renderCustomThemes();
}

function renderCustomThemes() {
    const container = document.getElementById('custom-themes-container');
    if (!container) return;
    container.innerHTML = '';

    if (!currentUser.saved_themes) {
        currentUser.saved_themes = [];
    }

    currentUser.saved_themes.forEach(themeName => {
        const btn = document.createElement('button');
        btn.className = 'theme-btn p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-center font-semibold text-indigo-800 transition shadow-sm text-sm truncate';
        btn.setAttribute('data-theme', themeName);
        btn.innerText = `🎮 ${themeName}`;
        
        btn.addEventListener('click', () => {
            startReadingSession(`Aventura emocionante basada en ${themeName}`);
        });

        container.appendChild(btn);
    });
}

function validateThemeSecurity(themeText) {
    const forbiddenWords = [
        'matar', 'asesinar', 'sangre', 'masacre', 'suicidio', 'morir', 'arma de fuego', 'pistola', 'navaja', 'golpear', 'tortura',
        'sexo', 'sexual', 'pornografia', 'porno', 'desnudo', 'erotico', 'prostituta', 'violacion', 'orgasmo',
        'idiota', 'estupido', 'maldito'
    ];

    const lowerTheme = themeText.toLowerCase();
    for (let word of forbiddenWords) {
        if (lowerTheme.includes(word)) {
            return false;
        }
    }
    return true;
}

document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if(e.target.closest('#custom-themes-container')) return;
        const theme = e.target.getAttribute('data-theme');
        if(theme) startReadingSession(theme);
    });
});

const customBtn = document.getElementById('btn-custom-theme');
if (customBtn) {
    customBtn.addEventListener('click', () => {
        const customInput = document.getElementById('custom-theme-input');
        if (!customInput) return;
        
        const customTheme = customInput.value.trim();

        if (!customTheme) {
            alert("Por favor, escribe un tema personalizado (ej. Minecraft, Mario Bros...)");
            return;
        }

        if (!validateThemeSecurity(customTheme)) {
            alert("⚠️ Este tema no está permitido. Por favor elige un tema apto para lectura educativa y divertida.");
            return;
        }

        if (!currentUser.saved_themes) {
            currentUser.saved_themes = [];
        }

        const alreadyExists = currentUser.saved_themes.map(t => t.toLowerCase()).includes(customTheme.toLowerCase());
        const COSTO_ESTRELLAS = 5;

        if (!alreadyExists) {
            if ((currentUser.total_stars || 0) < COSTO_ESTRELLAS) {
                alert(`⭐ ¡Te faltan estrellas! Crear y guardar una nueva categoría cuesta ${COSTO_ESTRELLAS} estrellas. ¡Lee más cuentos para conseguirlas!`);
                return;
            }

            currentUser.total_stars -= COSTO_ESTRELLAS;
            currentUser.saved_themes.push(customTheme);
            
            localStorage.setItem('lee_conmigo_user_local', JSON.stringify(currentUser));
            updateDashboardUi();
            alert(`🎉 ¡Categoría "${customTheme}" guardada con éxito por ${COSTO_ESTRELLAS} estrellas!`);
        }

        customInput.value = '';
        const adaptedTheme = `Aventura emocionante basada en ${customTheme}`;
        startReadingSession(adaptedTheme);
    });
}

async function startReadingSession(theme) {
    showScreen('reading');
    const spinner = document.getElementById('loading-spinner');
    const readingContent = document.getElementById('reading-content');

    if (spinner) spinner.classList.remove('hidden');
    if (readingContent) readingContent.classList.add('hidden');

    try {
        const { data, error } = await supabase.functions.invoke('generate-reading', {
            body: { age: 8, level: currentUser.current_level, theme: theme }
        });

        if (error) throw new Error("Error de Supabase: " + JSON.stringify(error));
        if (data && data.error) throw new Error("Error de la IA: " + data.error);

        if (!data.texto || !data.preguntas || data.preguntas.length === 0) {
            throw new Error("La IA no devolvió un cuento o preguntas válidas. Intenta de nuevo.");
        }

        currentStory = data.texto;
        currentQuestions = data.preguntas;
        
        const storyText = document.getElementById('story-text');
        if (storyText) storyText.innerText = currentStory;
        
        if (spinner) spinner.classList.add('hidden');
        if (readingContent) readingContent.classList.remove('hidden');
        startTime = Date.now();

    } catch (err) {
        if (spinner) spinner.classList.add('hidden');
        alert("DIAGNÓSTICO:\n\n" + err.message);
        showScreen('dashboard');
    }
}

const btnReadAloud = document.getElementById('btn-read-aloud');
if (btnReadAloud) {
    btnReadAloud.addEventListener('click', () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            utterance = new SpeechSynthesisUtterance(currentStory);
            utterance.lang = 'es-ES';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        } else {
            alert("Tu navegador no soporta lectura en voz alta.");
        }
    });
}

const btnToQuestions = document.getElementById('btn-to-questions');
if (btnToQuestions) {
    btnToQuestions.addEventListener('click', () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        if (!currentQuestions || currentQuestions.length === 0) {
            alert("Hubo un error cargando las preguntas de este cuento. Por favor vuelve al inicio.");
            showScreen('dashboard');
            return;
        }
        
        showScreen('questions');
        currentQuestionIndex = 0;
        score = 0;

        setTimeout(() => {
            renderQuestion();
        }, 50);
    });
}

function renderQuestion() {
    if (!currentQuestions || currentQuestionIndex >= currentQuestions.length) {
        finishSession();
        return;
    }

    const q = currentQuestions[currentQuestionIndex];
    const qTitle = document.getElementById('question-title');
    const qText = document.getElementById('question-text');

    if (qTitle) qTitle.innerText = `Pregunta ${currentQuestionIndex + 1} de ${currentQuestions.length}`;
    if (qText) qText.innerText = q.pregunta;
    
    // --- PROGRESIÓN DE VISIBILIDAD DEL TEXTO ---
    // En Nivel 1 y 2, mostramos el cuento arriba de la pregunta como referencia. En Niveles 3, 4 y 5 se oculta.
    let storyHelper = document.getElementById('story-helper-box');
    if (currentUser.current_level <= 2) {
        if (!storyHelper) {
            storyHelper = document.createElement('div');
            storyHelper.id = 'story-helper-box';
            storyHelper.className = 'p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 max-h-24 overflow-y-auto mb-2';
            const questionsContainer = document.getElementById('screen-questions');
            // Insertamos el recordatorio del cuento antes de las opciones
            questionsContainer.insertBefore(storyHelper, document.getElementById('options-container'));
        }
        storyHelper.innerText = `📖 Cuento: "${currentStory}"`;
        storyHelper.classList.remove('hidden');
    } else {
        if (storyHelper) {
            storyHelper.classList.add('hidden');
        }
    }
    // -------------------------------------------

    const container = document.getElementById('options-container');
    if (!container) return;
    
    container.innerHTML = '';
    const feedback = document.getElementById('feedback-message');
    if (feedback) {
        feedback.classList.add('hidden');
        feedback.innerText = '';
    }

    q.opciones.forEach(opcion => {
        const btn = document.createElement('button');
        btn.className = 'option-btn w-full p-3 text-left border border-slate-200 rounded-xl font-medium hover:bg-slate-50 transition text-sm';
        btn.innerText = opcion;
        btn.onclick = () => checkAnswer(btn, opcion, q.respuesta_correcta);
        container.appendChild(btn);
    });
}

function checkAnswer(btn, selected, correct) {
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(b => b.disabled = true);

    const feedback = document.getElementById('feedback-message');
    if (feedback) feedback.classList.remove('hidden');

    if (selected.trim().toLowerCase() === correct.trim().toLowerCase()) {
        btn.classList.add('correct');
        if (feedback) {
            feedback.innerText = "¡Correcto! 🌟";
            feedback.className = "mt-3 text-lg font-bold text-center text-green-500";
        }
        score++;
    } else {
        btn.classList.add('incorrect');
        buttons.forEach(b => { 
            if(b.innerText.trim().toLowerCase() === correct.trim().toLowerCase()) {
                b.classList.add('correct'); 
            }
        });
        if (feedback) {
            feedback.innerText = `Casi... era: "${correct}"`;
            feedback.className = "mt-3 text-base font-bold text-center text-red-500";
        }
    }

    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuestions.length) {
            renderQuestion();
        } else {
            finishSession();
        }
    }, 2000);
}

function finishSession() {
    showScreen('results');
    
    let newLevel = currentUser.current_level;
    let newSuccessStreak = currentUser.success_streak || 0;
    let newFailStreak = currentUser.fail_streak || 0;
    let levelMsg = "Sigue practicando, ¡lo estás haciendo genial!";

    const totalQ = currentQuestions.length; 
    const passingMark = totalQ === 3 ? 3 : 4; 

    if (score >= passingMark) {
        newSuccessStreak++;
        newFailStreak = 0;
        if (newSuccessStreak >= 3 && newLevel < 5) {
            newLevel++;
            newSuccessStreak = 0;
            levelMsg = "¡Felicidades! ¡Has subido de nivel! 🚀";
        }
    } else if (score <= 1 && totalQ === 5) { 
        newFailStreak++;
        newSuccessStreak = 0;
        if (newFailStreak >= 2 && newLevel > 1) {
            newLevel--;
            newFailStreak = 0;
            levelMsg = "Vamos a un nivel más fácil para practicar mejor. 💪";
        }
    } else {
        newSuccessStreak = 0;
        newFailStreak = 0;
    }

    const newStars = (currentUser.total_stars || 0) + score;

    currentUser.current_level = newLevel;
    currentUser.total_stars = newStars;
    currentUser.success_streak = newSuccessStreak;
    currentUser.fail_streak = newFailStreak;
    
    localStorage.setItem('lee_conmigo_user_local', JSON.stringify(currentUser));

    const resultScore = document.getElementById('result-score');
    const resultLevelMsg = document.getElementById('result-level-msg');

    if (resultScore) resultScore.innerText = `${score}/${totalQ}`;
    if (resultLevelMsg) resultLevelMsg.innerText = levelMsg;
}

const btnHome = document.getElementById('btn-home');
if (btnHome) {
    btnHome.addEventListener('click', () => {
        updateDashboardUi();
        showScreen('dashboard');
    });
}
