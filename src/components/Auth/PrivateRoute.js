import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './PrivateRoute.css';

const PrivateRoute = ({ requiredRole }) => {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return <div className="private-route-loading">Carregando...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;