// app.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// --- CONFIGURACIÓN SUPABASE ---
const SUPABASE_URL = 'https://hxwtajinbdrumqjgzmnt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Rf57XQKZhl0jJ_aF3LZmRQ_04Yr-ij9';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- ESTADO DE LA APLICACIÓN ---
let currentUser = null;
let currentStory = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let startTime = 0;
let utterance = null;

// --- ELEMENTOS DEL DOM ---
const screens = {
    login: document.getElementById('screen-login'),
    dashboard: document.getElementById('screen-dashboard'),
    reading: document.getElementById('screen-reading'),
    results: document.getElementById('screen-results')
};

// --- NAVEGACIÓN ---
function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove('screen-active');
        screen.classList.add('screen-hidden');
    });
    screens[screenName].classList.remove('screen-hidden');
    screens[screenName].classList.add('screen-active');
}

// --- VERIFICAR SESIÓN LOCAL AL CARGAR ---
window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('lee_conmigo_user_local');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateDashboardUi();
        showScreen('dashboard');
    }
});

// --- LÓGICA DE INICIO (Nombre y Género para Avatar) ---
document.getElementById('btn-start').addEventListener('click', () => {
    const name = document.getElementById('input-name').value.trim();
    // Suponiendo que tu select en el HTML tiene el id "input-gender" (opciones: 'hombre' o 'mujer')
    const genderSelect = document.getElementById('input-gender'); 
    const gender = genderSelect ? genderSelect.value : 'hombre';

    if (!name) {
        alert("Por favor, ingresa un nombre.");
        return;
    }

    currentUser = {
        name: name,
        gender: gender, // 'hombre' o 'mujer'
        current_level: 1,
        total_stars: 0,
        success_streak: 0,
        fail_streak: 0
    };

    localStorage.setItem('lee_conmigo_user_local', JSON.stringify(currentUser));

    updateDashboardUi();
    showScreen('dashboard');
});

function updateDashboardUi() {
    if (!currentUser) return;
    
    // Personalizar icono de perfil según el género
    const avatarIcon = currentUser.gender === 'mujer' ? '👧' : '👦';
    const dashNameElement = document.getElementById('dash-name');
    if (dashNameElement) {
        dashNameElement.innerText = `${avatarIcon} Hola, ${currentUser.name}`;
    }

    document.getElementById('dash-level').innerText = currentUser.current_level;
    document.getElementById('dash-stars').innerText = currentUser.total_stars;
}

// --- GENERADOR CON IA (GROQ) ---
document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        const theme = e.target.getAttribute('data-theme');
        startReadingSession(theme);
    });
});

async function startReadingSession(theme) {
    showScreen('reading');
    document.getElementById('loading-spinner').classList.remove('hidden');
    document.getElementById('reading-content').classList.add('hidden');
    document.getElementById('questions-content').classList.add('hidden');

    try {
        // Como eliminamos la edad, enviamos un valor estándar o adaptado (ej. 8 años por defecto para guiar a la IA)
        const { data, error } = await supabase.functions.invoke('generate-reading', {
            body: { age: 8, level: currentUser.current_level, theme: theme }
        });

        if (error) throw new Error("Error de Supabase: " + JSON.stringify(error));
        if (data && data.error) throw new Error("Error de la IA: " + data.error);

        currentStory = data.texto;
        currentQuestions = data.preguntas;
        
        document.getElementById('story-text').innerText = currentStory;
        document.getElementById('loading-spinner').classList.add('hidden');
        document.getElementById('reading-content').classList.remove('hidden');
        startTime = Date.now();

    } catch (err) {
        document.getElementById('loading-spinner').classList.add('hidden');
        alert("DIAGNÓSTICO:\n\n" + err.message);
        showScreen('dashboard');
    }
}

// --- TEXT-TO-SPEECH ---
document.getElementById('btn-read-aloud').addEventListener('click', () => {
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

// --- SISTEMA DE PREGUNTAS ---
document.getElementById('btn-to-questions').addEventListener('click', () => {
    if(window.speechSynthesis) window.speechSynthesis.cancel();
    document.getElementById('reading-content').classList.add('hidden');
    document.getElementById('questions-content').classList.remove('hidden');
    currentQuestionIndex = 0;
    score = 0;
    renderQuestion();
});

function renderQuestion() {
    if (!currentQuestions || currentQuestionIndex >= currentQuestions.length) {
        finishSession();
        return;
    }

    const q = currentQuestions[currentQuestionIndex];
    document.getElementById('question-title').innerText = `Pregunta ${currentQuestionIndex + 1} de ${currentQuestions.length}`;
    document.getElementById('question-text').innerText = q.pregunta;
    
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    document.getElementById('feedback-message').classList.add('hidden');

    q.opciones.forEach(opcion => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opcion;
        btn.onclick = () => checkAnswer(btn, opcion, q.respuesta_correcta);
        container.appendChild(btn);
    });
}

function checkAnswer(btn, selected, correct) {
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(b => b.disabled = true);

    const feedback = document.getElementById('feedback-message');
    feedback.classList.remove('hidden');

    if (selected.trim().toLowerCase() === correct.trim().toLowerCase()) {
        btn.classList.add('correct');
        feedback.innerText = "¡Correcto! 🌟";
        feedback.className = "mt-6 text-2xl font-bold text-center text-green-500";
        score++;
    } else {
        btn.classList.add('incorrect');
        buttons.forEach(b => { 
            if(b.innerText.trim().toLowerCase() === correct.trim().toLowerCase()) {
                b.classList.add('correct'); 
            }
        });
        feedback.innerText = `Casi... la respuesta correcta era: "${correct}"`;
        feedback.className = "mt-6 text-2xl font-bold text-center text-red-500";
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

// --- RESULTADOS Y SISTEMA DE NIVELES ---
function finishSession() {
    document.getElementById('questions-content').classList.add('hidden');
    
    let newLevel = currentUser.current_level;
    let newSuccessStreak = currentUser.success_streak || 0;
    let newFailStreak = currentUser.fail_streak || 0;
    let levelMsg = "Sigue practicando, ¡lo estás haciendo genial!";

    const totalQ = currentQuestions.length; // Dinámico: 3 para Nivel 1, 5 para Niveles 2-5
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

    document.getElementById('result-score').innerText = `${score}/${totalQ}`;
    document.getElementById('result-level-msg').innerText = levelMsg;
    showScreen('results');
}

document.getElementById('btn-home').addEventListener('click', () => {
    updateDashboardUi();
    showScreen('dashboard');
});
