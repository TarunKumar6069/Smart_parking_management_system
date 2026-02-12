import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, update, get, push } from "firebase/database"; 
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import Login from './Login';
import '../App.css';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCzS1cF71A0vieBPJ02KkrxM4mqZ3-HQ8E", 
  authDomain: "smartparking-2226.firebaseapp.com",
  databaseURL: "https://smartparking-2226-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smartparking-2226",
  storageBucket: "smartparking-2226.appspot.com",
  messagingSenderId: "123",
  appId: "1:123:web:abc"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

function UserHome() {
  const [user, setUser] = useState(null);
  const [locations, setLocations] = useState({});
  const [notification, setNotification] = useState(null);

  // View Navigation State
  const [view, setView] = useState('dashboard'); 
  const [history, setHistory] = useState([]);

  // Modal State
  const [selectedSlot, setSelectedSlot] = useState(null);

  /**
   * Effect: Initialization & Cleanup
   * Resets 'reserved' flags on component mount to ensure data consistency 
   * in case of previous unexpected disconnects.
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const locationsRef = ref(database, 'locations');
        get(locationsRef).then((snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const updates = {};
            // Reset local reservation status for all nodes
            Object.keys(data).forEach(key => {
              updates[`locations/${key}/reserved`] = 0;
            });
            update(ref(database), updates);
          }
        });
      }
    });
    return () => unsubscribe();
  }, []);

  /**
   * Effect: Real-time Data Listener
   * Subscribes to the 'locations' node to reflect changes instantly.
   */
  useEffect(() => {
    if (user) {
      const locationsRef = ref(database, 'locations');
      onValue(locationsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) setLocations(data);
      });
    }
  }, [user]);

  // Helper: Extract display name from email address
  const getUserName = () => {
    if (!user || !user.email) return "User";
    const namePart = user.email.split('@')[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  };

  const initiateBooking = (key) => {
    setSelectedSlot(key);
  };

  /**
   * Core Logic: Booking Transaction
   * 1. Validates availability.
   * 2. Updates database reservation count.
   * 3. Generates a transactional receipt.
   * 4. Updates local history.
   */
  const finalizeBooking = (durationLabel, priceAmount) => {
    if (!selectedSlot) return;

    const key = selectedSlot;
    const place = locations[key];
    
    // Calculate real-time availability
    const totalOccupied = (place.occupied || 0) + (place.reserved || 0);
    const realFree = place.total - totalOccupied;

    if (realFree > 0) {
      // 1. Reserve the slot in the database
      update(ref(database, `locations/${key}`), {
        reserved: (place.reserved || 0) + 1
      })
      .then(() => {
        // 2. Generate Receipt Object
        const receipt = {
          userEmail: user.email,
          locationName: place.name || "Unknown Location",
          timestamp: Date.now(),
          dateString: new Date().toLocaleDateString(),
          timeString: new Date().toLocaleTimeString(),
          duration: durationLabel,
          price: priceAmount,
          status: 'Confirmed'
        };

        // 3. Push receipt to 'bookings' collection
        push(ref(database, 'bookings'), receipt);

        // 4. Update local history state for UI feedback
        const newHistoryItem = {
          id: Date.now(),
          place: place.name,
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          date: new Date().toLocaleDateString(),
          duration: durationLabel,
          price: priceAmount, 
          status: 'Active'
        };
        setHistory([newHistoryItem, ...history]);

        // UI Feedback
        setNotification(`✅ Booked for ${durationLabel}!`);
        setSelectedSlot(null);
        setTimeout(() => setNotification(null), 3000);
      })
      .catch((error) => alert(error.message));
    } else {
      alert("Parking Full!");
      setSelectedSlot(null);
    }
  };

  if (!user) return <Login onLogin={setUser} />;

  // Helper: Retrieve dynamic pricing for the currently selected location
  const getActivePrices = () => {
    if (!selectedSlot || !locations[selectedSlot]) {
        return { p1: 20, p6: 60, p24: 150 }; // Default fallback
    }
    const loc = locations[selectedSlot];
    return {
        p1: loc.prices && loc.prices['1hr'] ? loc.prices['1hr'] : 20,
        p6: loc.prices && loc.prices['6hr'] ? loc.prices['6hr'] : 60,
        p24: loc.prices && loc.prices['24hr'] ? loc.prices['24hr'] : 150,
    };
  };

  return (
    <div className="app-container">
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>

      <header>
        <div className="logo" onClick={() => setView('dashboard')} style={{cursor: 'pointer'}}>
          🅿️ ParkOS <span className="beta-tag"></span>
        </div>
        
        <nav className="top-nav">
          <button 
            className={view === 'dashboard' ? 'nav-link active' : 'nav-link'} 
            onClick={() => setView('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={view === 'history' ? 'nav-link active' : 'nav-link'} 
            onClick={() => setView('history')}
          >
            History
          </button>
          <button 
            className={view === 'about' ? 'nav-link active' : 'nav-link'} 
            onClick={() => setView('about')}
          >
            About
          </button>
        </nav>

        <div className="user-header-info">
          <span className="welcome-text">Hi, {getUserName()}</span>
          <button className="logout-btn" onClick={() => signOut(auth)}>Log Out</button>
        </div>
      </header>

      {notification && <div className="notification-toast">{notification}</div>}

      <main>
        {/* DASHBOARD VIEW */}
        {view === 'dashboard' && (
          <>
            <div className="hero-card-container">
              <div className="hero-text-content">
                <h1>Find Your <br /><span className="text-gradient">Space.</span></h1>
                <p>Real-time availability. Smart booking.<br/>No more circling around.</p>
              </div>
              <div className="hero-car-image"></div>
            </div>

            <h2 className="section-title">Nearby Locations</h2>

            <div className="locations-grid">
              {Object.keys(locations).length === 0 ? <p style={{color: 'white'}}>Loading locations...</p> : 
               Object.keys(locations).map((key) => {
                const place = locations[key];
                
                // Calculate Availability based on Occupied + Reserved
                const totalOccupied = (Number(place.occupied) || 0) + (Number(place.reserved) || 0);
                let realFree = (Number(place.total) || 0) - totalOccupied;
                
                if (realFree < 0) realFree = 0;
                
                const isFull = realFree === 0;

                return (
                  <div key={key} className="location-card glass-panel">
                    <div className="card-header-image" style={{
                      backgroundImage: place.image ? `url(${place.image})` : 'none',
                    }}>
                      <div className={`status-pill ${isFull ? 'red' : 'green'}`}>
                        {isFull ? 'FULL' : 'AVAILABLE'}
                      </div>
                    </div>
                    
                    <div className="card-content">
                      <h3>{place.name}</h3>
                      <div className="stats-row">
                        <div className="stat-item">
                          <span className="stat-val">{realFree}</span>
                          <span className="stat-label">Free</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-val">{totalOccupied}</span>
                          <span className="stat-label">Taken</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-val">{place.total}</span>
                          <span className="stat-label">Total</span>
                        </div>
                      </div>
                      <div className="progress-track">
                        <div 
                          className="progress-fill" 
                          style={{ 
                            width: `${(totalOccupied / place.total) * 100}%`, 
                            background: isFull ? 'linear-gradient(90deg, #ff4757, #ff6b81)' : 'linear-gradient(90deg, #00b894, #55efc4)',
                            boxShadow: isFull ? '0 0 10px #ff4757' : '0 0 10px #00b894'
                          }}
                        ></div>
                      </div>
                      <button 
                        className={`action-btn ${isFull ? 'disabled' : ''}`}
                        onClick={() => initiateBooking(key)}
                        disabled={isFull}
                      >
                        {isFull ? "Unavailable" : "Book Slot Now"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* HISTORY VIEW */}
        {view === 'history' && (
          <div className="content-container glass-panel">
            <h2>📜 Your Booking History</h2>
            {history.length === 0 ? (
              <div className="empty-state">
                <p>No parking sessions found. Go book a slot! 🚗</p>
              </div>
            ) : (
              <div className="history-list">
                {history.map(item => (
                  <div key={item.id} className="history-item">
                    <div className="history-left">
                      <div className="h-icon">🅿️</div>
                      <div>
                        <h3>{item.place}</h3>
                        <span className="h-time">{item.date} • {item.time}</span>
                      </div>
                    </div>
                    <div className="history-right" style={{textAlign: 'right'}}>
                        <div className="duration-tag">⏱ {item.duration}</div>
                        <div style={{color: '#4facfe', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '4px'}}>
                           Paid: {item.price}
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABOUT VIEW */}
        {view === 'about' && (
          <div className="content-container glass-panel about-section">
            <div className="about-header">
              <h2>🤖 About ParkOS</h2>
              <p>Revolutionizing urban parking with AI & Computer Vision.</p>
            </div>
            <div className="about-grid">
              <div className="about-card">
                <h3>🚀 Our Mission</h3>
                <p>To eliminate the stress of parking by providing real-time, AI-driven availability data directly to your device.</p>
              </div>
              <div className="about-card">
                <h3>🧠 How It Works</h3>
                <p>We use CCTV cameras and Python-based Mask R-CNN models to detect cars and update cloud databases instantly.</p>
              </div>
            </div>
            <div className="team-footer">
               <p>Made with <span className="heart">❤️</span> by</p>
               <h3>Pratham, Anusha, Varshney & Tarun :)</h3>
               <small>© 2026 Smart Parking Systems</small>
            </div>
          </div>
        )}
      </main>

      {/* BOOKING MODAL */}
      {selectedSlot && (
        <div className="modal-overlay" onClick={() => setSelectedSlot(null)}>
          <div className="glass-panel modal-card" onClick={e => e.stopPropagation()}>
            <h3>⏳ Select Duration</h3>
            <p>Booking for: <span style={{color: '#4facfe'}}>{locations[selectedSlot]?.name}</span></p>
            
            <div className="duration-options">
              {/* Dynamic Price Rendering */}
              {(() => {
                 const p = getActivePrices();
                 return (
                   <>
                    <button className="duration-btn" onClick={() => finalizeBooking("1 Hour", `₹${p.p1}`)}>
                        1 Hour <span style={{fontSize: '0.8em', opacity: 0.8}}>(₹{p.p1})</span>
                    </button>
                    
                    <button className="duration-btn" onClick={() => finalizeBooking("6 Hours", `₹${p.p6}`)}>
                        6 Hours <span style={{fontSize: '0.8em', opacity: 0.8}}>(₹{p.p6})</span>
                    </button>
                    
                    <button className="duration-btn full-day" onClick={() => finalizeBooking("24 Hours", `₹${p.p24}`)}>
                        24 Hours <span style={{fontSize: '0.8em', opacity: 0.8}}>(₹{p.p24})</span>
                    </button>
                   </>
                 );
              })()}
            </div>
            
            <button className="cancel-text" onClick={() => setSelectedSlot(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserHome;