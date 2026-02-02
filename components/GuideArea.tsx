
import React from 'react';
import { NotebookSummary } from '../types';

interface GuideAreaProps {
  summary: NotebookSummary | null;
  isLoading: boolean;
  onAsk: (text: string) => void;
}

const GuideArea: React.FC<GuideAreaProps> = ({ summary, isLoading, onAsk }) => {
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Analisando suas fontes...</h2>
        <p className="text-slate-500">Estamos extraindo os pontos principais para você.</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Comece adicionando fontes</h2>
        <p className="text-slate-500 max-w-sm">Carregue documentos ou cole textos para ver o resumo completo e as perguntas sugeridas aqui.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-10 bg-[#FBFCFE]">
      <div className="max-w-4xl mx-auto space-y-12">
        <section>
          <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4">Visão Geral</h3>
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm leading-relaxed text-slate-700 text-lg">
            {summary.overview}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4">Tópicos Principais</h3>
            <ul className="space-y-3">
              {summary.topics.map((t, i) => (
                <li key={i} className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <span className="w-6 h-6 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold">{i+1}</span>
                  <span className="text-slate-700 font-medium">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4">Perguntas Sugeridas</h3>
            <div className="space-y-3">
              {summary.faqs.map((f, i) => (
                <button 
                  key={i}
                  onClick={() => onAsk(f.q)}
                  className="w-full text-left bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 p-4 rounded-xl transition-all group"
                >
                  <p className="text-sm font-bold text-indigo-900 mb-1 group-hover:underline">{f.q}</p>
                  <p className="text-xs text-indigo-600 line-clamp-1">{f.a}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default GuideArea;
