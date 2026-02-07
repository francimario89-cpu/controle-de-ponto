
import React from 'react';

const CompanyFeatures: React.FC = () => {
  const features = [
    {
      icon: "https://cdn-icons-png.flaticon.com/512/3132/3132040.png",
      title: "Marcação de ponto offline",
      desc: "Funcionários batem ponto de qualquer lugar, mesmo sem acesso à internet."
    },
    {
      icon: "https://cdn-icons-png.flaticon.com/512/1865/1865269.png",
      title: "Localização dos pontos",
      desc: "Veja os locais onde os colaboradores registraram o ponto."
    },
    {
      icon: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
      title: "Cercas virtuais",
      desc: "Determine onde os funcionários podem ou não bater os pontos."
    },
    {
      icon: "https://cdn-icons-png.flaticon.com/512/1042/1042339.png",
      title: "Marcação de ponto com foto",
      desc: "Solicite um registro de foto na marcação dos pontos."
    },
    {
      icon: "https://cdn-icons-png.flaticon.com/512/3063/3063822.png",
      title: "App coletivo e individual",
      desc: "Dois aplicativos para as necessidades de cada empresa."
    },
    {
      icon: "https://cdn-icons-png.flaticon.com/512/2693/2693507.png",
      title: "Administração de banco de horas",
      desc: "Acompanhe e organize o banco de horas automaticamente."
    },
    {
      icon: "https://cdn-icons-png.flaticon.com/512/3090/3090412.png",
      title: "Relatórios fiscais obrigatórios",
      desc: "Emita todos os relatórios fiscais com apenas um clique."
    },
    {
      icon: "https://cdn-icons-png.flaticon.com/512/2830/2830595.png",
      title: "Horas extras e adicionais parametrizadas",
      desc: "Tenha os cálculos automáticos de horas trabalhadas de acordo com a necessidade da sua empresa."
    }
  ];

  return (
    <div className="p-6 space-y-8 pb-24 bg-white dark:bg-slate-950 min-h-full">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-[#002d4b] dark:text-white tracking-tighter">para empresas:</h2>
        <div className="w-12 h-1 bg-primary mx-auto rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((f, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[40px] flex flex-col items-center text-center space-y-4 hover:shadow-xl transition-all group">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center p-4 group-hover:scale-110 transition-transform">
              <img src={f.icon} alt={f.title} className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all" />
            </div>
            <div className="space-y-2">
              <h3 className="text-[13px] font-black text-[#002d4b] dark:text-white uppercase leading-tight">{f.title}</h3>
              <p className="text-[10px] text-slate-400 font-bold leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 bg-[#002d4b] rounded-[40px] text-white text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">Conformidade Total</p>
        <p className="text-[11px] opacity-70">Sistema 100% adequado à Portaria 671 do MTP</p>
      </div>
    </div>
  );
};

export default CompanyFeatures;
