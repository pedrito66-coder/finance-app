"use server";

import { PrismaClient } from "@prisma/client";

// Inizializza Prisma (singleton per evitare connessioni multiple)
const prisma = new PrismaClient();

// ✅ CREA una nuova transazione (accetta nome categoria, non ID)
export async function createTransaction(data: {
  date: string;
  amount: number;
  type: string;
  note?: string;
  categoryId: string;  // ← qui passeremo il NOME della categoria
}) {
  // 1. Cerca la categoria per nome
  let category = await prisma.category.findFirst({
    where: { name: data.categoryId, type: data.type }
  });

  // 2. Se non esiste, creala al volo
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: data.categoryId,
        type: data.type,
        color: "#6366f1"
      }
    });
  }

  // 3. Ora crea la transazione con l'ID vero della categoria
  return prisma.transaction.create({
    data: {
      date: new Date(data.date),
      amount: data.amount,
      type: data.type,
      note: data.note,
      category: { connect: { id: category.id } }
    }
  });
}

// ✅ LEGGI le ultime transazioni (con limite)
export async function getTransactions(limit = 20) {
  return prisma.transaction.findMany({
    orderBy: { date: "desc" },
    take: limit,
    include: { category: true }
  });
}

// ✅ LEGGI tutte le categorie
export async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

// ✅ CREA una nuova categoria (se non esiste)
export async function createCategory(name: string, type: string, color = "#6366f1") {
  try {
    return await prisma.category.create({
      data: { name, type, color }
    });
  } catch (e) {
    // Se esiste già, restituiscila
    return await prisma.category.findFirst({ where: { name } });
  }
}

// ✅ DASHBOARD: totali e trend mensile
export async function getDashboardData() {
  const transactions = await prisma.transaction.findMany({
    include: { category: true },
    orderBy: { date: "asc" }
  });

  // Totale per tipo
  const totals: Record<string, number> = {
    EXPENSE: 0, INCOME: 0, SAVING: 0, DEBT: 0, INVESTMENT: 0
  };
  transactions.forEach(t => {
    if (totals[t.type] !== undefined) totals[t.type] += t.amount;
  });

  // Trend mensile (saldo cumulativo)
  const monthly: Record<string, number> = {};
  transactions.forEach(t => {
    const key = t.date.toISOString().slice(0, 7); // "YYYY-MM"
    const value = t.type === "EXPENSE" ? -t.amount : t.amount;
    monthly[key] = (monthly[key] || 0) + value;
  });

  // Converte in array ordinato per il grafico
  const monthlyArray = Object.entries(monthly)
    .map(([month, balance]) => ({ month, balance }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return { 
    totals, 
    monthly: monthlyArray,
    netBalance: totals.INCOME - totals.EXPENSE
  };
}
// ✅ CREA un nuovo obiettivo di risparmio
export async function createGoal(name: string, targetAmount: number) {
  return prisma.savingsGoal.create({
    data: { name, targetAmount, currentAmount: 0 }
  });
}

// ✅ LEGGI tutti gli obiettivi
export async function getGoals() {
  return prisma.savingsGoal.findMany({ orderBy: { createdAt: 'desc' } });
}

// ✅ AGGIUNGI fondi a un obiettivo
export async function addToGoal(goalId: string, amount: number) {
  const goal = await prisma.savingsGoal.findUnique({ where: { id: goalId } });
  if (!goal) throw new Error("Obiettivo non trovato");
  
  const newAmount = goal.currentAmount + amount;
  return prisma.savingsGoal.update({
    where: { id: goalId },
    data: { currentAmount: newAmount }
  });
}
// ✅ LEGGI TUTTE le transazioni (per l'export)
export async function getAllTransactions() {
  return prisma.transaction.findMany({
    include: { category: true },
    orderBy: { date: "desc" }
  });
}