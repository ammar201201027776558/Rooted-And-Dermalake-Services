// Simple client-side auth and per-user progress storage (not secure)
(function(){
  function getUsers(){
    return JSON.parse(localStorage.getItem('users') || '[]');
  }
  function saveUsers(u){
    localStorage.setItem('users', JSON.stringify(u));
  }

  function hash(p){
    try { return btoa(p); } catch(e){ return String(p); }
  }

  function registerUser(username, password){
    username = (username||'').trim();
    if(!username || !password) return { ok:false, msg:'الرجاء إدخال اسم مستخدم وكلمة مرور' };
    const users = getUsers();
    if(users.find(u => u.username === username)) return { ok:false, msg:'اسم المستخدم موجود بالفعل' };
    users.push({ username, password: hash(password), progress: {} });
    saveUsers(users);
    localStorage.setItem('currentUser', username);
    return { ok:true };
  }

  function loginUser(username, password){
    username = (username||'').trim();
    const users = getUsers();
    const found = users.find(u => u.username === username && u.password === hash(password));
    if(!found) return { ok:false, msg:'اسم المستخدم أو كلمة المرور غير صحيحة' };
    localStorage.setItem('currentUser', username);
    return { ok:true };
  }

  function logoutUser(){
    localStorage.removeItem('currentUser');
  }

  function getCurrentUser(){
    return localStorage.getItem('currentUser');
  }

  function saveUserProgress(obj){
    const username = getCurrentUser();
    if(!username) return { ok:false, msg:'غير مسجل الدخول' };
    const users = getUsers();
    const u = users.find(x => x.username === username);
    if(!u) return { ok:false, msg:'المستخدم غير موجود' };
    u.progress = obj || {};
    saveUsers(users);
    // also keep a snapshot key per user for convenience
    localStorage.setItem('progress:' + username, JSON.stringify(u.progress));
    return { ok:true };
  }

  function loadUserProgress(){
    const username = getCurrentUser();
    if(!username) return null;
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
    loadUserProgress
  };
})();
