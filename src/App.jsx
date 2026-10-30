import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, updateDoc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';
import { ClipboardList, LayoutDashboard, CheckCircle, AlertTriangle, Wrench, Hash, Save, HardHat, FileText, BarChart2, Download } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

// Tu configuración real de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCjX4g-qjJOn6iYgw7MoXk9Jl_Kx5cFw0A",
  authDomain: "controlcalidadfqc.firebaseapp.com",
  projectId: "controlcalidadfqc",
  storageBucket: "controlcalidadfqc.firebasestorage.app",
  messagingSenderId: "434044300796",
  appId: "1:434044300796:web:1dff4ff735d9c550785679",
  measurementId: "G-FTF5WLTT1R"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'control-calidad-fqc-main';

// Motor months options
const MONTHS_LIST = [
  "Enero-2026", "Febrero-2026", "Marzo-2026", "Abril-2026",
  "Mayo-2026", "Junio-2026", "Julio-2026", "Agosto-2026",
  "Septiembre-2026", "Octubre-2026", "Noviembre-2026", "Diciembre-2026"
];

const AUDITORS_LIST = ["Auditor 1", "Auditor 2", "Auditor 3", "Auditor 4"];

export default function App() {
  const [activeTab, setActiveTab] = useState('capture');
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error("Auth error:", e);
        if (isMounted) {
          setIsAuthenticated(true);
          setLoading(false);
        }
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (isMounted) {
        setUser(currentUser);
        if (currentUser) {
          setIsAuthenticated(true);
          setLoading(false);
        }
      }
    });

    const timer = setTimeout(() => {
      if (isMounted && loading) {
        setIsAuthenticated(true);
        setLoading(false);
      }
    }, 2000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  // Fetch real-time units data de Firestore
  useEffect(() => {
    const unitsRef = collection(db, 'artifacts', appId, 'public', 'data', 'quality_units');
    const unsubscribe = onSnapshot(unitsRef, (snapshot) => {
      const loadedUnits = [];
      snapshot.forEach((docSnap) => {
        loadedUnits.push({ id: docSnap.id, ...docSnap.data() });
      });
      setUnits(loadedUnits);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching units:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      {/* Header Industrial */}
      <header className="bg-[#1e293b] text-white shadow-lg border-b-4 border-[#ff5a00]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-3 sm:mb-0">
            <div className="bg-[#ff5a00] p-2.5 rounded-lg shadow">
              <HardHat className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wider uppercase">Control de Calidad FQC</h1>
              <p className="text-xs text-gray-400">Auditoría de Unidades</p>
            </div>
          </div>
          
          <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
            <button
              onClick={() => setActiveTab('capture')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                activeTab === 'capture' ? 'bg-[#ff5a00] text-white shadow' : 'text-gray-300 hover:text-white'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              <span>Capturador</span>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                activeTab === 'dashboard' ? 'bg-[#ff5a00] text-white shadow' : 'text-gray-300 hover:text-white'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard ({units.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5a00]"></div>
          </div>
        ) : (
          <>
            {activeTab === 'capture' && <CaptureForm units={units} />}
            {activeTab === 'dashboard' && <Dashboard units={units} />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-3 text-center text-xs border-t border-gray-800">
        Sistema de Auditoría Industrial • Operación en Tiempo Real con Nube
      </footer>
    </div>
  );
}

// COMPONENTE: Capturador de Datos con Autocompletado
function CaptureForm({ units }) {
  const [serialNumber, setSerialNumber] = useState('');
  const [motorMonth, setMotorMonth] = useState(MONTHS_LIST[9]);
  const [auditorName, setAuditorName] = useState(AUDITORS_LIST[0]);
  const [estatus, setEstatus] = useState('Liberada');
  const [residuos, setResiduos] = useState('No');
  const [aprisoClosed, setAprisoClosed] = useState('Sí');
  const [reparados, setReparados] = useState('Sí');
  const [nuevosDefectosExist, setNuevosDefectosExist] = useState('No');
  const [cantidadNuevos, setCantidadNuevos] = useState('');
  const [cantidadReparados, setCantidadReparados] = useState('');
  const [comentarios, setComentarios] = useState('');
  
  const [isExisting, setIsExisting] = useState(false);
  const [message, setMessage] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  const handleSerialBlur = () => {
    if (!serialNumber.trim()) {
      setIsExisting(false);
      return;
    }
    const found = units.find(u => u.serialNumber.toLowerCase() === serialNumber.trim().toLowerCase());
    if (found) {
      setIsExisting(true);
      setMotorMonth(found.motorMonth || MONTHS_LIST[9]);
      setAuditorName(found.auditorName || AUDITORS_LIST[0]);
      setEstatus(found.estatus || 'Liberada');
      setResiduos(found.residuos || 'No');
      setAprisoClosed(found.aprisoClosed || 'Sí');
      setReparados(found.reparados || 'Sí');
      setNuevosDefectosExist(found.nuevosDefectosExist || 'No');
      setCantidadNuevos(found.cantidadNuevos ?? '');
      setCantidadReparados(found.cantidadReparados ?? '');
      setComentarios(found.comentarios || '');
      setMessage({ type: 'success', text: `Unidad "${found.serialNumber}" encontrada. Se cargó su historial previo.` });
    } else {
      setIsExisting(false);
      setMessage({ type: 'info', text: 'Número de serie nuevo. Ingrese los datos de auditoría.' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!serialNumber.trim()) {
      setMessage({ type: 'error', text: 'El número de serie es obligatorio.' });
      return;
    }

    setLoadingAction(true);
    try {
      const existingUnit = units.find(u => u.serialNumber.toLowerCase() === serialNumber.trim().toLowerCase());
      const unitsRef = collection(db, 'artifacts', appId, 'public', 'data', 'quality_units');

      if (existingUnit) {
        const currentReworks = Number(existingUnit.reparaciones) || 0;
        const isNowInRepair = estatus !== 'Liberada';
        const wasInRepairBefore = existingUnit.estatus !== 'Liberada';
        
        let newReworks = currentReworks;
        if (isNowInRepair && !wasInRepairBefore) {
          newReworks += 1;
        } else if (isNowInRepair && wasInRepairBefore && existingUnit.estatus !== estatus) {
          newReworks += 1;
        }

        const docRef = doc(unitsRef, existingUnit.id);
        await updateDoc(docRef, {
          motorMonth,
          auditorName,
          estatus,
          reparaciones: newReworks,
          residuos,
          aprisoClosed,
          reparados,
          nuevosDefectosExist,
          cantidadNuevos: cantidadNuevos !== '' ? Number(cantidadNuevos) : 0,
          cantidadReparados: cantidadReparados !== '' ? Number(cantidadReparados) : 0,
          comentarios,
          timestamp: serverTimestamp()
        });
        setMessage({ type: 'success', text: `¡Se ha guardado exitosamente! Unidad ${serialNumber.trim()} actualizada correctamente. Retrabajos totales: ${newReworks}` });
      } else {
        const initialReworks = estatus !== 'Liberada' ? 1 : 0;
        const newDocRef = doc(unitsRef);
        await setDoc(newDocRef, {
          serialNumber: serialNumber.trim(),
          motorMonth,
          auditorName,
          estatus,
          reparaciones: initialReworks,
          residuos,
          aprisoClosed,
          reparados,
          nuevosDefectosExist,
          cantidadNuevos: cantidadNuevos !== '' ? Number(cantidadNuevos) : 0,
          cantidadReparados: cantidadReparados !== '' ? Number(cantidadReparados) : 0,
          comentarios,
          timestamp: serverTimestamp()
        });
        setMessage({ type: 'success', text: `¡Se ha guardado exitosamente! Unidad ${serialNumber.trim()} registrada con éxito.` });
      }

      setSerialNumber('');
      setComentarios('');
      setCantidadNuevos('');
      setCantidadReparados('');
      setIsExisting(false);
    } catch (err) {
      console.error("Error saving data:", err);
      setMessage({ type: 'error', text: 'Error al guardar en la base de datos.' });
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <div className="bg-[#1e293b] px-6 py-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-bold text-white flex items-center">
          <ClipboardList className="h-5 w-5 mr-2 text-[#ff5a00]" />
          Captura de Auditoría de Unidades
        </h2>
        {isExisting && (
          <span className="bg-amber-500 text-white text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider animate-pulse">
            Modo Actualización / Retorno
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {message && (
          <div className={`p-4 rounded-lg text-sm font-medium ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            message.type === 'info' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Número de Serie *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Hash className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                onBlur={handleSerialBlur}
                placeholder="Ej. SN-80123"
                className="pl-10 w-full rounded-lg border-gray-300 shadow-sm focus:border-[#ff5a00] focus:ring focus:ring-[#ff5a00] focus:ring-opacity-50 border p-2.5 uppercase font-mono text-lg font-bold"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Al salir del campo, el sistema verificará si ya fue registrada.</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Fecha del Motor (Mes)</label>
            <select
              value={motorMonth}
              onChange={(e) => setMotorMonth(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#ff5a00] focus:ring focus:ring-[#ff5a00] focus:ring-opacity-50 border p-2.5 font-medium bg-gray-50"
            >
              {MONTHS_LIST.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Auditor de FQC</label>
            <select
              value={auditorName}
              onChange={(e) => setAuditorName(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#ff5a00] focus:ring focus:ring-[#ff5a00] focus:ring-opacity-50 border p-2.5 font-medium bg-gray-50"
            >
              {AUDITORS_LIST.map(aud => <option key={aud} value={aud}>{aud}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Estatus Final / Área de Retención</label>
            <select
              value={estatus}
              onChange={(e) => setEstatus(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#ff5a00] focus:ring focus:ring-[#ff5a00] focus:ring-opacity-50 border p-2.5 font-bold text-gray-800 bg-gray-50"
            >
              <option value="Liberada">✅ Liberada (Sin defectos)</option>
              <option value="En Reparación">❌ En Reparación (General)</option>
              <option value="Pintura">🎨 Pintura</option>
              <option value="Soldadura">🔥 Soldadura</option>
              <option value="Shortage">📦 Shortage (Falta de material)</option>
              <option value="Otro">⚠️ Otro</option>
            </select>
          </div>
        </div>

        <hr className="border-gray-200 my-4" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">¿Máquina se recibe con residuos?</label>
            <select value={residuos} onChange={(e) => setResiduos(e.target.value)} className="w-full rounded-md border-gray-300 border p-2 text-sm bg-white font-semibold">
              <option value="No">No</option>
              <option value="Sí">Sí</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">¿Fueron cerrados los defectos en Apriso?</label>
            <select value={aprisoClosed} onChange={(e) => setAprisoClosed(e.target.value)} className="w-full rounded-md border-gray-300 border p-2 text-sm bg-white font-semibold">
              <option value="Sí">Sí</option>
              <option value="No">No</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">¿Fueron reparados los defectos?</label>
            <select value={reparados} onChange={(e) => setReparados(e.target.value)} className="w-full rounded-md border-gray-300 border p-2 text-sm bg-white font-semibold">
              <option value="Sí">Sí</option>
              <option value="No">No</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">¿La máquina cuenta con nuevos defectos?</label>
            <select value={nuevosDefectosExist} onChange={(e) => setNuevosDefectosExist(e.target.value)} className="w-full rounded-md border-gray-300 border p-2 text-sm bg-white font-semibold">
              <option value="No">No</option>
              <option value="Sí">Sí</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">¿Cuántos defectos nuevos tiene?</label>
            <input type="number" min="0" value={cantidadNuevos} onChange={(e) => setCantidadNuevos(e.target.value)} placeholder="0" className="w-full rounded-lg border-gray-300 border p-2.5 font-medium" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">¿Cuántos defectos reparaste?</label>
            <input type="number" min="0" value={cantidadReparados} onChange={(e) => setCantidadReparados(e.target.value)} placeholder="0" className="w-full rounded-lg border-gray-300 border p-2.5 font-medium" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Comentarios o Detalles</label>
          <textarea rows="3" value={comentarios} onChange={(e) => setComentarios(e.target.value)} placeholder="Notas adicionales..." className="w-full rounded-lg border-gray-300 border p-2.5 font-medium"></textarea>
        </div>

        <button type="submit" disabled={loadingAction} className="w-full bg-[#ff5a00] hover:bg-[#e04f00] text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer">
          <Save className="h-5 w-5" />
          <span>{loadingAction ? 'Guardando...' : 'Registrar / Actualizar Unidad'}</span>
        </button>
      </form>
    </div>
  );
}

// COMPONENTE: Dashboard y Tabla de Reportes
function Dashboard({ units }) {
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');

  const availableDates = Array.from(new Set(units.map(unit => {
    const d = unit.timestamp?.toDate ? unit.timestamp.toDate() : new Date();
    return d.toISOString().slice(0, 10);
  }))).sort().reverse();

  const filteredUnits = units.filter(unit => {
    if (selectedDateFilter === 'all') return true;
    const d = unit.timestamp?.toDate ? unit.timestamp.toDate() : new Date();
    const dateStr = d.toISOString().slice(0, 10);
    return dateStr === selectedDateFilter;
  });

  const totalAudited = filteredUnits.length;
  const released = filteredUnits.filter(u => u.estatus === 'Liberada').length;
  const inRepair = filteredUnits.filter(u => u.estatus !== 'Liberada').length;
  const totalReworks = filteredUnits.reduce((acc, curr) => acc + (Number(curr.reparaciones) || 0), 0);

  const defects = {
    pintura: filteredUnits.filter(u => u.estatus === 'Pintura').length,
    soldadura: filteredUnits.filter(u => u.estatus === 'Soldadura').length,
    shortage: filteredUnits.filter(u => u.estatus === 'Shortage').length,
    general: filteredUnits.filter(u => u.estatus === 'En Reparación').length,
    otro: filteredUnits.filter(u => u.estatus === 'Otro').length,
  };

  const exportToExcel = () => {
    if (filteredUnits.length === 0) {
      alert("No hay unidades para exportar en este filtro.");
      return;
    }

    const headers = ["Fecha y Hora", "Auditor FQC", "Numero de Serie", "Motor Mes", "Retrabajos", "Estatus / Area", "Residuos", "Apriso Cerrado", "Reparados", "Nuevos Defectos", "Cant. Nuevos", "Cant. Reparados", "Comentarios"];
    
    const rows = filteredUnits.map(unit => {
      const dateObj = unit.timestamp?.toDate ? unit.timestamp.toDate() : new Date();
      const dateStr = dateObj.toLocaleString();
      return [
        `"${dateStr}"`,
        `"${unit.auditorName || ''}"`,
        `"${unit.serialNumber || ''}"`,
        `"${unit.motorMonth || ''}"`,
        unit.reparaciones || 0,
        `"${unit.estatus || ''}"`,
        `"${unit.residuos || 'No'}"`,
        `"${unit.aprisoClosed || 'Sí'}"`,
        `"${unit.reparados || 'Sí'}"`,
        `"${unit.nuevosDefectosExist || 'No'}"`,
        unit.cantidadNuevos || 0,
        unit.cantidadReparados || 0,
        `"${(unit.comentarios || '').replace(/"/g, '""')}"`
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Calidad_FQC_${selectedDateFilter === 'all' ? 'Historico' : selectedDateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusCounts = filteredUnits.reduce((acc, unit) => {
    const key = unit.estatus || 'Desconocido';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.keys(statusCounts).map(key => ({ name: key, value: statusCounts[key] }));
  const COLORS = { 'Liberada': '#22c55e', 'En Reparación': '#ef4444', 'Pintura': '#3b82f6', 'Soldadura': '#eab308', 'Shortage': '#a855f7', 'Otro': '#64748b' };

  const auditorCounts = filteredUnits.reduce((acc, unit) => {
    const aud = unit.auditorName || 'Sin Asignar';
    acc[aud] = (acc[aud] || 0) + 1;
    return acc;
  }, {});

  const barData = Object.keys(auditorCounts).map(key => ({ name: key, unidades: auditorCounts[key] })).sort((a, b) => b.unidades - a.unidades);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-base font-bold text-gray-800">Panel General de Indicadores</h3>
          <p className="text-xs text-gray-500">Métricas consolidadas de inspección</p>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <label className="text-xs font-bold text-gray-700 whitespace-nowrap">Filtrar por Día:</label>
            <select
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="rounded-lg border-gray-300 border p-2 text-xs font-semibold bg-gray-50 focus:border-[#ff5a00] focus:ring focus:ring-[#ff5a00] focus:ring-opacity-50"
            >
              <option value="all">📅 Todos los días (Histórico)</option>
              {availableDates.map(dateStr => {
                const [year, month, day] = dateStr.split('-');
                return <option key={dateStr} value={dateStr}>{day}/{month}/{year}</option>;
              })}
            </select>
          </div>

          <button
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-lg shadow transition-all flex items-center space-x-1.5 text-xs cursor-pointer whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow border-l-4 border-blue-600 flex items-center justify-between">
          <div><p className="text-xs font-bold text-gray-500">Total Unidades</p><h4 className="text-2xl font-black text-gray-800">{totalAudited}</h4></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow border-l-4 border-green-500 flex items-center justify-between">
          <div><p className="text-xs font-bold text-gray-500">Liberadas</p><h4 className="text-2xl font-black text-green-600">{released}</h4></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow border-l-4 border-red-500 flex items-center justify-between">
          <div><p className="text-xs font-bold text-gray-500">Retenidas</p><h4 className="text-2xl font-black text-red-600">{inRepair}</h4></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow border-l-4 border-amber-500 flex items-center justify-between">
          <div><p className="text-xs font-bold text-gray-500">Retrabajos</p><h4 className="text-2xl font-black text-amber-600">{totalReworks}</h4></div>
        </div>
      </div>

      {inRepair > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
          <h4 className="text-sm font-bold text-amber-900 mb-2 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-1.5 text-amber-600" />
            Desglose de Unidades Retenidas por Área:
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            <div className="bg-white p-2 rounded shadow-sm border border-amber-100"><span className="block text-xs text-gray-500">Pintura</span><span className="text-lg font-black text-blue-600">{defects.pintura}</span></div>
            <div className="bg-white p-2 rounded shadow-sm border border-amber-100"><span className="block text-xs text-gray-500">Soldadura</span><span className="text-lg font-black text-yellow-600">{defects.soldadura}</span></div>
            <div className="bg-white p-2 rounded shadow-sm border border-amber-100"><span className="block text-xs text-gray-500">Shortage</span><span className="text-lg font-black text-purple-600">{defects.shortage}</span></div>
            <div className="bg-white p-2 rounded shadow-sm border border-amber-100"><span className="block text-xs text-gray-500">En Reparación</span><span className="text-lg font-black text-red-600">{defects.general}</span></div>
            <div className="bg-white p-2 rounded shadow-sm border border-amber-100"><span className="block text-xs text-gray-500">Otro</span><span className="text-lg font-black text-gray-600">{defects.otro}</span></div>
          </div>
        </div>
      )}

      {filteredUnits.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-xl p-5 h-80 flex flex-col items-center">
            <h3 className="text-base font-bold text-gray-800 mb-2 self-start">Distribución de Estatus</h3>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#94a3b8'} />)}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white shadow rounded-xl p-5 h-80 flex flex-col items-center">
            <h3 className="text-base font-bold text-gray-800 mb-2 self-start">Unidades por Auditor</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <RechartsTooltip />
                <Bar dataKey="unidades" fill="#ff5a00" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-200">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-800 flex items-center">
            <FileText className="h-5 w-5 text-[#ff5a00] mr-2" />
            Historial de Unidades ({filteredUnits.length})
          </h3>
          {selectedDateFilter !== 'all' && (
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full">
              Filtro: {selectedDateFilter}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-600 uppercase">Fecha / Hora</th>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-600 uppercase">Auditor FQC</th>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-600 uppercase">Nº Serie</th>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-600 uppercase">Motor (Mes)</th>
                <th className="px-4 py-3 text-center text-xs font-black text-gray-600 uppercase">Retrabajos</th>
                <th className="px-4 py-3 text-center text-xs font-black text-gray-600 uppercase">Estatus / Área</th>
                <th className="px-4 py-3 text-center text-xs font-black text-gray-600 uppercase">Residuos</th>
                <th className="px-4 py-3 text-center text-xs font-black text-gray-600 uppercase">Apriso</th>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-600 uppercase">Comentarios</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500 font-medium">
                    No hay unidades registradas para este filtro.
                  </td>
                </tr>
              ) : (
                filteredUnits.map((unit) => {
                  const dateObj = unit.timestamp?.toDate ? unit.timestamp.toDate() : new Date();
                  const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const isLiberada = unit.estatus === 'Liberada';
                  return (
                    <tr key={unit.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{dateStr}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-gray-800">{unit.auditorName}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono font-black text-gray-900">{unit.serialNumber}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{unit.motorMonth}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-center font-bold text-amber-700">{unit.reparaciones}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${isLiberada ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {unit.estatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-center">
                        <span className={`px-2 py-0.5 rounded font-bold ${unit.residuos === 'Sí' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'}`}>{unit.residuos}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-center">
                        <span className={`px-2 py-0.5 rounded font-bold ${unit.aprisoClosed === 'Sí' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{unit.aprisoClosed}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{unit.comentarios || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}