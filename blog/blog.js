document.getElementById('yearNow').textContent = new Date().getFullYear();

/* Loader */
window.addEventListener('load', ()=>{ setTimeout(()=>document.getElementById('loader').classList.add('hide'),300); });

/* Language toggle */
const htmlRoot = document.getElementById('htmlRoot');
document.getElementById('langToggle').addEventListener('click', ()=>{
  htmlRoot.setAttribute('lang', htmlRoot.getAttribute('lang')==='hi' ? 'en' : 'hi');
});

/* Dark mode toggle */
const darkBtn = document.getElementById('darkToggle');
darkBtn.addEventListener('click', ()=>{
  document.documentElement.classList.toggle('dark');
  darkBtn.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
});

/* Mobile drawer */
const drawer = document.getElementById('mobileDrawer');
const overlay = document.getElementById('overlay');
function openDrawer(){ drawer.classList.add('open'); overlay.classList.add('show'); }
function closeDrawer(){ drawer.classList.remove('open'); overlay.classList.remove('show'); }
document.getElementById('hamburgerBtn').addEventListener('click', openDrawer);
document.getElementById('drawerClose').addEventListener('click', closeDrawer);
overlay.addEventListener('click', closeDrawer);
drawer.querySelectorAll('a').forEach(a=>a.addEventListener('click', closeDrawer));

/* FAQ accordion */
document.querySelectorAll('.faq-q').forEach(q=>{
  q.addEventListener('click', ()=>{
    const item = q.parentElement;
    const answer = item.querySelector('.faq-a');
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i=>{ i.classList.remove('open'); i.querySelector('.faq-a').style.maxHeight = null; });
    if(!wasOpen){ item.classList.add('open'); answer.style.maxHeight = answer.scrollHeight + 'px'; }
  });
});

/* Back to top + navbar shadow */
const backTop = document.getElementById('backTop');
window.addEventListener('scroll', ()=>{
  backTop.classList.toggle('show', window.scrollY > 500);
});
backTop.addEventListener('click', ()=>window.scrollTo({top:0,behavior:'smooth'}));

/* Scroll reveal */
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries)=>{
  entries.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
},{threshold:0.12});
revealEls.forEach(el=>io.observe(el));

/* ============================================================
   GOOGLE SHEET CONNECTION — same Web App URL as the main site,
   so every blog-page booking lands in the same Sheet + email.
   ============================================================ */
const SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbywT2pDATn_SmPNqs2b0rOn8JUbnavJJTpJ_uVOO_VmwjUz8r4HxYOPHyfocFdjoBmJ/exec";

function isHi(){ return document.documentElement.lang==='hi'; }

function sendToSheet(formName, formEl){
  const data = new FormData(formEl);
  data.append('Form', formName);
  data.append('Submitted At', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  return fetch(SHEET_WEBAPP_URL, { method: 'POST', mode: 'no-cors', body: data });
}

function validPhone(v){
  const d = String(v||'').replace(/[\s\-()]/g,'').replace(/^(\+91|91|0)/,'');
  return /^[6-9]\d{9}$/.test(d);
}

function handleForm(formId, formName, onSuccess){
  const form = document.getElementById(formId);
  if(!form) return;
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    if(form.elements['website'] && form.elements['website'].value){ return; }
    const phoneField = form.querySelector('input[type="tel"][required]');
    if(phoneField && !validPhone(phoneField.value)){
      alert(isHi() ? 'कृपया सही 10 अंकों का मोबाइल नंबर लिखें।' : 'Please enter a valid 10-digit mobile number.');
      phoneField.focus();
      return;
    }
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    sendToSheet(formName, form)
      .then(()=>onSuccess(form))
      .catch(()=>{
        alert(isHi()
          ? 'फॉर्म भेजने में समस्या आई। कृपया इंटरनेट जाँचकर दोबारा प्रयास करें या सीधे कॉल करें।'
          : 'Could not send the form. Please check your internet and try again, or call us directly.');
      })
      .finally(()=>{ btn.disabled = false; });
  });
}

handleForm('quickBookingForm', 'Booking', (form)=>{
  form.style.display = 'none';
  document.getElementById('quickFormSuccess').classList.add('show');
});
