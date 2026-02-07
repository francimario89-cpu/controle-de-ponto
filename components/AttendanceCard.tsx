
import React, { useState, useRef, useEffect } from 'react';
import { PointRecord, User, Company } from '../types';

interface AttendanceCardProps {
  records: PointRecord[];
  company: Company | null;
}

const AttendanceCard: React.FC<AttendanceCardProps> = ({ records, company }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'signed' | 'cancelled'>('pending');
  const [viewState, setViewState] = useState<'list' | 'detail' | 'signature' | 'preview'>('list');
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const user: User = JSON.parse(localStorage.getItem('fortime_user') || '{}');

  // Períodos de exemplo
  const [pointCards, setPointCards] = useState([
    { id: '1', period: '01/11/2024 à 30/11/2024', status: 'pending' },
    { id: '2', period: '01/10/2024 à 31/10/2024', status: 'signed' },
  ]);

  const filteredCards = pointCards.filter(c => c.status === activeTab);

  const startDetail = (card: any) => {
    setSelectedCard(card);
    setViewState('detail');
  };

  const startSignature = () => {
    setViewState('signature');
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
      setViewState('preview');
    }
  };

  const handleFinalSign = () => {
    setPointCards(prev => prev.map(c => c.id === selectedCard.id ? { ...c, status: 'signed' } : c));
    setViewState('list');
    setSelectedCard(null);
    setSignature(null);
    setActiveTab('signed');
  };

  // Lógica de desenho (Assinatura)
  useEffect(() => {
    if (viewState === 'signature' && canvasRef.current) {
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
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        ctx.lineWidth = 3;
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
        canvas.removeEventListener('touchstart', startDraw);
        canvas.removeEventListener('touchmove', draw);
        canvas.removeEventListener('touchend', endDraw);
      };
    }
  }, [viewState]);

  // View: Detalhes do Cartão (Tabela)
  if (viewState === 'detail') {
    return (
      <div className="flex flex-col h-full bg-white animate-in slide-in-from-right">
        <header className="px-4 py-4 flex items-center border-b bg-white sticky top-0 z-10">
          <button onClick={() => setViewState('list')} className="p-2 text-[#0057ff]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="flex-1 text-center font-bold text-slate-800 text-sm mr-10">Cartão de ponto</h1>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
          <div className="p-6 flex justify-between items-center">
            <span className="text-sm font-medium text-slate-600">{selectedCard.period}</span>
            <span className="bg-orange-50 text-orange-400 px-3 py-1.5 rounded-lg text-[10px] font-bold">Aguardando assinatura</span>
          </div>

          <div className="px-4">
            <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-center border-collapse">
                <thead className="bg-[#eef2f8] text-[#475569] text-[10px] font-bold uppercase">
                  <tr>
                    <th className="p-3 border-r border-white">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300" />
                    </th>
                    <th className="p-3 border-r border-white">Dia <span className="inline-block scale-75 opacity-50">⇅</span></th>
                    <th className="p-3 border-r border-white">E1 <span className="inline-block scale-75 opacity-50">⇅</span></th>
                    <th className="p-3 border-r border-white">S1 <span className="inline-block scale-75 opacity-50">⇅</span></th>
                    <th className="p-3">E2 <span className="inline-block scale-75 opacity-50">⇅</span></th>
                  </tr>
                </thead>
                <tbody className="text-[11px] font-medium text-slate-600">
                  {[...Array(10)].map((_, i) => (
                    <tr key={i} className={i % 2 !== 0 ? 'bg-[#f8faff]' : 'bg-white'}>
                      <td className="p-3 border-r border-slate-50">
                         <input type="checkbox" className="w-4 h-4 rounded border-slate-300" />
                      </td>
                      <td className="p-3 border-r border-slate-50">{String(i+1).padStart(2, '0')}/11</td>
                      <td className="p-3 border-r border-slate-50">{i === 1 || i === 2 ? '-' : '08:00'}</td>
                      <td className="p-3 border-r border-slate-50">{i === 1 || i === 2 ? '-' : '12:00'}</td>
                      <td className="p-3">{i === 1 || i === 2 ? '-' : '13:00'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-6 fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t">
          <button 
            onClick={startSignature}
            className="w-full py-4 bg-[#0057ff] text-white rounded-xl font-bold text-sm shadow-xl active:scale-95 transition-all"
          >
            Assinar Cartão
          </button>
        </div>
      </div>
    );
  }

  // View: Tela de Assinatura (Horizontal com Barra Azul Lateral)
  if (viewState === 'signature') {
    return (
      <div className="fixed inset-0 z-50 bg-white flex animate-in slide-in-from-bottom duration-300">
        <div className="flex-1 flex flex-col p-6">
          <header className="flex justify-between items-center mb-4">
            <button onClick={handleClearSignature} className="text-[#0057ff] p-2 bg-slate-100 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
            <h2 className="text-sm font-bold text-slate-400 rotate-90 md:rotate-0">Cadastro de assinatura</h2>
            <div className="w-10"></div>
          </header>
          
          <div className="flex-1 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl relative overflow-hidden">
             <canvas ref={canvasRef} className="w-full h-full cursor-crosshair touch-none" width={600} height={800} />
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10 text-xs font-black uppercase tracking-widest -rotate-90">Assine seu nome aqui</div>
          </div>
        </div>

        <button 
          onClick={handleSaveSignature}
          className="w-16 md:w-20 bg-[#0057ff] flex items-center justify-center text-white"
        >
          <span className="-rotate-90 whitespace-nowrap font-black uppercase text-xs tracking-widest">Cadastrar Assinatura!</span>
        </button>
      </div>
    );
  }

  // View: Comprovante (Preview)
  if (viewState === 'preview') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col animate-in zoom-in duration-300">
        <header className="bg-white p-4 flex items-center border-b">
           <button onClick={() => setViewState('detail')} className="text-[#0057ff] p-2">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
           </button>
           <h2 className="flex-1 text-center font-bold text-sm mr-10">Relatório de cartão ponto</h2>
           <button className="p-2 text-slate-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 flex justify-center no-scrollbar">
           <div className="w-full max-w-sm bg-white shadow-2xl p-6 min-h-[700px] flex flex-col text-[8px] font-sans text-slate-800">
              <div className="flex items-center gap-2 mb-4">
                 <div className="text-blue-500 font-bold text-xl">✓</div>
                 <div className="font-bold text-sm">for<span className="text-blue-500">time</span></div>
              </div>
              
              <div className="space-y-1 mb-4 border-b pb-4">
                 <p><b>Empresa:</b> {company?.name || 'Minha Empresa'} - CNPJ: {company?.cnpj || '24.377.910/0001-56'}</p>
                 <p><b>Endereço:</b> Rua Raymundo Putty, 8 - Jardim Neusa Maria</p>
                 <div className="bg-slate-50 p-2 rounded mt-2 font-bold flex justify-between">
                    <span>{user.name} - Período: {selectedCard.period}</span>
                 </div>
                 <p className="mt-2"><b>PIS/PASEP:</b> 59737210958</p>
                 <p><b>Nº de Folha:</b> 0</p>
                 <p><b>Função:</b> {user.roleFunction || 'Publicitário'}</p>
                 <p><b>Admissão:</b> {user.admissionDate || '01/06/2023'}</p>
                 <p><b>Departamento:</b> Marketing</p>
              </div>

              <table className="w-full border-collapse mb-8">
                 <thead>
                    <tr className="bg-slate-100 text-center border-b border-slate-300">
                       <th className="p-1">Data</th>
                       <th className="p-1">Ent 1 - Sai 1</th>
                       <th className="p-1">Ent 2 - Sai 2</th>
                       <th className="p-1">C.PRE</th>
                    </tr>
                 </thead>
                 <tbody className="text-center">
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(d => (
                       <tr key={d} className="border-b border-slate-50">
                          <td className="p-1">{String(d).padStart(2, '0')}/11/2024</td>
                          <td className="p-1">{d === 2 || d === 3 ? '-' : '08:02 - 12:02'}</td>
                          <td className="p-1">{d === 2 || d === 3 ? '-' : '13:02 - 18:02'}</td>
                          <td className="p-1">08:00</td>
                       </tr>
                    ))}
                 </tbody>
              </table>

              <div className="mt-auto space-y-4">
                 <div className="border-t pt-4">
                    <p className="text-[10px] font-bold mb-2">Comprovante de Aceite Eletrônico</p>
                    {signature && <img src={signature} className="h-14 object-contain mx-auto" />}
                    <div className="text-center font-bold mt-1">{user.name}</div>
                    <div className="text-[7px] text-slate-400 mt-2">
                       <p><b>E-mail:</b> {user.email}</p>
                       <p><b>Data e Hora:</b> {new Date().toLocaleString()}</p>
                       <p className="truncate"><b>Protocolo:</b> 0346265e...0ac403</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="p-6 bg-white border-t flex gap-4">
           <button onClick={() => setViewState('detail')} className="flex-1 py-4 border border-slate-200 text-slate-500 rounded-xl font-bold text-sm">Cancelar</button>
           <button onClick={handleFinalSign} className="flex-[2] py-4 bg-[#0057ff] text-white rounded-xl font-bold text-sm shadow-xl">Assinar Cartão</button>
        </div>
      </div>
    );
  }

  // View: Lista Principal
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <header className="px-4 py-4 border-b dark:border-slate-800 flex flex-col items-center">
        <h1 className="font-bold text-slate-800 dark:text-white text-sm mb-4">Cartão de ponto</h1>
        
        <div className="flex bg-[#f1f3f9] dark:bg-slate-800 p-1.5 rounded-2xl w-full">
          {(['pending', 'signed', 'cancelled'] as const).map(t => (
            <button 
              key={t}
              onClick={() => setActiveTab(t)} 
              className={`flex-1 py-3 text-[10px] font-bold uppercase rounded-xl transition-all ${activeTab === t ? 'bg-white dark:bg-slate-700 text-[#0057ff] shadow-sm' : 'text-slate-400'}`}
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
            onClick={() => startDetail(card)}
            className="bg-[#f8faff] dark:bg-slate-800/50 p-6 rounded-[28px] flex items-center justify-between border border-slate-50 dark:border-slate-800 group active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md border border-slate-50">
                <span className="text-orange-400 text-2xl">⏳</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight">Cartão de Ponto</p>
                <p className="text-[13px] font-black text-slate-800 dark:text-white">{card.period}</p>
              </div>
            </div>
            <div className="text-[#0057ff]/30">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
            </div>
          </div>
        ))}

        {filteredCards.length === 0 && (
          <div className="py-20 text-center opacity-30 flex flex-col items-center">
             <span className="text-5xl mb-4">📇</span>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhum cartão nesta categoria</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceCard;
