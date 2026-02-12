import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import your pages
import UserHome from './pages/UserHome';        // User Page
import Login from './pages/Login';              // The Login screen
import AdminDashboard from './pages/AdminDashboard'; // Admin Dashboard

function App() {
  return (
    <Router>
      <Routes>
        {/* Default Route: Shows the Login Page first */}
        <Route path="/" element={<Login />} />

        {/* User Route: The main parking booking app */}
        <Route path="/home" element={<UserHome />} />

        {/* Admin Route: The Dashboard */}
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;