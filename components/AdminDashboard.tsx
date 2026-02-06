
import React, { useState, useEffect } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, onSnapshot, deleteDoc } from "firebase/firestore";

interface AdminDashboardProps {
  latestRecords: PointRecord[];
  company: Company | null;
  employees: Employee[];
  onAddEmployee: (emp: any) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateIP: (ip: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, onUpdateIP }) => {
  const [tab, setTab] = useState<'colaboradores' | 'aprovacoes' | 'config'>('colaboradores');
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [geoLat, setGeoLat] = useState(company?.geofence?.lat || 0);
  const [geoLng, setGeoLng] = useState(company?.geofence?.lng || 0);
  const [geoRadius, setGeoRadius] = useState(company?.geofence?.radius || 100);

  useEffect(() => {
    if (!company?.id) return;
    const q = query(collection(db, "requests"), where("companyCode", "==", company.id));
    return onSnapshot(q, (s) => {
      const reqs: any[] = [];
      s.forEach(d => reqs.push({ id: d.id, ...d.data() }));
      setRequests(reqs);
    });
  }, [company?.id]);

  const handleApprove = async (id: string, status: 'approved' | 'rejected') => {
    await updateDoc(doc(db, "requests", id), { status });
    alert(`Solicitação ${status === 'approved' ? 'Aprovada' : 'Rejeitada'}!`);
  };

  const saveGeofence = async () => {
    if (!company?.id) return;
    await updateDoc(doc(db, "companies", company.id), {
      geofence: { enabled: true, lat: geoLat, lng: geoLng, radius: geoRadius }
    });
    alert("Cerca Virtual configurada com sucesso!");
  };

  const getMyLocation = () => {
    navigator.geolocation.getCurrentPosition(p => {
      setGeoLat(p.coords.latitude);
      setGeoLng(p.coords.longitude);
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 bg-white border-b border-slate-100 shrink-0">
        <div className="flex p-1 bg-slate-100 rounded-2xl">
          {(['colaboradores', 'aprovacoes', 'config'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${tab === t ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400'}`}>
              {t === 'aprovacoes' ? `Justificativas (${requests.filter(r => r.status === 'pending').length})` : t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar pb-20">
        {tab === 'colaboradores' && (
          <div className="space-y-4">
            <div className="bg-slate-900 rounded-[32px] p-6 text-white flex items-center justify-between">
               <div>
                  <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Status em Tempo Real</p>
                  <p className="text-2xl font-black">{employees.length} Colaboradores</p>
               </div>
               <div className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/20">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-[9px] font-black uppercase">Online</span>
               </div>
            </div>
            {employees.map(e => (
              <div key={e.id} className="bg-white p-4 rounded-[32px] border border-slate-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <img src={e.photo} className="w-12 h-12 rounded-2xl object-cover border border-slate-100" />
                  <div>
                    <p className="text-xs font-black text-slate-800">{e.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">MAT: {e.matricula}</p>
                  </div>
                </div>
                <button onClick={() => onDeleteEmployee(e.id)} className="p-3 text-red-200 hover:text-red-500 transition-colors">✕</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'aprovacoes' && (
          <div className="space-y-4">
            {requests.length === 0 ? (
               <div className="py-20 text-center opacity-30"><p className="text-4xl mb-2">📬</p><p className="text-xs font-black uppercase">Nenhuma pendência</p></div>
            ) : (
              requests.map(r => (
                <div key={r.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${r.type === 'atestado' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>{r.type}</span>
                      <h4 className="text-sm font-black text-slate-800 mt-2">{r.userName}</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{r.date}</p>
                    </div>
                    {r.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(r.id, 'rejected')} className="w-8 h-8 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">✕</button>
                        <button onClick={() => handleApprove(r.id, 'approved')} className="w-8 h-8 bg-emerald-500 text-white rounded-xl flex items-center justify-center">✓</button>
                      </div>
                    ) : (
                      <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full ${r.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{r.status}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-2xl">"{r.reason}"</p>
                  {r.attachment && (
                    <img src={r.attachment} className="w-full h-48 object-cover rounded-2xl border border-slate-100" />
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'config' && (
          <div className="space-y-4">
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">Cerca Virtual (Geofence)</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Restringir local de batida</p>
              </div>
              
              <div className="space-y-4">
                <button onClick={getMyLocation} className="w-full py-4 bg-orange-50 text-orange-600 border border-orange-100 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2">
                   📍 Capturar Coordenadas Atuais
                </button>
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Latitude</label>
                      <input type="number" value={geoLat} onChange={e => setGeoLat(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Longitude</label>
                      <input type="number" value={geoLng} onChange={e => setGeoLng(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" />
                   </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Raio de Tolerância (Metros)</label>
                  <input type="number" value={geoRadius} onChange={e => setGeoRadius(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" />
                </div>
                <button onClick={saveGeofence} className="w-full py-5 bg-orange-500 text-white rounded-[24px] font-black text-[10px] uppercase shadow-lg shadow-orange-100">Salvar Perímetro</button>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
               <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Escala de Trabalho</h3>
               <div className="grid grid-cols-2 gap-4">
                  <input type="time" className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" placeholder="Início" />
                  <input type="time" className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" placeholder="Fim" />
               </div>
               <button className="w-full py-4 border-2 border-slate-100 rounded-[24px] font-black text-[10px] text-slate-400 uppercase">Salvar Jornada Base</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
