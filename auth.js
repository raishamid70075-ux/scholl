document.body.insertAdjacentHTML('beforeend', `
<div id="auth-overlay" class="auth-modal-overlay">
  <div class="auth-card">
    <button id="auth-close" class="auth-close">&times;</button>
    <div class="auth-title">Identitas Warga</div>
    <div class="auth-tabs">
      <button class="auth-tab active" id="tab-login">Masuk</button>
      <button class="auth-tab" id="tab-signup">Daftar</button>
    </div>
    <form id="authForm" class="auth-form">
      <div id="signup-fields">
        <input type="text" id="auth-username" placeholder="Username / Nama Panggilan" style="width:100%;">
      </div>
      <input type="email" id="auth-email" placeholder="Alamat Email" required style="width:100%;">
      <input type="password" id="auth-password" placeholder="Password (min 6 kar)" required style="width:100%;" minlength="6">
      
      <button type="submit" id="auth-submit-btn" class="btn-submit" style="width: 100%; margin-top: 8px;">Masuk</button>
      <div id="auth-msg" class="auth-msg"></div>
    </form>
  </div>
</div>
`);

// Supabase Setup
const SUPABASE_URL = 'https://mguyazbqddhvrnvbjsdl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ndXlhemJxZGRodnJudmJqc2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMjA2NjksImV4cCI6MjEwMTU5NjY2OX0.Lv4dB7lelo3PmYyxvsDrfTgYONCYDG1HaM0prVBuEc8';

let supabaseClient = null;
if (SUPABASE_URL !== 'GANTI_DENGAN_URL_SUPABASE_KAMU') {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
window.supabaseClient = supabaseClient;

const authOverlay = document.getElementById('auth-overlay');
const authNavBtn = document.getElementById('nav-auth-btn');
const authClose = document.getElementById('auth-close');
const authFormEl = document.getElementById('authForm');
const authMsg = document.getElementById('auth-msg');
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const signupFields = document.getElementById('signup-fields');
const submitBtn = document.getElementById('auth-submit-btn');

const commentGate = document.getElementById('comment-auth-gate');
const commentFormEl = document.getElementById('commentForm');
const loggedInUsernameEl = document.getElementById('loggedInUsername');
const cNameInput = document.getElementById('cName');
const btnLoginGate = document.getElementById('btn-login-gate');

let isLoginMode = true;
let currentUser = null;
let currentUsername = '';

function toggleAuthMode(login) {
  isLoginMode = login;
  if (login) {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    signupFields.classList.remove('active');
    document.getElementById('auth-username').removeAttribute('required');
    submitBtn.textContent = 'Masuk';
  } else {
    tabLogin.classList.remove('active');
    tabSignup.classList.add('active');
    signupFields.classList.add('active');
    document.getElementById('auth-username').setAttribute('required', 'true');
    submitBtn.textContent = 'Daftar';
  }
  authMsg.textContent = '';
}

tabLogin.addEventListener('click', () => toggleAuthMode(true));
tabSignup.addEventListener('click', () => toggleAuthMode(false));

function openAuthModal() { authOverlay.classList.add('active'); }
function closeAuthModal() { authOverlay.classList.remove('active'); }

authClose.addEventListener('click', closeAuthModal);
if (btnLoginGate) btnLoginGate.addEventListener('click', openAuthModal);

if (authNavBtn) {
  authNavBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (currentUser && supabaseClient) {
      await supabaseClient.auth.signOut();
      checkSession();
    } else {
      openAuthModal();
    }
  });
}

if (authFormEl) {
  authFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!supabaseClient) {
      authMsg.textContent = 'Error: Supabase Key belum diganti di file auth.js!';
      authMsg.style.color = 'var(--pen-red)';
      return;
    }

    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    authMsg.textContent = 'Memproses...';
    authMsg.style.color = 'var(--ink)';

    if (isLoginMode) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        authMsg.textContent = error.message;
        authMsg.style.color = 'var(--pen-red)';
      } else {
        closeAuthModal();
        checkSession();
      }
    } else {
      const username = document.getElementById('auth-username').value;
      const { data, error } = await supabaseClient.auth.signUp({
        email, password, options: { data: { username } }
      });

      if (error) {
        authMsg.textContent = error.message;
        authMsg.style.color = 'var(--pen-red)';
      } else {
        authMsg.textContent = 'Berhasil daftar! Silakan masuk.';
        authMsg.style.color = 'var(--chalk-green)';
        setTimeout(() => toggleAuthMode(true), 1500);
      }
    }
  });
}

async function checkSession() {
  if (!supabaseClient) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  currentUser = session?.user || null;

  if (currentUser) {
    currentUsername = currentUser.user_metadata?.username || currentUser.email.split('@')[0];
    if (authNavBtn) authNavBtn.textContent = '🚪 Logout (' + currentUsername + ')';

    // Muat profil: apakah user ini admin?
    let isAdmin = false;
    try {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('is_admin')
        .eq('id', currentUser.id)
        .maybeSingle();
      isAdmin = !!(profile && profile.is_admin);
    } catch (e) {
      console.error('Gagal memuat profil:', e.message);
    }
    window.currentUserIsAdmin = isAdmin;
    if (isAdmin) {
      const el = document.getElementById('nav-auth-btn');
      if (el) el.textContent = '🛡️ Admin (' + currentUsername + ')';
    }
    const analyticsSection = document.getElementById('analytics');
    if (analyticsSection) analyticsSection.style.display = isAdmin ? 'block' : 'none';
    if (isAdmin && typeof loadTopSearches === 'function') loadTopSearches();
    if (typeof loadComments === 'function') loadComments();

    if (commentGate) commentGate.style.display = 'none';
    if (commentFormEl) {
      commentFormEl.style.display = 'flex';
      loggedInUsernameEl.textContent = currentUsername;
      cNameInput.value = currentUsername;
    }
  } else {
    window.currentUserIsAdmin = false;
    if (authNavBtn) authNavBtn.textContent = '🔑 Login';
    const analyticsSection = document.getElementById('analytics');
    if (analyticsSection) analyticsSection.style.display = 'none';

    if (commentGate) commentGate.style.display = 'block';
    if (commentFormEl) commentFormEl.style.display = 'none';
  }
}

// Cek sesi awal
checkSession();
