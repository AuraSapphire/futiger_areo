const SUPABASE_URL='https://atuwtktnxeimwvprkdgp.supabase.co';
const SUPABASE_KEY='sb_publishable_II673G5TTeusbLVOtaKm8g_8GL6XEEI';
const MAX_MESSAGE_LENGTH=2000;
let captchaAnswer=0;

async function db(path,options={}){
  const headers={apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,...(options.headers||{})};
  if(options.body)headers['Content-Type']='application/json';
  const res=await fetch(SUPABASE_URL+'/rest/v1/'+path,{...options,headers});
  const body=await res.text();
  if(!res.ok)throw new Error(body||('HTTP '+res.status));
  return body?JSON.parse(body):null;
}


const AUDIO_BUCKET='site-audio';
let audioTracks=[];
let currentTrackIndex=0;

function prettyTrackName(filename){
  return filename.replace(/\\.[^/.]+$/,'').replace(/[-_]+/g,' ').replace(/\\b\\w/g,c=>c.toUpperCase());
}

function audioPublicUrl(path){
  return SUPABASE_URL+'/storage/v1/object/public/'+AUDIO_BUCKET+'/'+path.split('/').map(encodeURIComponent).join('/');
}

async function loadMusicLibrary(){
  const list=document.getElementById('musicPlaylist');
  const audio=document.getElementById('siteAudio');
  if(!list||!audio)return;
  list.innerHTML='<div class="playlist-loading"><i class="fa-solid fa-spinner fa-spin"></i> scanning the radio shelf…</div>';
  try{
    const res=await fetch(SUPABASE_URL+'/storage/v1/object/list/'+AUDIO_BUCKET,{
      method:'POST',
      headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({prefix:'',limit:100,offset:0,sortBy:{column:'name',order:'asc'}})
    });
    const rows=await res.json();
    if(!res.ok)throw new Error(rows?.message||'Could not list music');
    audioTracks=(Array.isArray(rows)?rows:[]).filter(x=>x.id!==null && /\\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(x.name));
    list.innerHTML='';
    if(!audioTracks.length){
      list.innerHTML='<div class="playlist-empty">No songs yet — upload one to the <b>site-audio</b> bucket.</div>';
      return;
    }
    audioTracks.forEach((track,i)=>{
      const btn=document.createElement('button');
      btn.type='button';btn.className='playlist-track';
      btn.innerHTML='<i class="fa-solid fa-music"></i><span>'+prettyTrackName(track.name)+'</span>';
      btn.addEventListener('click',()=>playTrack(i));
      list.appendChild(btn);
    });
    playTrack(0,false);
  }catch(err){
    console.error('Music library error:',err);
    list.innerHTML='<div class="playlist-empty">Radio shelf unavailable. <button id="musicRetry" class="aero-btn small" type="button">retry</button></div>';
    document.getElementById('musicRetry')?.addEventListener('click',loadMusicLibrary);
  }
}

function playTrack(index,autoplay=true){
  const audio=document.getElementById('siteAudio');
  if(!audio||!audioTracks[index])return;
  currentTrackIndex=index;
  const track=audioTracks[index];
  audio.src=audioPublicUrl(track.name);
  const name=document.querySelector('.track-name'),artist=document.querySelector('.track-artist');
  if(name)name.textContent=prettyTrackName(track.name);
  if(artist)artist.textContent='site-audio • Supabase';
  document.querySelectorAll('.playlist-track').forEach((b,i)=>b.classList.toggle('active',i===index));
  if(autoplay)audio.play().catch(()=>{});
}

function setupMusicPlayer(){
  const audio=document.getElementById('siteAudio');
  if(!audio)return;
  audio.addEventListener('ended',()=>playTrack((currentTrackIndex+1)%audioTracks.length));
  document.getElementById('musicRefresh')?.addEventListener('click',loadMusicLibrary);
  loadMusicLibrary();
}

function makeCaptcha(){
  const a=Math.floor(Math.random()*9)+1,b=Math.floor(Math.random()*9)+1;
  captchaAnswer=a+b;
  const q=document.getElementById('captchaQuestion'),input=document.getElementById('captchaAnswer');
  if(q)q.textContent=a+' + '+b+' =';
  if(input)input.value='';
}

function formatDate(value){
  return new Date(value).toLocaleString([], {dateStyle:'medium',timeStyle:'short'});
}

async function loadPosts(date=null){
  const box=document.getElementById('postsContainer');
  if(!box)return;
  box.innerHTML='<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i> floating thoughts are loading…</div>';
  try{
    const rows=await db('posts?select=id,message,created_at,is_deleted&is_deleted=eq.false&order=created_at.desc&limit=5000');
    const posts=date?rows.filter(p=>new Date(p.created_at).toISOString().slice(0,10)===date):rows;
    if(!posts.length){
      box.innerHTML='<div class="empty-state"><div class="empty-cloud">☁</div><strong>nothing floating yet</strong><span>be the first to leave a thought</span></div>';
      return;
    }
    box.innerHTML='';
    for(const post of posts){
      const card=document.createElement('article');
      card.className='post-card';
      const meta=document.createElement('div');
      meta.className='post-meta';
      const who=document.createElement('span');
      who.textContent='anonymous';
      const time=document.createElement('time');
      time.textContent='• '+formatDate(post.created_at);
      meta.append(who,time);
      const msg=document.createElement('div');
      msg.className='post-message';
      msg.textContent=post.message||'';
      card.append(meta,msg);
      box.appendChild(card);
    }
  }catch(err){
    console.error('Supabase load error:',err);
    box.innerHTML='<div class="error-state"><i class="fa-solid fa-triangle-exclamation"></i><strong>the sky is cloudy</strong><span>Could not load the diary.</span><small style="display:block;opacity:.7;margin-top:8px">Check your connection and try again.</small><button id="retryBtn" class="aero-btn small">try again</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click',()=>loadPosts(date));
  }
}

async function renderArchiveList(){
  const wrap=document.getElementById('archiveDates');
  if(!wrap)return;
  try{
    const rows=await db('posts?select=created_at&is_deleted=eq.false&order=created_at.desc&limit=5000');
    const dates=[...new Set(rows.map(p=>new Date(p.created_at).toISOString().slice(0,10)))];
    wrap.innerHTML='';
    for(const date of dates){
      const btn=document.createElement('button');
      btn.type='button';btn.className='archive-date';
      btn.textContent=new Date(date+'T00:00:00').toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
      btn.addEventListener('click',()=>{toggleArchive(false);loadPosts(date);});
      wrap.appendChild(btn);
    }
    if(!dates.length)wrap.innerHTML='<div class="archive-empty">no archives yet</div>';
  }catch(err){console.error(err);wrap.innerHTML='<div class="archive-empty">archive unavailable</div>'}
}

async function submitPost(){
  const input=document.getElementById('postInput');
  const captcha=document.getElementById('captchaAnswer');
  const message=input?.value.trim()||'';
  if(!message)return alert('say something!');
  if(message.length>MAX_MESSAGE_LENGTH)return alert('message too long');
  if(Number(captcha?.value)!==captchaAnswer)return alert('captcha answer is incorrect');
  try{
    await db('posts',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({message})});
    input.value='';
    makeCaptcha();
    await loadPosts();
    await renderArchiveList();
  }catch(err){console.error(err);alert('failed to post. '+err.message)}
}

function toggleArchive(show){
  const panel=document.getElementById('archivePanel');
  if(!panel)return;
  if(show===undefined)show=panel.hasAttribute('hidden');
  panel.toggleAttribute('hidden',!show);
}

async function exportPosts(){
  try{
    const rows=await db('posts?select=message,created_at&is_deleted=eq.false&order=created_at.asc&limit=5000');
    const text=rows.map(p=>'['+formatDate(p.created_at)+'] anonymous\n'+(p.message||'')).join('\n\n');
    const blob=new Blob([text||'No posts yet.'],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='public-dumps-'+new Date().toISOString().slice(0,10)+'.txt';
    document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }catch(err){console.error(err);alert('could not export posts')}
}



/* Functional Note Pad-style page scrollbar */
function setupPageScrollbar(){
  const rail=document.getElementById('pageScrollbar');
  const track=document.getElementById('npScrollTrack');
  const thumb=document.getElementById('npScrollThumb');
  const up=document.getElementById('npScrollUp');
  const down=document.getElementById('npScrollDown');
  if(!rail||!track||!thumb||!up||!down)return;

  let dragging=false;
  let dragOffset=0;

  function metrics(){
    const max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
    const trackH=track.clientHeight;
    const ratio=window.innerHeight/Math.max(document.documentElement.scrollHeight,window.innerHeight);
    const thumbH=Math.max(24,Math.min(trackH,Math.round(trackH*ratio)));
    const travel=Math.max(0,trackH-thumbH);
    return {max,trackH,thumbH,travel};
  }

  function render(){
    const m=metrics();
    thumb.style.height=m.thumbH+'px';
    const y=m.max?window.scrollY/m.max*m.travel:0;
    thumb.style.top=Math.max(0,Math.min(m.travel,y))+'px';
  }

  function scrollByPage(amount){
    window.scrollBy({top:amount,behavior:'smooth'});
  }

  up.addEventListener('click',()=>scrollByPage(-Math.max(80,window.innerHeight*.65)));
  down.addEventListener('click',()=>scrollByPage(Math.max(80,window.innerHeight*.65)));

  track.addEventListener('pointerdown',e=>{
    if(e.target===thumb)return;
    const r=track.getBoundingClientRect();
    const m=metrics();
    const target=Math.max(0,Math.min(m.travel,e.clientY-r.top-m.thumbH/2));
    window.scrollTo({top:m.max?(target/m.travel)*m.max:0,behavior:'smooth'});
  });

  thumb.addEventListener('pointerdown',e=>{
    e.preventDefault();
    const r=thumb.getBoundingClientRect();
    dragging=true;
    dragOffset=e.clientY-r.top;
    thumb.setPointerCapture(e.pointerId);
  });
  thumb.addEventListener('pointermove',e=>{
    if(!dragging)return;
    const r=track.getBoundingClientRect();
    const m=metrics();
    const target=Math.max(0,Math.min(m.travel,e.clientY-r.top-dragOffset));
    window.scrollTo({top:m.max?(target/m.travel)*m.max:0});
  });
  thumb.addEventListener('pointerup',()=>{dragging=false});
  thumb.addEventListener('pointercancel',()=>{dragging=false});

  // Wheel over the custom scrollbar itself.
  rail.addEventListener('wheel',e=>{
    e.preventDefault();
    window.scrollBy({top:e.deltaY});
  },{passive:false});

  window.addEventListener('scroll',render,{passive:true});
  window.addEventListener('resize',render);
  requestAnimationFrame(render);
}

window.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('homeBtn')?.addEventListener('click',e=>{e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});loadPosts()});
  document.getElementById('archiveToggle')?.addEventListener('click',()=>{toggleArchive();renderArchiveList()});
  document.getElementById('closeArchive')?.addEventListener('click',()=>toggleArchive(false));
  document.getElementById('exportBtn')?.addEventListener('click',exportPosts);
  document.getElementById('getCaptcha')?.addEventListener('click',makeCaptcha);
  document.getElementById('postBtn')?.addEventListener('click',submitPost);
  makeCaptcha();
  loadPosts();renderArchiveList();
  setupMusicPlayer();
  setupPageScrollbar();
});
