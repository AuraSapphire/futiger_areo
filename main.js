const MAX_MESSAGE_LENGTH = 2000;
const SUPABASE_URL = 'https://atuwtktnxeimwvprkdgp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_II673G5TTeusbLVOtaKm8g_8GL6XEEI';

let currentCaptcha = null;
let radioTrackIndex = 0;
let radioPlaying = false;
const radioAudio = new Audio();
radioAudio.preload = 'metadata';

const radioTracks = [
  { name:'Season of Memories', artist:'GFRIEND', image:'https://64.media.tumblr.com/257022417e60949df9482eafb52e5ace/823f4dd47674e5f7-3d/s2048x3072/6d11aa3c11b135bccaf8f4ccd42a6abdcfced8cc.jpg', src:'https://files.catbox.moe/vc4p9o.mp3' },
  { name:'HIGH', artist:'Seori', image:'https://64.media.tumblr.com/1c56b4b76b0736f0833a4e43d174ed66/823f4dd47674e5f7-b5/s2048x3072/4f2138ddeb3a4aa98887b8b55aa27fcda7fc3969.jpg', src:'https://files.catbox.moe/ddh7c5.mp3' }
];

async function supabaseRequest(path, options = {}) {
  const headers = { apikey: SUPABASE_KEY, ...options.headers };
  if(options.body) headers['Content-Type'] = 'application/json';
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {...options, headers});
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if(!res.ok) throw new Error((data && data.message) || (data && data.error) || ('Supabase HTTP ' + res.status));
  return data;
}

function makeCaptcha(){
  const a = Math.floor(Math.random()*9)+1, b = Math.floor(Math.random()*9)+1;
  currentCaptcha = { answer: a+b };
  document.getElementById('captchaQuestion').textContent = a + ' + ' + b + ' =';
  document.getElementById('captchaAnswer').value = '';
}

function formatDate(iso){ return new Date(iso).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}); }
function formatTime(seconds){
  if(!Number.isFinite(seconds)) return '00:00';
  return String(Math.floor(seconds/60)).padStart(2,'0') + ':' + String(Math.floor(seconds%60)).padStart(2,'0');
}

async function loadPosts(filterDate = null){
  const container = document.getElementById('postsContainer');
  container.innerHTML = '<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i> floating thoughts are loading…</div>';
  try{
    const params = 'select=id,message,created_at,is_deleted&is_deleted=eq.false&order=created_at.desc&limit=100';
    const rows = await supabaseRequest('posts?' + params);
    const filtered = filterDate ? rows.filter(p => new Date(p.created_at).toISOString().slice(0,10) === filterDate) : rows;
    if(!filtered.length){
      container.innerHTML = '<div class="empty-state"><div class="empty-cloud">☁</div><strong>nothing floating yet</strong><span>be the first to leave a thought</span></div>';
      return;
    }
    container.innerHTML = '';
    filtered.forEach(post => {
      const card = document.createElement('article');
      card.className = 'post-card';
      const meta = document.createElement('div'); meta.className='post-meta';
      meta.innerHTML = '<span>anonymous</span><time>• ' + formatDate(post.created_at) + '</time>';
      const msg = document.createElement('div'); msg.className='post-message'; msg.textContent=post.message;
      card.append(meta,msg); container.appendChild(card);
    });
  }catch(error){
    console.error(error);
    container.innerHTML = '<div class="error-state"><i class="fa-solid fa-triangle-exclamation"></i><strong>the sky is cloudy</strong><span>could not connect to the diary database.</span><button id="retryBtn" class="aero-btn small">try again</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click',()=>loadPosts(filterDate));
  }
}

async function submitPost(){
  const input=document.getElementById('postInput'), raw=input.value.trim();
  if(!raw) return alert('say something!');
  if(raw.length>MAX_MESSAGE_LENGTH) return alert('message too long');
  const answer=Number(document.getElementById('captchaAnswer').value);
  if(!currentCaptcha || answer!==currentCaptcha.answer) return alert('captcha answer is incorrect');
  try{
    await supabaseRequest('posts', {method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({message:raw})});
    input.value=''; makeCaptcha(); await loadPosts(); await renderArchiveList();
  }catch(error){ console.error(error); alert('failed to post: '+error.message); }
}

async function renderArchiveList(){
  const wrap=document.getElementById('archiveDates');
  try{
    const rows=await supabaseRequest('posts?select=created_at&is_deleted=eq.false&order=created_at.desc&limit=1000');
    const dates=[...new Set(rows.map(p=>new Date(p.created_at).toISOString().slice(0,10)))];
    wrap.innerHTML='';
    if(!dates.length){wrap.innerHTML='<div class="archive-empty">no archives yet</div>';return;}
    dates.forEach(date=>{
      const btn=document.createElement('button'); btn.type='button'; btn.className='archive-date';
      btn.innerHTML='<i class="fa-regular fa-calendar"></i><span>'+new Date(date+'T00:00:00').toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})+'</span>';
      btn.addEventListener('click',()=>{loadPosts(date);toggleArchive(false);});
      wrap.appendChild(btn);
    });
  }catch(error){ console.error(error); wrap.innerHTML='<div class="archive-empty">archive unavailable</div>'; }
}

async function exportPosts(){
  try{
    const rows=await supabaseRequest('posts?select=message,created_at&is_deleted=eq.false&order=created_at.asc&limit=5000');
    const text=rows.map(p=>'['+formatDate(p.created_at)+'] anonymous\\n'+p.message).join('\\n\\n');
    const blob=new Blob([text||'No posts yet.'],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download='public-dumps-'+new Date().toISOString().slice(0,10)+'.txt'; a.click(); URL.revokeObjectURL(url);
  }catch(error){console.error(error);alert('could not export posts');}
}

function toggleArchive(show){
  const panel=document.getElementById('archivePanel');
  if(show===undefined) show=panel.hasAttribute('hidden');
  panel.toggleAttribute('hidden',!show);
}

function loadRadioTrack(index, autoplay=false){
  radioTrackIndex=(index+radioTracks.length)%radioTracks.length;
  const t=radioTracks[radioTrackIndex];
  document.querySelector('.track-art').style.backgroundImage='url("'+t.image+'")';
  document.querySelector('.track-name').textContent=t.name;
  document.querySelector('.track-artist').textContent=t.artist;
  document.querySelector('.seek_slider').value=0;
  document.querySelector('.current-time').textContent='00:00';
  document.querySelector('.total-duration').textContent='00:00';
  radioAudio.pause(); radioAudio.src=t.src; radioAudio.load(); radioPlaying=false; updateRadioButton();
  if(autoplay) playRadio();
}
function updateRadioButton(){
  const b=document.querySelector('.playpause-track');
  b.innerHTML=radioPlaying?'<i class="fa-solid fa-pause"></i>':'<i class="fa-solid fa-play"></i>';
  b.setAttribute('aria-label',radioPlaying?'Pause':'Play');
}
async function playRadio(){
  try{await radioAudio.play();radioPlaying=true;updateRadioButton();}
  catch(e){console.error(e);alert('The audio file could not be played. The audio host may be unavailable.');}
}
function pauseRadio(){radioAudio.pause();radioPlaying=false;updateRadioButton();}
function updateRadioProgress(){
  const s=document.querySelector('.seek_slider');
  if(Number.isFinite(radioAudio.duration)&&radioAudio.duration>0){
    s.value=(radioAudio.currentTime/radioAudio.duration)*100;
    document.querySelector('.total-duration').textContent=formatTime(radioAudio.duration);
  }
  document.querySelector('.current-time').textContent=formatTime(radioAudio.currentTime);
}
function seekRadio(){if(Number.isFinite(radioAudio.duration))radioAudio.currentTime=radioAudio.duration*(Number(document.querySelector('.seek_slider').value)/100);}
function nextRadioTrack(){loadRadioTrack(radioTrackIndex+1,true)}
function prevRadioTrack(){loadRadioTrack(radioTrackIndex-1,true)}

radioAudio.addEventListener('timeupdate',updateRadioProgress);
radioAudio.addEventListener('loadedmetadata',updateRadioProgress);
radioAudio.addEventListener('ended',nextRadioTrack);
radioAudio.addEventListener('error',()=>{radioPlaying=false;updateRadioButton();console.error('Audio failed:',radioAudio.src);});

window.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('homeBtn').addEventListener('click',e=>{e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});loadPosts();});
  document.getElementById('archiveToggle').addEventListener('click',()=>{toggleArchive();renderArchiveList();});
  document.getElementById('closeArchive').addEventListener('click',()=>toggleArchive(false));
  document.getElementById('exportBtn').addEventListener('click',exportPosts);
  document.getElementById('getCaptcha').addEventListener('click',makeCaptcha);
  document.getElementById('postBtn').addEventListener('click',submitPost);
  document.querySelector('.playpause-track').addEventListener('click',()=>radioPlaying?pauseRadio():playRadio());
  document.querySelector('.next-track').addEventListener('click',nextRadioTrack);
  document.querySelector('.prev-track').addEventListener('click',prevRadioTrack);
  document.querySelector('.seek_slider').addEventListener('input',seekRadio);
  loadRadioTrack(0); makeCaptcha(); loadPosts(); renderArchiveList();
});
