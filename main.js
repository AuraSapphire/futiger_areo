// main frontend logic (fetch-based)
const MAX_MESSAGE_LENGTH = 2000;
let currentCaptchaId = null;
let captchaMethod = 'math'; // 'math' or 'hcaptcha'
let hcaptchaSitekey = null;

async function fetchCaptcha(){
  try{
    const res = await fetch('/api/captcha');
    const j = await res.json();
    captchaMethod = j.method;
    if(captchaMethod === 'hcaptcha'){
      hcaptchaSitekey = j.sitekey;
      const wrap = document.getElementById('captchaWrap');
      wrap.innerHTML = `<div class="h-captcha" data-sitekey="${hcaptchaSitekey}"></div>`;
      // reset hCaptcha widget
      if(window.hcaptcha) window.hcaptcha.reset();
    } else {
      currentCaptchaId = j.id;
      document.getElementById('captchaQuestion').textContent = j.question;
      document.getElementById('captchaAnswer').value = '';
    }
  }catch(e){ console.error(e); }
}

async function submitPost(){
  const postInput = document.getElementById('postInput');
  const raw = postInput.value.trim();
  if(!raw){ alert('say something!'); return; }
  if(raw.length > MAX_MESSAGE_LENGTH){ alert('message too long'); return; }
  
  let payload = { message: raw };
  
  if(captchaMethod === 'hcaptcha'){
    const captchaToken = window.hcaptcha ? window.hcaptcha.getResponse() : null;
    if(!captchaToken){ alert('please complete captcha'); return; }
    payload.captchaToken = captchaToken;
  } else {
    if(!currentCaptchaId){ alert('get captcha first'); return; }
    const captchaAnswer = document.getElementById('captchaAnswer').value;
    payload.captchaId = currentCaptchaId;
    payload.captchaAnswer = captchaAnswer;
  }
  
  try{
    const res = await fetch('/api/posts', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    const j = await res.json();
    if(!res.ok){ alert(j.error||'post failed'); fetchCaptcha(); return; }
    postInput.value = '';
    currentCaptchaId = null;
    loadPosts();
    renderArchiveList();
    fetchCaptcha();
  }catch(e){ console.error(e); alert('network error'); }
}

async function loadPosts(filterDate){
  const postsContainer = document.getElementById('postsContainer');
  postsContainer.innerHTML = '<div style="padding:30px;color:#999">loading…</div>';
  try{
    const q = filterDate ? `?date=${encodeURIComponent(filterDate)}` : '';
    const res = await fetch('/api/posts'+q);
    const j = await res.json();
    const rows = j.posts || [];
    if(!rows.length){ postsContainer.innerHTML = '<div style="padding:30px;color:#999">no posts yet</div>'; return; }
    postsContainer.innerHTML = '';
    rows.forEach(post => {
      const postDiv = document.createElement('div');
      postDiv.style.marginBottom='15px'; postDiv.style.padding='12px'; postDiv.style.borderLeft='4px solid #d4af37'; postDiv.style.backgroundColor='#f8f8f8'; postDiv.style.borderRadius='3px'; postDiv.style.border='1px solid #ddd';
      const meta = document.createElement('div'); meta.style.fontSize='0.85em'; meta.style.marginBottom='8px'; meta.style.color='#999';
      const anon = document.createElement('span'); anon.style.color='#666'; anon.style.fontWeight='bold'; anon.textContent='anonymous';
      const time = document.createElement('span'); time.style.marginLeft='6px'; time.textContent='• '+post.timestamp;
      meta.appendChild(anon); meta.appendChild(time);
      const msg = document.createElement('div'); msg.style.wordWrap='break-word'; msg.style.whiteSpace='pre-wrap'; msg.style.lineHeight='1.6'; msg.style.color='#333'; msg.style.fontFamily='MS San Serif'; msg.textContent=post.message;
      postDiv.appendChild(meta); postDiv.appendChild(msg);
      postsContainer.appendChild(postDiv);
    });
  }catch(e){ console.error(e); postsContainer.innerHTML = '<div style="padding:30px;color:#999">unable to load posts</div>'; }
}

async function renderArchiveList(){
  try{
    const res = await fetch('/api/posts');
    const j = await res.json();
    const posts = j.posts || [];
    const dates = [...new Set(posts.map(p=>p.date))];
    const archiveDates = document.getElementById('archiveDates'); archiveDates.innerHTML='';
    if(!dates.length){ archiveDates.innerHTML='<div style="color:#999;padding:8px">no archives yet</div>'; return; }
    dates.sort((a,b)=>b.localeCompare(a)).forEach(dateKey=>{
      const d = document.createElement('div'); d.style.padding='6px 4px'; d.style.borderBottom='1px dashed #eee'; d.style.cursor='pointer'; d.textContent=dateKey;
      d.addEventListener('click', ()=>{ loadPosts(dateKey); showArchiveHeader(dateKey); toggleArchive(false); }); archiveDates.appendChild(d);
    });
  }catch(e){ console.error(e); }
}

function showArchiveHeader(dateKey){ const header = document.querySelector('.board-header'); let label = header.querySelector('.archive-label'); if(!label){ label=document.createElement('div'); label.className='archive-label'; label.style.marginLeft='12px'; label.style.fontSize='13px'; label.style.color='#666'; header.appendChild(label); } label.textContent=`viewing: ${dateKey}`; let clearBtn = header.querySelector('#clearArchiveView'); if(!clearBtn){ clearBtn=document.createElement('button'); clearBtn.id='clearArchiveView'; clearBtn.textContent='show all'; clearBtn.style.marginLeft='8px'; clearBtn.style.padding='6px 8px'; clearBtn.style.fontFamily='MS San Serif'; clearBtn.addEventListener('click', ()=>{ loadPosts(); label.remove(); clearBtn.remove(); }); header.appendChild(clearBtn); } }

function toggleArchive(show){ const panel=document.getElementById('archivePanel'); if(show===undefined) show=panel.hasAttribute('hidden'); if(show) panel.removeAttribute('hidden'); else panel.setAttribute('hidden',''); }

// attach handlers
window.addEventListener('DOMContentLoaded', async ()=>{
  document.getElementById('archiveToggle').addEventListener('click', ()=>{ toggleArchive(); renderArchiveList(); });
  document.getElementById('closeArchive').addEventListener('click', ()=>toggleArchive(false));
  document.getElementById('getCaptcha').addEventListener('click', fetchCaptcha);
  document.getElementById('postBtn').addEventListener('click', submitPost);
  await loadPosts(); await renderArchiveList(); fetchCaptcha();
});
