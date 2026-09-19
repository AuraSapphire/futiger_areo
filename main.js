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


// =========================
// Tiny radio / music player
// =========================
let radioTrackIndex = 0;
let radioPlaying = false;
let radioTimer = null;
const radioAudio = document.createElement('audio');
radioAudio.preload = 'metadata';

const radioTracks = [
  {
    name: 'Season of Memories',
    artist: 'GFRIEND',
    image: 'https://64.media.tumblr.com/257022417e60949df9482eafb52e5ace/823f4dd47674e5f7-3d/s2048x3072/6d11aa3c11b135bccaf8f4ccd42a6abdcfced8cc.jpg',
    src: 'https://files.catbox.moe/vc4p9o.mp3'
  },
  {
    name: 'HIGH',
    artist: 'Seori',
    image: 'https://64.media.tumblr.com/1c56b4b76b0736f0833a4e43d174ed66/823f4dd47674e5f7-b5/s2048x3072/4f2138ddeb3a4aa98887b8b55aa27fcda7fc3969.jpg',
    src: 'https://files.catbox.moe/ddh7c5.mp3'
  }
];

function formatRadioTime(seconds){
  if(!Number.isFinite(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}

function loadRadioTrack(index, autoplay = false){
  radioTrackIndex = (index + radioTracks.length) % radioTracks.length;
  const track = radioTracks[radioTrackIndex];
  const art = document.querySelector('.track-art');
  const name = document.querySelector('.track-name');
  const artist = document.querySelector('.track-artist');
  const seek = document.querySelector('.seek_slider');
  const current = document.querySelector('.current-time');
  const total = document.querySelector('.total-duration');

  radioAudio.pause();
  radioAudio.src = track.src;
  radioAudio.load();

  if(art) art.style.backgroundImage = 'url("' + track.image + '")';
  if(name) name.textContent = track.name;
  if(artist) artist.textContent = track.artist;
  if(seek) seek.value = 0;
  if(current) current.textContent = '00:00';
  if(total) total.textContent = '00:00';

  radioPlaying = false;
  updateRadioButton();

  if(autoplay) playRadio();
}

function updateRadioButton(){
  const button = document.querySelector('.playpause-track');
  if(!button) return;
  button.innerHTML = radioPlaying
    ? '<i class="fa-solid fa-pause"></i>'
    : '<i class="fa-solid fa-play"></i>';
}

async function playRadio(){
  try{
    await radioAudio.play();
    radioPlaying = true;
    updateRadioButton();
  }catch(error){
    console.error('Music player error:', error);
    radioPlaying = false;
    updateRadioButton();
    alert('This track could not be played. The audio host may be unavailable.');
  }
}

function pauseRadio(){
  radioAudio.pause();
  radioPlaying = false;
  updateRadioButton();
}

function seekRadio(){
  if(Number.isFinite(radioAudio.duration)){
    radioAudio.currentTime = radioAudio.duration * (Number(document.querySelector('.seek_slider').value) / 100);
  }
}

function updateRadioProgress(){
  const seek = document.querySelector('.seek_slider');
  const current = document.querySelector('.current-time');
  const total = document.querySelector('.total-duration');

  if(!seek || !current || !total) return;

  if(Number.isFinite(radioAudio.duration) && radioAudio.duration > 0){
    seek.value = (radioAudio.currentTime / radioAudio.duration) * 100;
    total.textContent = formatRadioTime(radioAudio.duration);
  }
  current.textContent = formatRadioTime(radioAudio.currentTime);
}

function nextRadioTrack(){
  loadRadioTrack(radioTrackIndex + 1, true);
}

function prevRadioTrack(){
  loadRadioTrack(radioTrackIndex - 1, true);
}

radioAudio.addEventListener('timeupdate', updateRadioProgress);
radioAudio.addEventListener('loadedmetadata', updateRadioProgress);
radioAudio.addEventListener('ended', nextRadioTrack);
radioAudio.addEventListener('error', () => {
  radioPlaying = false;
  updateRadioButton();
  console.error('Unable to load radio track:', radioAudio.src);
});

window.addEventListener('DOMContentLoaded', () => {
  const play = document.querySelector('.playpause-track');
  const next = document.querySelector('.next-track');
  const prev = document.querySelector('.prev-track');
  const seek = document.querySelector('.seek_slider');

  if(play) play.addEventListener('click', () => radioPlaying ? pauseRadio() : playRadio());
  if(next) next.addEventListener('click', nextRadioTrack);
  if(prev) prev.addEventListener('click', prevRadioTrack);
  if(seek) seek.addEventListener('input', seekRadio);

  loadRadioTrack(0);
});
