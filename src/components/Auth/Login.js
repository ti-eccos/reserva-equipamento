import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { checkUserPermission } from '../../utils/permissions';
import googleIcon from '../../assets/google-icon.png';
import './Login.css';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

const Login = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, currentUser, setUserRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserNavigation = async () => {
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        let role = 'user';
        if (userDoc.exists()) {
          role = userDoc.data().role;
        } else {
          role = await checkUserPermission(currentUser.email);
          const userData = {
            uid: currentUser.uid,
            name: currentUser.displayName || '',
            email: currentUser.email,
            photoURL: currentUser.photoURL || '',
            createdAt: new Date(),
            lastLogin: new Date(),
            role: role
          };
          await setDoc(userDocRef, userData, { merge: true });
        }

        setUserRole(role);

        switch (role) {
          case 'admin':
            navigate('/admin');
            break;
          case 'user':
            navigate('/user');
            break;
          case 'unauthorized':
            navigate('/access-denied');
            break;
          default:
            navigate('/access-denied');
        }
      }
    };

    checkUserNavigation();
  }, [currentUser, navigate, setUserRole]);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const userCredential = await login(googleProvider);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      let role = 'user';
      if (userDoc.exists()) {
        role = userDoc.data().role;
      } else {
        role = await checkUserPermission(user.email);
        const userData = {
          uid: user.uid,
          name: user.displayName || '',
          email: user.email,
          photoURL: user.photoURL || '',
          createdAt: new Date(),
          lastLogin: new Date(),
          role: role
        };
        await setDoc(userDocRef, userData, { merge: true });
      }

      setUserRole(role);

    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('O popup de login foi fechado. Tente novamente.');
      } else if (err.message.includes('apenas contas institucionais')) {
        setError('Apenas contas do Colégio Eccos são permitidas');
      } else {
        setError('Falha ao fazer login com Google. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Sistema de Reserva de Equipamentos</h2>
      <h3>Colégio Eccos</h3>

      {error && <div className="error-message">{error}</div>}

      <div className="google-login">
        <p>Faça login com sua conta institucional:</p>
        <button 
          onClick={handleGoogleLogin} 
          disabled={loading}
          className="google-login-button"
        >
          <img src={googleIcon} alt="Google" className="google-icon" />
          {loading ? 'Processando...' : 'Entrar com Google'}
        </button>
        <p className="login-info">
          Apenas contas do domínio @colegioeccos.com.br são permitidas.
        </p>
      </div>
    </div>
  );
};

export default Login;