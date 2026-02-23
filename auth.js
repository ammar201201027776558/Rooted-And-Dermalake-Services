// Simple client-side auth and per-user progress storage (not secure)
(function(){
  const API_ROOT = 'http://localhost:3000/api';

  function getUsers(){ return JSON.parse(localStorage.getItem('users') || '[]'); }
  function saveUsers(u){ localStorage.setItem('users', JSON.stringify(u)); }
  function hash(p){ try { return btoa(p); } catch(e){ return String(p); } }

  function setSessionCreds(username, password){
    try { sessionStorage.setItem('authCred', btoa(username + ':' + password)); } catch(e){}
  }
  function clearSessionCreds(){ sessionStorage.removeItem('authCred'); }
  function getSessionCreds(){
    try { const v = sessionStorage.getItem('authCred'); if(!v) return null; const s = atob(v); const idx = s.indexOf(':'); if(idx === -1) return null; return { username: s.slice(0, idx), password: s.slice(idx+1) }; } catch(e){ return null; }
  }

  // Try backend register, fallback to localStorage if network/remote fails
  async function registerUser(username, password){
    username = (username||'').trim();
    if(!username || !password) return { ok:false, msg:'الرجاء إدخال اسم مستخدم وكلمة مرور' };
    // try backend
    try {
      const resp = await fetch(API_ROOT + '/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) });
      if(resp.ok){ setSessionCreds(username,password); localStorage.setItem('currentUser', username); return { ok:true, backend:true }; }
      const j = await resp.json().catch(()=>({}));
      // if username exists or other server response, return that
      return { ok:false, msg: j.msg || 'خطأ من الخادم' };
    } catch (err) {
      // fallback to localStorage implementation
      const users = getUsers();
      if(users.find(u => u.username === username)) return { ok:false, msg:'اسم المستخدم موجود بالفعل' };
      users.push({ username, password: hash(password), progress: {} });
      saveUsers(users);
      localStorage.setItem('currentUser', username);
      setSessionCreds(username,password);
      return { ok:true, backend:false };
    }
  }

  async function loginUser(username, password){
    username = (username||'').trim();
    if(!username || !password) return { ok:false, msg:'الرجاء إدخال اسم مستخدم وكلمة مرور' };
    try {
      const resp = await fetch(API_ROOT + '/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) });
      if(resp.ok){ localStorage.setItem('currentUser', username); setSessionCreds(username,password); return { ok:true, backend:true }; }
      const j = await resp.json().catch(()=>({}));
      return { ok:false, msg: j.msg || 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    } catch (err) {
      // fallback to localStorage
      const users = getUsers();
      const found = users.find(u => u.username === username && u.password === hash(password));
      if(!found) return { ok:false, msg:'اسم المستخدم أو كلمة المرور غير صحيحة' };
      localStorage.setItem('currentUser', username);
      setSessionCreds(username,password);
      return { ok:true, backend:false };
    }
  }

  function logoutUser(){ localStorage.removeItem('currentUser'); clearSessionCreds(); }
  function getCurrentUser(){ return localStorage.getItem('currentUser'); }

  // Save progress: try backend using session creds, else local
  async function saveUserProgress(obj){
    const username = getCurrentUser(); if(!username) return { ok:false, msg:'غير مسجل الدخول' };
    const creds = getSessionCreds();
    if(creds){
      try {
        const resp = await fetch(API_ROOT + '/saveProgress', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: creds.username, password: creds.password, state: obj }) });
        if(resp.ok) return { ok:true, backend:true };
      } catch(e){}
    }
    // fallback local
    const users = getUsers();
    const u = users.find(x => x.username === username);
    if(!u) return { ok:false, msg:'المستخدم غير موجود' };
    u.progress = obj || {};
    saveUsers(users);
    localStorage.setItem('progress:' + username, JSON.stringify(u.progress));
    return { ok:true, backend:false };
  }

  async function loadUserProgress(){
    const username = getCurrentUser(); if(!username) return null;
    const creds = getSessionCreds();
    if(creds){
      try {
        const resp = await fetch(API_ROOT + '/loadProgress', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: creds.username, password: creds.password }) });
        if(resp.ok){ const j = await resp.json(); return j.progress || null; }
      } catch(e){}
    }
    const users = getUsers();
    const u = users.find(x => x.username === username);
    return (u && u.progress) ? u.progress : null;
  }

  window.auth = {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    saveUserProgress,
    loadUserProgress,
    // expose session helper for debugging
    _getSessionCreds: getSessionCreds
  };
})();
