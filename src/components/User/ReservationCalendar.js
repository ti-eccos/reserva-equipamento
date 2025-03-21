import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import './ReservationCalendar.css';

const ReservationCalendar = ({ onDateSelect, initialDate, ignoreAvailability = false }) => {
  const [currentDate, setCurrentDate] = useState(initialDate ? new Date(initialDate) : new Date());
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvailableDates = async () => {
      setLoading(true);
      try {
        const datesCollection = collection(db, 'availabilities');
        const datesSnapshot = await getDocs(datesCollection);
        const datesList = datesSnapshot.docs
          .filter(doc => doc.data().date)
          .map(doc => {
            const data = doc.data();
            return data.date;
          });
        
        setAvailableDates(datesList);
      } catch (error) {
        console.error("Error fetching available dates:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableDates();
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const handleDateClick = (day) => {
    if (!isSameMonth(day, currentDate)) return;

    const dateString = format(day, 'yyyy-MM-dd');
    const isAvailable = ignoreAvailability || availableDates.includes(dateString);
    
    if (!isAvailable) return;

    const isAlreadySelected = selectedDates.includes(dateString);
    
    if (isAlreadySelected) {
      setSelectedDates(selectedDates.filter(date => date !== dateString));
    } else {
      setSelectedDates([...selectedDates, dateString]);
    }

    onDateSelect(dateString);
  };

  const tileClassName = (day) => {
    const dateString = format(day, 'yyyy-MM-dd');
    
    const isAvailable = ignoreAvailability || availableDates.includes(dateString);
    const isSelected = selectedDates.includes(dateString);
    
    let classNames = ['calendar-day'];
    
    if (!isSameMonth(day, currentDate)) {
      classNames.push('out-of-range');
    }
    
    if (isToday(day)) {
      classNames.push('today');
    }
    
    if (isAvailable) {
      classNames.push('available');
    } else {
      classNames.push('out-of-range');
    }
    
    if (isSelected) {
      classNames.push('selected');
    }
    
    return classNames.join(' ');
  };

  const renderHeader = () => {
    return (
      <div className="calendar-header">
        <button 
          className="calendar-nav-btn"
          onClick={() => setCurrentDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1))}
        >
          {'<'}
        </button>
        <h2>
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <button 
          className="calendar-nav-btn"
          onClick={() => setCurrentDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1))}
        >
          {'>'}
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    return (
      <div className="calendar-weekdays">
        {weekdays.map((day, index) => (
          <div key={index}>{day}</div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    return (
      <div className="calendar-days">
        {days.map((day, index) => (
          <div 
            key={index} 
            className={tileClassName(day)}
            onClick={() => handleDateClick(day)}
          >
            {format(day, 'd')}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="reservation-calendar">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
};

export default ReservationCalendar;