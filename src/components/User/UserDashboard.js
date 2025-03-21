import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import EquipmentList from './EquipmentList';
import Loading from '../UI/Loading';
import './UserDashboard.css';

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('new');
  const [myReservations, setMyReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { currentUser, logout } = useAuth();
  
  const fetchUserReservations = async () => {
    if (!currentUser) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let userReservationsQuery = query(
        collection(db, 'reservations'),
        where('userId', '==', currentUser.uid),
        where('status', '!=', 'cancelado')
      );
      
      if (statusFilter !== 'all') {
        userReservationsQuery = query(
          userReservationsQuery,
          where('status', '==', statusFilter)
        );
      }
      
      const reservationsSnapshot = await getDocs(userReservationsQuery);
      
      let reservationsData = reservationsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date ? data.date.toDate() : null,
          equipmentNames: data.equipmentNames || [],
          equipmentIds: data.equipmentIds || [],
          equipmentCount: data.equipmentCount || 0
        };
      });
      
      const filteredReservations = reservationsData.filter(reservation => 
        searchTerm === '' || 
        (reservation.equipmentNames || []).some(name => 
          name.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        (reservation.purpose || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      setMyReservations(filteredReservations);
    } catch (error) {
      setError("Erro ao carregar suas reservas. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchUserReservations();
    }
  }, [currentUser, statusFilter, searchTerm]);

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUserReservations();
  };

  const formatDate = (date) => {
    return date ? date.toLocaleDateString('pt-BR') : 'Data não disponível';
  };

  const handleDeleteReservation = async (id) => {
    if (window.confirm("Tem certeza que deseja cancelar esta reserva?")) {
      try {
        await updateDoc(doc(db, 'reservations', id), {
          status: 'cancelado'
        });

        setMyReservations(prevReservations => 
          prevReservations.filter(reservation => reservation.id !== id)
        );
      } catch (error) {
        alert("Erro ao cancelar reserva. Por favor, tente novamente.");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const getUserRole = () => {
    if (!currentUser) return 'user';
    return currentUser.email.includes('@admin.') ? 'admin' : 'user';
  };

  return (
    <div className="user-dashboard">
      <div className="navbar">
        <div className="logo">
          <h1>Painel do Usuário</h1>
        </div>
      </div>
      
      <div className="dashboard-content">
        <div className="admin-tabs">
          <button 
            className={`tab-button ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            Nova Reserva
          </button>
          <button 
            className={`tab-button ${activeTab === 'my' ? 'active' : ''}`}
            onClick={() => setActiveTab('my')}
          >
            Minhas Reservas ({myReservations.length})
          </button>
        </div>
        
        <div className="tab-content">
          {activeTab === 'new' && <EquipmentList onReservationComplete={() => {
            setActiveTab('my');
            fetchUserReservations();
          }} />}
          
          {activeTab === 'my' && (
            <div className="my-reservations">
              <div className="reservations-controls">
                <div className="filter-group">
                  <select 
                    value={statusFilter}
                    onChange={handleStatusFilterChange}
                  >
                    <option value="all">Todos os Status</option>
                    <option value="pendente">Pendentes</option>
                    <option value="aprovado">Aprovadas</option>
                    <option value="rejeitado">Rejeitadas</option>
                    <option value="em uso">Em Uso</option>
                    <option value="devolvido">Devolvido</option>
                  </select>
                  
                  <form onSubmit={handleSearch} className="search-form">
                    <input
                      type="text"
                      placeholder="Buscar por equipamento ou finalidade..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                    <button type="submit" className="search-button">Buscar</button>
                  </form>
                </div>
              </div>
              
              {error && <div className="error-message">{error}</div>}
              
              {loading ? (
                <Loading />
              ) : myReservations.length === 0 ? (
                <p>Você ainda não tem reservas{statusFilter !== 'all' ? ` com status ${statusFilter}` : ''}.</p>
              ) : (
                <div className="reservations-table-container">
                  <table className="reservations-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Horário</th>
                        <th>Equipamentos</th>
                        <th>Finalidade</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {myReservations.map(reservation => {
                        const sortedEquipmentNames = [...reservation.equipmentNames].sort((a, b) => a.localeCompare(b));

                        return (
                          <tr key={reservation.id}>
                            <td>{formatDate(reservation.date)}</td>
                            <td>{reservation.startTime || 'N/D'} - {reservation.endTime || 'N/D'}</td>
                            <td className="equipment-column">
                              <div className="equipment-list">
                                {sortedEquipmentNames.join(', ')}
                              </div>
                            </td>
                            <td className="purpose-column">{reservation.purpose || 'Não especificado'}</td>
                            <td>
                              <span className={`status-badge ${reservation.status === 'aprovado' ? 'approved' : 
                                reservation.status === 'rejeitado' ? 'rejected' : 
                                reservation.status === 'em uso' ? 'in-use' : 
                                reservation.status === 'devolvido' ? 'returned' : 'pending'}`}>
                                {reservation.status === 'aprovado' ? 'Aprovado' : 
                                 reservation.status === 'rejeitado' ? 'Rejeitado' : 
                                 reservation.status === 'em uso' ? 'Em Uso' : 
                                 reservation.status === 'devolvido' ? 'Devolvido' : 'Pendente'}
                              </span>
                            </td>
                            <td>
                              <button 
                                onClick={() => handleDeleteReservation(reservation.id)}
                                className="delete-button"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;