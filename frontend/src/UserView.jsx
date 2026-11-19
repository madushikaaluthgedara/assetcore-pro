import React, { useState, useEffect } from 'react';
import { getCategories, getDevices, getTickets, createTicket } from './api';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function UserView({ currentUser, onLogout }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const [categoriesList, setCategoriesList] = useState([]);
  const [allDevices, setAllDevices] = useState([]); // Admin එකතු කළ Devices Database එකෙන් ලබා ගැනීමට
  const [filteredDevices, setFilteredDevices] = useState([]); // Category එකට අදාළ Filtered Devices
  const [myTickets, setMyTickets] = useState([]);

  // Fallback user session management
  const activeUser = currentUser || {
    name: localStorage.getItem('userName') || 'User',
    email: localStorage.getItem('userEmail') || 'user@assetcore.com'
  };

  // Ticket Form Data State
  const [ticketForm, setTicketForm] = useState({
    category: '',
    assetName: '',
    serialNumber: '',
    issue: ''
  });

  // 🔄 Load Categories, Devices & User Tickets from the MySQL backend
  const loadData = async () => {
    try {
      const [categories, devices, tickets] = await Promise.all([
        getCategories(), getDevices(), getTickets()
      ]);

      const catArray = Array.isArray(categories) ? categories : [];
      setCategoriesList(catArray);
      if (catArray.length > 0) {
        setTicketForm(prev => prev.category ? prev : ({ ...prev, category: catArray[0].name }));
      }

      setAllDevices(Array.isArray(devices) ? devices : []);

      const userEmail = activeUser?.email || 'user';
      const list = (Array.isArray(tickets) ? tickets : [])
        .filter(t => t.reportedByEmail === userEmail || t.reportedBy === activeUser?.name)
        .reverse();
      setMyTickets(list);
    } catch (err) {
      console.error('Error loading data from backend:', err);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 10000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);


  // 🔄 Selected Category එක මාරු වන විට ඊට අදාළ Devices පමණක් Filter කිරීම
  useEffect(() => {
    if (ticketForm.category) {
      const filtered = allDevices.filter(
        device => (device.parentCategory || device.category || '').toLowerCase() === ticketForm.category.toLowerCase()
      );
      setFilteredDevices(filtered);

      // Filter වූ පළමු Device එක හා එහි Serial Number එක Auto-select කිරීම
      if (filtered.length > 0) {
        setTicketForm(prev => ({
          ...prev,
          assetName: filtered[0].name || '',
          serialNumber: filtered[0].serialNumber || ''
        }));
      } else {
        setTicketForm(prev => ({
          ...prev,
          assetName: '',
          serialNumber: ''
        }));
      }
    }
  }, [ticketForm.category, allDevices]);

  // 🎯 Dropdown එකෙන් Device එක Select කළ විට Serial Number එක Auto fill වීම
  const handleDeviceChange = (e) => {
    const selectedName = e.target.value;
    const selectedDev = filteredDevices.find(d => d.name === selectedName);

    setTicketForm(prev => ({
      ...prev,
      assetName: selectedName,
      serialNumber: selectedDev ? (selectedDev.serialNumber || '') : ''
    }));
  };

  // QR Code Scanner Logic
  useEffect(() => {
    let scanner;
    if (isScannerOpen) {
      scanner = new Html5QrcodeScanner('qr-reader', {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      });

      scanner.render(
        (decodedText) => {
          try {
            const parsedData = JSON.parse(decodedText);
            setTicketForm(prev => ({
              ...prev,
              assetName: parsedData.assetName || parsedData.name || decodedText,
              serialNumber: parsedData.serialNumber || parsedData.sn || decodedText,
              category: parsedData.category || prev.category
            }));
          } catch {
            setTicketForm(prev => ({
              ...prev,
              serialNumber: decodedText,
              assetName: prev.assetName || `Scanned Device (${decodedText})`
            }));
          }
          
          scanner.clear();
          setIsScannerOpen(false);
          setIsModalOpen(true);
        },
        () => {}
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [isScannerOpen]);

  // Submit Ticket to Firebase
  const handleSubmitTicket = async (e) => {
    e.preventDefault();

    if (!ticketForm.assetName || !ticketForm.issue) {
      alert("Please select/enter a Device Name and Issue Description!");
      return;
    }

    try {
      await createTicket({
        category: ticketForm.category || 'General',
        assetName: ticketForm.assetName,
        serialNumber: ticketForm.serialNumber || 'N/A',
        issue: ticketForm.issue,
        reportedBy: activeUser?.name || 'User',
        reportedByEmail: activeUser?.email || 'user@assetcore.com',
        status: 'Pending',
        createdAt: new Date().toISOString().split('T')[0]
      });
      await loadData();

      alert("✅ Ticket submitted successfully to Admin!");
      setIsModalOpen(false);
      setTicketForm({
        category: categoriesList.length > 0 ? categoriesList[0].name : '',
        assetName: '',
        serialNumber: '',
        issue: ''
      });
    } catch (err) {
      console.error("Error submitting ticket:", err);
      alert("Failed to submit ticket: " + err.message);
    }
  };

  const bgMain = isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900';
  const cardBg = isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-md';
  const innerCardBg = isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900';
  const inputBg = isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900';
  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className={`min-h-screen ${bgMain} flex flex-col font-sans transition-colors duration-200`}>
      
      {/* 🔝 TOP NAVIGATION BAR */}
      <header className={`${cardBg} border-b backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-lg`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-blue-500/30">
              💎
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wide leading-tight">AssetCore</h1>
              <p className="text-sm text-blue-500 font-bold">User Dashboard</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className={`flex items-center gap-2 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'} border px-4 py-2.5 rounded-xl font-bold text-sm transition cursor-pointer`}
          >
            <span>{isDarkMode ? '🌙 Dark' : '☀️ Light'}</span>
          </button>

          <div className="h-8 w-[1px] bg-slate-700/50 hidden sm:block"></div>

          <div className={`flex items-center gap-3 ${innerCardBg} border px-4 py-2 rounded-xl`}>
            <div className="w-9 h-9 bg-blue-500/20 border border-blue-400/30 text-blue-500 rounded-xl flex items-center justify-center font-black text-base uppercase">
              {activeUser?.name ? activeUser.name.charAt(0) : 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-extrabold leading-tight">{activeUser?.name}</p>
              <p className={`text-xs ${textMuted} leading-tight`}>{activeUser?.email}</p>
            </div>
          </div>

          <button 
            onClick={onLogout} 
            className="bg-slate-800 hover:bg-red-600 text-white border border-slate-700 text-sm font-bold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2"
          >
            <span>🚪</span>
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </header>
      
      {/* 💻 MAIN CONTENT */}
      <main className="flex-1 max-w-6xl w-full mx-auto space-y-8 p-6">
        
        <div className={`${cardBg} border p-8 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6`}>
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-3xl">
              👤
            </div>
            <div>
              <h2 className="text-2xl font-black">Welcome, {activeUser?.name}!</h2>
              <p className={`text-sm ${textMuted} mt-1 font-semibold`}>Select equipment or scan device QR Code to report an issue.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => setIsScannerOpen(true)}
              className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white text-base font-extrabold px-6 py-3.5 rounded-2xl flex items-center justify-center gap-3 cursor-pointer shadow-lg shadow-emerald-600/20 transition"
            >
              <span className="text-xl">📷</span> Scan Device QR
            </button>

            <button 
              onClick={() => setIsModalOpen(true)} 
              className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white text-base font-extrabold px-6 py-3.5 rounded-2xl flex items-center justify-center gap-3 cursor-pointer shadow-lg shadow-blue-600/20 transition"
            >
              <span className="text-xl">✍️</span> Manual Form
            </button>
          </div>
        </div>

        {/* Support Tickets List */}
        <div className={`${cardBg} border rounded-3xl p-8 space-y-6`}>
          <h3 className="text-lg font-black flex items-center gap-2 border-b border-slate-700/40 pb-4">
            📋 Support Tickets ({myTickets.length})
          </h3>

          {myTickets.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <span className="text-4xl block">🎉</span>
              <p className={`text-base font-bold ${textMuted}`}>No support tickets submitted yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className={`${innerCardBg} uppercase font-bold text-xs tracking-wider`}>
                  <tr>
                    <th className="p-4">Category</th>
                    <th className="p-4">Asset Name</th>
                    <th className="p-4">Serial Number</th>
                    <th className="p-4">Issue Details</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {myTickets.map((t) => (
                    <tr key={t.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100'}>
                      <td className={`p-4 ${textMuted} font-bold`}>{t.category}</td>
                      <td className="p-4 font-black text-base">{t.assetName}</td>
                      <td className="p-4 font-mono text-blue-500 font-bold text-base">{t.serialNumber || 'N/A'}</td>
                      <td className="p-4 max-w-xs font-medium">{t.issue}</td>
                      <td className="p-4">
                        <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase ${
                          t.status === 'Assigned' 
                            ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' 
                            : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* 📷 QR SCANNER MODAL */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className={`${cardBg} border rounded-3xl p-6 w-full max-w-lg space-y-4 text-center`}>
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="text-lg font-black">📷 Scan Equipment QR Code</h3>
              <button onClick={() => setIsScannerOpen(false)} className="text-xl font-bold cursor-pointer hover:text-red-500">✕</button>
            </div>
            
            <div id="qr-reader" className="w-full rounded-2xl overflow-hidden border-2 border-emerald-500"></div>

            <button 
              onClick={() => setIsScannerOpen(false)} 
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm cursor-pointer"
            >
              Cancel Scanning
            </button>
          </div>
        </div>
      )}

      {/* 🛑 REPORT ISSUE FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className={`${cardBg} border rounded-3xl p-8 max-w-lg w-full shadow-2xl relative`}>
            
            <div className="flex justify-between items-center border-b border-slate-700/50 pb-4 mb-6">
              <h3 className="text-xl font-black flex items-center gap-2">⚠️ Report Equipment Issue</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-2xl font-bold cursor-pointer hover:text-red-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitTicket} className="space-y-5 text-sm">
              
              {/* 1. Main Category Dropdown */}
              <div>
                <label className="font-extrabold block mb-2 uppercase text-xs">Main Category *</label>
                <select 
                  value={ticketForm.category} 
                  onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })} 
                  className={`w-full p-4 ${inputBg} rounded-xl font-bold cursor-pointer text-base border-blue-500/40`}
                >
                  {categoriesList.map((cat, idx) => (
                    <option key={cat.id || idx} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Device Model Dropdown (Filtered by selected Category) */}
              <div>
                <label className="font-extrabold block mb-2 uppercase text-xs">Select Device Model *</label>
                {filteredDevices.length > 0 ? (
                  <select 
                    value={ticketForm.assetName} 
                    onChange={handleDeviceChange} 
                    className={`w-full p-4 ${inputBg} rounded-xl font-bold cursor-pointer text-base`}
                  >
                    {filteredDevices.map((dev, idx) => (
                      <option key={dev.id || idx} value={dev.name}>
                        {dev.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    required 
                    placeholder="No devices under this category. Type manually..." 
                    value={ticketForm.assetName} 
                    onChange={(e) => setTicketForm({ ...ticketForm, assetName: e.target.value })} 
                    className={`w-full p-4 ${inputBg} rounded-xl font-bold text-base`} 
                  />
                )}
              </div>

              {/* 3. Serial Number (Auto-filled) */}
              <div>
                <label className="font-extrabold block mb-2 uppercase text-xs flex justify-between">
                  <span>Serial Number (Auto-filled)</span>
                  <span className="text-blue-500 font-bold">Auto</span>
                </label>
                <input 
                  type="text" 
                  readOnly
                  placeholder="SN Code will appear here" 
                  value={ticketForm.serialNumber} 
                  className={`w-full p-4 ${inputBg} opacity-80 rounded-xl font-mono font-bold text-base border-blue-500/40`} 
                />
              </div>

              {/* 4. Issue Description */}
              <div>
                <label className="font-extrabold block mb-2 uppercase text-xs">Issue Description *</label>
                <textarea 
                  required 
                  rows={4} 
                  placeholder="Describe the issue in detail..." 
                  value={ticketForm.issue} 
                  onChange={(e) => setTicketForm({ ...ticketForm, issue: e.target.value })} 
                  className={`w-full p-4 ${inputBg} rounded-xl font-semibold text-base resize-none`} 
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-lg shadow-red-600/30 transition text-base cursor-pointer"
                >
                  ⚡ Send Ticket to Admin
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}