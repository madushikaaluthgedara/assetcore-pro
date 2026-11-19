import React, { useState, useEffect } from 'react';
import { getUsers, createUser, deleteUser, getAssets, createAsset, updateAsset, deleteAsset, getTickets, updateTicket, getCategories, createCategory, deleteCategory, getDevices, createDevice, updateDevice, deleteDevice } from './api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import { confirmDialog } from './toast.js';

export default function AdminView({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('Work Orders');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Database Data States
  const [usersList, setUsersList] = useState([]);
  const [assets, setAssets] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [devicesList, setDevicesList] = useState([]);

  // Input States
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Right Drawer Form Open/Close State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // Form State for "Add New Device Model"
  const [newDeviceForm, setNewDeviceForm] = useState({
    name: '',
    parentCategory: '',
    serialNumber: '',
    machineCode: '',
    department: '',
    location: '',
    installDate: ''
  });

  // Machine whose maintenance history is being viewed (null = closed)
  const [historyDevice, setHistoryDevice] = useState(null);

  // Form State for "Add New Asset Task"
  const [taskForm, setTaskForm] = useState({
    name: '',
    category: '',
    selectedDeviceId: '',
    serialNumber: '',
    issue: '',
    assignedTechnician: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '10:00',
    maintenanceType: 'Preventive',
    downtimeStart: '',
    downtimeEnd: '',
    spareParts: ''
  });

  // User Account Form State
  const [newUser, setNewUser] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    role: 'User',
    category: '' 
  });

  // 🔄 LOAD DATA FROM MYSQL BACKEND (was: Firebase realtime sync)
  const loadAll = async () => {
    try {
      const [users, assetsData, ticketsData, categories, devices] = await Promise.all([
        getUsers(), getAssets(), getTickets(), getCategories(), getDevices()
      ]);
      setUsersList(Array.isArray(users) ? users : []);
      setAssets(Array.isArray(assetsData) ? [...assetsData].reverse() : []);
      setTickets(Array.isArray(ticketsData) ? [...ticketsData].reverse() : []);
      const catArray = Array.isArray(categories) ? categories : [];
      setCategoriesList(catArray);
      if (catArray.length > 0) {
        setNewUser(prev => prev.category ? prev : ({ ...prev, category: catArray[0].name }));
        setNewDeviceForm(prev => prev.parentCategory ? prev : ({ ...prev, parentCategory: catArray[0].name }));
      }
      setDevicesList(Array.isArray(devices) ? devices : []);
    } catch (err) {
      console.error('Error loading data from backend:', err);
    }
  };

  useEffect(() => {
    loadAll();
    const timer = setInterval(loadAll, 10000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const pendingTickets = tickets.filter(t => t.status !== 'Assigned');
  const availableDevices = devicesList.filter(d => d.parentCategory === taskForm.category);

  const handleCategoryChangeInTask = (selectedCat) => {
    const filteredDevs = devicesList.filter(d => d.parentCategory === selectedCat);
    const firstDev = filteredDevs[0];

    setTaskForm(prev => ({
      ...prev,
      category: selectedCat,
      selectedDeviceId: firstDev ? firstDev.id : '',
      name: firstDev ? firstDev.name : prev.name,
      serialNumber: firstDev ? (firstDev.serialNumber || '') : ''
    }));
  };

  const handleDeviceChangeInTask = (deviceId) => {
    const selectedDev = devicesList.find(d => String(d.id) === String(deviceId));
    if (selectedDev) {
      setTaskForm(prev => ({
        ...prev,
        selectedDeviceId: deviceId,
        name: selectedDev.name,
        serialNumber: selectedDev.serialNumber || ''
      }));
    }
  };

  const totalAssetsCount = assets.length;
  const assignedAssetsCount = assets.filter(a => a.status === 'Assigned' || (a.status !== 'Completed' && a.assignedTechnician)).length;
  const completedAssetsCount = assets.filter(a => a.status === 'Completed').length;
  const maxBarValue = Math.max(totalAssetsCount, 1);

  // ---- Factory helpers ----
  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = (a) => a.status !== 'Completed' && a.scheduledDate && String(a.scheduledDate).split('T')[0] < todayStr;
  const overdueCount = assets.filter(isOverdue).length;
  const machinesRunning = devicesList.filter(d => (d.status || 'Running') === 'Running').length;
  const machinesBreakdown = devicesList.filter(d => d.status === 'Breakdown').length;
  const machinesUnderMaint = devicesList.filter(d => d.status === 'Under Maintenance').length;
  const downtimeHours = (a) => {
    if (!a.downtimeStart) return null;
    const start = new Date(a.downtimeStart);
    const end = a.downtimeEnd ? new Date(a.downtimeEnd) : new Date();
    const h = (end - start) / 36e5;
    return isNaN(h) || h < 0 ? null : h.toFixed(1);
  };
  const machineStatusBadge = (st) => {
    const v = st || 'Running';
    return v === 'Breakdown'
      ? 'bg-red-500/20 text-red-500 border-red-500/30'
      : v === 'Under Maintenance'
      ? 'bg-amber-500/20 text-amber-500 border-amber-500/30'
      : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
  };

  const handleStatusChange = async (assetId, newStatus) => {
    try {
      await updateAsset(assetId, { status: newStatus });
      await loadAll();
    } catch (err) {
      alert("Error updating status: " + err.message);
    }
  };

  const getTechniciansAvailability = (targetDate, targetTime) => {
    const allTechnicians = usersList.filter(u => u.role === 'Technician');
    const defaultTechs = [
      { id: 't1', name: 'Kamal' },
      { id: 't2', name: 'Nemi' },
      { id: 't3', name: 'Sunil Shantha' }
    ];

    const mergedList = [...allTechnicians];
    defaultTechs.forEach(dt => {
      if (!mergedList.some(m => m.name.toLowerCase() === dt.name.toLowerCase())) {
        mergedList.push(dt);
      }
    });

    return mergedList.map(tech => {
      const isBusy = assets.some(asset => 
        asset.assignedTechnician === tech.name &&
        asset.scheduledDate === targetDate &&
        asset.scheduledTime === targetTime
      );
      return { ...tech, isBusy };
    });
  };

  const getFilteredAssets = (type) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    return assets.filter(item => {
      const dateToCheck = item.scheduledDate || item.registeredDate;
      if (!dateToCheck) return false;
      if (type === 'daily') {
        return dateToCheck === todayStr;
      } else if (type === 'monthly') {
        return dateToCheck.startsWith(currentMonthStr);
      }
      return true;
    });
  };

  const downloadPDFReport = (type) => {
    try {
      const dataToExport = getFilteredAssets(type);
      if (dataToExport.length === 0) {
        alert(`No records found for ${type.toUpperCase()} report!`);
        return;
      }

      const doc = new jsPDF();
      const title = type === 'daily' ? `Daily Inventory Report (${new Date().toISOString().split('T')[0]})` 
                    : `Monthly Inventory Report (${new Date().toISOString().substring(0, 7)})`;

      doc.setFontSize(14);
      doc.text(title, 14, 15);

      const tableColumn = ["#", "Asset Name", "Category", "Serial Number", "Status", "Technician", "Schedule Date & Time"];
      const tableRows = dataToExport.map((a, i) => [
        i + 1,
        a.name || 'N/A',
        a.category || 'N/A',
        a.serialNumber || 'N/A',
        a.status || 'Assigned',
        a.assignedTechnician || 'Unassigned',
        a.scheduledDate ? `${a.scheduledDate} ${a.scheduledTime || ''}` : 'N/A'
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 25,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] }
      });

      doc.save(`${type}_asset_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      alert("PDF Export Error: " + err.message);
    }
  };

  const downloadExcelReport = (type) => {
    try {
      const dataToExport = getFilteredAssets(type);
      if (dataToExport.length === 0) {
        alert(`No records found for ${type.toUpperCase()} report!`);
        return;
      }

      const excelData = dataToExport.map((a, i) => ({
        "No": i + 1,
        "Asset Name": a.name || 'N/A',
        "Category": a.category || 'N/A',
        "Serial Number": a.serialNumber || 'N/A',
        "Status": a.status || 'Assigned',
        "Assigned Technician": a.assignedTechnician || 'Unassigned',
        "Scheduled Date": a.scheduledDate || 'N/A',
        "Scheduled Time": a.scheduledTime || 'N/A',
        "Issue": a.issue || 'N/A'
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Asset Report");

      XLSX.writeFile(workbook, `${type}_asset_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      alert("Excel Export Error: " + err.message);
    }
  };

  const generateAndDownloadQRPdf = async (deviceData) => {
    try {
      const qrPayload = JSON.stringify({
        assetName: deviceData.name,
        category: deviceData.parentCategory,
        serialNumber: deviceData.serialNumber
      });

      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 300,
        margin: 2
      });

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 148, 25, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('AssetCore Pro - Device Tag', 10, 16);

      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(10, 32, 128, 165, 4, 4);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Device Name:`, 18, 45);
      doc.setFont('helvetica', 'normal');
      doc.text(`${deviceData.name}`, 55, 45);

      doc.setFont('helvetica', 'bold');
      doc.text(`Category:`, 18, 55);
      doc.setFont('helvetica', 'normal');
      doc.text(`${deviceData.parentCategory}`, 55, 55);

      doc.setFont('helvetica', 'bold');
      doc.text(`Serial Number:`, 18, 65);
      doc.setFont('helvetica', 'mono');
      doc.text(`${deviceData.serialNumber}`, 55, 65);

      doc.addImage(qrDataUrl, 'PNG', 24, 75, 100, 100);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('Scan this QR code using AssetCore mobile or user app', 22, 185);

      doc.save(`QR_${deviceData.name.replace(/\s+/g, '_')}_${deviceData.serialNumber}.pdf`);
    } catch (err) {
      console.error("QR PDF Generation Error:", err);
      alert("Failed to generate QR Code PDF: " + err.message);
    }
  };

  const handleRegisterNewDevice = async (e) => {
    e.preventDefault();
    if (!newDeviceForm.parentCategory) {
      alert("Please select a Main Category first!");
      return;
    }

    const devicePayload = {
      name: newDeviceForm.name.trim(),
      parentCategory: newDeviceForm.parentCategory,
      serialNumber: newDeviceForm.serialNumber.trim(),
      machineCode: newDeviceForm.machineCode.trim(),
      department: newDeviceForm.department.trim(),
      location: newDeviceForm.location.trim(),
      installDate: newDeviceForm.installDate || null,
      status: 'Running',
      createdAt: new Date().toISOString().split('T')[0]
    };

    try {
      await createDevice(devicePayload);
      await loadAll();
      await generateAndDownloadQRPdf(devicePayload);

      alert(`✅ Machine "${newDeviceForm.name}" registered and QR Code PDF downloaded!`);
      setNewDeviceForm({ name: '', parentCategory: categoriesList.length > 0 ? categoriesList[0].name : '', serialNumber: '', machineCode: '', department: '', location: '', installDate: '' });
      setActiveTab('Categories');
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleAddNewAssetTask = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: taskForm.name,
        category: taskForm.category || 'General',
        serialNumber: taskForm.serialNumber,
        issue: taskForm.issue,
        assignedTechnician: taskForm.assignedTechnician,
        scheduledDate: taskForm.scheduledDate,
        scheduledTime: taskForm.scheduledTime,
        status: 'Assigned',
        serviceReportPdf: '',
        serviceCost: '',
        maintenanceType: taskForm.maintenanceType || 'Preventive',
        downtimeStart: taskForm.downtimeStart ? taskForm.downtimeStart.replace('T', ' ') + ':00' : null,
        downtimeEnd: taskForm.downtimeEnd ? taskForm.downtimeEnd.replace('T', ' ') + ':00' : null,
        spareParts: taskForm.spareParts || '',
        registeredDate: new Date().toISOString().split('T')[0]
      };

      await createAsset(payload);

      if (selectedTicketId) {
        await updateTicket(selectedTicketId, {
          status: 'Assigned',
          assignedTechnician: taskForm.assignedTechnician,
          scheduledDate: taskForm.scheduledDate,
          scheduledTime: taskForm.scheduledTime
        });
      }

      await loadAll();
      alert(`✅ New Work Order Saved & Scheduled!`);
      setIsDrawerOpen(false);
      setSelectedTicketId(null);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const openNewAssetDrawer = (ticket = null) => {
    const defaultCat = ticket?.category || (categoriesList.length > 0 ? categoriesList[0].name : '');
    const initialDevs = devicesList.filter(d => d.parentCategory === defaultCat);
    const initialDev = initialDevs[0];

    if (ticket) {
      setSelectedTicketId(ticket.id);
      setTaskForm({
        name: ticket.assetName || ticket.name || (initialDev ? initialDev.name : ''),
        category: defaultCat,
        selectedDeviceId: initialDev ? initialDev.id : '',
        serialNumber: ticket.serialNumber || (initialDev ? initialDev.serialNumber : ''),
        issue: ticket.issue || '',
        assignedTechnician: '',
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '10:00',
        maintenanceType: 'Breakdown',
        downtimeStart: '',
        downtimeEnd: '',
        spareParts: ''
      });
    } else {
      setSelectedTicketId(null);
      setTaskForm({
        name: initialDev ? initialDev.name : '',
        category: defaultCat,
        selectedDeviceId: initialDev ? initialDev.id : '',
        serialNumber: initialDev ? (initialDev.serialNumber || '') : '',
        issue: '',
        assignedTechnician: '',
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '10:00',
        maintenanceType: 'Preventive',
        downtimeStart: '',
        downtimeEnd: '',
        spareParts: ''
      });
    }
    setIsDrawerOpen(true);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryInput.trim()) return;
    try {
      await createCategory({ name: newCategoryInput.trim() });
      await loadAll();
      setNewCategoryInput('');
      alert("✅ Main Category Added!");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (await confirmDialog("Delete Category?")) {
      await deleteCategory(id);
      await loadAll();
    }
  };

  const handleDeleteDevice = async (id) => {
    if (await confirmDialog("Delete Machine?")) {
      await deleteDevice(id);
      await loadAll();
    }
  };

  const handleDeleteAsset = async (id) => {
    if (await confirmDialog("Delete Asset Record?")) {
      await deleteAsset(id);
      await loadAll();
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const userPayload = {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        category: newUser.role === 'Technician' ? (newUser.category || 'General') : '',
        createdAt: new Date().toISOString().split('T')[0]
      };

      await createUser(userPayload);
      await loadAll();
      setNewUser({ 
        name: '', 
        email: '', 
        password: '', 
        role: 'User', 
        category: categoriesList.length > 0 ? categoriesList[0].name : '' 
      });
      alert("User Account Created Successfully!");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleDeleteUser = async (id) => {
    if (await confirmDialog("Delete User Account?")) {
      await deleteUser(id);
      await loadAll();
    }
  };

  const bgMain = isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardBg = isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const innerCardBg = isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200';
  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-600';
  const inputBg = isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900';

  return (
    <div className={`min-h-screen ${bgMain} p-6 space-y-6 max-w-[1650px] w-full mx-auto font-sans transition-colors duration-200 text-base`}>
      <header className={`${cardBg} border rounded-2xl px-6 py-5 flex justify-between items-center shadow-md`}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-blue-500/20">
            💎
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-wide ${isDarkMode ? 'text-white' : 'text-slate-900'} leading-tight`}>AssetCore Pro</h1>
            <p className="text-base text-blue-500 font-semibold">Welcome back, Admin</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-base">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className={`flex items-center gap-2 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'} border px-5 py-3 rounded-xl font-bold transition cursor-pointer text-base`}
          >
            <span>{isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
          </button>
          
          <span className="bg-blue-600/10 text-blue-600 border border-blue-500/30 px-5 py-2.5 rounded-xl font-black text-sm tracking-wider uppercase">
            ADMIN
          </span>

          <button 
            onClick={onLogout} 
            className="bg-red-600 hover:bg-red-500 text-white px-5 py-3 rounded-xl font-bold text-sm transition cursor-pointer shadow-sm"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex gap-6">
        <aside className={`${isSidebarCollapsed ? 'w-24' : 'w-80'} transition-all shrink-0`}>
          <div className={`${cardBg} border p-5 rounded-3xl space-y-4`}>
            <div className="flex justify-between items-center px-2">
              {!isSidebarCollapsed && <span className={`text-sm font-extrabold ${textMuted} uppercase tracking-wider`}>ADMIN NAVIGATION</span>}
              <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="text-blue-500 p-1 font-bold cursor-pointer text-lg">
                {isSidebarCollapsed ? '▶' : '◀'}
              </button>
            </div>

            <nav className="space-y-2.5">
              {[
                { id: 'Dashboard', icon: '📊', badge: 0 },
                { id: 'Machines', icon: '🏭', badge: 0 },
                { id: 'Tickets & Messages', icon: '🔔', badge: pendingTickets.length },
                { id: 'Work Orders', icon: '🔧', badge: overdueCount },
                { id: 'Categories', icon: '🏷️', badge: 0 },
                { id: 'User Accounts', icon: '👥', badge: 0 },
                { id: 'Reports', icon: '📈', badge: 0 },
                { id: 'Schedule Calendar', icon: '📅', badge: 0 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl text-base font-bold transition cursor-pointer ${
                    activeTab === tab.id 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                      : `${textMuted} ${isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-slate-100'}`
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{tab.icon}</span>
                    {!isSidebarCollapsed && <span>{tab.id}</span>}
                  </div>
                  {!isSidebarCollapsed && tab.badge > 0 && (
                    <span className="bg-amber-500 text-slate-950 text-sm font-black px-3 py-1 rounded-full">{tab.badge}</span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1 space-y-6 min-w-0">
          {activeTab === 'Dashboard' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black flex items-center gap-2">📊 System Overview</h2>
                <button onClick={() => openNewAssetDrawer()} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-base font-bold cursor-pointer shadow-md">
                  + New Work Order
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`${cardBg} border p-6 rounded-3xl flex flex-col items-center justify-center space-y-4`}>
                  <span className={`text-sm font-extrabold ${textMuted} uppercase tracking-wider`}>TOTAL MACHINES</span>
                  <div className="relative w-44 h-44 rounded-full border-[12px] border-blue-500 flex items-center justify-center shadow-inner">
                    <span className="text-6xl font-black">{devicesList.length}</span>
                  </div>
                </div>

                <div className={`${cardBg} border p-6 rounded-3xl md:col-span-2 space-y-4 flex flex-col justify-between`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-extrabold ${textMuted} uppercase tracking-wider`}>WORK ORDERS STATUS OVERVIEW</span>
                  </div>

                  <div className="h-52 flex items-end justify-around pt-6 px-4 gap-6 border-b border-slate-700/40 pb-2">
                    <div className="flex flex-col items-center gap-2 h-full justify-end w-1/3">
                      <span className="text-base font-black text-blue-500">{totalAssetsCount}</span>
                      <div className={`w-16 ${innerCardBg} rounded-t-xl overflow-hidden flex items-end h-full`}>
                        <div className="w-full bg-blue-500 rounded-t-xl transition-all duration-500" style={{ height: `${(totalAssetsCount / maxBarValue) * 100}%` }}></div>
                      </div>
                      <span className="text-sm font-bold text-center">Total Work Orders</span>
                    </div>

                    <div className="flex flex-col items-center gap-2 h-full justify-end w-1/3">
                      <span className="text-base font-black text-amber-500">{assignedAssetsCount}</span>
                      <div className={`w-16 ${innerCardBg} rounded-t-xl overflow-hidden flex items-end h-full`}>
                        <div className="w-full bg-amber-500 rounded-t-xl transition-all duration-500" style={{ height: `${(assignedAssetsCount / maxBarValue) * 100}%` }}></div>
                      </div>
                      <span className="text-sm font-bold text-center">Assigned Jobs</span>
                    </div>

                    <div className="flex flex-col items-center gap-2 h-full justify-end w-1/3">
                      <span className="text-base font-black text-emerald-500">{completedAssetsCount}</span>
                      <div className={`w-16 ${innerCardBg} rounded-t-xl overflow-hidden flex items-end h-full`}>
                        <div className="w-full bg-emerald-500 rounded-t-xl transition-all duration-500" style={{ height: `${(completedAssetsCount / maxBarValue) * 100}%` }}></div>
                      </div>
                      <span className="text-sm font-bold text-center">Completed Jobs</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className={`${cardBg} border p-5 rounded-3xl text-center`}>
                  <span className="text-3xl font-black text-emerald-500">{machinesRunning}</span>
                  <span className={`block text-sm font-extrabold ${textMuted} uppercase tracking-wider mt-1`}>🟢 Machines Running</span>
                </div>
                <div className={`${cardBg} border p-5 rounded-3xl text-center`}>
                  <span className="text-3xl font-black text-red-500">{machinesBreakdown}</span>
                  <span className={`block text-sm font-extrabold ${textMuted} uppercase tracking-wider mt-1`}>🔴 Breakdown Now</span>
                </div>
                <div className={`${cardBg} border p-5 rounded-3xl text-center`}>
                  <span className="text-3xl font-black text-amber-500">{machinesUnderMaint}</span>
                  <span className={`block text-sm font-extrabold ${textMuted} uppercase tracking-wider mt-1`}>🟠 Under Maintenance</span>
                </div>
                <div className={`${cardBg} border p-5 rounded-3xl text-center`}>
                  <span className="text-3xl font-black text-red-500">{overdueCount}</span>
                  <span className={`block text-sm font-extrabold ${textMuted} uppercase tracking-wider mt-1`}>⚠️ Overdue Jobs</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Machines' && (
            <div className="space-y-6">
              <div className={`${cardBg} border rounded-3xl p-8 max-w-2xl mx-auto space-y-6`}>
              <div>
                <h2 className="text-2xl font-black flex items-center gap-2">🏭 Register New Machine</h2>
                <p className={`text-base ${textMuted} mt-1 font-semibold`}>Add a factory machine to auto-generate & download its QR Code PDF tag.</p>
              </div>

              <form onSubmit={handleRegisterNewDevice} className="space-y-5 text-base">
                <div>
                  <label className="font-extrabold block mb-2 uppercase text-sm">Select Parent / Main Category *</label>
                  <select 
                    required 
                    value={newDeviceForm.parentCategory} 
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, parentCategory: e.target.value })} 
                    className={`w-full p-4 ${inputBg} rounded-xl font-bold cursor-pointer border-blue-500/50 text-base`}
                  >
                    {categoriesList.map(cat => (
                      <option key={cat.id} value={cat.name} className="text-base">{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-extrabold block mb-2 uppercase text-sm">Machine Name / Model *</label>
                  <input type="text" required placeholder="e.g. Boiler Model-X / Filling Machine F-200" value={newDeviceForm.name} onChange={(e) => setNewDeviceForm({ ...newDeviceForm, name: e.target.value })} className={`w-full p-4 ${inputBg} rounded-xl font-semibold text-base`} />
                </div>
                
                <div>
                  <label className="font-extrabold block mb-2 uppercase text-sm">Serial Number *</label>
                  <input type="text" required placeholder="e.g. SN-DEV-2026-X" value={newDeviceForm.serialNumber} onChange={(e) => setNewDeviceForm({ ...newDeviceForm, serialNumber: e.target.value })} className={`w-full p-4 ${inputBg} rounded-xl font-mono text-base`} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-extrabold block mb-2 uppercase text-sm">Machine Code</label>
                    <input type="text" placeholder="e.g. M-01 / PM-03" value={newDeviceForm.machineCode} onChange={(e) => setNewDeviceForm({ ...newDeviceForm, machineCode: e.target.value })} className={`w-full p-4 ${inputBg} rounded-xl font-mono text-base`} />
                  </div>
                  <div>
                    <label className="font-extrabold block mb-2 uppercase text-sm">Install Date</label>
                    <input type="date" value={newDeviceForm.installDate} onChange={(e) => setNewDeviceForm({ ...newDeviceForm, installDate: e.target.value })} className={`w-full p-4 ${inputBg} rounded-xl font-semibold text-base`} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-extrabold block mb-2 uppercase text-sm">Department / Section</label>
                    <input type="text" placeholder="e.g. Production Line 1" value={newDeviceForm.department} onChange={(e) => setNewDeviceForm({ ...newDeviceForm, department: e.target.value })} className={`w-full p-4 ${inputBg} rounded-xl font-semibold text-base`} />
                  </div>
                  <div>
                    <label className="font-extrabold block mb-2 uppercase text-sm">Location in Factory</label>
                    <input type="text" placeholder="e.g. Building A, Bay 3" value={newDeviceForm.location} onChange={(e) => setNewDeviceForm({ ...newDeviceForm, location: e.target.value })} className={`w-full p-4 ${inputBg} rounded-xl font-semibold text-base`} />
                  </div>
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-lg transition text-lg cursor-pointer flex items-center justify-center gap-2">
                    ⚡ Add Machine & Download QR PDF
                  </button>
                </div>
              </form>
              </div>

              <div className={`${cardBg} border rounded-3xl p-6 space-y-4`}>
                <h3 className="text-xl font-black">🏭 Machine Register ({devicesList.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-base">
                    <thead className={`${innerCardBg} ${textMuted} uppercase font-extrabold text-xs tracking-wider`}>
                      <tr>
                        <th className="p-4">CODE</th>
                        <th className="p-4">MACHINE</th>
                        <th className="p-4">CATEGORY</th>
                        <th className="p-4">SERIAL</th>
                        <th className="p-4">DEPARTMENT / LOCATION</th>
                        <th className="p-4">INSTALLED</th>
                        <th className="p-4">STATUS</th>
                        <th className="p-4 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {devicesList.length === 0 ? (
                        <tr><td colSpan="8" className={`text-center p-6 ${textMuted} font-bold`}>No machines registered yet.</td></tr>
                      ) : (
                        devicesList.map((d) => (
                          <tr key={d.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100/60'}>
                            <td className="p-4 font-mono font-bold text-blue-500">{d.machineCode || '—'}</td>
                            <td className="p-4 font-black text-lg">{d.name}</td>
                            <td className={`p-4 ${textMuted} font-bold`}>{d.parentCategory}</td>
                            <td className="p-4 font-mono">{d.serialNumber || 'N/A'}</td>
                            <td className={`p-4 ${textMuted} font-semibold text-sm`}>{d.department || '—'}{d.location ? ` · ${d.location}` : ''}</td>
                            <td className={`p-4 ${textMuted} font-semibold text-sm`}>{d.installDate ? String(d.installDate).split('T')[0] : '—'}</td>
                            <td className="p-4">
                              <span className={`px-4 py-1.5 rounded-full text-xs font-black border ${machineStatusBadge(d.status)}`}>{d.status || 'Running'}</span>
                            </td>
                            <td className="p-4 text-right whitespace-nowrap space-x-3">
                              <button onClick={() => setHistoryDevice(d)} className="text-blue-400 hover:underline font-bold cursor-pointer text-sm">📜 History</button>
                              <button onClick={() => generateAndDownloadQRPdf(d)} className="text-blue-400 hover:underline font-bold cursor-pointer text-sm">🖨️ QR</button>
                              <button onClick={() => handleDeleteDevice(d.id)} className="text-red-500 hover:underline font-black cursor-pointer text-sm">Delete</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Tickets & Messages' && (
            <div className={`${cardBg} border rounded-3xl p-6 space-y-4`}>
              <h3 className="text-xl font-black flex items-center gap-2">🔔 Pending Issue Tickets ({pendingTickets.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-base">
                  <thead className={`${innerCardBg} ${textMuted} uppercase font-extrabold text-xs tracking-wider`}>
                    <tr>
                      <th className="p-4">#</th>
                      <th className="p-4">ASSET / ISSUE</th>
                      <th className="p-4">SERIAL</th>
                      <th className="p-4">STATUS</th>
                      <th className="p-4">ASSIGNED TECH</th>
                      <th className="p-4 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {pendingTickets.length === 0 ? (
                      <tr><td colSpan="6" className={`text-center p-6 ${textMuted} font-bold`}>No pending tickets. All tasks have been assigned!</td></tr>
                    ) : (
                      pendingTickets.map((t, i) => (
                        <tr key={t.id || i} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100/60'}>
                          <td className={`p-4 ${textMuted} font-bold`}>{i + 1}</td>
                          <td className="p-4">
                            <span className="font-black block text-lg">{t.assetName || t.name || 'Issue Ticket'}</span>
                            <span className={`text-sm ${textMuted} font-semibold`}>{t.issue || 'No details specified.'}</span>
                          </td>
                          <td className="p-4 font-mono text-blue-500 font-bold text-base">{t.serialNumber || 'N/A'}</td>
                          <td className="p-4">
                            <span className="px-4 py-1.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-600 border border-amber-500/30">
                              {t.status || 'Pending'}
                            </span>
                          </td>
                          <td className={`p-4 text-sm ${textMuted} font-bold`}>
                            {t.assignedTechnician || 'Unassigned'}
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => openNewAssetDrawer(t)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-extrabold cursor-pointer shadow-sm">
                              Assign Task
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Work Orders' && (
            <div className={`${cardBg} border rounded-3xl p-6 space-y-4`}>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black">🔧 Work Orders / Maintenance Jobs ({assets.length})</h3>
                <button onClick={() => openNewAssetDrawer()} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-sm font-extrabold cursor-pointer shadow-md">+ New Work Order</button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-base">
                  <thead className={`${innerCardBg} ${textMuted} uppercase font-extrabold text-xs tracking-wider`}>
                    <tr>
                      <th className="p-4">#</th>
                      <th className="p-4">NAME</th>
                      <th className="p-4">CATEGORY</th>
                      <th className="p-4">TYPE</th>
                      <th className="p-4">SERIAL / TECH</th>
                      <th className="p-4">SCHEDULED DATE & TIME</th>
                      <th className="p-4">DOWNTIME</th>
                      <th className="p-4">STATUS</th>
                      <th className="p-4">SERVICE REPORT & COST (PDF)</th>
                      <th className="p-4 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {assets.length === 0 ? (
                      <tr><td colSpan="10" className={`text-center p-6 ${textMuted} font-bold`}>No work orders recorded yet.</td></tr>
                    ) : (
                      assets.map((a, i) => {
                        const currentStatus = a.status || 'Assigned';
                        const pdfData = a.serviceReportPdf || a.reportPdfUrl;

                        return (
                          <tr key={a.id} className={isOverdue(a) ? 'bg-red-500/10 hover:bg-red-500/20' : (isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100/60')}>
                            <td className={`p-4 ${textMuted} font-bold`}>{i + 1}</td>
                            <td className="p-4 font-black text-lg">{a.name}</td>
                            <td className={`p-4 ${textMuted} font-bold`}>{a.category || 'General'}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1.5 rounded-full text-xs font-black border ${
                                (a.maintenanceType || 'Preventive') === 'Breakdown'
                                  ? 'bg-red-500/20 text-red-500 border-red-500/30'
                                  : (a.maintenanceType === 'Inspection'
                                    ? 'bg-violet-500/20 text-violet-400 border-violet-500/30'
                                    : 'bg-blue-500/20 text-blue-400 border-blue-500/30')
                              }`}>{a.maintenanceType || 'Preventive'}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-blue-500 font-mono font-bold block text-base">{a.serialNumber || 'N/A'}</span>
                              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-bold">{a.assignedTechnician || 'Unassigned'}</span>
                            </td>
                            <td className={`p-4 ${textMuted} font-semibold text-sm`}>
                              {a.scheduledDate ? `${String(a.scheduledDate).split('T')[0]} @ ${a.scheduledTime || ''}` : 'N/A'}
                              {isOverdue(a) && <span className="block text-red-500 font-black text-xs mt-1">⚠️ OVERDUE</span>}
                            </td>
                            <td className="p-4 font-bold text-sm">
                              {downtimeHours(a) ? <span className="text-red-400">⏱ {downtimeHours(a)} h</span> : <span className={textMuted}>—</span>}
                              {a.spareParts ? <span className={`block text-xs ${textMuted} font-semibold mt-1`}>Parts: {a.spareParts}</span> : null}
                            </td>
                            
                            <td className="p-4">
                              <select
                                value={currentStatus}
                                onChange={(e) => handleStatusChange(a.id, e.target.value)}
                                className={`px-4 py-2 rounded-full text-xs font-black uppercase border cursor-pointer ${
                                  currentStatus === 'Completed'
                                    ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                                    : currentStatus === 'In Progress'
                                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                    : 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                                }`}
                              >
                                <option value="Assigned" className="bg-slate-900 text-amber-500">ASSIGNED</option>
                                <option value="In Progress" className="bg-slate-900 text-blue-400">IN PROGRESS</option>
                                <option value="Completed" className="bg-slate-900 text-emerald-500">COMPLETED</option>
                              </select>
                            </td>

                            <td className="p-4">
                              {pdfData ? (
                                <div className="flex flex-col gap-1 items-start">
                                  <a 
                                    href={pdfData} 
                                    download={`Service_Report_${a.name || 'Asset'}.pdf`}
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/40 px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-sm"
                                  >
                                    📄 Download PDF
                                  </a>
                                  {a.serviceCost && (
                                    <span className="text-xs font-black text-emerald-400">
                                      Cost: {a.serviceCost}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className={`text-sm italic font-semibold ${textMuted}`}>No Report Uploaded</span>
                              )}
                            </td>

                            <td className="p-4 text-right">
                              <button onClick={() => handleDeleteAsset(a.id)} className="text-red-500 hover:underline font-black cursor-pointer text-sm">Delete</button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Categories' && (
            <div className={`${cardBg} border rounded-3xl p-6 space-y-6 max-w-3xl mx-auto`}>
              <h3 className="text-xl font-black">Manage Categories & Machines</h3>
              
              <form onSubmit={handleAddCategory} className="flex gap-3">
                <input type="text" required placeholder="New Main Category Name..." value={newCategoryInput} onChange={(e) => setNewCategoryInput(e.target.value)} className={`flex-1 p-4 ${inputBg} rounded-xl text-base font-semibold`} />
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-xl text-base font-extrabold shadow-md cursor-pointer">+ Add Category</button>
              </form>

              <div className="space-y-4">
                {categoriesList.length === 0 ? (
                  <p className={`text-center py-4 ${textMuted} font-bold`}>No categories added yet.</p>
                ) : (
                  categoriesList.map((cat) => {
                    const categoryDevices = devicesList.filter(d => d.parentCategory === cat.name);

                    return (
                      <div key={cat.id} className={`${innerCardBg} border p-5 rounded-2xl space-y-3`}>
                        <div className="flex justify-between items-center border-b border-slate-700/30 pb-3">
                          <span className="font-black text-lg text-blue-500 flex items-center gap-2">
                            📁 Category: {cat.name}
                          </span>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-500 text-sm font-bold hover:underline cursor-pointer">
                            Delete Category
                          </button>
                        </div>

                        <div className="pl-4 space-y-2">
                          <span className={`text-xs font-extrabold uppercase tracking-wider block ${textMuted}`}>
                            Machines under "{cat.name}" ({categoryDevices.length}):
                          </span>
                          {categoryDevices.length === 0 ? (
                            <p className="text-sm italic text-slate-500 font-semibold">No machines registered under this category yet.</p>
                          ) : (
                            categoryDevices.map((dev) => (
                              <div key={dev.id} className={`${cardBg} border p-4 rounded-xl flex justify-between items-center text-sm`}>
                                <div>
                                  <span className="font-black text-base block">{dev.name}</span>
                                  <span className="font-mono text-blue-400 font-bold">SN: {dev.serialNumber || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button 
                                    onClick={() => generateAndDownloadQRPdf(dev)} 
                                    className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 border border-blue-500/30 px-3 py-1.5 rounded-lg font-bold cursor-pointer text-xs"
                                  >
                                    🖨️ Get QR PDF
                                  </button>
                                  <button onClick={() => handleDeleteDevice(dev.id)} className="text-red-400 hover:underline font-bold cursor-pointer text-xs">
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'User Accounts' && (
            <div className={`${cardBg} border rounded-3xl p-6 space-y-6 max-w-3xl mx-auto`}>
              <h3 className="text-xl font-black">Manage User & Technician Accounts</h3>
              
              <form onSubmit={handleAddUser} className="grid grid-cols-2 gap-4 text-base">
                <input type="text" required placeholder="Name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className={`p-4 ${inputBg} rounded-xl font-semibold`} />
                <input type="email" required placeholder="Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className={`p-4 ${inputBg} rounded-xl font-semibold`} />
                <input type="password" required placeholder="Password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className={`p-4 ${inputBg} rounded-xl font-semibold`} />

                <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className={`p-4 ${inputBg} rounded-xl cursor-pointer font-bold`}>
                  <option value="User">User</option>
                  <option value="Technician">Technician</option>
                  <option value="Admin">Admin</option>
                </select>

                {newUser.role === 'Technician' && (
                  <div className="col-span-2">
                    <label className="font-extrabold block mb-1.5 text-xs uppercase text-blue-500">🛠️ Select Technician Specialization / Category *</label>
                    <select value={newUser.category} onChange={e => setNewUser({ ...newUser, category: e.target.value })} className={`w-full p-4 ${inputBg} rounded-xl cursor-pointer font-bold border-blue-500/50`}>
                      {categoriesList.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button type="submit" className="col-span-2 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl font-extrabold shadow-md text-base cursor-pointer transition">
                  Create Account
                </button>
              </form>

              <div className="space-y-3">
                {usersList.map((u) => (
                  <div key={u.id} className={`flex justify-between items-center ${innerCardBg} border p-4 rounded-xl text-base`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg">{u.name}</span>
                        <span className={`text-xs px-3 py-1 rounded-full font-black ${
                          u.role === 'Technician' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : u.role === 'Admin' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                        }`}>
                          {u.role}
                        </span>

                        {u.role === 'Technician' && u.category && (
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-black">
                            🏷️ {u.category}
                          </span>
                        )}
                      </div>
                      <span className={`text-sm ${textMuted} font-semibold block`}>{u.email}</span>
                    </div>

                    {u.role === 'Admin' || u.id === currentUser?.id ? (
                      <span className="text-slate-500 font-bold text-sm" title="Admin accounts are protected and cannot be deleted">
                        🔒 Protected
                      </span>
                    ) : (
                      <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 font-bold hover:underline cursor-pointer text-sm">
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Reports' && (
            <div className={`${cardBg} border p-8 rounded-3xl space-y-6 max-w-4xl mx-auto`}>
              <div>
                <h3 className="text-2xl font-black flex items-center gap-2">📈 Export System Analytics & Reports</h3>
                <p className={`text-base ${textMuted} mt-1 font-semibold`}>Download Daily or Monthly asset inventory records in PDF or Excel formats.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`${innerCardBg} border p-6 rounded-2xl space-y-4`}>
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h4 className="text-lg font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">🗓️ Daily Report (Today)</h4>
                    <span className="text-sm bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-mono px-3 py-1 rounded-md font-bold">{new Date().toISOString().split('T')[0]}</span>
                  </div>
                  <p className={`text-base ${textMuted} font-semibold`}>Total records today: <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{getFilteredAssets('daily').length}</strong></p>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => downloadPDFReport('daily')} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3.5 rounded-xl text-sm font-extrabold cursor-pointer shadow-md flex items-center justify-center gap-2">📄 PDF</button>
                    <button onClick={() => downloadExcelReport('daily')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl text-sm font-extrabold cursor-pointer shadow-md flex items-center justify-center gap-2">📊 Excel</button>
                  </div>
                </div>

                <div className={`${innerCardBg} border p-6 rounded-2xl space-y-4`}>
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h4 className="text-lg font-black text-blue-600 dark:text-blue-400 flex items-center gap-2">📅 Monthly Report (This Month)</h4>
                    <span className="text-sm bg-blue-500/20 text-blue-600 dark:text-blue-300 font-mono px-3 py-1 rounded-md font-bold">{new Date().toISOString().substring(0, 7)}</span>
                  </div>
                  <p className={`text-base ${textMuted} font-semibold`}>Total records this month: <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{getFilteredAssets('monthly').length}</strong></p>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => downloadPDFReport('monthly')} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3.5 rounded-xl text-sm font-extrabold cursor-pointer shadow-md flex items-center justify-center gap-2">📄 PDF</button>
                    <button onClick={() => downloadExcelReport('monthly')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl text-sm font-extrabold cursor-pointer shadow-md flex items-center justify-center gap-2">📊 Excel</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Schedule Calendar' && (
            <div className={`${cardBg} border rounded-3xl p-6 space-y-4`}>
              <h3 className="text-xl font-black flex items-center gap-2">📅 Task Schedule Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assets.filter(a => a.scheduledDate).map((task) => (
                  <div key={task.id} className={`${innerCardBg} border p-5 rounded-2xl space-y-3`}>
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span className="font-black text-blue-500 text-base">{task.name}</span>
                      <span className="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-full font-mono font-bold">{task.scheduledDate}</span>
                    </div>
                    <p className="text-base font-medium">Technician: <strong className="text-emerald-600 dark:text-emerald-400 font-black">{task.assignedTechnician}</strong></p>
                    <p className={`text-sm ${textMuted} font-semibold`}>Time: {task.scheduledTime || 'N/A'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {historyDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setHistoryDevice(null)}>
          <div className={`w-full max-w-3xl max-h-[85vh] overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-3xl p-6 space-y-4 shadow-2xl`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black">📜 Maintenance History — {historyDevice.name}</h3>
                <p className={`text-sm ${textMuted} font-semibold mt-1`}>
                  {historyDevice.machineCode ? `Code: ${historyDevice.machineCode} · ` : ''}SN: {historyDevice.serialNumber || 'N/A'}
                  {historyDevice.department ? ` · ${historyDevice.department}` : ''}{historyDevice.location ? ` · ${historyDevice.location}` : ''}
                </p>
              </div>
              <button onClick={() => setHistoryDevice(null)} className={`${textMuted} hover:text-red-500 font-bold p-1 text-2xl cursor-pointer`}>✕</button>
            </div>
            {(() => {
              const jobs = assets.filter(a => (historyDevice.serialNumber && a.serialNumber === historyDevice.serialNumber) || a.name === historyDevice.name);
              if (jobs.length === 0) return <p className={`text-center py-6 ${textMuted} font-bold`}>No maintenance jobs recorded for this machine yet.</p>;
              return (
                <div className="space-y-3">
                  {jobs.map((a) => (
                    <div key={a.id} className={`${innerCardBg} border p-4 rounded-2xl space-y-1`}>
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="font-black">{a.scheduledDate ? String(a.scheduledDate).split('T')[0] : '—'} · {a.maintenanceType || 'Preventive'}</span>
                        <span className="text-xs font-black uppercase">{a.status}</span>
                      </div>
                      <p className={`text-sm ${textMuted} font-semibold`}>{a.issue || 'No details'}</p>
                      <p className="text-xs font-bold">
                        Tech: {a.assignedTechnician || 'Unassigned'}
                        {downtimeHours(a) ? ` · ⏱ Downtime: ${downtimeHours(a)} h` : ''}
                        {a.serviceCost ? ` · Cost: ${a.serviceCost}` : ''}
                        {a.spareParts ? ` · Parts: ${a.spareParts}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity">
          <div className={`w-full max-w-md ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} border-l h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto`}>
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
                <h3 className="text-xl font-black">🔧 New Work Order</h3>
                <button onClick={() => setIsDrawerOpen(false)} className={`${textMuted} hover:text-red-500 font-bold p-1 text-2xl cursor-pointer`}>✕</button>
              </div>

              <form id="taskDrawerForm" onSubmit={handleAddNewAssetTask} className="space-y-4 text-base">
                <div>
                  <label className="font-extrabold block mb-1 uppercase text-xs">Category *</label>
                  <select 
                    value={taskForm.category} 
                    onChange={(e) => handleCategoryChangeInTask(e.target.value)} 
                    className={`w-full p-4 ${inputBg} rounded-xl cursor-pointer font-bold border-blue-500/40 text-base`}
                  >
                    {categoriesList.map((cat, idx) => (
                      <option key={cat.id || idx} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-extrabold block mb-1 uppercase text-xs">Select Machine *</label>
                  <select 
                    value={taskForm.selectedDeviceId} 
                    onChange={(e) => handleDeviceChangeInTask(e.target.value)} 
                    className={`w-full p-4 ${inputBg} rounded-xl cursor-pointer font-bold text-base`}
                  >
                    {availableDevices.length === 0 ? (
                      <option value="">No machines registered under "{taskForm.category}"</option>
                    ) : (
                      availableDevices.map((dev) => (
                        <option key={dev.id} value={dev.id}>{dev.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="font-extrabold block mb-1 uppercase text-xs">Machine / Job Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Printer Model / Service Name" 
                    value={taskForm.name} 
                    onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })} 
                    className={`w-full p-4 ${inputBg} rounded-xl font-bold text-base`} 
                  />
                </div>

                <div>
                  <label className="font-extrabold block mb-1 uppercase text-xs flex justify-between items-center">
                    <span>Serial Number *</span>
                    <span className="text-xs text-blue-400 font-bold">Auto-filled</span>
                  </label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. SN-0000" 
                    value={taskForm.serialNumber} 
                    onChange={(e) => setTaskForm({ ...taskForm, serialNumber: e.target.value })} 
                    className={`w-full p-4 ${inputBg} font-mono font-bold text-base rounded-xl border-emerald-500/50`} 
                  />
                </div>

                <div>
                  <label className="font-extrabold block mb-1 uppercase text-xs">Issue / Service Details *</label>
                  <textarea 
                    rows={3} 
                    required 
                    placeholder="Describe what technician needs to fix..." 
                    value={taskForm.issue} 
                    onChange={(e) => setTaskForm({ ...taskForm, issue: e.target.value })} 
                    className={`w-full p-4 ${inputBg} rounded-xl font-semibold text-base`} 
                  />
                </div>

                <div>
                  <label className="font-extrabold block mb-1 uppercase text-xs">Maintenance Type *</label>
                  <select value={taskForm.maintenanceType} onChange={(e) => setTaskForm({ ...taskForm, maintenanceType: e.target.value })} className={`w-full p-4 ${inputBg} rounded-xl cursor-pointer font-bold text-base`}>
                    <option value="Preventive">🛠️ Preventive (planned)</option>
                    <option value="Breakdown">🔴 Breakdown (machine stopped)</option>
                    <option value="Inspection">🔍 Inspection</option>
                  </select>
                </div>

                {taskForm.maintenanceType === 'Breakdown' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-extrabold block mb-1 uppercase text-xs">⏱ Machine Stopped At</label>
                      <input type="datetime-local" value={taskForm.downtimeStart} onChange={(e) => setTaskForm({ ...taskForm, downtimeStart: e.target.value })} className={`w-full p-3.5 ${inputBg} rounded-xl font-bold text-base`} />
                    </div>
                    <div>
                      <label className="font-extrabold block mb-1 uppercase text-xs">Back Running At</label>
                      <input type="datetime-local" value={taskForm.downtimeEnd} onChange={(e) => setTaskForm({ ...taskForm, downtimeEnd: e.target.value })} className={`w-full p-3.5 ${inputBg} rounded-xl font-bold text-base`} />
                    </div>
                  </div>
                )}

                <div>
                  <label className="font-extrabold block mb-1 uppercase text-xs">Spare Parts Used</label>
                  <input type="text" placeholder="e.g. Bearing 6205 x2, Belt A-45" value={taskForm.spareParts} onChange={(e) => setTaskForm({ ...taskForm, spareParts: e.target.value })} className={`w-full p-4 ${inputBg} rounded-xl font-semibold text-base`} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-extrabold block mb-1 uppercase text-xs">Scheduled Date *</label>
                    <input type="date" required value={taskForm.scheduledDate} onChange={(e) => setTaskForm({ ...taskForm, scheduledDate: e.target.value })} className={`w-full p-3.5 ${inputBg} rounded-xl font-bold text-base`} />
                  </div>
                  <div>
                    <label className="font-extrabold block mb-1 uppercase text-xs">Scheduled Time *</label>
                    <input type="time" required value={taskForm.scheduledTime} onChange={(e) => setTaskForm({ ...taskForm, scheduledTime: e.target.value })} className={`w-full p-3.5 ${inputBg} rounded-xl font-bold text-base`} />
                  </div>
                </div>

                <div>
                  <label className="font-extrabold block mb-1 uppercase text-xs">Assign Technician *</label>
                  <select required value={taskForm.assignedTechnician} onChange={(e) => setTaskForm({ ...taskForm, assignedTechnician: e.target.value })} className={`w-full p-4 ${inputBg} rounded-xl cursor-pointer font-bold text-base`}>
                    <option value="">-- Choose Technician --</option>
                    {getTechniciansAvailability(taskForm.scheduledDate, taskForm.scheduledTime).map((tech, idx) => (
                      <option key={idx} value={tech.isBusy ? '' : tech.name} disabled={tech.isBusy} className={tech.isBusy ? 'text-red-500' : 'text-emerald-600'}>
                        {tech.name} {tech.isBusy ? '❌ (Busy)' : '✅ (Available)'}
                      </option>
                    ))}
                  </select>
                </div>
              </form>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-6">
              <button type="submit" form="taskDrawerForm" className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg transition text-base cursor-pointer">+ Save Work Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}