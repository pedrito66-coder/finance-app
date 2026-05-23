"use client";

import { useEffect, useState } from "react";
import {
  getDashboardData,
  getTransactions,
  getCategories,
  createTransaction,
  createCategory,
  getAllTransactions
} from "./actions";
import { LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showCashForm, setShowCashForm] = useState(false);
  const [cashBalance, setCashBalance] = useState<number>(0);
  
  // Modificato qui per includere "TIPS" (Mance)
  const [form, setForm] = useState({
    amount: "", type: "EXPENSE", category: "", note: "", 
    date: new Date().toISOString().split("T")[0]
  });
  const [cashForm, setCashForm] = useState({ amount: "", type: "ADD" as "ADD" | "WITHDRAW" | "TIPS" });
  
  const [loading, setLoading] = useState(false);

  useEffect(() => { 
    loadData();
    const savedCash = localStorage.getItem("cash_balance");
    if (savedCash) setCashBalance(parseFloat(savedCash));
  }, []);

  const loadData = async () => {
    try {
      const [dash, trans, cats] = await Promise.all([
        getDashboardData(), 
        getTransactions(10), 
        getCategories()
      ]);
      setDashboard(dash);
      setRecent(trans);
      setCategories(cats);
    } catch (err) {
      console.error("Errore caricamento:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.category) return alert("Compila importo e categoria");
    
    setLoading(true);
    try {
      let cat = categories.find((c: any) => c.name.toLowerCase() === form.category.toLowerCase());
      if (!cat) {
        cat = await createCategory(form.category, form.type);
        await loadData();
      }
      
      await createTransaction({
        date: form.date, 
        amount: parseFloat(form.amount), 
        type: form.type,
        note: form.note, 
        categoryId: cat.name
      });
      
      setForm({ ...form, amount: "", note: "" });
      setShowForm(false);
      await loadData();
      alert("Transazione salvata!");
    } catch (err: any) {
      alert("Errore: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCashUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashForm.amount) return alert("Inserisci importo");
    
    const amount = parseFloat(cashForm.amount);
    let newBalance = cashBalance;
    
    // Logica aggiornata: Mance aggiunge soldi come il prelievo
    if (cashForm.type === "ADD" || cashForm.type === "TIPS") {
      newBalance += amount;
    } else {
      if (amount > cashBalance) return alert("Fondi insufficienti!");
      newBalance -= amount;
    }
    
    setCashBalance(newBalance);
    localStorage.setItem("cash_balance", newBalance.toString());
    setCashForm({ amount: "", type: "ADD" });
    setShowCashForm(false);
    alert("Contanti aggiornati: EUR " + newBalance.toFixed(2));
  };

  if (!dashboard) return <div style={{padding: 40, textAlign: 'center' as 'center', fontSize: 18}}>Caricamento dati...</div>;

  const expenseData = categories.map((c: any, i: number) => ({
    name: c.name,
    value: recent.filter(t => t.category?.name === c.name).reduce((sum: number, t: any) => sum + t.amount, 0),
    color: ['#ef4444', '#22c55e', '#6366f1', '#f59e0b', '#8b5cf6', '#ec4899'][i % 6]
  })).filter((d: any) => d.value > 0);

  return (
    <div style={{maxWidth: 1100, margin: '0 auto', padding: 20, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'}}>
      
      {/* Header */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, flexWrap: 'wrap', gap: 10}}>
        <div>
          <h1 style={{fontSize: 28, margin: 0}}>FinanceApp</h1>
          <p style={{color: '#666', margin: '4px 0 0'}}>Gestisci le tue finanze personali</p>
        </div>
        <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
          
          <button onClick={() => setShowCashForm(!showCashForm)} style={{
            background: cashBalance > 0 ? "#fef3c7" : "#f1f5f9", 
            border: "2px solid #f59e0b", 
            padding: "10px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600,
            color: cashBalance > 0 ? "#92400e" : "#475569"
          }}>
            Contanti: EUR {cashBalance.toFixed(2)}
          </button>
          
          <button onClick={async () => {
            try {
              const data = await getAllTransactions();
              if (data.length === 0) return alert("Nessun dato da esportare");
              
              let csvContent = "data:text/csv;charset=utf-8,";
              csvContent += "Data,Importo,Tipo,Categoria,Note\n";
              
              data.forEach((row: any) => {
                const date = new Date(row.date).toLocaleDateString('it-IT');
                const amount = row.amount.toFixed(2).replace('.', ',');
                const type = row.type === "EXPENSE" ? "Uscita" : (row.type === "INCOME" ? "Entrata" : row.type);
                const cat = row.category?.name || "-";
                const note = row.note || "";
                
                csvContent += date + "," + amount + "," + type + "," + cat + "," + note + "\n";
              });
              
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", "finanze_backup.csv");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            } catch (err) {
              alert("Errore durante l'export");
            }
          }} style={{
            background: "#1e293b", color: "white", border: "none", 
            padding: "10px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 5
          }}>
            Scarica Excel
          </button>

          <a href="/goals" style={{
            background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "10px 18px", 
            borderRadius: 8, textDecoration: "none", color: "#334155", fontSize: 15, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 6
          }}>Obiettivi</a>
          
          <button 
            onClick={() => setShowForm(!showForm)}
            style={{
              background: '#6366f1', color: 'white', border: 'none', 
              padding: '10px 18px', borderRadius: 8, cursor: 'pointer',
              fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            {showForm ? 'Chiudi' : '+ Nuova Transazione'}
          </button>
        </div>
      </div>

      {/* FORM CONTANTI - AGGIORNATO CON MANCIO */}
      {showCashForm && (
        <form onSubmit={handleCashUpdate} style={{
          background: "#fffbeb", padding: 20, borderRadius: 12, 
          marginBottom: 25, border: "2px solid #fbbf24"
        }}>
          <h3 style={{margin: '0 0 15px', fontSize: 18, color: "#92400e"}}>Gestione Contanti</h3>
          <p style={{margin: '0 0 15px', color: "#78350f", fontSize: 14}}>
            Saldo attuale: <strong>EUR {cashBalance.toFixed(2)}</strong>
          </p>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginBottom: 15}}>
            
            {/* TENDINA AGGIORNATA */}
            <select value={cashForm.type} onChange={(e) => setCashForm({...cashForm, type: e.target.value as any})}
              style={{padding: 10, borderRadius: 6, border: '1px solid #fbbf24', fontSize: 14, background: 'white'}}>
              <option value="ADD">Prelievo da banca (aggiungi)</option>
              <option value="TIPS">Mance (aggiungi)</option>
              <option value="WITHDRAW">Spesa in contanti (rimuovi)</option>
            </select>
            
            <input type="number" step="0.01" placeholder="Importo" value={cashForm.amount} 
              onChange={(e) => setCashForm({...cashForm, amount: e.target.value})}
              style={{padding: 10, borderRadius: 6, border: '1px solid #fbbf24', fontSize: 14}} />
            <button type="submit" style={{
              padding: "10px 16px", background: "#f59e0b", color: "white", 
              border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600
            }}>Aggiorna</button>
          </div>
        </form>
      )}

      {/* Form Transazioni */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background: '#f8fafc', padding: 20, borderRadius: 12, 
          marginBottom: 25, border: '1px solid #e2e8f0'
        }}>
          <h3 style={{margin: '0 0 15px', fontSize: 18}}>Aggiungi Transazione</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 15}}>
            <input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} 
              style={{padding: 10, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14}} />
            <input type="number" step="0.01" placeholder="Importo" value={form.amount} 
              onChange={(e) => setForm({...form, amount: e.target.value})}
              style={{padding: 10, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14}} />
            <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})}
              style={{padding: 10, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, background: 'white'}}>
              <option value="EXPENSE">Uscita</option>
              <option value="INCOME">Entrata</option>
              <option value="SAVING">Risparmio</option>
              <option value="DEBT">Debito</option>
            </select>
            <input type="text" placeholder="Categoria" value={form.category} 
              onChange={(e) => setForm({...form, category: e.target.value})}
              style={{padding: 10, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14}} />
          </div>
          <input type="text" placeholder="Note (opzionale)" value={form.note} 
            onChange={(e) => setForm({...form, note: e.target.value})}
            style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1', marginBottom: 15, fontSize: 14, boxSizing: 'border-box'}} />
          <button type="submit" disabled={loading} 
            style={{width: '100%', padding: 12, background: '#22c55e', color: 'white', 
              border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', 
              fontSize: 15, fontWeight: 500, opacity: loading ? 0.7 : 1}}>
            {loading ? 'Salvataggio in corso...' : 'Salva Transazione'}
          </button>
        </form>
      )}

      {/* Card Totali */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 15, marginBottom: 30}}>
        <div style={{background: 'linear-gradient(135deg, #fef2f2, white)', padding: 18, borderRadius: 12, borderLeft: '4px solid #ef4444'}}>
          <p style={{color: '#666', margin: '0 0 5px', fontSize: 14}}>Spese</p>
          <p style={{fontSize: 26, fontWeight: 'bold', color: '#dc2626', margin: 0}}>EUR {dashboard.totals.EXPENSE.toFixed(2)}</p>
        </div>
        <div style={{background: 'linear-gradient(135deg, #f0fdf4, white)', padding: 18, borderRadius: 12, borderLeft: '4px solid #22c55e'}}>
          <p style={{color: '#666', margin: '0 0 5px', fontSize: 14}}>Entrate</p>
          <p style={{fontSize: 26, fontWeight: 'bold', color: '#16a34a', margin: 0}}>EUR {dashboard.totals.INCOME.toFixed(2)}</p>
        </div>
        <div style={{background: 'linear-gradient(135deg, #fefce8, white)', padding: 18, borderRadius: 12, borderLeft: '4px solid #f59e0b'}}>
          <p style={{color: '#666', margin: '0 0 5px', fontSize: 14}}>Contanti</p>
          <p style={{fontSize: 26, fontWeight: 'bold', color: '#d97706', margin: 0}}>EUR {cashBalance.toFixed(2)}</p>
        </div>
        <div style={{background: 'linear-gradient(135deg, #f0f9ff, white)', padding: 18, borderRadius: 12, borderLeft: '4px solid #6366f1'}}>
          <p style={{color: '#666', margin: '0 0 5px', fontSize: 14}}>Saldo</p>
          <p style={{fontSize: 26, fontWeight: 'bold', color: dashboard.netBalance >= 0 ? '#16a34a' : '#dc2626', margin: 0}}>
            EUR {dashboard.netBalance.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Grafici */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 30}}>
        
        <div style={{background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', overflowX: 'auto'}}>
          <h3 style={{margin: '0 0 15px', fontSize: 18}}>Andamento Mensile</h3>
          {dashboard.monthly.length > 0 ? (
            <LineChart width={600} height={260} data={dashboard.monthly}>
              <XAxis dataKey="month" tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 12}} tickFormatter={(v) => "EUR " + v} />
              <Tooltip formatter={(value: any) => "EUR " + value.toFixed(2)} />
              <Line type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={3} dot={{r: 4}} />
            </LineChart>
          ) : (
            <div style={{height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 14}}>
              Aggiungi transazioni per vedere il grafico
            </div>
          )}
        </div>

        <div style={{background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', overflowX: 'auto'}}>
          <h3 style={{margin: '0 0 15px', fontSize: 18}}>Spese per Categoria</h3>
          {expenseData.length > 0 ? (
            <PieChart width={400} height={260}>
              <Pie 
                data={expenseData} 
                cx="50%" cy="50%" 
                outerRadius={80} 
                innerRadius={40}
                dataKey="value" 
                label={({name, percent}: any) => name + " " + (percent*100).toFixed(0) + "%"}
                labelLine={false}
              >
                {expenseData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={2} />)}
              </Pie>
              <Tooltip formatter={(value: any) => "EUR " + value.toFixed(2)} />
            </PieChart>
          ) : (
            <div style={{height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 14}}>
              Nessuna spesa registrata
            </div>
          )}
        </div>
      </div>

      {/* Ultime Transazioni */}
      <div style={{background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.08)'}}>
        <h3 style={{margin: '0 0 15px', fontSize: 18}}>Ultime Transazioni</h3>
        {recent.length === 0 ? (
          <p style={{color: '#999', textAlign: 'center' as 'center', padding: '25px 0', margin: 0}}>Nessuna transazione registrata</p>
        ) : (
          <div style={{maxHeight: 300, overflowY: 'auto'}}>
            {recent.map((t: any) => (
              <div key={t.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0', borderBottom: '1px solid #f1f5f9'
              }}>
                <div>
                  <p style={{fontWeight: 600, margin: '0 0 3px', fontSize: 15}}>
                    {t.category?.name || 'Senza categoria'}
                  </p>
                  <p style={{fontSize: 13, color: '#64748b', margin: 0}}>
                    {new Date(t.date).toLocaleDateString('it-IT', {day: 'numeric', month: 'short'})} 
                    {t.note && " - " + t.note}
                  </p>
                </div>
                <span style={{
                  fontWeight: 700, fontSize: 16,
                  color: t.type === 'EXPENSE' ? '#dc2626' : '#16a34a'
                }}>
                  {t.type === 'EXPENSE' ? '-' : '+'}EUR {t.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}