// src/components/Admin/UserManager.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import Loading from '../UI/Loading';
import './UserManager.css';

const PROTECTED_ADMIN_EMAIL = "suporte@colegioeccos.com.br";

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        let usersQuery = collection(db, 'users');
        
        if (filter !== 'all') {
          usersQuery = query(usersQuery, where('role', '==', filter));
        }
        
        const usersSnapshot = await getDocs(usersQuery);
        let usersList = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          lastLogin: doc.data().lastLogin?.toDate ? doc.data().lastLogin.toDate() : new Date(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
        }));
        
        if (searchTerm) {
          usersList = usersList.filter(user => 
            user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        
        usersList.sort((a, b) => b.lastLogin - a.lastLogin);
        
        setUsers(usersList);
      } catch (error) {
        console.error("Erro ao buscar usuários:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [filter, searchTerm]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      const userToUpdate = users.find(user => user.id === userId);
      
      if (userToUpdate.email === PROTECTED_ADMIN_EMAIL && newRole !== 'admin') {
        alert(`A conta ${PROTECTED_ADMIN_EMAIL} deve sempre ter permissão de administrador.`);
        return;
      }

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: newRole
      });
      
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId
            ? { ...user, role: newRole }
            : user
        )
      );
      
      if (editingUser === userId) {
        setEditingUser(null);
      }
      
      alert(`Permissão do usuário alterada para: ${newRole}`);
    } catch (error) {
      console.error("Erro ao atualizar permissão do usuário:", error);
      alert("Erro ao atualizar permissão. Por favor, tente novamente.");
    }
  };

  const formatDate = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return "Data inválida";
    }
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="user-manager">
      <h3>Gerenciamento de Usuários</h3>
      
      <div className="filter-controls">
        <div className="filter-group">
          <label htmlFor="role-filter">Filtrar por permissão:</label>
          <select 
            id="role-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="admin">Administradores</option>
            <option value="user">Usuários</option>
            <option value="unauthorized">Não autorizados</option>
          </select>
        </div>

        <div className="search-group">
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {loading ? (
        <Loading />
      ) : users.length === 0 ? (
        <p>Nenhum usuário encontrado.</p>
      ) : (
        <div className="user-grid">
          {users.map(user => (
            <div key={user.id} className="user-box">
              <div className="user-info">
                <h4>{user.name || 'Sem nome'}</h4>
                <p>{user.email || 'Email não disponível'}</p>
                <p>Último Login: {formatDate(user.lastLogin)}</p>
                <p>Primeiro Acesso: {formatDate(user.createdAt)}</p>
                <div className={`status-badge ${user.role || 'unauthorized'}`}>
                  {user.role === 'admin' ? 'Administrador' : 
                   user.role === 'user' ? 'Usuário' : 'Não autorizado'}
                </div>
              </div>
              <div className="user-actions">
                {editingUser === user.id ? (
                  <div className="edit-role-controls">
                    <button 
                      onClick={() => handleRoleChange(user.id, 'admin')}
                      className={`common-btn ${user.role === 'admin' ? 'active' : ''}`}
                    >
                      Admin
                    </button>
                    <button 
                      onClick={() => handleRoleChange(user.id, 'user')}
                      className={`common-btn ${user.role === 'user' ? 'active' : ''}`}
                      disabled={user.email === PROTECTED_ADMIN_EMAIL}
                    >
                      Usuário
                    </button>
                    <button 
                      onClick={() => handleRoleChange(user.id, 'unauthorized')}
                      className={`common-btn danger ${user.role === 'unauthorized' ? 'active' : ''}`}
                      disabled={user.email === PROTECTED_ADMIN_EMAIL}
                    >
                      Bloquear
                    </button>
                    <button 
                      onClick={() => setEditingUser(null)}
                      className="common-btn secondary"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setEditingUser(user.id)}
                    className="common-btn"
                  >
                    Alterar Permissão
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserManager;