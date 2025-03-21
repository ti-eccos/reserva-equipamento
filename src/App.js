import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/Auth/PrivateRoute';
import Login from './components/Auth/Login';
import AdminDashboard from './components/Admin/AdminDashboard';
import UserDashboard from './components/User/UserDashboard';
import AccessDenied from './components/UI/AccessDenied';
import Navbar from './components/UI/Navbar';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Navbar />
          <main className="content">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<PrivateRoute requiredRole="admin" />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>
              <Route element={<PrivateRoute requiredRole="user" />}>
                <Route path="/user" element={<UserDashboard />} />
              </Route>
              <Route path="/access-denied" element={<AccessDenied />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;