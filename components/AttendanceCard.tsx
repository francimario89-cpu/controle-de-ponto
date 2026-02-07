
import React, { useState, useRef, useEffect } from 'react';
import { PointRecord, User, Company } from '../types';

interface AttendanceCardProps {
  records: PointRecord[];
  company: Company | null;
}

const AttendanceCard: React.FC<AttendanceCardProps> = ({ records, company }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'signed' | 'cancelled'>('pending');
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const user: User = JSON.parse(localStorage.getItem('fortime_user') || '{}');

  // Mock de cartões de ponto para demonstração do fluxo do vídeo
  const [pointCards, setPointCards] = useState([
    { id: '1', period: '01/11/2024 à 30/11/2024', status: 'pending' },
    { id: '2', period: '01/10/2024 à 31/10/2024', status: 'signed' },
  ]);

  const filteredCards = pointCards.filter(c => c.status === activeTab);

  const startSignature = (card: any) => {
    setSelectedCard(card);
    setIsSigning(true);
  };

  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSaveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      setSignature(canvas.toDataURL());
      setIsSigning(false);
      setIsPreviewing(true);
    }
  };

  const handleFinalSign = () => {
    setPointCards(prev => prev.map(c => c.id === selectedCard.id ? { ...c, status: 'signed' } : c));
    setIsPreviewing(false);
    setSelectedCard(null);
    setSignature(null);
    setActiveTab('signed');
    alert("Cartão assinado com sucesso!");
  };

  // Lógica simples de desenho para o canvas de assinatura
  useEffect(() => {
    if (isSigning && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let drawing = false;
      const startDraw = (e: any) => {
        drawing = true;
        draw(e);
      };
      const endDraw = () => {
        drawing = false;
        ctx.beginPath();
      };
      const draw = (e: any) => {
        if (!drawing) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
      };

      canvas.addEventListener('mousedown', startDraw);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', endDraw);
      canvas.addEventListener('touchstart', startDraw);
      canvas.addEventListener('touchmove', draw);
      canvas.addEventListener('touchend', endDraw);

      return () => {
        canvas.removeEventListener('mousedown', startDraw);
        canvas.removeEventListener('mousemove', draw);
        canvas.removeEventListener('mouseup', endDraw);
      };
    }
  }, [isSigning]);

  if (isSigning) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
        <header className="flex justify-between items-center mb-10">
          <button onClick={() => setIsSigning(false)} className="text-[#0057ff] font-bold">Voltar</button>
          <h2 className="font-bold text-sm">Cadastro de assinatura</h2>
          <button onClick={handleClearSignature} className="text-red-500 font-bold">🗑️</button>
        </header>
        
        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
           <div className="w-full h-64 border-2 border-slate-100 rounded-2xl bg-slate-50 relative overflow-hidden">
             <canvas 
               ref={canvasRef} 
               width={400} 
               height={300} 
               className="w-full h-full cursor-crosshair"
             />
             <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none opacity-20 text-[10px] font-black uppercase tracking-widest">Assine aqui seu nome completo</div>
           </div>
           
           <button 
             onClick={handleSaveSignature}
             className="w-full py-4 bg-[#0057ff] text-white rounded-xl font-black uppercase text-[10px] shadow-lg"
           >
             Cadastrar Assinatura
           </button>
        </div>
      </div>
    );
  }

  if (isPreviewing) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col animate-in zoom-in duration-300">
        <header className="bg-white p-4 flex items-center border-b">
           <button onClick={() => setIsPreviewing(false)} className="text-[#0057ff] p-2">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
           </button>
           <h2 className="flex-1 text-center font-bold text-sm mr-10">Visualização do Cartão</h2>
        </header>

        <div className="flex-1 overflow-y-auto p-4 flex justify-center">
           <div className="w-full max-w-sm bg-white shadow-2xl p-6 min-h-[600px] flex flex-col text-[8px] font-sans">
              <div className="text-center border-b-2 border-black pb-2 mb-4">
                 <h1 className="text-[12px] font-black uppercase">Relatório de cartão ponto</h1>
                 <p className="font-bold">{company?.name}</p>
              </div>
              
              <div className="space-y-1 mb-4">
                 <p><b>EMPRESA:</b> {company?.name} - CNPJ: {company?.cnpj || '00.000.000/0001-00'}</p>
                 <p><b>COLABORADOR:</b> {user.name} - MATRÍCULA: {user.matricula}</p>
                 <p><b>PERÍODO:</b> {selectedCard.period}</p>
              </div>

              <table className="w-full border-collapse border border-black mb-10">
                 <thead>
                    <tr className="bg-slate-100">
                       <th className="border border-black p-1">DIA</th>
                       <th className="border border-black p-1">ENT 1</th>
                       <th className="border border-black p-1">SAI 1</th>
                       <th className="border border-black p-1">ENT 2</th>
                       <th className="border border-black p-1">SAI 2</th>
                    </tr>
                 </thead>
                 <tbody>
                    {[1,2,3,4,5,6,7].map(d => (
                       <tr key={d}>
                          <td className="border border-black p-1 text-center">{d}</td>
                          <td className="border border-black p-1 text-center">08:00</td>
                          <td className="border border-black p-1 text-center">12:00</td>
                          <td className="border border-black p-1 text-center">13:12</td>
                          <td className="border border-black p-1 text-center">18:00</td>
                       </tr>
                    ))}
                 </tbody>
              </table>

              <div className="mt-auto flex flex-col items-center gap-4">
                 {signature && <img src={signature} className="h-16 object-contain" />}
                 <div className="w-full border-t border-black text-center pt-1 font-bold">{user.name}</div>
              </div>
           </div>
        </div>

        <div className="p-6 bg-white border-t flex gap-4">
           <button onClick={() => setIsPreviewing(false)} className="flex-1 py-4 border-2 border-[#0057ff] text-[#0057ff] rounded-xl font-bold text-xs">Recusar</button>
           <button onClick={handleFinalSign} className="flex-[2] py-4 bg-[#0057ff] text-white rounded-xl font-bold text-xs shadow-xl">Assinar Cartão</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <header className="px-4 py-4 border-b dark:border-slate-800 flex flex-col items-center">
        <h1 className="font-bold text-slate-800 dark:text-white text-sm mb-4">Cartão de ponto</h1>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full">
          {(['pending', 'signed', 'cancelled'] as const).map(t => (
            <button 
              key={t}
              onClick={() => setActiveTab(t)} 
              className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${activeTab === t ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400'}`}
            >
              {t === 'pending' ? 'Pendentes' : t === 'signed' ? 'Assinados' : 'Cancelados'}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar pb-24">
        {filteredCards.map((card) => (
          <div 
            key={card.id} 
            onClick={() => card.status === 'pending' && startSignature(card)}
            className="bg-[#f8faff] dark:bg-slate-800/50 p-6 rounded-2xl flex items-center justify-between border border-slate-50 dark:border-slate-800 group active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm border border-orange-100">
                <span className="text-orange-400 text-xl">{card.status === 'pending' ? '⏳' : '✅'}</span>
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-tight">Cartão de Ponto</p>
                <p className="text-[10px] font-bold text-slate-800 dark:text-white">{card.period}</p>
                {card.status === 'pending' && <span className="bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded text-[8px] font-black uppercase mt-1 inline-block">Aguardando assinatura</span>}
                {card.status === 'signed' && <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black uppercase mt-1 inline-block">Assinado digitalmente</span>}
              </div>
            </div>
            <div className="text-slate-300">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
            </div>
          </div>
        ))}

        {filteredCards.length === 0 && (
          <div className="py-20 text-center opacity-30 flex flex-col items-center">
             <span className="text-4xl mb-4">📇</span>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhum cartão nesta categoria</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceCard;
