
import React, { useState, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy } from 'firebase/firestore';

const Requests: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState<'ajuste' | 'atestado'>('ajuste');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const startCamera = async () => {
    setIsCapturing(true);
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if (videoRef.current) videoRef.current.srcObject = s;
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      setAttachment(canvas.toDataURL('image/jpeg', 0.6));
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      setIsCapturing(false);
    }
  };

  const handleSubmit = async () => {
    if (!reason || !date) return alert("Preencha os campos.");
    setLoading(true);
    const user = JSON.parse(localStorage.getItem('fortime_user') || '{}');
    await addDoc(collection(db, "requests"), {
      companyCode: user.companyCode,
      matricula: user.matricula,
      userName: user.name,
      type,
      reason,
      date,
      attachment,
      status: 'pending',
      createdAt: new Date()
    });
    setLoading(false);
    setShowModal(false);
    setAttachment(null);
    setReason('');
  };

  return (
    <div className="p-6 space-y-6 pb-24 h-full relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase text-xs">Solicitações</h2>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Ajustes e Atestados</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Aqui viria o map das solicitações reais do Firebase */}
        <div className="p-8 border-2 border-dashed border-orange-100 rounded-[40px] text-center bg-orange-50/20">
           <p className="text-[10px] font-black text-orange-300 uppercase">Use o botão + para enviar justificativas</p>
        </div>
      </div>

      <button onClick={() => setShowModal(true)} className="fixed bottom-10 right-10 w-16 h-16 bg-orange-500 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-20">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-end p-4">
          <div className="w-full bg-white rounded-[44px] p-8 animate-in slide-in-from-bottom-full max-h-[90vh] overflow-y-auto no-scrollbar">
            <h3 className="text-center font-black text-slate-800 uppercase text-xs mb-8">Nova Justificativa</h3>
            
            <div className="space-y-5">
              <div className="flex bg-orange-50 p-1.5 rounded-2xl">
                <button onClick={() => setType('ajuste')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${type === 'ajuste' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Esquecimento</button>
                <button onClick={() => setType('atestado')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${type === 'atestado' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Atestado</button>
              </div>

              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-5 bg-orange-50 rounded-[24px] text-xs font-bold outline-none border border-orange-100 focus:bg-white transition-all" />
              
              <textarea 
                placeholder="Descreva o motivo..." 
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full p-5 bg-orange-50 rounded-[24px] text-xs font-bold h-32 resize-none outline-none border border-orange-100 focus:bg-white transition-all" 
              />

              {type === 'atestado' && (
                <div className="space-y-3">
                   {!attachment && !isCapturing && (
                     <button onClick={startCamera} className="w-full py-6 border-2 border-dashed border-orange-200 rounded-[24px] text-[10px] font-black text-orange-500 uppercase flex flex-col items-center gap-2">
                       📸 Tirar Foto do Atestado
                     </button>
                   )}
                   {isCapturing && (
                     <div className="relative rounded-[24px] overflow-hidden bg-black aspect-video">
                       <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                       <button onClick={takePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white w-12 h-12 rounded-full border-4 border-orange-500"></button>
                     </div>
                   )}
                   {attachment && (
                     <div className="relative">
                       <img src={attachment} className="w-full rounded-[24px] border border-orange-100" />
                       <button onClick={() => setAttachment(null)} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full">✕</button>
                     </div>
                   )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowModal(false)} className="flex-1 py-5 text-slate-400 font-black text-[10px] uppercase">Cancelar</button>
                <button 
                  onClick={handleSubmit} 
                  disabled={loading}
                  className="flex-2 bg-orange-500 text-white py-5 rounded-[24px] font-black text-[10px] uppercase shadow-xl shadow-orange-100 active:scale-95 transition-all"
                >
                  {loading ? 'Enviando...' : 'Confirmar Envio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
