import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, update, remove, push } from "firebase/database";
import { useNavigate } from 'react-router-dom';
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

const AdminDashboard = () => {
  const navigate = useNavigate();
  
  // Data State: Stores raw data from Firebase
  const [locations, setLocations] = useState({});
  const [allBookings, setAllBookings] = useState([]);
  
  // Navigation State: Controls the currently viewed location
  const [locationKeys, setLocationKeys] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Modal State: Controls the Add/Edit Location form
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', total: 50, image: '', price1hr: 20, price6hr: 60, price24hr: 150
  });
  const [editingId, setEditingId] = useState(null);

  /**
   * Effect: Real-time Data Listeners
   * Subscribes to 'locations' and 'bookings' nodes to keep the dashboard
   * in sync with the database and user activities.
   */
  useEffect(() => {
    // 1. Subscribe to Locations
    const locationsRef = ref(database, 'locations');
    const unsubLoc = onValue(locationsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setLocations(data);
      setLocationKeys(Object.keys(data));
    });

    // 2. Subscribe to Booking History
    const bookingsRef = ref(database, 'bookings');
    const unsubBook = onValue(bookingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAllBookings(Object.values(data));
      } else {
        setAllBookings([]);
      }
    });

    // Cleanup listeners on unmount
    return () => { unsubLoc(); unsubBook(); };
  }, []);

  // Current Location Context
  const currentKey = locationKeys[currentIndex];
  const currentLocation = currentKey ? locations[currentKey] : null;

  /**
   * Memoized Stats Calculation
   * Computes derived metrics (Revenue, Occupancy, Rates) specifically for 
   * the currently selected location to avoid unnecessary recalculations.
   */
  const stats = useMemo(() => {
    if (!currentLocation) return { revenue: 0, occupied: 0, total: 0, free: 0, rate: 0 };

    // 1. Occupancy Calculation
    const occupied = (Number(currentLocation.occupied) || 0) + (Number(currentLocation.reserved) || 0);
    const total = Number(currentLocation.total) || 1;
    let free = total - occupied;
    if (free < 0) free = 0;
    const rate = Math.round((occupied / total) * 100);

    // 2. Revenue Calculation (Filtered by Location Name)
    const locRevenue = allBookings
        .filter(b => b.locationName === currentLocation.name)
        .reduce((sum, b) => {
            const price = Number(b.price.replace('₹', '')) || 0;
            return sum + price;
        }, 0);

    return {
        revenue: locRevenue,
        occupied,
        total,
        free,
        rate
    };
  }, [currentLocation, allBookings]);

  // --- Navigation Handlers ---
  
  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % locationKeys.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + locationKeys.length) % locationKeys.length);
  };

  // --- CRUD Operations ---

  const handleDelete = () => {
    if(window.confirm(`Are you sure you want to delete ${currentLocation.name}?`)) {
        const keyToDelete = currentKey;
        setCurrentIndex(0); // Reset index to avoid out-of-bounds error
        remove(ref(database, `locations/${keyToDelete}`));
    }
  };

  const handleEdit = () => {
    setEditingId(currentKey);
    setFormData({
      name: currentLocation.name,
      total: currentLocation.total,
      image: currentLocation.image || '',
      price1hr: currentLocation.prices?.['1hr'] || 20,
      price6hr: currentLocation.prices?.['6hr'] || 60,
      price24hr: currentLocation.prices?.['24hr'] || 150,
    });
    setShowModal(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({ name: '', total: 50, image: '', price1hr: 20, price6hr: 60, price24hr: 150 });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Construct Data Payload
    const payload = {
      name: formData.name,
      total: Number(formData.total),
      image: formData.image,
      occupied: 0,
      reserved: 0,
      prices: {
        "1hr": Number(formData.price1hr),
        "6hr": Number(formData.price6hr),
        "24hr": Number(formData.price24hr)
      }
    };

    if (editingId) {
      // Update existing location
      update(ref(database, `locations/${editingId}`), payload);
    } else {
      // Create new location
      push(ref(database, 'locations'), payload);
    }
    setShowModal(false);
  };

  return (
    <div className="app-container dashboard-mode">
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>

      <div className="dashboard-content" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', zIndex: 10, position: 'relative' }}>
        
        {/* Header Section with Location Switcher */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '5px' }}>Live System Overview</p>
            
            {locationKeys.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button onClick={handlePrev} style={{ background: 'none', border: 'none', color: '#4facfe', fontSize: '1.5rem', cursor: 'pointer', fontWeight: 'bold' }}>&lt;</button>
                    
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white', margin: 0, textShadow: '0 0 15px rgba(255,255,255,0.4)' }}>
                        {currentLocation?.name}
                    </h1>

                    <button onClick={handleNext} style={{ background: 'none', border: 'none', color: '#4facfe', fontSize: '1.5rem', cursor: 'pointer', fontWeight: 'bold' }}>&gt;</button>

                    <div style={{ display: 'flex', gap: '5px', marginLeft: '10px' }}>
                        <button onClick={handleEdit} title="Edit Location" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✏️</button>
                        <button onClick={handleDelete} title="Delete Location" style={{ background: 'rgba(255,0,0,0.2)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>🗑️</button>
                    </div>
                </div>
            ) : (
                <h1 style={{ color: 'white' }}>No Locations Found</h1>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
                onClick={handleAddNew} 
                className="action-btn" 
                style={{ padding: '0.6rem 1.2rem', background: 'linear-gradient(90deg, #4facfe, #00f260)', color: 'white', border: 'none' }}
            >
                Add New Location
            </button>
            <button 
                onClick={() => navigate('/')} 
                className="action-btn" 
                style={{ padding: '0.6rem 1.2rem', background: 'white', color: '#333', border: 'none' }}
            >
                Logout
            </button>
          </div>
        </header>

        {currentLocation ? (
            <>
                {/* Key Metrics Row: Revenue, Occupancy, Pricing */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                  
                  {/* Revenue Card */}
                  <div className="glass-panel" style={{ padding: '2rem', display: 'flex', alignItems: 'center', borderRadius: '15px' }}>
                      <div style={{ fontSize: '3rem', marginRight: '1rem' }}>💰</div>
                      <div>
                      <p style={{ color: '#aaa', marginBottom: '0.2rem', fontSize: '0.9rem' }}>Revenue</p>
                      <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4facfe' }}>₹{stats.revenue.toLocaleString()}</h2>
                      </div>
                  </div>

                  {/* Occupancy Card */}
                  <div className="glass-panel" style={{ padding: '2rem', display: 'flex', alignItems: 'center', borderRadius: '15px' }}>
                      <div style={{ fontSize: '3rem', marginRight: '1rem' }}>🚗</div>
                      <div>
                      <p style={{ color: '#aaa', marginBottom: '0.2rem', fontSize: '0.9rem' }}>Occupancy</p>
                      <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: stats.rate > 90 ? '#ff5858' : '#00f260' }}>{stats.rate}%</h2>
                      <p style={{ color: 'white', opacity: 0.8, fontSize: '0.8rem', margin: 0 }}>{stats.occupied} / {stats.total} Slots</p>
                      </div>
                  </div>

                  {/* Pricing Card */}
                  <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <h4 style={{ color: '#aaa', margin: '0 0 10px 0', fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>Current Pricing</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9rem' }}>
                        <span style={{color: 'white'}}>1 Hr</span>
                        <span style={{color: '#4facfe', fontWeight: 'bold'}}>₹{currentLocation.prices?.['1hr'] || 20}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9rem' }}>
                        <span style={{color: 'white'}}>6 Hr</span>
                        <span style={{color: '#4facfe', fontWeight: 'bold'}}>₹{currentLocation.prices?.['6hr'] || 60}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{color: 'white'}}>24 Hr</span>
                        <span style={{color: '#4facfe', fontWeight: 'bold'}}>₹{currentLocation.prices?.['24hr'] || 150}</span>
                      </div>
                  </div>
                </div>

                {/* Content Row: Visualizer & History */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
                
                {/* Live Visualizer */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ color: 'white', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                    Parking Load
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(25px, 1fr))', gap: '6px' }}>
                    {Array.from({ length: stats.total }).map((_, index) => {
                        const isOccupied = index < stats.occupied;
                        return (
                        <div key={index} style={{
                            height: '25px', borderRadius: '4px',
                            background: isOccupied ? 'linear-gradient(135deg, #ff4757, #ff6b81)' : 'linear-gradient(135deg, #2ed573, #7bed9f)',
                            opacity: isOccupied ? 1 : 0.3
                            }} 
                        />
                        );
                    })}
                    </div>
                </div>

                {/* Transaction History */}
                <div className="glass-panel" style={{ padding: '2rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ color: 'white', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                    Bookings 
                    </h3>
                    <div style={{ overflowY: 'auto', maxHeight: '250px', paddingRight: '10px' }}>
                    {(() => {
                        const locBookings = allBookings.filter(b => b.locationName === currentLocation.name).reverse();
                        if (locBookings.length === 0) return <p style={{ color: '#666', textAlign: 'center', marginTop: '1rem' }}>No transactions yet.</p>;

                        return (
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                            {locBookings.map((booking, index) => (
                                <li key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', marginBottom: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', borderLeft: '4px solid #4facfe' }}>
                                <div>
                                    <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                        Booking #{locBookings.length - index}
                                    </div>
                                    <div style={{ color: '#aaa', fontSize: '0.75rem' }}>{booking.timeString} • {booking.duration}</div>
                                </div>
                                <div style={{ color: '#2ed573', fontWeight: 'bold' }}>{booking.price}</div>
                                </li>
                            ))}
                            </ul>
                        );
                    })()}
                    </div>
                </div>
                </div>
            </>
        ) : (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#aaa' }}>
                <h2>Welcome to ParkOS Admin</h2>
                <p>Click "+ Add Location" to get started.</p>
            </div>
        )}

      </div>

      {/* --- ADD/EDIT MODAL --- */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="glass-panel modal-card" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '500px' }}>
            <h3>{editingId ? "Edit Location" : "Add New Location"}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="text" placeholder="Location Name" required className="glass-input" 
                     value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              
              <input type="url" placeholder="Image URL (Optional)" className="glass-input" 
                     value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} />
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <label style={{color: '#aaa', fontSize: '0.8rem'}}>Total Slots</label>
                    <input type="number" placeholder="Total Slots" required className="glass-input" 
                           value={formData.total} onChange={e => setFormData({...formData, total: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                 <div>
                    <label style={{color: '#aaa', fontSize: '0.8rem'}}>1 Hr Price</label>
                    <input type="number" className="glass-input" value={formData.price1hr} onChange={e => setFormData({...formData, price1hr: e.target.value})} />
                 </div>
                 <div>
                    <label style={{color: '#aaa', fontSize: '0.8rem'}}>6 Hr Price</label>
                    <input type="number" className="glass-input" value={formData.price6hr} onChange={e => setFormData({...formData, price6hr: e.target.value})} />
                 </div>
                 <div>
                    <label style={{color: '#aaa', fontSize: '0.8rem'}}>24 Hr Price</label>
                    <input type="number" className="glass-input" value={formData.price24hr} onChange={e => setFormData({...formData, price24hr: e.target.value})} />
                 </div>
              </div>

              <button type="submit" className="action-btn" style={{ marginTop: '1rem', background: '#4facfe', border: 'none', color: 'white' }}>
                {editingId ? "Update Location" : "Create Location"}
              </button>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer' }}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;