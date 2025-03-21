import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import Loading from '../UI/Loading';
import './ReservationApproval.css';
import emailjs from '@emailjs/browser';

const ReservationApproval = () => {
    const [reservations, setReservations] = useState([]);
    const [filter, setFilter] = useState('todas');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [availableDates, setAvailableDates] = useState([]);
    const tableRef = useRef(null);

    const sendEmailNotification = async (userEmail, status, reservationDetails) => {
        try {
            const templateParams = {
                user_email: userEmail,
                status: status,
                equipment_names: reservationDetails.equipmentNames.join(', '),
                date: formatDate(reservationDetails.date),
                purpose: reservationDetails.purpose,
            };

            await emailjs.send(
                'service_o1qqttp',
                'template_tivg11o',
                templateParams,
                '02A7mbqrm7LOKc068'
            );

            console.log('E-mail de notificação enviado com sucesso para:', userEmail);
        } catch (error) {
            console.error('Erro ao enviar e-mail de notificação:', error);
        }
    };

    const fetchUserEmail = async (userId) => {
        try {
            const userRef = doc(db, 'users', userId);
            const userSnapshot = await getDoc(userRef);

            if (userSnapshot.exists()) {
                const userData = userSnapshot.data();
                return userData.email;
            } else {
                console.warn('Usuário não encontrado no Firestore.');
                return null;
            }
        } catch (error) {
            console.error('Erro ao buscar e-mail do usuário:', error);
            return null;
        }
    };

    const handleStatusChange = async (reservationId, newStatus) => {
        try {
            const reservationRef = doc(db, 'reservations', reservationId);
            await updateDoc(reservationRef, { status: newStatus });

            const updatedReservation = reservations.find(reservation => reservation.id === reservationId);

            if (updatedReservation && (newStatus === 'aprovado' || newStatus === 'rejeitado')) {
                const userEmail = await fetchUserEmail(updatedReservation.userId);

                if (userEmail) {
                    await sendEmailNotification(userEmail, newStatus, updatedReservation);
                } else {
                    console.warn('E-mail do usuário não encontrado para enviar notificação.');
                }
            }

            setReservations(prevReservations => {
                const updatedReservations = prevReservations.map(reservation =>
                    reservation.id === reservationId ? { ...reservation, status: newStatus } : reservation
                );
                updatedReservations.sort((a, b) => b.date - a.date);
                return updatedReservations;
            });
        } catch (error) {
            console.error("Erro ao atualizar status da reserva:", error);
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

    useEffect(() => {
        const fetchReservations = async () => {
            setLoading(true);
            try {
                let reservationsQuery;

                if (filter === 'todas') {
                    reservationsQuery = collection(db, 'reservations');
                } else {
                    reservationsQuery = query(
                        collection(db, 'reservations'),
                        where('status', '==', filter)
                    );
                }

                const reservationsSnapshot = await getDocs(reservationsQuery);

                const reservationsList = reservationsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    let reservationDate;
                    try {
                        reservationDate = data.date && typeof data.date.toDate === 'function'
                            ? data.date.toDate()
                            : new Date();
                    } catch (error) {
                        console.error("Erro ao converter data para reserva:", doc.id, error);
                        reservationDate = new Date();
                    }

                    return {
                        id: doc.id,
                        ...data,
                        date: reservationDate,
                        userName: data.userName || "Não especificado",
                        userId: data.userId
                    };
                });

                reservationsList.sort((a, b) => b.date - a.date);

                const filteredReservations = reservationsList.filter(reservation =>
                    reservation.equipmentNames?.join(', ').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    reservation.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    reservation.userName?.toLowerCase().includes(searchTerm.toLowerCase())
                );

                setReservations(filteredReservations);
            } catch (error) {
                console.error("Erro ao buscar reservas:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReservations();
    }, [filter, searchTerm]);

    useEffect(() => {
        const fetchAvailableDates = async () => {
            try {
                const datesCollection = collection(db, 'availabilities');
                const datesSnapshot = await getDocs(datesCollection);
                const datesList = datesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setAvailableDates(datesList);
            } catch (error) {
                console.error("Erro ao buscar datas disponíveis:", error);
            }
        };

        fetchAvailableDates();
    }, []);

    const handleDeleteReservation = async (reservationId) => {
        const confirmDelete = window.confirm("Tem certeza que deseja excluir esta reserva?");
        if (!confirmDelete) return;

        try {
            const reservationRef = doc(db, 'reservations', reservationId);
            await deleteDoc(reservationRef);
            setReservations(prevReservations =>
                prevReservations.filter(reservation => reservation.id !== reservationId)
            );
        } catch (error) {
            console.error("Erro ao excluir reserva:", error);
        }
    };

    return (
        <div className="reservation-approval">
            <h3>Gerenciamento de Reservas</h3>

            <div className="filter-controls">
                <label htmlFor="status-filter">Filtrar por status:</label>
                <select
                    id="status-filter"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                >
                    <option value="todas">Todas</option>
                    <option value="pendente">Pendentes</option>
                    <option value="aprovado">Aprovadas</option>
                    <option value="rejeitado">Rejeitadas</option>
                    <option value="em uso">Em Uso</option>
                    <option value="devolvido">Devolvido</option>
                    <option value="cancelado">Cancelado</option>
                </select>
            </div>

            <div className="search-controls">
                <input
                    type="text"
                    placeholder="Buscar por nome do usuário, equipamento ou finalidade..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <Loading />
            ) : reservations.length === 0 ? (
                <p>Nenhuma reserva {filter !== 'todas' ? filter : ''} encontrada.</p>
            ) : (
                <table className="reservations-table" ref={tableRef}>
                    <thead>
                        <tr>
                            <th className="medium-column user-name">Nome do Usuário</th>
                            <th className="small-column">Data</th>
                            <th className="small-column">Horário</th>
                            <th className="small-column quantity">Qtd</th>
                            <th className="medium-column">Equipamentos</th>
                            <th className="large-column-finalidade">Finalidade</th>
                            <th className="medium-column status">Status</th>
                            <th className="small-column action">Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reservations.map(reservation => (
                            <tr key={reservation.id}>
                                <td className="medium-column user-name">{reservation.userName || "Não especificado"}</td>
                                <td className="small-column">{formatDate(reservation.date)}</td>
                                <td className="small-column">{reservation.startTime || "N/A"} - {reservation.endTime || "N/A"}</td>
                                <td className="small-column quantity">{reservation.equipmentNames?.length || 0}</td>
                                <td className="medium-column">{reservation.equipmentNames?.join(', ') || "Não especificado"}</td>
                                <td className="large-column-finalidade">{reservation.purpose || "Não especificado"}</td>
                                <td className="medium-column status">
                                    <select
                                        value={reservation.status}
                                        onChange={(e) => handleStatusChange(reservation.id, e.target.value)}
                                    >
                                        <option value="pendente">Pendente</option>
                                        <option value="aprovado">Aprovado</option>
                                        <option value="rejeitado">Rejeitado</option>
                                        <option value="em uso">Em Uso</option>
                                        <option value="devolvido">Devolvido</option>
                                        <option value="cancelado">Cancelado</option>
                                    </select>
                                </td>
                                <td className="small-column action">
                                    <span
                                        className="delete-reservation"
                                        onClick={() => handleDeleteReservation(reservation.id)}
                                    >
                                        &#10006;
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ReservationApproval;