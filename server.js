const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const DB_FILE = path.join(__dirname, 'db.json');
function readDB(){
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e){ return { users: [] }; }
}
function writeDB(db){ fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8'); }

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));

app.get('/', (req, res) => res.json({ ok: true, msg: 'auth backend running' }));

app.post('/api/register', (req, res) => {
  const { username, password } = req.body || {};
  if(!username || !password) return res.status(400).json({ ok:false, msg:'missing' });
  const db = readDB();
  if(db.users.find(u => u.username === username)) return res.status(409).json({ ok:false, msg:'exists' });
  const hash = bcrypt.hashSync(password, 10);
  db.users.push({ username, passwordHash: hash, progress: {} });
  writeDB(db);
  return res.json({ ok:true });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if(!username || !password) return res.status(400).json({ ok:false, msg:'missing' });
  const db = readDB();
  const u = db.users.find(x => x.username === username);
  if(!u) return res.status(401).json({ ok:false, msg:'notfound' });
  const match = bcrypt.compareSync(password, u.passwordHash);
  if(!match) return res.status(401).json({ ok:false, msg:'invalid' });
  return res.json({ ok:true });
});

function authCheck(body){
  const { username, password } = body || {};
  if(!username || !password) return { ok:false, msg:'missing' };
  const db = readDB();
  const u = db.users.find(x => x.username === username);
  if(!u) return { ok:false, msg:'notfound' };
  if(!bcrypt.compareSync(password, u.passwordHash)) return { ok:false, msg:'invalid' };
  return { ok:true, user:u, db };
}

app.post('/api/saveProgress', (req, res) => {
  const check = authCheck(req.body);
  if(!check.ok) return res.status(401).json(check);
  const { db, user } = check;
  const { state } = req.body || {};
  user.progress = state || {};
  writeDB(db);
  return res.json({ ok:true });
});

app.post('/api/loadProgress', (req, res) => {
  const check = authCheck(req.body);
  if(!check.ok) return res.status(401).json(check);
  const { user } = check;
  return res.json({ ok:true, progress: user.progress || {} });
});

// ensure db exists
if(!fs.existsSync(DB_FILE)) writeDB({ users: [] });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Auth backend listening on port', PORT));
