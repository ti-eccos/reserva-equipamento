import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  addDoc,
  collection,
  getDocs,
  Timestamp,
  query,
  where,
  and,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import ReservationCalendar from './ReservationCalendar';
import emailjs from 'emailjs-com';
import './ReservationForm.css';

const EMAILJS_USER_ID = '02A7mbqrm7LOKc068';
const EMAILJS_SERVICE_ID = 'service_o1qqttp';
const EMAILJS_TEMPLATE_ID = 'template_ni1ubw7';

const ConflictModal = ({ isOpen, onClose, conflictingEquipment }) => {
  if (!isOpen) return null;

  return (
    <div className="conflict-modal">
      <div className="conflict-modal-content">
        <h2>Conflito de Reserva</h2>
        <p>Os seguintes equipamentos já estão reservados nesta data e horário:</p>
        <ul>
          {conflictingEquipment.map((name, index) => (
            <li key={index}>{name}</li>
          ))}
        </ul>
        <p>Por favor, tente outro horário ou data.</p>
        <div className="form-actions">
          <button onClick={onClose}>Entendi</button>
        </div>
      </div>
    </div>
  );
};

const ReservationForm = ({ equipments = [], onComplete }) => {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictingEquipment, setConflictingEquipment] = useState([]);
  const [reservationToNotify, setReservationToNotify] = useState(null);

  useEffect(() => {
    const fetchAvailabilities = async () => {
      try {
        const availabilitiesCollection = collection(db, 'availabilities');
        const availabilitiesSnapshot = await getDocs(
          query(availabilitiesCollection, where('date', '!=', null))
        );

        const availabilitiesList = availabilitiesSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            return data.date;
          });

        setAvailableDates(availabilitiesList);
      } catch (error) {
        setError('Não foi possível carregar as datas disponíveis');
      }
    };

    fetchAvailabilities();
  }, []);

  const checkReservationConflicts = async (selectedDate, startTime, endTime, equipmentIds) => {
    try {
      const dateTimestamp = Timestamp.fromDate(new Date(selectedDate.toISOString().split('T')[0] + 'T00:00:00'));

      const conflictQuery = query(
        collection(db, 'reservations'),
        and(
          where('date', '==', dateTimestamp),
          where('status', 'not-in', ['rejeitado', 'cancelado']),
          where('startTime', '<', endTime),
          where('endTime', '>', startTime)
        )
      );

      const conflictSnapshot = await getDocs(conflictQuery);

      const conflictingReservations = conflictSnapshot.docs.filter(doc => {
        const reservationData = doc.data();
        const conflictingEquipment = reservationData.equipmentIds.filter(
          id => equipmentIds.includes(id)
        );
        return conflictingEquipment.length > 0;
      });

      if (conflictingReservations.length > 0) {
        const conflictedEquipmentNames = conflictingReservations.flatMap(
          doc => doc.data().equipmentNames
        );
        return conflictedEquipmentNames;
      }

      return false;
    } catch (error) {
      throw error;
    }
  };

  const sendEmailToAdmins = async (reservationData) => {
    try {
      const adminQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
      const adminSnapshot = await getDocs(adminQuery);
      const adminEmails = adminSnapshot.docs.map(doc => doc.data().email);

      adminEmails.forEach(adminEmail => {
        const templateParams = {
          to_email: adminEmail,
          reservation_id: reservationData.id,
          user_name: reservationData.userName,
          date: reservationData.date.toDate().toLocaleDateString('pt-BR'),
          start_time: reservationData.startTime,
          end_time: reservationData.endTime,
          equipment_names: reservationData.equipmentNames.join(', '),
          purpose: reservationData.purpose,
          status: reservationData.status,
        };

        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_USER_ID)
          .then((response) => {
            console.log('E-mail enviado com sucesso!', response.status, response.text);
          })
          .catch((error) => {
            console.error('Erro ao enviar e-mail:', error);
          });
      });
    } catch (error) {
      console.error('Erro ao buscar administradores:', error);
    }
  };

  const handleDateSelect = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    
    const isAvailable = availableDates.includes(dateString);
    
    if (isAvailable) {
      setSelectedDate(date);
      
      setAvailableTimeSlots({
        startTime: '08:00',
        endTime: '18:00'
      });
      
      setStep(2);
      setError('');
    } else {
      setError('Data indisponível para reserva');
    }
  };

  const validateTimeFormat = (timeString) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    return timeRegex.test(timeString);
  };

  const validateTimeSlots = () => {
    if (!startTime || !endTime) {
      setError('Preencha os horários de início e término');
      return false;
    }

    if (!validateTimeFormat(startTime) || !validateTimeFormat(endTime)) {
      setError('Formato de hora inválido. Use o formato HH:MM (exemplo: 09:30)');
      return false;
    }

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startDate = new Date();
    startDate.setHours(startHour, startMinute, 0);
    
    const endDate = new Date();
    endDate.setHours(endHour, endMinute, 0);

    if (startDate >= endDate) {
      setError('Horário de término deve ser após o horário de início');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateTimeSlots()) return;

    if (!purpose.trim()) {
      setError('Informe o propósito da reserva');
      return;
    }

    setLoading(true);
    try {
      const conflicts = await checkReservationConflicts(
        selectedDate, 
        startTime, 
        endTime, 
        equipments.map(eq => eq.id)
      );

      if (conflicts) {
        setConflictingEquipment(conflicts);
        setShowConflictModal(true);
        setLoading(false);
        return;
      }

      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      const reservationData = {
        userId: currentUser.uid, 
        userName: currentUser.displayName || currentUser.email,
        equipmentIds: equipments.map(eq => eq.id),
        equipmentNames: equipments.map(eq => eq.name || 'Equipamento'),
        date: Timestamp.fromDate(new Date(selectedDate.toISOString().split('T')[0] + 'T00:00:00')),
        startTime,
        endTime,
        purpose,
        status: 'pendente',
        createdAt: Timestamp.now(),
        equipmentCount: equipments.length
      };

      const docRef = await addDoc(collection(db, 'reservations'), reservationData);
      reservationData.id = docRef.id;

      await sendEmailToAdmins(reservationData);

      onComplete?.();
    } catch (error) {
      setError(`Falha ao criar reserva: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <ReservationCalendar onDateSelect={handleDateSelect} />
  );

  const renderStep2 = () => (
    <div className="reservation-time-selection">
      <h3>Selecione o Horário</h3>
      <div className="time-inputs">
        <div>
          <label>Horário de Início:</label>
          <input 
            type="text"
            placeholder="HH:MM (ex: 09:30)"
            value={startTime} 
            onChange={(e) => setStartTime(e.target.value)}
          />
          <small className="form-hint">Formato: HH:MM (exemplo: 09:30)</small>
        </div>
        <div>
          <label>Horário de Término:</label>
          <input 
            type="text"
            placeholder="HH:MM (ex: 11:30)"
            value={endTime} 
            onChange={(e) => setEndTime(e.target.value)}
          />
          <small className="form-hint">Formato: HH:MM (exemplo: 11:30)</small>
        </div>
      </div>
      <div className="purpose-input">
        <label>Propósito da Reserva:</label>
        <textarea 
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Descreva brevemente o propósito da reserva"
        />
      </div>
      <div className="form-actions">
        <button 
          onClick={() => setStep(1)}
          className="back-btn"
        >
          Voltar
        </button>
        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="submit-btn"
        >
          {loading ? 'Processando...' : 'Confirmar Reserva'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="reservation-form">
      {error && <div className="error-message">{error}</div>}
      
      <ConflictModal isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        conflictingEquipment={conflictingEquipment}
      />
      
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
    </div>
  );
};

ConflictModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  conflictingEquipment: PropTypes.arrayOf(PropTypes.string).isRequired
};

ReservationForm.propTypes = {
  equipments: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  })),
  onComplete: PropTypes.func,
};

export default ReservationForm;