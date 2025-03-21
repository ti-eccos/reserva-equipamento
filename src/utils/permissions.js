import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const checkUserPermission = async (email) => {
  if (!email) return 'unauthorized';

  const adminEmails = [
    'suporte@colegioeccos.com.br',
    'admin@colegioeccos.com.br'
  ];

  if (adminEmails.includes(email)) {
    return 'admin';
  }

  if (!email.endsWith('@colegioeccos.com.br')) {
    return 'unauthorized';
  }

  try {
    const username = email.split('@')[0];
    const userRef = doc(db, 'user-roles', username);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const roleData = userDoc.data();
      const validRoles = ['admin', 'user', 'unauthorized'];
      if (validRoles.includes(roleData.role)) {
        return roleData.role;
      }
    }

    return 'user';

  } catch (error) {
    return 'unauthorized';
  }
};

export const setUserRole = async (email, role) => {
  if (!['admin', 'user', 'unauthorized'].includes(role)) {
    throw new Error('Role inválida');
  }

  const username = email.split('@')[0];
  const userRef = doc(db, 'user-roles', username);

  try {
    await setDoc(userRef, { role }, { merge: true });
    return true;
  } catch (error) {
    return false;
  }
};