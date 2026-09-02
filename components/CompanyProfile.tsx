
import React, { useState, useRef } from 'react';
import { Company } from '../types';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Upload, Trash2, Link as LinkIcon, CheckCircle2, AlertCircle, Info, Image as ImageIcon, Sparkles } from 'lucide-react';

interface CompanyProfileProps {
  company: Company | null;
}

const CompanyProfile: React.FC<CompanyProfileProps> = ({ company }) => {
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>(company?.logoUrl || '');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: company?.name || '',
    socialReason: company?.socialReason || '',
    cnpj: company?.cnpj || '',
    address: company?.address || '',
    neighborhood: company?.neighborhood || '',
    city: company?.city || '',
    state: company?.state || '',
    zip: company?.zip || '',
    phone: company?.phone || '',
    adminEmail: company?.adminEmail || '',
    authorizedIP: company?.authorizedIP || ''
  });

  // Função para processar e otimizar imagem com Canvas no cliente
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de tipo de arquivo
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setUploadStatus({
        type: 'error',
        message: 'Formato inválido! Envie uma imagem em PNG, JPG, WEBP ou SVG.'
      });
      return;
    }

    // Validação de tamanho (máximo 5MB antes de comprimir)
    if (file.size > 5 * 1024 * 1024) {
      setUploadStatus({
        type: 'error',
        message: 'O arquivo é muito grande! O limite máximo para upload é de 5 MB.'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Redimensionar proporcionalmente para caber em 512x512 max
        const maxDimension = 512;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Salva em PNG com transparência preservada ou JPEG
          const isTransparent = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/svg+xml';
          const optimizedBase64 = canvas.toDataURL(isTransparent ? 'image/png' : 'image/jpeg', 0.92);

          setLogoUrl(optimizedBase64);
          setUploadStatus({
            type: 'success',
            message: `Logomarca carregada e otimizada com sucesso! (${width} × ${height} px). Lembre-se de clicar em "Salvar Alterações".`
          });
        }
      };
      img.onerror = () => {
        setUploadStatus({
          type: 'error',
          message: 'Falha ao processar a imagem. Tente outro arquivo.'
        });
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (!customUrlInput.trim()) return;
    setLogoUrl(customUrlInput.trim());
    setShowUrlInput(false);
    setCustomUrlInput('');
    setUploadStatus({
      type: 'success',
      message: 'Link da logomarca aplicado com sucesso! Clique em "Salvar Alterações" para gravar.'
    });
  };

  const handleRemoveLogo = () => {
    if (confirm('Deseja remover a logomarca da empresa e utilizar o ícone padrão do sistema?')) {
      setLogoUrl('');
      setUploadStatus({
        type: 'info',
        message: 'Logomarca removida. A logo padrão com as iniciais da empresa será utilizada.'
      });
    }
  };

  const handleSave = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "companies", company.id), {
        ...formData,
        logoUrl: logoUrl || ''
      });
      setUploadStatus({
        type: 'success',
        message: 'Dados e logomarca da empresa atualizados com sucesso no sistema!'
      });
      alert("DADOS E LOGOMARCA DA EMPRESA ATUALIZADOS COM SUCESSO!");
    } catch (e) {
      console.error(e);
      setUploadStatus({
        type: 'error',
        message: 'Erro ao salvar alterações no banco de dados.'
      });
      alert("ERRO AO ATUALIZAR DADOS.");
    }
    setLoading(false);
  };

  const fields = [
    { label: "Nome Fantasia", value: formData.name, field: "name" },
    { label: "Razão Social", value: formData.socialReason, field: "socialReason" },
    { label: "CNPJ", value: formData.cnpj, field: "cnpj" },
    { label: "Endereço (Rua/Nº)", value: formData.address, field: "address" },
    { label: "Bairro", value: formData.neighborhood, field: "neighborhood" },
    { label: "Cidade", value: formData.city, field: "city" },
    { label: "Estado (UF)", value: formData.state, field: "state" },
    { label: "CEP", value: formData.zip, field: "zip" },
    { label: "Telefone", value: formData.phone, field: "phone" },
    { label: "IP Autorizado (WiFi Empresa)", value: formData.authorizedIP, field: "authorizedIP" },
    { label: "E-mail Administrativo", value: formData.adminEmail, field: "adminEmail" },
    { label: "Código de Acesso (Para Colaboradores)", value: company?.accessCode || 'NÃO GERADO', field: "accessCode", disabled: true }
  ];

  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'Empresa')}&background=0057ff&color=fff&size=512`;
  const currentDisplayLogo = logoUrl || defaultAvatar;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="px-6 py-6 flex flex-col items-center border-b dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
        <h1 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-widest">Dados da Empresa & Identidade Visual</h1>
        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Configurações de Logomarca, Registro e Acesso</p>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 pb-32 max-w-4xl mx-auto w-full">
        
        {/* SEÇÃO PRINCIPAL DE LOGOMARCA */}
        <div className="bg-white dark:bg-slate-900 rounded-[36px] p-6 md:p-8 border dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <ImageIcon size={20} />
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Logomarca Oficial da Empresa
                </h2>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                Aparecerá no menu lateral, nos relatórios em PDF, no painel web e no app dos colaboradores
              </p>
            </div>
            {logoUrl && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900 transition-colors"
              >
                <Trash2 size={13} />
                <span>Remover Logo</span>
              </button>
            )}
          </div>

          {/* ÁREA DE PRÉ-VISUALIZAÇÃO E UPLOAD */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Box da Logomarca com Prévia Dupla */}
            <div className="lg:col-span-5 flex flex-col items-center gap-3">
              <div className="w-full flex flex-col items-center p-6 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700">
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-3">Prévia em Fundo Claro e Escuro</p>
                
                <div className="flex gap-4 items-center justify-center">
                  {/* Fundo Claro */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-24 h-24 rounded-2xl bg-white border-2 border-slate-200 shadow-md p-2 flex items-center justify-center overflow-hidden">
                      <img 
                        src={currentDisplayLogo} 
                        alt="Logomarca Fundo Claro" 
                        className="max-w-full max-h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-[8px] font-bold text-slate-500 uppercase">Tema Claro</span>
                  </div>

                  {/* Fundo Escuro */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-24 h-24 rounded-2xl bg-slate-900 border-2 border-slate-700 shadow-md p-2 flex items-center justify-center overflow-hidden">
                      <img 
                        src={currentDisplayLogo} 
                        alt="Logomarca Fundo Escuro" 
                        className="max-w-full max-h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Tema Escuro</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${logoUrl ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
                  <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">
                    {logoUrl ? 'Logomarca Personalizada Ativa' : 'Logomarca Padrão do Sistema'}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações de Upload e Especificações Técnicas */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Botões de Ação */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml" 
                  className="hidden" 
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-4 px-5 bg-[#0057ff] hover:bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Upload size={16} />
                  <span>Escolher Arquivo de Logo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="py-4 px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-wider border dark:border-slate-700 flex items-center justify-center gap-2 transition-all"
                >
                  <LinkIcon size={16} />
                  <span>Inserir Link (URL)</span>
                </button>
              </div>

              {/* Input para Colar URL da imagem */}
              {showUrlInput && (
                <div className="p-4 bg-blue-50 dark:bg-slate-800 rounded-2xl border border-blue-200 dark:border-slate-700 space-y-2 animate-in fade-in">
                  <label className="text-[8px] font-black uppercase text-blue-700 dark:text-blue-400">
                    Cole o link direto da imagem (URL https://...):
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="url" 
                      placeholder="https://suaempresa.com.br/logo.png" 
                      value={customUrlInput}
                      onChange={e => setCustomUrlInput(e.target.value)}
                      className="flex-1 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-blue-500 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleApplyUrl}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase rounded-xl transition-all"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              )}

              {/* MENSAGEM DE STATUS */}
              {uploadStatus && (
                <div className={`p-3.5 rounded-2xl flex items-start gap-2.5 text-[9px] font-bold uppercase ${
                  uploadStatus.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
                    : uploadStatus.type === 'error'
                    ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                    : 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                }`}>
                  {uploadStatus.type === 'success' && <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />}
                  {uploadStatus.type === 'error' && <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />}
                  {uploadStatus.type === 'info' && <Info size={16} className="shrink-0 text-blue-600 mt-0.5" />}
                  <span className="leading-relaxed">{uploadStatus.message}</span>
                </div>
              )}

              {/* CARD DE ESPECIFICAÇÕES E TAMANHO RECOMENDADO */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 text-[10px] font-black uppercase">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Especificações e Dimensões Recomendadas</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-[9px]">
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-slate-400 font-bold uppercase text-[8px]">Tamanho Ideal</p>
                    <p className="font-black text-slate-800 dark:text-white mt-0.5">512 × 512 pixels</p>
                    <p className="text-[7px] text-slate-400">Mínimo: 200 × 200 px</p>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-slate-400 font-bold uppercase text-[8px]">Proporção</p>
                    <p className="font-black text-slate-800 dark:text-white mt-0.5">1:1 (Quadrada)</p>
                    <p className="text-[7px] text-slate-400">Ou horizontal até 3:1</p>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-slate-400 font-bold uppercase text-[8px]">Formato de Arquivo</p>
                    <p className="font-black text-slate-800 dark:text-white mt-0.5">PNG com fundo transparente</p>
                    <p className="text-[7px] text-slate-400">Aceita também JPG, WEBP, SVG</p>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-slate-400 font-bold uppercase text-[8px]">Tamanho Máximo</p>
                    <p className="font-black text-slate-800 dark:text-white mt-0.5">Até 2 MB</p>
                    <p className="text-[7px] text-emerald-600 font-bold">Otimizado automaticamente</p>
                  </div>
                </div>

                <p className="text-[8px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed pt-1">
                  💡 <strong>Dica do Sistema:</strong> O aplicativo otimiza e redimensiona a imagem automaticamente no navegador para garantir um carregamento ultrarrápido em celulares e na geração dos relatórios de espelho de ponto em PDF.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* DADOS CADASTRAIS DA EMPRESA */}
        <div className="bg-white dark:bg-slate-900 rounded-[36px] p-6 md:p-8 border dark:border-slate-800 shadow-sm space-y-5">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white pb-3 border-b dark:border-slate-800">
            Informações Cadastrais & Fiscais
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.field} className={`space-y-1.5 ${f.field === 'address' || f.field === 'socialReason' || f.field === 'authorizedIP' ? 'md:col-span-2' : ''}`}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {f.label}
                </label>
                <input 
                  type="text" 
                  value={(formData as any)[f.field] || (f as any).value} 
                  onChange={e => !f.disabled && setFormData(prev => ({ ...prev, [f.field]: e.target.value }))}
                  placeholder={f.field === 'authorizedIP' ? "Ex: 177.100.200.50" : ""}
                  readOnly={f.disabled}
                  className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-[#0057ff] transition-all shadow-sm ${f.disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
                {f.field === 'authorizedIP' && (
                  <p className="text-[8px] text-slate-400 uppercase font-bold px-1">
                    Se preenchido, o ponto só poderá ser batido quando o colaborador estiver conectado ao IP da rede Wi-Fi da empresa.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* BOTÃO SALVAR */}
        <div className="pt-2">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full py-5 bg-[#0057ff] hover:bg-blue-700 text-white rounded-[28px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'SALVANDO ALTERAÇÕES...' : 'Salvar Alterações & Logomarca'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfile;

