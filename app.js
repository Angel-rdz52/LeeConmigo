// app.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// --- CONFIGURACIÓN SUPABASE ---
// Reemplaza con los valores de tu panel de Supabase (Settings -> API)
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbG...TU_ANON_KEY_PUBLICA';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- ESTADO DE LA APLICACIÓN ---
let currentUser = null;
let currentStory = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let startTime = 0;
let utterance = null; // Para Web Speech API

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

// --- LÓGICA DE INICIO Y PERFIL ---
document.getElementById('btn-start').addEventListener('click', async () => {
    const name = document.getElementById('input-name').value.trim();
    const age = parseInt(document.getElementById('input-age').value);

    if (!name || isNaN(age) || age < 6 || age > 12) {
        alert("Por favor, ingresa un nombre y una edad entre 6 y 12 años.");
        return;
    }

    // Buscar si el usuario ya existe (simplificado por nombre, en prod usar auth)
    const { data: existingUsers, error: selectError } = await supabase
        .from('profiles')
        .select('*')
        .eq('name', name)
        .limit(1);

    if (existingUsers && existingUsers.length > 0) {
        currentUser = existingUsers[0];
    } else {
        // Crear nuevo perfil
        const { data: newUser, error: insertError } = await supabase
            .from('profiles')
            .insert([{ name, age }])
            .select()
            .single();
        
        currentUser = newUser;
    }

    updateDashboardUi();
    showScreen('dashboard');
});

function updateDashboardUi() {
    document.getElementById('dash-name').innerText = `Hola, ${currentUser.name}`;
    document.getElementById('dash-level').innerText = currentUser.current_level;
    document.getElementById('dash-stars').innerText = currentUser.total_stars;
}

// --- GENERADOR CON IA ---
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
        // Llama a la Edge Function
        const { data, error } = await supabase.functions.invoke('generate-reading', {
            body: { age: currentUser.age, level: currentUser.current_level, theme: theme }
        });

        if (error) throw error;

        currentStory = data.texto;
        currentQuestions = data.preguntas;
        
        document.getElementById('story-text').innerText = currentStory;
        document.getElementById('loading-spinner').classList.add('hidden');
        document.getElementById('reading-content').classList.remove('hidden');
        startTime = Date.now();

    } catch (err) {
        alert("Hubo un error mágico preparando tu cuento. ¡Intenta de nuevo!");
        showScreen('dashboard');
    }
}

// --- TEXT-TO-SPEECH ---
document.getElementById('btn-read-aloud').addEventListener('click', () => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Detener lecturas anteriores
        utterance = new SpeechSynthesisUtterance(currentStory);
        utterance.lang = 'es-ES';
        utterance.rate = 0.9; // Velocidad para niños
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
    // Deshabilitar todos los botones
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(b => b.disabled = true);

    const feedback = document.getElementById('feedback-message');
    feedback.classList.remove('hidden');

    if (selected === correct) {
        btn.classList.add('correct');
        feedback.innerText = "¡Correcto! 🌟";
        feedback.className = "mt-6 text-2xl font-bold text-center text-green-500";
        score++;
    } else {
        btn.classList.add('incorrect');
        // Resaltar la correcta
        buttons.forEach(b => { if(b.innerText === correct) b.classList.add('correct'); });
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
    }, 2500);
}

// --- RESULTADOS Y SISTEMA DE NIVELES ---
async function finishSession() {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const wordsRead = currentStory.split(' ').length;
    
    // Calcular subida/bajada de nivel
    let newLevel = currentUser.current_level;
    let newSuccessStreak = currentUser.success_streak;
    let newFailStreak = currentUser.fail_streak;
    let levelMsg = "Sigue practicando, ¡lo estás haciendo genial!";

    if (score >= 4) {
        newSuccessStreak++;
        newFailStreak = 0;
        if (newSuccessStreak >= 3 && newLevel < 5) {
            newLevel++;
            newSuccessStreak = 0;
            levelMsg = "¡Felicidades! ¡Has subido de nivel! 🚀";
        }
    } else if (score <= 1) { // Menos de 2 aciertos
        newFailStreak++;
        newSuccessStreak = 0;
        if (newFailStreak >= 2 && newLevel > 1) {
            newLevel--;
            newFailStreak = 0;
            levelMsg = "Vamos a un nivel más fácil para practicar mejor. 💪";
        }
    } else {
        // Si saca 2 o 3, reseteamos rachas
        newSuccessStreak = 0;
        newFailStreak = 0;
    }

    const newStars = currentUser.total_stars + score;

    // Actualizar Base de Datos
    await supabase.from('reading_sessions').insert([{
        profile_id: currentUser.id,
        words_read: wordsRead,
        time_spent_seconds: timeSpent,
        score: score
    }]);

    await supabase.from('profiles').update({
        current_level: newLevel,
        total_stars: newStars,
        success_streak: newSuccessStreak,
        fail_streak: newFailStreak
    }).eq('id', currentUser.id);

    // Actualizar estado local
    currentUser.current_level = newLevel;
    currentUser.total_stars = newStars;
    currentUser.success_streak = newSuccessStreak;
    currentUser.fail_streak = newFailStreak;

    // Mostrar UI de Resultados
    document.getElementById('result-score').innerText = `${score}/5`;
    document.getElementById('result-level-msg').innerText = levelMsg;
    showScreen('results');
}

document.getElementById('btn-home').addEventListener('click', () => {
    updateDashboardUi();
    showScreen('dashboard');
});

