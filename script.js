document.getElementById('yearNow').textContent = new Date().getFullYear();

/* Loader */
window.addEventListener('load', ()=>{ setTimeout(()=>document.getElementById('loader').classList.add('hide'),350); });

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

/* Service tabs */
document.querySelectorAll('.service-tabs .tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.service-tabs .tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.service-panel').forEach(p=>p.classList.remove('active'));
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

/* Gallery filter */
document.querySelectorAll('.gal-filters .tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.gal-filters .tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    document.querySelectorAll('.gal-item').forEach(item=>{
      item.style.display = (f==='all' || item.dataset.cat===f) ? 'flex' : 'none';
    });
  });
});

/* Lightbox */
const lightbox = document.getElementById('lightbox');
const lightboxBox = document.getElementById('lightboxBox');
document.querySelectorAll('.gal-item').forEach(item=>{
  item.addEventListener('click', ()=>{
    const img = item.querySelector('img');
    const imgHtml = img ? img.outerHTML : '';
    lightboxBox.innerHTML = '<button class="lightbox-close" id="lightboxClose">✕</button>' + imgHtml + item.querySelector('span').outerHTML;
    lightbox.classList.add('show');
    document.getElementById('lightboxClose').addEventListener('click', ()=>lightbox.classList.remove('show'));
  });
});
lightbox.addEventListener('click', (e)=>{ if(e.target===lightbox) lightbox.classList.remove('show'); });

/* Video lightbox: click a video card to play its YouTube embed.
   To add a real video, set data-yt="VIDEO_ID" on the .video-item in index.html
   (just the YouTube video ID, not the full URL) — it'll embed automatically. */
const videoLightbox = document.getElementById('videoLightbox');
const videoLightboxBox = document.getElementById('videoLightboxBox');
document.querySelectorAll('.video-item').forEach(item=>{
  item.addEventListener('click', ()=>{
    const ytId = item.dataset.yt;
    let inner = '<button class="lightbox-close" id="videoLightboxClose">✕</button>';
    if(ytId){
      inner += `<iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0" title="Pandit Baldev Sharma - puja video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    } else {
      inner += '<div class="video-msg"><span class="lang-en">This video will be added soon. Watch all our videos on YouTube:</span><span class="lang-hi">यह वीडियो शीघ्र जोड़ा जाएगा। हमारे सभी वीडियो YouTube पर देखें:</span><br><br><a href="https://www.youtube.com/@officialpanditbaldevsharma" target="_blank" rel="noopener" class="btn btn-primary">▶ YouTube</a></div>';
    }
    videoLightboxBox.innerHTML = inner;
    videoLightbox.classList.add('show');
    document.getElementById('videoLightboxClose').addEventListener('click', ()=>{
      videoLightbox.classList.remove('show');
      videoLightboxBox.innerHTML = '<button class="lightbox-close" id="videoLightboxClose">✕</button>';
    });
  });
});
document.querySelectorAll('.video-item').forEach(item=>{
  item.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); item.click(); } });
});
videoLightbox.addEventListener('click', (e)=>{
  if(e.target===videoLightbox){
    videoLightbox.classList.remove('show');
    videoLightboxBox.innerHTML = '<button class="lightbox-close" id="videoLightboxClose">✕</button>';
  }
});

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

/* ============================================================
   GOOGLE SHEET CONNECTION
   Paste your Google Apps Script Web App URL below (ends in /exec).
   See the setup guide provided alongside this file for how to get it.
   ============================================================ */
const SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbywT2pDATn_SmPNqs2b0rOn8JUbnavJJTpJ_uVOO_VmwjUz8r4HxYOPHyfocFdjoBmJ/exec";

function isHi(){ return document.documentElement.lang==='hi'; }

function sendToSheet(formName, formEl){
  const data = new FormData(formEl);
  data.append('Form', formName);
  data.append('Submitted At', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  // no-cors: Apps Script doesn't return readable CORS headers, so the reply can't be read.
  // fetch() only fails on network problems, which is what we catch below.
  return fetch(SHEET_WEBAPP_URL, { method: 'POST', mode: 'no-cors', body: data });
}

// Accepts 10-digit Indian mobile numbers, with optional +91 / 0 prefix
function validPhone(v){
  const d = String(v||'').replace(/[\s\-()]/g,'').replace(/^(\+91|91|0)/,'');
  return /^[6-9]\d{9}$/.test(d);
}

function handleForm(formId, formName, onSuccess){
  const form = document.getElementById(formId);
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    // Spam trap: real visitors never see/fill this hidden field
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

handleForm('bookingForm', 'Booking', (form)=>{
  form.style.display = 'none';
  document.getElementById('formSuccess').classList.add('show');
});
handleForm('contactForm', 'Contact', (form)=>{
  alert(isHi() ? 'धन्यवाद! आपका संदेश प्राप्त हो गया है।' : 'Thank you! Your message has been received.');
  form.reset();
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
