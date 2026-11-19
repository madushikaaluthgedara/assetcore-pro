import React, { useState } from 'react';
import Login from './Login';
import AdminView from './AdminView';
import UserView from './UserView';
import TechnicianView from './TechnicianView';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    localStorage.setItem('currentUser', JSON.stringify(userData));
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    localStorage.clear();
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const role = currentUser.role;

  return (
    <>
      {role === 'Admin' && <AdminView currentUser={currentUser} onLogout={handleLogout} />}
      {role === 'User' && <UserView currentUser={currentUser} onLogout={handleLogout} />}
      {role === 'Technician' && <TechnicianView currentUser={currentUser} onLogout={handleLogout} />}
    </>
  );
}