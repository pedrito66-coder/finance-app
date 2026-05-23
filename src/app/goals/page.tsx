"use client";

import { useEffect, useState } from "react";
import { createGoal, getGoals, addToGoal } from "../actions";

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", target: "" });
  const [addAmounts, setAddAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadGoals(); }, []);

  const loadGoals = async () => {
    try {
      const data = await getGoals();
      setGoals(data);
      data.forEach(g => {
        if (g.currentAmount >= g.targetAmount && !sessionStorage.getItem(`notified_${g.id}`)) {
          showNotification(`"${g.name}" raggiunto!`, `Hai accumulato €${g.currentAmount.toFixed(2)}`);
          sessionStorage.setItem(`notified_${g.id}`, "true");
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const showNotification = (title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  };

  const requestNotificationPermission = () => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.target) return alert("Compila nome e importo target");
    setLoading(true);
    try {
      await createGoal(form.name, parseFloat(form.target));
      setForm({ name: "", target: "" });
      setShowForm(false);
      await loadGoals();
    } catch (err: any) {
      alert("Errore: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFunds = async (goalId: string) => {
    const amount = parseFloat(addAmounts[goalId] || "0");
    if (amount <= 0) return alert("Inserisci un importo valido");
    setLoading(true);
    try {
      await addToGoal(goalId, amount);
      setAddAmounts(prev => ({ ...prev, [goalId]: "" }));
      await loadGoals();
    } catch (err: any) {
      alert("Errore: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20, fontFamily: "-apple-system, sans-serif" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 25 }}>
        <div>
          <h1 style={{ fontSize: 26, margin: 0 }}>🎯 Obiettivi di Risparmio</h1>
          <p style={{ color: "#666", margin: "4px 0 0" }}>Monitora i tuoi traguardi finanziari</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={requestNotificationPermission} style={{
            background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "8px 14px", 
            borderRadius: 8, cursor: "pointer", fontSize: 14
          }}>🔔 Notifiche</button>
          <button onClick={() => setShowForm(!showForm)} style={{
            background: "#6366f1", color: "white", border: "none", 
            padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500
          }}>{showForm ? "✕ Annulla" : "+ Nuovo Obiettivo"}</button>
        </div>
      </div>

      {/* Form Creazione */}
      {showForm && (
        <form onSubmit={handleCreateGoal} style={{
          background: "#f8fafc", padding: 18, borderRadius: 12, 
          marginBottom: 25, border: "1px solid #e2e8f0"
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 10, alignItems: "end" }}>
            <input type="text" placeholder="Nome obiettivo (es. Università)" value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})}
              style={{ padding: 10, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }} />
            <input type="number" step="0.01" placeholder="€ Target" value={form.target} 
              onChange={e => setForm({...form, target: e.target.value})}
              style={{ padding: 10, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }} />
            <button type="submit" disabled={loading} style={{
              padding: "10px 16px", background: "#22c55e", color: "white", 
              border: "none", borderRadius: 6, cursor: loading ? "not-allowed" : "pointer", fontSize: 14
            }}>{loading ? "..." : "Crea"}</button>
          </div>
        </form>
      )}

      {/* Lista Obiettivi */}
      {goals.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>🏁 Nessun obiettivo creato</p>
          <p>Clicca "+ Nuovo Obiettivo" per iniziare a tracciare i tuoi risparmi</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {goals.map(goal => {
            const percent = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            const isReached = percent >= 100;
            return (
              <div key={goal.id} style={{
                background: "white", padding: 18, borderRadius: 12, 
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: isReached ? "2px solid #22c55e" : "1px solid #e2e8f0"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
                      {goal.name}
                      {isReached && <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>✅ RAGGIUNTO</span>}
                    </h3>
                    <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 13 }}>
                      €{goal.currentAmount.toFixed(2)} di €{goal.targetAmount.toFixed(2)}
                    </p>
                  </div>
                  <span style={{ fontSize: 20, fontWeight: "bold", color: isReached ? "#16a34a" : "#475569" }}>
                    {percent.toFixed(0)}%
                  </span>
                </div>

                {/* Barra di progresso */}
                <div style={{ background: "#e2e8f0", borderRadius: 20, height: 10, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{
                    width: `${percent}%`, height: "100%", 
                    background: isReached ? "linear-gradient(90deg, #22c55e, #16a34a)" : "linear-gradient(90deg, #6366f1, #8b5cf6)",
                    transition: "width 0.5s ease", borderRadius: 20
                  }}></div>
                </div>

                {/* Aggiungi fondi */}
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" step="0.01" placeholder="€ Aggiungi" value={addAmounts[goal.id] || ""} 
                    onChange={e => setAddAmounts(prev => ({ ...prev, [goal.id]: e.target.value }))}
                    style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }} />
                  <button onClick={() => handleAddFunds(goal.id)} disabled={loading} style={{
                    padding: "8px 12px", background: "#6366f1", color: "white", 
                    border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500
                  }}>💰 Aggiungi</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}