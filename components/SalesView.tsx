
import React, { useState, useEffect, useMemo } from 'react';
import { Sale, Employee, Company } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc } from 'firebase/firestore';
import { Filter, CheckCircle, Clock, DollarSign, Calendar, User, ShoppingBag } from 'lucide-react';

interface SalesViewProps {
  company: Company | null;
  employees: Employee[];
}

const SalesView: React.FC<SalesViewProps> = ({ company, employees }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeller, setFilterSeller] = useState('todos');
  const [filterPeriod, setFilterPeriod] = useState<'week' | 'month' | 'year' | 'today'>('month');
  const [filterTicket, setFilterTicket] = useState<'all' | 150 | 200 | 300>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSale, setNewSale] = useState({
    sellerId: '',
    sellerName: '',
    amount: 0,
    ticketValue: 200 as 150 | 200 | 300,
    customerName: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!company?.id) return;

    const q = query(
      collection(db, "sales"),
      where("companyCode", "==", company.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      const salesData: Sale[] = [];
      snap.forEach(d => {
        const data = d.data();
        salesData.push({
          ...data,
          id: d.id,
          date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        } as Sale);
      });
      setSales(salesData.sort((a, b) => b.date.getTime() - a.date.getTime()));
      setLoading(false);
    });

    return () => unsub();
  }, [company?.id]);

  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter(sale => {
      // Filter by Seller
      if (filterSeller !== 'todos' && sale.sellerId !== filterSeller) return false;

      // Filter by Ticket
      if (filterTicket !== 'all' && sale.ticketValue !== filterTicket) return false;

      // Filter by Period
      const saleDate = new Date(sale.date);
      if (filterPeriod === 'today') {
        return saleDate.toDateString() === now.toDateString();
      }
      if (filterPeriod === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return saleDate >= weekAgo;
      }
      if (filterPeriod === 'month') {
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      }
      if (filterPeriod === 'year') {
        return saleDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [sales, filterSeller, filterPeriod]);

  const stats = useMemo(() => {
    return filteredSales.reduce((acc, sale) => {
      acc.totalAmount += sale.amount;
      acc.totalCommission += sale.commissionValue;
      if (sale.commissionStatus === 'paid') {
        acc.paidCommission += sale.commissionValue;
      } else {
        acc.pendingCommission += sale.commissionValue;
      }
      acc.ticketCounts[sale.ticketValue] = (acc.ticketCounts[sale.ticketValue] || 0) + 1;
      return acc;
    }, {
      totalAmount: 0,
      totalCommission: 0,
      paidCommission: 0,
      pendingCommission: 0,
      ticketCounts: { 150: 0, 200: 0, 300: 0 } as Record<number, number>
    });
  }, [filteredSales]);

  const handleMarkAsPaid = async (saleId: string) => {
    try {
      await updateDoc(doc(db, "sales", saleId), {
        commissionStatus: 'paid'
      });
    } catch (e) {
      alert("Erro ao atualizar status de pagamento.");
    }
  };

  const handleAddSale = async () => {
    if (!newSale.sellerId || !newSale.amount) {
      alert("Por favor, preencha o vendedor e o valor da venda.");
      return;
    }

    const seller = employees.find(e => e.id === newSale.sellerId);
    if (!seller) return;

    // Lógica simples de comissão: 10%
    const commissionValue = newSale.amount * 0.1;

    try {
      await addDoc(collection(db, "sales"), {
        sellerId: newSale.sellerId,
        sellerName: seller.name,
        companyCode: company?.id,
        date: new Date(newSale.date),
        amount: Number(newSale.amount),
        ticketValue: newSale.ticketValue,
        commissionValue,
        commissionStatus: 'pending',
        customerName: newSale.customerName,
        createdAt: new Date()
      });
      setShowAddModal(false);
      setNewSale({ ...newSale, amount: 0, customerName: '' });
    } catch (e) {
      alert("Erro ao salvar venda.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 space-y-6 p-1">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Gestão de Vendas</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Controle de comissões e tickets da campanha</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-orange-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
        >
          + Registrar Nova Venda
        </button>
      </header>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-6 rounded-[40px] border dark:border-slate-800 shadow-sm">
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Filtrar por Vendedor</label>
          <div className="relative">
             <select 
              value={filterSeller} 
              onChange={e => setFilterSeller(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-3xl p-4 text-[11px] font-black uppercase appearance-none dark:text-white"
            >
              <option value="todos">Todos os Vendedores</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <User size={14} />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Período</label>
          <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-3xl">
            {(['today', 'week', 'month', 'year'] as const).map(p => (
              <button
                key={p}
                onClick={() => setFilterPeriod(p)}
                className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase transition-all ${filterPeriod === p ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Ano'}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Filtrar por Ticket (Campanha)</label>
          <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-3xl">
            {(['all', 150, 200, 300] as const).map(t => (
              <button
                key={String(t)}
                onClick={() => setFilterTicket(t)}
                className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase transition-all ${filterTicket === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {t === 'all' ? 'Tudo' : `T${t}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[40px] border dark:border-slate-800 shadow-sm text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Total de Vendas</p>
          <p className="text-xl font-black text-slate-800 dark:text-white">R$ {stats.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-950/20 p-6 rounded-[40px] border border-orange-100 dark:border-orange-900/30 shadow-sm text-center">
          <p className="text-[9px] font-black text-orange-600 uppercase mb-2">Comissão Pendente</p>
          <p className="text-xl font-black text-orange-600">R$ {stats.pendingCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-[40px] border border-emerald-100 dark:border-emerald-900/30 shadow-sm text-center">
          <p className="text-[9px] font-black text-emerald-600 uppercase mb-2">Comissão Paga</p>
          <p className="text-xl font-black text-emerald-600">R$ {stats.paidCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-slate-900 dark:bg-slate-800 p-6 rounded-[40px] shadow-xl text-center">
          <div className="flex justify-center gap-2 mb-2">
            <span className="text-[8px] bg-white/10 px-2 py-1 rounded-full text-white font-bold">150: {stats.ticketCounts[150]}</span>
            <span className="text-[8px] bg-white/10 px-2 py-1 rounded-full text-white font-bold">200: {stats.ticketCounts[200]}</span>
            <span className="text-[8px] bg-white/10 px-2 py-1 rounded-full text-white font-bold">300: {stats.ticketCounts[300]}</span>
          </div>
          <p className="text-[9px] font-black text-white/40 uppercase">Tickets da Campanha</p>
        </div>
      </div>

      {/* Tabela de Vendas */}
      <div className="bg-white dark:bg-slate-900 rounded-[40px] border dark:border-slate-800 shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-white">Listagem de Ocorrências</h3>
          <p className="text-[9px] font-bold text-slate-400 uppercase">{filteredSales.length} registros encontrados</p>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-300">
              <ShoppingBag size={48} className="mb-4 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma venda encontrada no período</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 border-b dark:border-slate-800">
                <tr className="text-[9px] font-black text-slate-400 uppercase">
                  <th className="p-6">Data</th>
                  <th className="p-6">Vendedor</th>
                  <th className="p-6">Ticket</th>
                  <th className="p-6">Valor</th>
                  <th className="p-6">Comissão</th>
                  <th className="p-6 text-center">Status</th>
                  <th className="p-6 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-bold dark:text-slate-200">
                {filteredSales.map(sale => (
                  <tr key={sale.id} className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-6">
                      <div className="flex flex-col">
                        <span>{sale.date.toLocaleDateString('pt-BR')}</span>
                        <span className="text-[8px] text-slate-400 font-black">{sale.date.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}</span>
                      </div>
                    </td>
                    <td className="p-6 uppercase">{sale.sellerName}</td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black ${
                        sale.ticketValue === 300 ? 'bg-purple-100 text-purple-600' :
                        sale.ticketValue === 200 ? 'bg-blue-100 text-blue-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        TICKET {sale.ticketValue}
                      </span>
                    </td>
                    <td className="p-6">R$ {sale.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="p-6 text-orange-600">R$ {sale.commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="p-6">
                      <div className="flex justify-center">
                        {sale.commissionStatus === 'paid' ? (
                          <span className="flex items-center gap-1 bg-emerald-100 text-emerald-600 px-3 py-1.5 rounded-full text-[8px] font-black uppercase">
                            <CheckCircle size={10} /> Pago
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 bg-amber-100 text-amber-600 px-3 py-1.5 rounded-full text-[8px] font-black uppercase">
                            <Clock size={10} /> Pendente
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex justify-center">
                        {sale.commissionStatus === 'pending' && (
                          <button 
                            onClick={() => handleMarkAsPaid(sale.id)}
                            className="bg-slate-900 dark:bg-slate-800 text-white px-4 py-2 rounded-xl text-[8px] font-black uppercase hover:bg-emerald-600 transition-colors active:scale-95"
                          >
                            Pagar
                          </button>
                        )}
                        {sale.commissionStatus === 'paid' && (
                           <span className="text-slate-300 dark:text-slate-700">--</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Nova Venda */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 rounded-[44px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase text-center mb-8 tracking-widest">Nova Venda</h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Vendedor</label>
                <select 
                  value={newSale.sellerId} 
                  onChange={e => setNewSale({...newSale, sellerId: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-3xl p-4 text-[11px] font-black uppercase outline-none dark:text-white"
                >
                  <option value="">Selecione o Vendedor</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Valor da Venda (R$)</label>
                <input 
                  type="number" 
                  value={newSale.amount || ''} 
                  onChange={e => setNewSale({...newSale, amount: Number(e.target.value)})}
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-3xl p-4 text-[11px] font-black outline-none dark:text-white"
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Ticket da Campanha</label>
                <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-3xl">
                  {([150, 200, 300] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setNewSale({...newSale, ticketValue: v})}
                      className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${newSale.ticketValue === v ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400'}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Cliente (Opcional)</label>
                <input 
                  type="text" 
                  value={newSale.customerName} 
                  onChange={e => setNewSale({...newSale, customerName: e.target.value.toUpperCase()})}
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-3xl p-4 text-[11px] font-black outline-none dark:text-white"
                  placeholder="NOME DO CLIENTE"
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-5 border-2 border-slate-100 dark:border-slate-800 rounded-[28px] text-[10px] font-black uppercase text-slate-400"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAddSale}
                  className="flex-[2] py-5 bg-orange-600 text-white rounded-[28px] text-[10px] font-black uppercase shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
                >
                  Salvar Venda
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesView;
