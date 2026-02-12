import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from 'react-router-dom';
import '../App.css';

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // UI State: Toggles between Admin and User login views
  const [isAdmin, setIsAdmin] = useState(false); 
  
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    const auth = getAuth();
    
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Authentication successful
        console.log("Logged in:", userCredential.user);
        
        // Redirect based on selected mode
        if (isAdmin) {
          navigate('/admin'); 
        } else {
          navigate('/home'); 
        }
      })
      .catch((error) => {
        setError("Invalid Email or Password");
        setLoading(false);
      });
  };

  return (
    <div className="app-container login-mode">
      {/* Background Elements */}
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>

      <div className="login-wrapper">
        <div className="glass-panel login-card">
        <div className="login-header" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            textAlign: 'center',
            width: '100%'
          }}>
            
            {/* Logo Container */}
            <div style={{ 
              position: 'relative', 
              width: '100%', 
              height: '80px',       
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              
              {/* Background Circle */}
              <div style={{
                position: 'absolute',
                width: '80px',        
                height: '80px',       
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(162, 155, 254, 0.25) 0%, rgba(162, 155, 254, 0) 70%)',
                zIndex: 0             
              }}></div>

              {/* Foreground Text */}
              <div style={{
                position: 'relative',
                zIndex: 2,            
                fontSize: '3rem', 
                fontWeight: 'bold', 
                color: 'white',
                whiteSpace: 'nowrap'
              }}>
                ParkOS
              </div>
            </div>
            
            {/* Dynamic Header Title */}
            <h1 style={{ margin: '0.5rem 0' }}>
              {isAdmin ? "Admin Portal" : "Welcome Back, User"}
            </h1>
            
            <p style={{ margin: 0, opacity: 0.8 }}>
              {isAdmin 
                ? "Enter credentials to access the Dashboard." 
                : "Enter your details to book a parking slot."}
            </p>
          </div>
          
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <input 
                type="email" 
                placeholder={isAdmin ? "admin@parking.com" : "user@parking.com"} 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input"
                required
              />
            </div>
            <div className="input-group">
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input"
                required
              />
            </div>
            
            <button type="submit" className="action-btn login-btn" disabled={loading}>
              {loading 
                ? "Signing In..." 
                : (isAdmin ? "Sign In to Dashboard" : "Sign In to App")
              }
            </button>
          </form>
          
          {error && <div className="error-message">{error}</div>}

          {/* Login Mode Toggle */}
          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
            {isAdmin ? (
              <span>
                Not an admin?{' '}
                <button 
                  onClick={() => setIsAdmin(false)} 
                  style={{ background: 'none', border: 'none', color: '#4facfe', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  User Login
                </button>
              </span>
            ) : (
              <span>
                Need to manage the system?{' '}
                <button 
                  onClick={() => setIsAdmin(true)} 
                  style={{ background: 'none', border: 'none', color: '#ff5858', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Login as Admin
                </button>
              </span>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default Login;