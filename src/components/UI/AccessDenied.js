import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AccessDenied.css';

const AccessDenied = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  return (
    <div className="access-denied-container">
      <h2>Acesso Negado</h2>
      <p>Você não tem permissão para acessar esta página.</p>
      <p>Apenas contas institucionais do Colégio Eccos têm acesso.</p>
      <button onClick={handleLogout}>Fazer Logout</button>
    </div>
  );
};

export default AccessDenied;