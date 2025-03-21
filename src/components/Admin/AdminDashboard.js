import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import './AdminDashboard.css';
import AvailabilityManager from './AvailabilityManager';
import EquipmentManager from './EquipmentManager';
import ReservationApproval from './ReservationApproval';
import UserManager from './UserManager';
import AdminReservationForm from './AdminReservationForm';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('reservations');
  const [pendingReservations, setPendingReservations] = useState(0);

  useEffect(() => {
    const fetchPendingReservations = async () => {
      try {
        const pendingQuery = query(
          collection(db, 'reservations'),
          where('status', '==', 'pendente')
        );
        const reservationsSnapshot = await getDocs(pendingQuery);
        const pendingCount = reservationsSnapshot.docs.length;
        setPendingReservations(pendingCount);
      } catch (error) {
        setPendingReservations(0);
      }
    };

    fetchPendingReservations();
    const intervalId = setInterval(fetchPendingReservations, 60000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="admin-dashboard app">
      <div className="navbar">
        <div className="logo">
          <h1>Painel Administrativo</h1>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="admin-tabs">
          <button
            className={`common-btn ${activeTab === 'reservations' ? 'active' : ''}`}
            onClick={() => setActiveTab('reservations')}
          >
            Reservas Pendentes {pendingReservations > 0 && `(${pendingReservations})`}
          </button>
          <button
            className={`common-btn ${activeTab === 'equipment' ? 'active' : ''}`}
            onClick={() => setActiveTab('equipment')}
          >
            Gerenciar Equipamentos
          </button>
          <button
            className={`common-btn ${activeTab === 'availability' ? 'active' : ''}`}
            onClick={() => setActiveTab('availability')}
          >
            Gerenciar Disponibilidade
          </button>
          <button
            className={`common-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Gerenciar Usuários
          </button>
          <button
            className={`common-btn ${activeTab === 'admin-reservations' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin-reservations')}
          >
            Fazer Reserva (Admin)
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'reservations' && <ReservationApproval />}
          {activeTab === 'equipment' && <EquipmentManager />}
          {activeTab === 'availability' && <AvailabilityManager />}
          {activeTab === 'users' && <UserManager />}
          {activeTab === 'admin-reservations' && <AdminReservationForm />}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;