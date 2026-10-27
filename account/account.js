/* ============================================================
   ACCOUNT SYSTEM — Firebase Authentication + Firestore
   Works once firebase-config.js has your real project keys.
   See FIREBASE-SETUP-GUIDE.txt for the one-time setup.
   ============================================================ */

let auth = null, db = null;

// Same Google Apps Script Web App URL as script.js / blog.js — used here
// to read back a logged-in user's own bookings (filtered by their email).
const SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbywT2pDATn_SmPNqs2b0rOn8JUbnavJJTpJ_uVOO_VmwjUz8r4HxYOPHyfocFdjoBmJ/exec";

function notConfiguredMsg(){
  return isHiLang()
    ? "लॉगिन सिस्टम अभी सेटअप नहीं हुआ है। कृपया FIREBASE-SETUP-GUIDE.txt फॉलो करें और firebase-config.js में अपनी keys डालें।"
    : "The login system isn't set up yet. Please follow FIREBASE-SETUP-GUIDE.txt and add your keys to firebase-config.js.";
}
function isHiLang(){ return document.documentElement.getAttribute('lang') === 'hi'; }


function initFirebaseIfReady() {
  if (
    typeof FIREBASE_IS_CONFIGURED === 'undefined' ||
    !FIREBASE_IS_CONFIGURED ||
    typeof firebase === 'undefined'
  ) {
    return false;
  }

  if (!auth) {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    auth = firebase.auth();
    db = firebase.firestore();
  }

  return true;
}


function showMsg(el, text, type){
  if(!el) return;
  el.textContent = text;
  el.className = "auth-msg show " + type;
}
function hideMsg(el){ if(el){ el.className = "auth-msg"; } }

/* ------------------ dark mode + lang (shared chrome) ------------------ */
document.addEventListener('DOMContentLoaded', ()=>{
  const yr = document.getElementById('yearNow'); if(yr) yr.textContent = new Date().getFullYear();
  const darkBtn = document.getElementById('darkToggle');
  if(darkBtn){
    darkBtn.addEventListener('click', ()=>{
      document.documentElement.classList.toggle('dark');
      darkBtn.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
    });
  }
  const loader = document.getElementById('loader');
  if(loader){ setTimeout(()=>loader.classList.add('hide'), 250); }
});

/* ============================================================
   SIGN UP
   ============================================================ */
function wireSignupForm(){
  const form = document.getElementById('signupForm');
  if(!form) return;
  const msg = document.getElementById('authMsg');

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    hideMsg(msg);
    if(!initFirebaseIfReady()){ showMsg(msg, notConfiguredMsg(), 'error'); return; }

    const name = form.querySelector('[name="name"]').value.trim();
    const phone = form.querySelector('[name="phone"]').value.trim();
    const email = form.querySelector('[name="email"]').value.trim();
    const pw = form.querySelector('[name="password"]').value;
    const pw2 = form.querySelector('[name="password2"]').value;

    if(pw.length < 6){ showMsg(msg, isHiLang() ? "पासवर्ड कम से कम 6 अक्षर का होना चाहिए।" : "Password must be at least 6 characters.", 'error'); return; }
    if(pw !== pw2){ showMsg(msg, isHiLang() ? "दोनों पासवर्ड मेल नहीं खा रहे।" : "Passwords do not match.", 'error'); return; }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try{
      const cred = await auth.createUserWithEmailAndPassword(email, pw);
      await cred.user.updateProfile({ displayName: name });
      await db.collection('users').doc(cred.user.uid).set({
        name: name, phone: phone, email: email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await cred.user.sendEmailVerification();
      window.location.href = 'dashboard.html';
    }catch(err){
      showMsg(msg, friendlyError(err), 'error');
    }finally{
      btn.disabled = false;
    }
  });
}

/* ============================================================
   LOGIN
   ============================================================ */
function wireLoginForm(){
  const form = document.getElementById('loginForm');
  if(!form) return;
  const msg = document.getElementById('authMsg');

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    hideMsg(msg);
    if(!initFirebaseIfReady()){ showMsg(msg, notConfiguredMsg(), 'error'); return; }

    const email = form.querySelector('[name="email"]').value.trim();
    const pw = form.querySelector('[name="password"]').value;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try{
      await auth.signInWithEmailAndPassword(email, pw);
      window.location.href = 'dashboard.html';
    }catch(err){
      showMsg(msg, friendlyError(err), 'error');
    }finally{
      btn.disabled = false;
    }
  });
}

/* ============================================================
   FORGOT PASSWORD
   ============================================================ */
function wireForgotForm(){
  const form = document.getElementById('forgotForm');
  if(!form) return;
  const msg = document.getElementById('authMsg');

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    hideMsg(msg);
    if(!initFirebaseIfReady()){ showMsg(msg, notConfiguredMsg(), 'error'); return; }

    const email = form.querySelector('[name="email"]').value.trim();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try{
      await auth.sendPasswordResetEmail(email);
      showMsg(msg, isHiLang()
        ? "पासवर्ड रीसेट लिंक आपकी ईमेल पर भेज दिया गया है।"
        : "A password reset link has been sent to your email.", 'success');
      form.reset();
    }catch(err){
      showMsg(msg, friendlyError(err), 'error');
    }finally{
      btn.disabled = false;
    }
  });
}

/* ============================================================
   DASHBOARD (protected page)
   ------------------------------------------------------------
   If nobody is logged in, this redirects to login.html before
   any account content is shown. The page itself is still a
   static file anyone COULD download — real protection of the
   DATA happens via Firestore security rules (see the setup
   guide) which only let a user read their own documents.
   ============================================================ */
function guardDashboard(){
  const gate = document.getElementById('dashGate');
  const content = document.getElementById('dashContent');
  if(!gate || !content) return;

  if(!initFirebaseIfReady()){
    gate.innerHTML = '<p class="auth-note">' + notConfiguredMsg() + '</p>';
    return;
  }

  auth.onAuthStateChanged(async (user)=>{
    if(!user){
      window.location.replace('login.html?next=dashboard');
      return;
    }
    gate.style.display = 'none';
    content.style.display = 'block';
    renderDashboard(user);
  });
}

async function renderDashboard(user){
  document.getElementById('dashName').textContent = user.displayName || (isHiLang() ? "यजमान" : "Devotee");
  document.getElementById('dashEmail').textContent = user.email;
  document.getElementById('dashAvatar').textContent = (user.displayName || user.email || '?').trim().charAt(0).toUpperCase();

  const pill = document.getElementById('verifyPill');
  if(user.emailVerified){
    pill.textContent = '✓ ' + (isHiLang() ? 'ईमेल सत्यापित' : 'Email verified');
    pill.className = 'verify-pill yes';
  } else {
    pill.textContent = '• ' + (isHiLang() ? 'ईमेल सत्यापित नहीं' : 'Email not verified');
    pill.className = 'verify-pill no';
  }

  const resendBtn = document.getElementById('resendVerify');
  if(resendBtn){
    resendBtn.style.display = user.emailVerified ? 'none' : 'inline-block';
    resendBtn.onclick = async ()=>{
      try{ await user.sendEmailVerification(); resendBtn.textContent = isHiLang() ? 'भेज दिया ✓' : 'Sent ✓'; }
      catch(e){}
    };
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if(logoutBtn){
    logoutBtn.addEventListener('click', async ()=>{
      await auth.signOut();
      window.location.href = 'login.html';
    });
  }

  // Pull this user's bookings from the same Google Sheet backend,
  // matched by the email they booked with — via JSONP (reliable
  // cross-origin read from Apps Script; plain fetch() can hit CORS).
  loadMyBookings(user.email);
}

function loadMyBookings(email){
  const listEl = document.getElementById('bookingList');
  const countEl = document.getElementById('bookingCount');
  const cbName = 'mbCallback_' + Date.now();
  const timeout = setTimeout(()=>{
    countEl.textContent = '–';
    listEl.innerHTML = '<div class="booking-empty">' + (isHiLang() ? 'बुकिंग लोड नहीं हो पाई। कृपया बाद में दोबारा कोशिश करें।' : 'Could not load bookings right now. Please try again later.') + '</div>';
    cleanup();
  }, 10000);

  function cleanup(){
    clearTimeout(timeout);
    delete window[cbName];
    if(script.parentNode) script.parentNode.removeChild(script);
  }

  window[cbName] = function(data){
    clearTimeout(timeout);
    const bookings = (data && data.bookings) ? data.bookings : [];
    countEl.textContent = bookings.length;
    if(bookings.length === 0){
      listEl.innerHTML = '<div class="booking-empty">' + (isHiLang() ? 'अभी तक कोई बुकिंग नहीं मिली। बुकिंग करते समय वही ईमेल भरें जो यहां लॉगिन में है।' : 'No bookings found yet. Use the same email at booking time as your login email.') + '</div>';
    } else {
      listEl.innerHTML = bookings.slice().reverse().map(b=>{
        const puja = b['Puja Type'] || '—';
        const date = b['Preferred Date'] || '—';
        const city = b['City'] || '';
        const submitted = b['Submitted At'] || '';
        return '<div class="booking-row"><div><div class="bt">' + escapeHtml(puja) + '</div><div class="bd">' +
          (isHiLang() ? 'तिथि' : 'Date') + ': ' + escapeHtml(date) + (city ? ' · ' + escapeHtml(city) : '') +
          '</div></div><div class="bd">' + escapeHtml(submitted) + '</div></div>';
      }).join('');
    }
    cleanup();
  };

  const script = document.createElement('script');
  script.src = SHEET_WEBAPP_URL + '?email=' + encodeURIComponent(email) + '&callback=' + cbName;
  script.onerror = ()=>{
    countEl.textContent = '–';
    listEl.innerHTML = '<div class="booking-empty">' + (isHiLang() ? 'बुकिंग लोड नहीं हो पाई। कृपया बाद में दोबारा कोशिश करें।' : 'Could not load bookings right now. Please try again later.') + '</div>';
    cleanup();
  };
  document.body.appendChild(script);
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function friendlyError(err){
  const code = err && err.code ? err.code : '';
  const map = {
    'auth/email-already-in-use': isHiLang() ? 'यह ईमेल पहले से रजिस्टर्ड है। लॉगिन करें।' : 'This email is already registered. Please log in.',
    'auth/invalid-email': isHiLang() ? 'कृपया सही ईमेल डालें।' : 'Please enter a valid email.',
    'auth/weak-password': isHiLang() ? 'पासवर्ड बहुत कमज़ोर है।' : 'Password is too weak.',
    'auth/user-not-found': isHiLang() ? 'इस ईमेल से कोई खाता नहीं मिला।' : 'No account found with this email.',
    'auth/wrong-password': isHiLang() ? 'पासवर्ड गलत है।' : 'Incorrect password.',
    'auth/invalid-credential': isHiLang() ? 'ईमेल या पासवर्ड गलत है।' : 'Incorrect email or password.',
    'auth/too-many-requests': isHiLang() ? 'बहुत बार कोशिश हुई, कृपया थोड़ी देर बाद कोशिश करें।' : 'Too many attempts. Please try again later.'
  };
  return map[code] || (isHiLang() ? 'कुछ गड़बड़ी हुई, कृपया दोबारा कोशिश करें।' : 'Something went wrong. Please try again.');
}

wireSignupForm();
wireLoginForm();
wireForgotForm();
guardDashboard();
