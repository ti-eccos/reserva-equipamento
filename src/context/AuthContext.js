import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../config/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { checkUserPermission } from '../utils/permissions';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
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

        setCurrentUser(user);
        setUserRole(role);
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('userRole', role);
      } else {
        setCurrentUser(null);
        setUserRole(null);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRole');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    const storedRole = localStorage.getItem('userRole');
    if (storedUser && storedRole) {
      setCurrentUser(JSON.parse(storedUser));
      setUserRole(storedRole);
    }
    setLoading(false);
  }, []);

  const login = (provider) => {
    return signInWithPopup(auth, provider);
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    currentUser,
    userRole,
    loading,
    login,
    logout,
    setUserRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};