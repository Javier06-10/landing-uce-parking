document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Icons
    lucide.createIcons();

    // 2. Scroll Reveal Animations
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-right');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    
    revealElements.forEach(el => revealObserver.observe(el));

    // 3. Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 4. Smooth Anchor Scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if(href === '#') return;
            e.preventDefault();
            const target = document.querySelector(href);
            if(target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // 5. Connect to Backend for Live Stats
    fetchLiveStats();
    // Refresh stats every 10 seconds to simulate real-time (or use socket if available)
    setInterval(fetchLiveStats, 10000);
});

// Real-time API Connection
async function fetchLiveStats() {
    const API_URL = 'https://uce-parking-backend.onrender.com/api';
    
    try {
        // Try fetching status
        // Since parking/status might need auth, we handle errors gracefully
        const response = await fetch(`${API_URL}/parking/status`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.total_capacidad !== undefined && data.porcentaje_ocupacion !== undefined) {
                const ocupados = Math.round(data.total_capacidad * (data.porcentaje_ocupacion / 100));
                const disponibles = data.total_capacidad - ocupados;
                
                document.getElementById('live-disp').innerText = disponibles;
                document.getElementById('live-detec').innerText = ocupados;
            }
        }
    } catch (error) {
        console.log('Backend not fully reachable or auth required, using simulated live data for landing demo.');
        simulateLiveStats();
    }
}

// Fallback logic to show animated stats if backend is unreachable or protected
function simulateLiveStats() {
    const dispEl = document.getElementById('live-disp');
    const detecEl = document.getElementById('live-detec');
    
    let currentDisp = parseInt(dispEl.innerText);
    let currentDetec = parseInt(detecEl.innerText);
    
    // Random fluctuation
    if (Math.random() > 0.5) {
        currentDisp = Math.max(0, currentDisp + (Math.random() > 0.5 ? 1 : -1));
        currentDetec = Math.max(0, currentDetec + (Math.random() > 0.5 ? 1 : -1));
        
        dispEl.innerText = currentDisp;
        detecEl.innerText = currentDetec;
        
        // Add a small visual pulse
        dispEl.style.color = 'var(--accent-green)';
        setTimeout(() => dispEl.style.color = '', 500);
    }
}

// ═══════════════════════════════════════════════════════════
// UI & MODALS & TOAST
// ═══════════════════════════════════════════════════════════
function openModal(id) {
    document.getElementById(id).classList.add('open');
}
function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}
function switchModal(from, to) {
    closeModal(from);
    setTimeout(() => openModal(to), 200);
}

let toastTimer;
function showToast(msg, type='info') {
    const icons = { success:'✅', error:'❌', info:'ℹ️' };
    document.getElementById('toast-icon').textContent = icons[type] || 'ℹ️';
    document.getElementById('toast-msg').textContent = msg;
    const t = document.getElementById('toast');
    t.className = `toast ${type} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 5000);
}
function hideToast() {
    document.getElementById('toast').classList.remove('show');
}

// ═══════════════════════════════════════════════════════════
// AUTHENTICATION (SUPABASE)
// ═══════════════════════════════════════════════════════════
const SUPABASE_URL = 'https://qvidbkkrxiwcvletaqfp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aWRia2tyeGl3Y3ZsZXRhcWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTEyMzUyNSwiZXhwIjoyMDgwNjk5NTI1fQ.BLiyPTAVxRvUM4kODFUo0O2U1M_CYoOjEKLWawC4ihY';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TOKEN_KEY = 'uce_token';

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    handleUrlParams();
    
    // Close modal on click outside
    document.querySelectorAll('.modal-overlay').forEach(el => {
        el.addEventListener('click', e => {
            if(e.target === el) closeModal(el.id);
        });
    });
});

function checkSession() {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const unauth = document.getElementById('nav-unauth');
    const auth = document.getElementById('nav-auth');
    if (unauth && auth) {
        unauth.style.display = token ? 'none' : 'block';
        auth.style.display = token ? 'flex' : 'none';
    }
}

async function doLogout() {
    await supabaseClient.auth.signOut();
    sessionStorage.removeItem(TOKEN_KEY);
    checkSession();
    showToast('Sesión cerrada correctamente', 'info');
}

async function doLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-err');
    const btn = document.getElementById('btn-login');

    errEl.style.display = 'none';
    if(!email || !password) {
        errEl.textContent = 'Completa todos los campos.';
        errEl.style.display = 'block';
        return;
    }

    btn.innerText = 'Verificando...';
    btn.disabled = true;

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw new Error(error.message);
        if (!data.session) throw new Error("Credenciales incorrectas o sesión fallida");

        sessionStorage.setItem(TOKEN_KEY, data.session.access_token);
        closeModal('modal-login');
        checkSession();
        showToast('¡Sesión iniciada!', 'success');

        const planPend = sessionStorage.getItem('uce_plan_pending');
        if(planPend) {
            sessionStorage.removeItem('uce_plan_pending');
            doCheckout(parseInt(planPend));
        }
    } catch(err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    } finally {
        btn.innerText = 'Iniciar Sesión';
        btn.disabled = false;
    }
}

async function doRegister() {
    const nombre = document.getElementById('reg-nombre').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const errEl = document.getElementById('reg-err');
    const btn = document.getElementById('btn-register');

    errEl.style.display = 'none';
    if(!nombre || !email || !password) {
        errEl.textContent = 'Completa todos los campos.';
        errEl.style.display = 'block'; return;
    }
    if(password.length < 8) {
        errEl.textContent = 'Mínimo 8 caracteres.';
        errEl.style.display = 'block'; return;
    }

    btn.innerText = 'Creando cuenta...';
    btn.disabled = true;

    try {
        const partes = nombre.split(' ');
        const nombreStr = partes[0];
        const apellidoStr = partes.slice(1).join(' ') || '';

        // Utilizar admin auth para auto-confirmar si es necesario y poder setear datos sin saltos
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if(authError) throw new Error(authError.message);

        const userId = authData.user.id;

        // Insertar persona
        const { error: personaError } = await supabaseClient.from('persona').insert({
            id_persona: userId,
            nombre: nombreStr,
            apellido: apellidoStr,
            email: email,
            condicion_salud: false
        });
        if(personaError) throw new Error("Error en persona: " + personaError.message);

        // Insertar usuario (rol cliente/estudiante por default, tipo 2)
        const { error: usuarioError } = await supabaseClient.from('usuario').insert({
            id: userId,
            id_persona: userId,
            rol_id: 6, // Ejemplo de rol
            id_tipo_usuario: 2, 
            organizacion_id: 1, // Por defecto en el demo
            id_estado: 1
        });
        if(usuarioError) throw new Error("Error en usuario: " + usuarioError.message);

        closeModal('modal-register');
        showToast('¡Cuenta creada! Inicia sesión ahora.', 'success');
        openModal('modal-login');
    } catch(err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    } finally {
        btn.innerText = 'Crear cuenta gratis';
        btn.disabled = false;
    }
}

// ═══════════════════════════════════════════════════════════
// SUBSCRIPTIONS & CHECKOUT
// ═══════════════════════════════════════════════════════════
function handlePlan(planId, btn) {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if(!token) {
        sessionStorage.setItem('uce_plan_pending', planId);
        openModal('modal-login');
        showToast('Inicia sesión para suscribirte a un plan.', 'info');
        return;
    }
    doCheckout(planId, btn);
}

const API_URL = 'https://uce-parking-backend.onrender.com/api';

async function doCheckout(planId, btn) {
    const originalText = btn ? btn.innerText : 'Procesando...';
    if(btn) { btn.innerText = 'Conectando...'; btn.disabled = true; }

    try {
        const token = sessionStorage.getItem(TOKEN_KEY);
        const res = await fetch(`${API_URL}/subscriptions/create-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ planId, organizacionId: 1 })
        });
        const data = await res.json();

        if(!res.ok || !data.url) throw new Error(data.error || 'Error al iniciar pago');
        window.location.href = data.url; 
    } catch(err) {
        showToast(err.message, 'error');
        if(btn) { btn.innerText = originalText; btn.disabled = false; }
    }
}

function handleUrlParams() {
    const p = new URLSearchParams(window.location.search);
    if(p.get('success') === 'true') {
        const plan = p.get('plan') || '';
        document.getElementById('success-banner').style.display = 'block';
        document.getElementById('success-msg').innerHTML = `Tu plan <strong>${plan}</strong> ha sido activado. <a href="http://localhost:3000" style="color:var(--accent-blue)">Ir al panel →</a>`;
        showToast(`¡Plan activado exitosamente!`, 'success');
        window.history.replaceState({}, '', window.location.pathname);
    }
    if(p.get('canceled') === 'true') {
        showToast('El proceso de pago fue cancelado.', 'info');
        window.history.replaceState({}, '', window.location.pathname);
    }
}
