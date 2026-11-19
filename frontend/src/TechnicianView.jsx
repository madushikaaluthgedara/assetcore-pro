import React, { useState, useEffect } from 'react';
import { getAssets, updateAsset } from './api';

export default function TechnicianView({ currentUser, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Modal States
  const [selectedTask, setSelectedTask] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [serviceCost, setServiceCost] = useState('');
  const [spareParts, setSpareParts] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // 👤 Logged Technician Information Dynamic Extraction
  const technicianName = 
    currentUser?.name || 
    currentUser?.username || 
    localStorage.getItem('userName') || 
    localStorage.getItem('userEmail')?.split('@')[0] || 
    'Technician';

  const technicianEmail = 
    currentUser?.email || 
    localStorage.getItem('userEmail') || 
    '';

  const loadTasks = async () => {
    try {
      const list = await getAssets();
      const myName = technicianName.toLowerCase().trim();
      const myEmail = technicianEmail.toLowerCase().trim();

      const myTasksOnly = (Array.isArray(list) ? list : []).filter(item => {
        const assigned = String(
          item.assignedTechnician ||
          item.technician ||
          item.assignedTo ||
          ''
        ).toLowerCase().trim();

        if (!assigned) return false;

        return assigned === myName || assigned === myEmail;
      });

      setTasks(myTasksOnly);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    const timer = setInterval(loadTasks, 10000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [technicianName, technicianEmail]);


  // Status Change Logic
  const handleStatusSelect = async (task, newStatus) => {
    if (newStatus === 'Completed' || newStatus === 'Completed / Fixed') {
      setSelectedTask(task);
    } else {
      try {
        await updateAsset(task.id, { status: newStatus });
        await loadTasks();
      } catch (err) {
        alert("Error updating status: " + err.message);
      }
    }
  };

  // Upload PDF Report
  const handlePdfUploadAndComplete = (e) => {
    e.preventDefault();
    if (!pdfFile) {
      alert("Please select a PDF Service Report file!");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(pdfFile);
    reader.onload = async () => {
      const base64Pdf = reader.result;
      try {
        await updateAsset(selectedTask.id, {
          status: 'Completed',
          serviceReportPdf: base64Pdf,
          serviceCost: serviceCost ? `$${serviceCost}` : 'N/A',
          spareParts: spareParts || selectedTask.spareParts || '',
          downtimeEnd: new Date().toISOString().slice(0, 19).replace('T', ' '),
          completedAt: new Date().toISOString().split('T')[0]
        });
        await loadTasks();

        alert("✅ Task completed & PDF uploaded successfully!");
        setSelectedTask(null);
        setPdfFile(null);
        setServiceCost('');
        setSpareParts('');
      } catch (err) {
        alert("Failed to submit report: " + err.message);
      } finally {
        setIsUploading(false);
      }
    };
  };

  const bgMain = isDarkMode ? 'bg-[#0f172a] text-white' : 'bg-slate-100 text-slate-900';
  const cardBg = isDarkMode ? 'bg-[#1e293b] border-slate-700/60' : 'bg-white border-slate-200 shadow-md';
  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className={`min-h-screen ${bgMain} flex flex-col font-sans transition-colors duration-200`}>
      
      {/* 🔝 HEADER */}
      <header className="border-b border-slate-800 bg-[#0f172a]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-2xl">
            🛠️
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wide">AssetCore Pro</h1>
            <p className={`text-base font-medium ${textMuted}`}>Technician Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer"
          >
            {isDarkMode ? '🌙 Dark' : '☀️ Light'}
          </button>

          {/* 👤 Technician Name Display Section */}
          <div className="text-right hidden sm:block">
            <p className="text-lg font-bold text-blue-400 capitalize">{technicianName}</p>
            {technicianEmail && <p className={`text-sm ${textMuted}`}>{technicianEmail}</p>}
          </div>

          <button 
            onClick={onLogout} 
            className="bg-red-600 hover:bg-red-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* 🔹 MAIN DASHBOARD */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        <div className={`${cardBg} border rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
          <div>
            <h2 className="text-3xl font-black flex items-center gap-3">
              🛠️ Technician Service Dashboard
            </h2>
            <p className={`text-base ${textMuted} mt-1`}>
              Manage assigned maintenance tasks for <span className="text-blue-400 font-bold capitalize">{technicianName}</span>
            </p>
          </div>

          <span className="bg-slate-900 border border-slate-700 text-slate-300 text-sm px-4 py-2 rounded-xl font-bold">
            Total Assigned: <strong className="text-blue-400 text-lg ml-1">{tasks.length}</strong>
          </span>
        </div>

        {loading ? (
          <div className={`${cardBg} border rounded-2xl p-12 text-center text-slate-400 font-bold text-xl`}>
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className={`${cardBg} border border-dashed rounded-2xl p-16 text-center space-y-4`}>
            <div className="text-6xl">📋</div>
            <h3 className="text-2xl font-bold">No tasks assigned to <span className="capitalize text-blue-400">{technicianName}</span>!</h3>
            <p className={`text-sm ${textMuted} max-w-lg mx-auto`}>
              Admin විසින් <strong>"{technicianName}"</strong> ලෙස Assign කරන ලද Assets පමණක් මෙහි පෙන්වයි.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => (
              <div key={task.id} className={`${cardBg} border rounded-2xl p-6 flex flex-col justify-between space-y-5`}>
                <div className="space-y-4">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
                      {task.category || 'machine'}
                    </span>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                      task.status === 'Completed' || task.status === 'Completed / Fixed'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>
                      {task.status || 'In Progress'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold">{task.name || task.assetName}</h3>
                    <p className={`text-sm ${textMuted} mt-1`}>
                      Serial No: <span className="font-mono text-slate-200 font-semibold">{task.serialNumber || task.serial || 'N/A'}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700/50 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Update Task Status
                  </label>
                  <select
                    value={task.status || 'In Progress'}
                    onChange={(e) => handleStatusSelect(task, e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700 text-white font-semibold text-sm rounded-xl p-3 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Completed">Completed / Fixed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* 📄 PDF UPLOAD MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              📄 Complete Task: {selectedTask.name}
            </h3>
            <form onSubmit={handlePdfUploadAndComplete} className="space-y-4 text-sm">
              <div>
                <label className="text-slate-300 font-bold block mb-2 text-sm">Upload PDF Service Report *</label>
                <input 
                  type="file" 
                  accept="application/pdf"
                  required
                  onChange={(e) => setPdfFile(e.target.files[0])}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white cursor-pointer"
                />
              </div>
              <div>
                <label className="text-slate-300 font-bold block mb-2 text-sm">Spare Parts Used (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Bearing 6205 x2, Belt A-45"
                  value={spareParts}
                  onChange={(e) => setSpareParts(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                />
              </div>
              <div>
                <label className="text-slate-300 font-bold block mb-2 text-sm">Service Cost ($) Optional</label>
                <input 
                  type="number" 
                  placeholder="e.g. 150"
                  value={serviceCost}
                  onChange={(e) => setServiceCost(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                />
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setSelectedTask(null)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-sm cursor-pointer">Cancel</button>
                <button type="submit" disabled={isUploading} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm cursor-pointer">
                  {isUploading ? 'Uploading...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}