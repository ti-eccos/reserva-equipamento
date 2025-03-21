import React, { useState, useEffect } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../config/firebase';
import ReservationForm from './ReservationForm';
import Loading from '../UI/Loading';
import './EquipmentList.css';

const EquipmentList = ({ onReservationComplete }) => {
  const [equipments, setEquipments] = useState([]);
  const [selectedEquipments, setSelectedEquipments] = useState([]);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    const fetchEquipments = async () => {
      setLoading(true);
      setError(null);
      try {
        const equipmentsQuery = collection(db, 'equipments');
        const equipmentsSnapshot = await getDocs(equipmentsQuery);
        const equipmentsList = equipmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        equipmentsList.sort((a, b) => a.name.localeCompare(b.name));

        setEquipments(equipmentsList);
      } catch (error) {
        setError("Não foi possível carregar os equipamentos. Por favor, tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }
    };

    fetchEquipments();
  }, []);

  const handleEquipmentSelect = (equipment) => {
    const alreadySelected = selectedEquipments.some(item => item.id === equipment.id);
    
    if (alreadySelected) {
      setSelectedEquipments(prev => prev.filter(item => item.id !== equipment.id));
    } else {
      setSelectedEquipments(prev => [...prev, equipment]);
    }
  };

  const handleProceedToReservation = () => {
    const sortedSelectedEquipments = [...selectedEquipments].sort((a, b) => a.name.localeCompare(b.name));
    setSelectedEquipments(sortedSelectedEquipments);
    setShowReservationForm(true);
  };

  const handleReservationComplete = () => {
    setShowReservationForm(false);
    setSelectedEquipments([]);
    if (onReservationComplete) {
      onReservationComplete();
    }
  };

  const getFilteredEquipments = () => {
    let filteredList = equipments;
    
    if (typeFilter !== 'todos') {
      filteredList = filteredList.filter(equipment => equipment.type === typeFilter);
    }
    
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filteredList = filteredList.filter(equipment => 
        equipment.name.toLowerCase().includes(query)
      );
    }
    
    return filteredList;
  };

  const filteredEquipments = getFilteredEquipments();
  const totalPages = Math.ceil(filteredEquipments.length / itemsPerPage);
  const paginatedEquipments = filteredEquipments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const equipmentTypes = [...new Set(equipments.map(equipment => equipment.type))];

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, searchQuery]);

  return (
    <div className="equipment-list-container">
      {showReservationForm ? (
        <ReservationForm 
          equipments={selectedEquipments} 
          onComplete={handleReservationComplete}
        />
      ) : (
        <>
          <h3>Equipamentos Disponíveis</h3>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="filter-controls">
            <div className="filters-row">
              <div className="filter-group">
                <label htmlFor="type-filter">Filtrar por tipo:</label>
                <select 
                  id="type-filter"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="todos">Todos os tipos</option>
                  {equipmentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group search-group">
                <label htmlFor="search-input">Buscar:</label>
                <input 
                  id="search-input"
                  type="text"
                  placeholder="Nome do equipamento..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {selectedEquipments.length > 0 && (
              <div className="selected-counter">
                <span>Equipamentos selecionados: {selectedEquipments.length}</span>
                <button 
                  onClick={handleProceedToReservation}
                  className="primary-btn proceed-btn"
                >
                  Prosseguir para Reserva
                </button>
              </div>
            )}
          </div>
          
          {loading ? (
            <Loading />
          ) : paginatedEquipments.length === 0 ? (
            <p>Nenhum equipamento encontrado com os filtros atuais.</p>
          ) : (
            <>
              <div className="equipment-grid">
                {paginatedEquipments.map(equipment => {
                  const isSelected = selectedEquipments.some(item => item.id === equipment.id);
                  
                  return (
                    <div 
                      key={equipment.id} 
                      className={`equipment-card ${isSelected ? 'selected-card' : ''}`}
                      onClick={() => handleEquipmentSelect(equipment)}
                    >
                      <h4>{equipment.name}</h4>
                      <p>
                        <strong>Tipo:</strong> 
                        <span className="type-box">{equipment.type}</span>
                      </p>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEquipmentSelect(equipment);
                        }}
                        className={isSelected ? 'select-btn selected-btn' : 'select-btn'}
                      >
                        {isSelected ? 'Selecionado ✓' : 'Selecionar'}
                      </button>
                    </div>
                  );
                })}
              </div>
              
              {totalPages > 1 && (
                <div className="pagination-controls">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    &laquo; Anterior
                  </button>
                  
                  <span className="page-indicator">
                    Página {currentPage} de {totalPages}
                  </span>
                  
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    Próximo &raquo;
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default EquipmentList;