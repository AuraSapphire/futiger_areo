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

const tracks=[
{name:'Season of Memories',artist:'GFRIEND',src:'https://files.catbox.moe/vc4p9o.mp3',image:'https://64.media.tumblr.com/257022417e60949df9482eafb52e5ace/823f4dd47674e5f7-3d/s2048x3072/6d11aa3c11b135bccaf8f4ccd42a6abdcfced8cc.jpg'},
{name:'HIGH',artist:'Seori',src:'https://files.catbox.moe/ddh7c5.mp3',image:'https://64.media.tumblr.com/1c56b4b76b0736f0833a4e43d174ed66/823f4dd47674e5f7-b5/s2048x3072/4f2138ddeb3a4aa98887b8b55aa27fcda7fc3969.jpg'}
];
let track=0,playing=false;
const audio=new Audio();audio.preload='metadata';
function updatePlayer(){
  const t=tracks[track];
  document.querySelector('.track-name')?.replaceChildren(document.createTextNode(t.name));
  document.querySelector('.track-artist')?.replaceChildren(document.createTextNode(t.artist));
  const art=document.querySelector('.track-art');if(art)art.style.backgroundImage='url("'+t.image+'")';
  const btn=document.querySelector('.playpause-track');if(btn)btn.innerHTML=playing?'<i class="fa-solid fa-pause"></i>':'<i class="fa-solid fa-play"></i>';
}
async function playPause(){
  if(playing){audio.pause();playing=false;updatePlayer();return}
  try{await audio.play();playing=true;updatePlayer()}catch(e){console.error(e);alert('The audio file could not be played.')}
}
function changeTrack(step,autoplay=true){
  track=(track+step+tracks.length)%tracks.length;
  audio.src=tracks[track].src;audio.load();playing=false;updatePlayer();
  if(autoplay)playPause();
}
audio.addEventListener('ended',()=>changeTrack(1,true));
audio.addEventListener('timeupdate',()=>{
  const range=document.querySelector('.seek_slider');
  if(range&&audio.duration)range.value=audio.currentTime/audio.duration*100;
  const cur=document.querySelector('.current-time');if(cur)cur.textContent=new Date(audio.currentTime*1000).toISOString().slice(14,19);
  const total=document.querySelector('.total-duration');if(total&&audio.duration)total.textContent=new Date(audio.duration*1000).toISOString().slice(14,19);
});

window.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('homeBtn')?.addEventListener('click',e=>{e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});loadPosts()});
  document.getElementById('archiveToggle')?.addEventListener('click',()=>{toggleArchive();renderArchiveList()});
  document.getElementById('closeArchive')?.addEventListener('click',()=>toggleArchive(false));
  document.getElementById('exportBtn')?.addEventListener('click',exportPosts);
  document.getElementById('getCaptcha')?.addEventListener('click',makeCaptcha);
  document.getElementById('postBtn')?.addEventListener('click',submitPost);
  document.querySelector('.playpause-track')?.addEventListener('click',playPause);
  document.querySelector('.next-track')?.addEventListener('click',()=>changeTrack(1));
  document.querySelector('.prev-track')?.addEventListener('click',()=>changeTrack(-1));
  document.querySelector('.seek_slider')?.addEventListener('input',e=>{if(audio.duration)audio.currentTime=audio.duration*Number(e.target.value)/100});
  audio.src=tracks[0].src;updatePlayer();makeCaptcha();
  loadPosts();renderArchiveList();
});
