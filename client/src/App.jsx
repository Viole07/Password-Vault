import { useState, useEffect, useMemo } from 'react';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import { Eye, EyeOff, Copy, Plus, Lock, LogOut, UserPlus, LogIn, Unlock, Trash2, Search, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';
import './App.css'; 

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001/api";

function App() {
  const [vault, setVault] = useState([]);
  const [formData, setFormData] = useState({ title: '', url: '', email: '', password: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showPassword, setShowPassword] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Auth & Security States
  const [token, setToken] = useState(localStorage.getItem('vaultToken') || '');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authData, setAuthData] = useState({ username: '', password: '' });
  const [masterKey, setMasterKey] = useState(''); 
  const [unlockInput, setUnlockInput] = useState('');

  const validation = useMemo(() => ({
    length: authData.password.length >= 8,
    upper: /[A-Z]/.test(authData.password),
    lower: /[a-z]/.test(authData.password),
    number: /\d/.test(authData.password),
    special: /[@$!%*?&]/.test(authData.password)
  }), [authData.password]);

  const isPasswordValid = Object.values(validation).every(Boolean);

  // --- SECURITY HELPERS ---

  const getDerivedKey = (password) => {
    const salt = authData.username || localStorage.getItem('vaultUser');
    if (!salt) return null;
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 600000 
    }).toString();
  };

  const fetchVault = async () => {
    if (!masterKey) return;
    try {
      const res = await axios.get(`${API_BASE}/vault`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const decryptedData = res.data.map(item => {
        try {
          const bytes = CryptoJS.AES.decrypt(item.password, masterKey);
          const originalText = bytes.toString(CryptoJS.enc.Utf8);
          return { ...item, password: originalText || "Decryption Failed" };
        } catch (e) {
          return { ...item, password: "Decryption Error" };
        }
      });
      setVault(decryptedData);
    } catch (err) {
      if (err.response?.status === 403) handleLogout();
    }
  };

  useEffect(() => {
    if (token && masterKey) fetchVault();
  }, [token, masterKey]);

  // --- AUTH HANDLERS ---

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) return;
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/register`, authData);
      alert("Registration Successful! Now login.");
      setIsRegistering(false);
    } catch (err) {
      alert(err.response?.data?.error || "Registration Failed");
    } finally { setLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Timeout allows UI to show "Loading" before heavy math blocks the thread
    setTimeout(async () => {
      try {
        const res = await axios.post(`${API_BASE}/auth/login`, authData);
        const generatedKey = getDerivedKey(authData.password);
        
        localStorage.setItem('keyFingerprint', CryptoJS.SHA256(generatedKey).toString());
        localStorage.setItem('vaultToken', res.data.token);
        localStorage.setItem('vaultUser', authData.username);
        
        setToken(res.data.token);
        setMasterKey(generatedKey);
        setAuthData({ ...authData, password: '' }); 
      } catch (err) {
        alert("Login Failed: Check credentials.");
      } finally { setLoading(false); }
    }, 100);
  };

  const handleUnlock = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const inputKey = getDerivedKey(unlockInput);
      if (!inputKey) { setLoading(false); return; }
      const inputFingerprint = CryptoJS.SHA256(inputKey).toString();
      
      if (inputFingerprint === localStorage.getItem('keyFingerprint')) {
        setMasterKey(inputKey);
        setUnlockInput('');
      } else {
        alert("Incorrect Master Password!");
        setUnlockInput('');
      }
      setLoading(false);
    }, 100);
  };

  const handleLogout = () => {
    localStorage.removeItem('vaultToken');
    localStorage.removeItem('vaultUser');
    localStorage.removeItem('keyFingerprint');
    setToken(''); setMasterKey(''); setVault([]);
  };

  // --- VAULT CRUD ---

  const handleSubmit = async (e) => {
    e.preventDefault();
    const encryptedPassword = CryptoJS.AES.encrypt(formData.password, masterKey).toString();
    try {
      await axios.post(`${API_BASE}/vault`, 
        { ...formData, password: encryptedPassword }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFormData({ title: '', url: '', email: '', password: '' });
      fetchVault();
    } catch (err) { alert("Error saving"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await axios.delete(`${API_BASE}/vault/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchVault();
    } catch (err) { alert("Delete failed"); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied! Clipboard clears in 30s.");
    setTimeout(() => navigator.clipboard.writeText(""), 30000); 
  };

  // --- RENDERING ---

  if (!token) {
    return (
      <div className="container center-ui">
        <Lock size={60} className="primary-color bounce" />
        <h1 className="main-title">{isRegistering ? "Secure Enrollment" : "Vault Access"}</h1>
        
        <div className="warning-banner">
          <AlertTriangle size={18} />
          <span><strong>Security Notice:</strong> This is a Zero-Knowledge system. If you forget your Master Password, your data is lost forever. There is no password reset.</span>
        </div>

        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="vault-form">
          <input 
            name="username" 
            placeholder="Username" 
            onChange={(e) => setAuthData({...authData, username: e.target.value})} 
            required 
          />
          <input 
            name="password" 
            type="password" 
            placeholder="Master Password" 
            onChange={(e) => setAuthData({...authData, password: e.target.value})} 
            required 
          />
          
          {isRegistering && (
            <div className="validation-box">
              <p style={{ color: validation.length ? '#4CAF50' : '#ff4444' }}>{validation.length ? '✓' : '×'} 8+ Characters</p>
              <p style={{ color: validation.upper ? '#4CAF50' : '#ff4444' }}>{validation.upper ? '✓' : '×'} Uppercase Letter</p>
              <p style={{ color: validation.lower ? '#4CAF50' : '#ff4444' }}>{validation.lower ? '✓' : '×'} Lowercase Letter</p>
              <p style={{ color: validation.number ? '#4CAF50' : '#ff4444' }}>{validation.number ? '✓' : '×'} Number</p>
              <p style={{ color: validation.special ? '#4CAF50' : '#ff4444' }}>{validation.special ? '✓' : '×'} Special Character (@$!%*?&)</p>
            </div>
          )}

          <button type="submit" className="btn-add" disabled={(isRegistering && !isPasswordValid) || loading}>
            {loading ? "Computing Key..." : (isRegistering ? "Register" : "Login")}
          </button>
        </form>

        <p onClick={() => setIsRegistering(!isRegistering)} className="toggle-auth">
          {isRegistering ? "Back to Login" : "Need a secure account? Register"}
        </p>

        <footer className="footer-info">
          <div className="info-badge"><ShieldCheck size={14}/> AES-256-CBC</div>
          <div className="info-badge"><Cpu size={14}/> 100k PBKDF2</div>
        </footer>
      </div>
    );
  }

  if (!masterKey) {
    return (
      <div className="container center-ui">
        <Unlock size={60} className="danger-color" />
        <h1>Vault is Locked</h1>
        <p className="subtitle">Enter your Master Password to re-derive your local decryption key.</p>
        <form onSubmit={handleUnlock} className="vault-form" style={{maxWidth: '400px'}}>
          <input type="password" placeholder="Master Password" value={unlockInput} onChange={(e) => setUnlockInput(e.target.value)} required />
          <button type="submit" className="btn-add" disabled={loading}>
            {loading ? "Unlocking..." : "Unlock"}
          </button>
        </form>
        <button onClick={handleLogout} className="btn-logout">Logout / Switch User</button>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="vault-header">
        <div className="header-brand">
          <ShieldCheck size={24} className="primary-color" />
          <h1>Password Vault</h1>
        </div>
        <button onClick={handleLogout} className="btn-logout"><LogOut size={16} /> Logout</button>
      </header>

      <form className="vault-form" onSubmit={handleSubmit}>
        <h3>Add New Secure Entry</h3>
        <input name="title" placeholder="Site Name" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
        <input name="email" placeholder="Email/Username" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
        <input name="password" type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
        <button type="submit" className="btn-add"><Plus size={16} /> Encrypt & Add</button>
      </form>

      <div className="search-container">
        <Search className="search-icon" size={18} />
        <input className="search-bar" placeholder="Search decrypted vault..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      <div className="vault-list">
        {vault.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => (
          <div key={item._id} className="vault-item">
            <div className="vault-info">
              <strong style={{fontSize: '1.1rem'}}>{item.title}</strong>
              <div className="vault-email">{item.email}</div>
            </div>
            <div className="vault-actions">
              <span className="password-box">{showPassword[item._id] ? item.password : '••••••••'}</span>
              <button className="btn-icon" onClick={() => setShowPassword({...showPassword, [item._id]: !showPassword[item._id]})}>
                {showPassword[item._id] ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
              <button className="btn-icon" onClick={() => copyToClipboard(item.password)}><Copy size={16}/></button>
              <button className="btn-delete" onClick={() => handleDelete(item._id)}><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
      </div>
      {vault.length === 0 && <p style={{textAlign: 'center', color: '#444', marginTop: '40px'}}>Vault is empty.</p>}
    </div>
  );
}

export default App;