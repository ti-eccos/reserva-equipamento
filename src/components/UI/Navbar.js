import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Navbar.module.css';

const Navbar = () => {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  if (!currentUser) return null;

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo} onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
        <h1>Colégio ECCOS</h1>
      </div>

      <div className={styles.userInfo}>
        <div className={styles.nameBox}>
          {currentUser.displayName || 'Luis Gustavo de Oliveira Santos'}
        </div>

        <div className={styles.roleBox}>
          {userRole === 'admin' ? 'Administrador' : 'Usuário'}
        </div>

        <button onClick={handleLogout} className={styles.logoutBtn}>
          Sair
        </button>
      </div>
    </nav>
  );
};

export default Navbar;