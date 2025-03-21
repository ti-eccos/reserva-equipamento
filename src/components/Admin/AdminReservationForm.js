import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import ReservationCalendar from '../User/ReservationCalendar';
import Loading from '../UI/Loading';
import './AdminReservationForm.css';

const AdminReservationForm = () => {
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [selectedEquipments, setSelectedEquipments] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchEquipments = async () => {
      setLoading(true);
      try {
        const equipmentsQuery = collection(db, 'equipments');
        const equipmentsSnapshot = await getDocs(equipmentsQuery);
        const equipmentsList = equipmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEquipments(equipmentsList);
      } catch (error) {
        setError('Não foi possível carregar os equipamentos.');
      } finally {
        setLoading(false);
      }
    };

    fetchEquipments();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersQuery = collection(db, 'users');
        const usersSnapshot = await getDocs(usersQuery);
        const usersList = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersList);
      } catch (error) {
        setError('Não foi possível carregar os usuários.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleEquipmentSelect = (equipment) => {
    const alreadySelected = selectedEquipments.some((item) => item.id === equipment.id);
    if (alreadySelected) {
      setSelectedEquipments((prev) => prev.filter((item) => item.id !== equipment.id));
    } else {
      setSelectedEquipments((prev) => [...prev, equipment]);
    }
  };

  const handleDateSelect = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    setSelectedDate(date);
    setError('');
  };

  const validateTimeSlots = () => {
    if (!startTime || !endTime) {
      setError('Preencha os horários de início e término.');
      return false;
    }

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startDate = new Date();
    startDate.setHours(startHour, startMinute, 0);

    const endDate = new Date();
    endDate.setHours(endHour, endMinute, 0);

    if (startDate >= endDate) {
      setError('Horário de término deve ser após o horário de início.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateTimeSlots()) return;

    if (!purpose.trim()) {
      setError('Informe o propósito da reserva.');
      return;
    }

    if (selectedEquipments.length === 0) {
      setError('Selecione pelo menos um equipamento.');
      return;
    }

    if (!selectedUser) {
      setError('Selecione um usuário para a reserva.');
      return;
    }

    setLoading(true);
    try {
      const reservationData = {
        userId: selectedUser.id,
        userName: selectedUser.name || selectedUser.displayName || 'Nome não disponível',
        equipmentIds: selectedEquipments.map((eq) => eq.id),
        equipmentNames: selectedEquipments.map((eq) => eq.name),
        date: Timestamp.fromDate(selectedDate),
        startTime,
        endTime,
        purpose,
        status: 'aprovado',
        createdAt: Timestamp.now(),
        equipmentCount: selectedEquipments.length,
      };

      await addDoc(collection(db, 'reservations'), reservationData);
      setError('');
      alert('Reserva criada com sucesso!');
      setSelectedEquipments([]);
      setSelectedDate(null);
      setStartTime('');
      setEndTime('');
      setPurpose('');
      setSelectedUser(null);
    } catch (error) {
      setError('Erro ao criar reserva. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getUserDisplayName = (user) => {
    if (!user) return '';
    return user.name || user.displayName || 'Nome não disponível';
  };

  const filteredEquipments = equipments
    .filter(equipment => 
      equipment.name.toLowerCase().includes(filter.toLowerCase()) || 
      equipment.type.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="admin-reservation-form">
      <h3 className="page-title">Fazer Reserva (Admin)</h3>

      {error && <div className="error-message">{error}</div>}

      <div className="user-selection">
        <h4>Selecione o Usuário</h4>
        <div className="user-selection-container">
          <select 
            value={selectedUser ? selectedUser.id : ''} 
            onChange={(e) => {
              const selected = users.find(user => user.id === e.target.value);
              setSelectedUser(selected || null);
            }}
            className="user-dropdown"
          >
            <option value="">-- Selecione um usuário --</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {getUserDisplayName(user)}
              </option>
            ))}
          </select>
          
          {selectedUser && (
            <div className="selected-user-info">
              <span className="user-label">Usuário selecionado:</span>
              <span className="user-name">{getUserDisplayName(selectedUser)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="equipment-selection">
        <h4>Selecione os Equipamentos</h4>
        <input
          type="text"
          placeholder="Filtrar por tipo ou nome"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-input"
        />
        <div className="equipment-grid">
          {filteredEquipments.map((equipment) => {
            const isSelected = selectedEquipments.some((item) => item.id === equipment.id);
            return (
              <div
                key={equipment.id}
                className={`equipment-card ${isSelected ? 'selected-card' : ''}`}
                onClick={() => handleEquipmentSelect(equipment)}
              >
                <h4>{equipment.name}</h4>
                <p>
                  <strong>Tipo:</strong> {equipment.type}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="reservation-calendar">
        <h4>Selecione a Data</h4>
        <ReservationCalendar 
          onDateSelect={handleDateSelect} 
          ignoreAvailability={true}
        />
      </div>

      <div className="time-selection">
        <h4>Selecione o Horário</h4>
        <div className="time-inputs">
          <div>
            <label>Horário de Início:</label>
            <input
              type="text"
              placeholder="HH:MM (ex: 09:30)"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <label>Horário de Término:</label>
            <input
              type="text"
              placeholder="HH:MM (ex: 11:30)"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="purpose-input">
        <label>Propósito da Reserva:</label>
        <textarea
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Descreva o propósito da reserva"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="submit-btn"
      >
        {loading ? 'Processando...' : 'Confirmar Reserva'}
      </button>
    </div>
  );
};

export default AdminReservationForm;