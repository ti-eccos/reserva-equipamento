import React from 'react';
import './RoleBadge.css';

const RoleBadge = ({ role }) => {
  const getBadgeClasses = () => {
    switch (role) {
      case 'admin':
        return 'bg-danger';
      case 'user':
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  };

  return (
    <span className={`badge rounded-pill ${getBadgeClasses()} text-white p-2`}>
      {role}
    </span>
  );
};

export default RoleBadge;