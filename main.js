const MAX_MESSAGE_LENGTH = 2000;
const SUPABASE_URL = 'https://atuwtktnxeimwvprkdgp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_II673G5TTeusbLVOtaKm8g_8GL6XEEI';
let currentCaptcha=null,radioTrackIndex=0,radioPlaying=false;
const radioAudio=new Audio(); radioAudio.preload='metadata';
const radioTracks=[];
window.addEventListener('DOMContentLoaded',()=>{loadPosts();});