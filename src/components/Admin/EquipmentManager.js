import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import './EquipmentManager.css';

const EquipmentManager = () => {
  const [equipments, setEquipments] = useState([]);
  const [filteredEquipments, setFilteredEquipments] = useState([]);
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    type: ''
  });
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filters, setFilters] = useState({
    name: '',
    type: ''
  });
  const [typeFilterDropdownOpen, setTypeFilterDropdownOpen] = useState(false);

  const fetchEquipments = async () => {
    setLoading(true);
    try {
      const equipmentsCollection = collection(db, 'equipments');
      const equipmentsSnapshot = await getDocs(equipmentsCollection);
      const equipmentsList = equipmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      equipmentsList.sort((a, b) => a.name.localeCompare(b.name));

      setEquipments(equipmentsList);
      setFilteredEquipments(equipmentsList);
    } catch (error) {
      console.error("Erro ao buscar equipamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments();
  }, []);

  useEffect(() => {
    filterEquipments();
  }, [filters, equipments]);

  const filterEquipments = () => {
    let result = [...equipments];
    
    if (filters.name) {
      result = result.filter(item => 
        item.name.toLowerCase().includes(filters.name.toLowerCase())
      );
    }
    
    if (filters.type) {
      result = result.filter(item => item.type === filters.type);
    }
    
    setFilteredEquipments(result);
  };

  const handleAddEquipment = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'equipments'), {
        ...newEquipment,
        createdAt: new Date()
      });
      setNewEquipment({ name: '', type: '' });
      fetchEquipments();
    } catch (error) {
      console.error("Erro ao adicionar equipamento:", error);
    }
  };

  const handleRemoveEquipment = async (id) => {
    if (window.confirm("Tem certeza que deseja remover este equipamento?")) {
      try {
        await deleteDoc(doc(db, 'equipments', id));
        fetchEquipments();
      } catch (error) {
        console.error("Erro ao remover equipamento:", error);
      }
    }
  };

  const handleSelectType = (type) => {
    setNewEquipment({ ...newEquipment, type });
    setDropdownOpen(false);
  };

  const handleSelectTypeFilter = (type) => {
    setFilters({ ...filters, type });
    setTypeFilterDropdownOpen(false);
  };

  const clearFilters = () => {
    setFilters({ name: '', type: '' });
  };

  return (
    <div className="equipment-manager">
      <h3>Adicionar Equipamentos</h3>

      <form onSubmit={handleAddEquipment}>
        <div className="form-group">
          <label htmlFor="name">Nome do Equipamento</label>
          <input
            type="text"
            id="name"
            value={newEquipment.name}
            onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="type">Tipo</label>
          <div className="custom-dropdown half-width">
            <div
              className="custom-dropdown-toggle"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {newEquipment.type || "Selecione..."}
              <span>▼</span>
            </div>
            {dropdownOpen && (
              <div className="custom-dropdown-menu show">
                <div
                  className="custom-dropdown-item"
                  onClick={() => handleSelectType("Chromebook")}
                >
                  Chromebook
                </div>
                <div
                  className="custom-dropdown-item"
                  onClick={() => handleSelectType("iPad")}
                >
                  iPad
                </div>
              </div>
            )}
          </div>
        </div>

        <button type="submit" className="primary-btn">
          Adicionar
        </button>
      </form>

      <h3 className="equipment-list-title">Lista de Equipamentos</h3>
      
      <div className="filters-container">
        <h4>Filtros</h4>
        <div className="filters-row">
          <div className="form-group half-width">
            <label htmlFor="nameFilter">Filtrar por Nome</label>
            <input
              type="text"
              id="nameFilter"
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
              placeholder="Digite para filtrar..."
            />
          </div>
          
          <div className="form-group half-width">
            <label htmlFor="typeFilter">Filtrar por Tipo</label>
            <div className="custom-dropdown">
              <div
                className="custom-dropdown-toggle"
                onClick={() => setTypeFilterDropdownOpen(!typeFilterDropdownOpen)}
              >
                {filters.type || "Todos"}
                <span>▼</span>
              </div>
              {typeFilterDropdownOpen && (
                <div className="custom-dropdown-menu show">
                  <div
                    className="custom-dropdown-item"
                    onClick={() => handleSelectTypeFilter("")}
                  >
                    Todos
                  </div>
                  <div
                    className="custom-dropdown-item"
                    onClick={() => handleSelectTypeFilter("Chromebook")}
                  >
                    Chromebook
                  </div>
                  <div
                    className="custom-dropdown-item"
                    onClick={() => handleSelectTypeFilter("iPad")}
                  >
                    iPad
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <button onClick={clearFilters} className="secondary-btn">
          Limpar Filtros
        </button>
      </div>

      <div className="equipment-grid">
        {loading ? (
          <p>Carregando...</p>
        ) : filteredEquipments.length === 0 ? (
          <p>Nenhum equipamento encontrado com os filtros atuais.</p>
        ) : (
          filteredEquipments.map((equipment) => (
            <div key={equipment.id} className="equipment-card">
              <h4>{equipment.name}</h4>
              <div>
                <span className="type-badge">{equipment.type}</span>
              </div>
              <div>
                <button 
                  onClick={() => handleRemoveEquipment(equipment.id)}
                  className="delete-btn"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EquipmentManager;