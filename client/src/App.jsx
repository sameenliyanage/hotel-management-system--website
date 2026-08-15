import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AppShell from './components/AppShell';
import Bookings from './pages/Bookings';
import Dashboard from './pages/Dashboard';
import Guests from './pages/Guests';
import Invoices from './pages/Invoices';
import RoomTypes from './pages/RoomTypes';
import Rooms from './pages/Rooms';
import Staff from './pages/Staff';
import Payments from './pages/Payments';

// A simple protected route wrapper to ensure only logged-in staff can access the dashboard
const ProtectedRoute = ({ children }) => {
  const staffData = localStorage.getItem('hotelStaff');
  if (!staffData) {
    // If no staff data is found in local storage, redirect to login page
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<Login />} />
      
      {/* Redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Protected Layout: All routes inside AppShell require authentication */}
      <Route 
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/room-types" element={<RoomTypes />} />
        <Route path="/guests" element={<Guests />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/payments" element={<Payments />} />
      </Route>
      
      {/* Catch-all route for undefined paths */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;