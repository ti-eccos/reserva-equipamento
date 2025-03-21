import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, Timestamp, writeBatch, query, where, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './AvailabilityManager.css';

const formatLocalDate = (date) => {
  const localDate = new Date(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const createLocalDate = (dateString) => {
  const [year, month, day] = dateString.split('-');
  return new Date(year, month - 1, day);
};

const AvailabilityManager = () => {
  const [selectedDates, setSelectedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableDates, setAvailableDates] = useState([]);

  const filterPastDates = (dates) => {
    const currentDate = new Date();
    const currentDateWithoutTime = new Date(currentDate.setHours(0, 0, 0, 0));
    return dates.filter(date => new Date(date.date) >= currentDateWithoutTime);
  };

  const removePastDatesFromFirestore = async (dates) => {
    const currentDate = new Date();
    const currentDateWithoutTime = new Date(currentDate.setHours(0, 0, 0, 0));
    const batch = writeBatch(db);
    let hasDateToRemove = false;

    dates.forEach(date => {
      if (new Date(date.date) < currentDateWithoutTime) {
        const dateRef = doc(db, 'availabilities', date.id);
        batch.delete(dateRef);
        hasDateToRemove = true;
      }
    });

    try {
      if (hasDateToRemove) {
        await batch.commit();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAvailableDates = async () => {
    setLoading(true);
    try {
      const datesCollection = collection(db, 'availabilities');
      const datesSnapshot = await getDocs(datesCollection);
      const datesList = datesSnapshot.docs
        .filter(doc => doc.data().date)
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      const sortedDates = datesList.sort((a, b) => new Date(a.date) - new Date(b.date));
      const filteredDates = filterPastDates(sortedDates);
      await removePastDatesFromFirestore(sortedDates);
      setAvailableDates(filteredDates);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableDates();
  }, []);

  useEffect(() => {
    const getTimeUntilNextMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0,
      );
      return nextMidnight.getTime() - now.getTime();
    };

    const scheduleDailyCheck = () => {
      const timeUntilNextMidnight = getTimeUntilNextMidnight();
      const timeoutId = setTimeout(() => {
        fetchAvailableDates();
        const intervalId = setInterval(fetchAvailableDates, 24 * 60 * 60 * 1000);
        return () => clearInterval(intervalId);
      }, timeUntilNextMidnight);
      return () => clearTimeout(timeoutId);
    };

    scheduleDailyCheck();
  }, []);

  const handleAddAvailableDate = async () => {
    if (selectedDates.length === 0) {
      alert("Selecione uma data primeiro!");
      return;
    }

    try {
      setLoading(true);
      const newDates = [];

      for (const newDate of selectedDates) {
        const dateString = newDate;
        const existingDateQuery = query(
          collection(db, 'availabilities'), 
          where('date', '==', dateString)
        );
        const existingDateSnapshot = await getDocs(existingDateQuery);

        if (existingDateSnapshot.empty) {
          const docRef = await addDoc(collection(db, 'availabilities'), {
            date: dateString,
            createdAt: Timestamp.now()
          });
          newDates.push({ id: docRef.id, date: dateString });
        }
      }

      const updatedAvailableDates = [...availableDates, ...newDates]
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      setAvailableDates(updatedAvailableDates);
      setSelectedDates([]);
      
      if (newDates.length > 0) {
        alert(`${newDates.length} nova(s) data(s) adicionada(s) com sucesso!`);
      } else {
        alert("Todas as datas selecionadas já existem.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao adicionar datas. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSelection = () => {
    setSelectedDates([]);
  };

  const handleRemoveAvailableDate = async (dateToRemove) => {
    try {
      setLoading(true);
      const dateQuery = query(
        collection(db, 'availabilities'), 
        where('date', '==', dateToRemove)
      );
      const snapshot = await getDocs(dateQuery);

      await Promise.all(snapshot.docs.map(async (document) => {
        await deleteDoc(document.ref);
      }));

      const updatedAvailableDates = availableDates
        .filter(ad => ad.date !== dateToRemove);
      
      setAvailableDates(updatedAvailableDates);
      alert(`Data ${new Date(dateToRemove).toLocaleDateString('pt-BR')} removida com sucesso.`);
    } catch (error) {
      console.error(error);
      alert("Erro ao remover data. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAllAvailableDates = async () => {
    if (window.confirm("Tem certeza que deseja remover TODAS as datas de disponibilidade? Esta ação não pode ser desfeita.")) {
      try {
        setLoading(true);
        const datesCollection = collection(db, 'availabilities');
        const snapshot = await getDocs(datesCollection);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach((document) => {
          batch.delete(document.ref);
        });

        await batch.commit();
        
        setAvailableDates([]);
        setSelectedDates([]);

        alert('Todas as datas de disponibilidade foram removidas.');
      } catch (error) {
        console.error(error);
        alert("Erro ao remover datas. Por favor, tente novamente.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDateChange = (value) => {
    const selectedDate = new Date(value);
    const selectedDateString = formatLocalDate(selectedDate);
    const isAlreadySelected = selectedDates.includes(selectedDateString);
    
    if (isAlreadySelected) {
      setSelectedDates(selectedDates.filter(date => date !== selectedDateString));
    } else {
      setSelectedDates([...selectedDates, selectedDateString]);
    }
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateString = formatLocalDate(date);
      const isSelected = selectedDates.includes(dateString);
      const isAvailable = availableDates.some(ad => ad.date === dateString);
      
      if (isSelected) return 'selected-date';
      if (isAvailable) return 'available-date';
      
      return null;
    }
    return null;
  };

  const renderAvailableDates = () => {
    return availableDates.map(ad => {
      const localDate = createLocalDate(ad.date);
      return (
        <li key={ad.date}>
          {localDate.toLocaleDateString('pt-BR')}
          <button 
            onClick={() => handleRemoveAvailableDate(ad.date)}
            className="common-btn danger remove-date-btn"
            disabled={loading}
          >
            &times;
          </button>
        </li>
      );
    });
  };

  return (
    <div className="calendar-manager">
      <h3>Calendário de Disponibilidade</h3>
      
      <div className="calendar-container">
        <Calendar
          onChange={handleDateChange}
          value={null}
          selectRange={false}
          tileClassName={tileClassName}
          minDate={new Date()}
          locale="pt-BR"
        />
      </div>
      
      <div className="dates-actions">
        <button 
          onClick={handleAddAvailableDate}
          disabled={selectedDates.length === 0 || loading}
          className="common-btn success"
        >
          {loading ? 'Processando...' : 'Adicionar Datas Selecionadas'}
        </button>
        
        <button 
          onClick={handleCancelSelection}
          disabled={selectedDates.length === 0 || loading}
          className="common-btn secondary"
        >
          Cancelar
        </button>
      </div>
      
      <div className="dates-section">
        <div className="available-dates-section">
          <div className="available-dates-header">
            <h4>Datas Disponíveis</h4>
            {availableDates.length > 0 && (
              <button 
                onClick={handleRemoveAllAvailableDates} 
                className="common-btn danger remove-all-dates-btn"
                disabled={loading}
              >
                {loading ? 'Processando...' : 'Remover Todas as Datas'}
              </button>
            )}
          </div>
          {loading ? (
            <p>Carregando datas disponíveis...</p>
          ) : availableDates.length === 0 ? (
            <p>Nenhuma data disponível</p>
          ) : (
            <ul>
              {renderAvailableDates()}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvailabilityManager;