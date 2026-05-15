'use server';

import { db } from '@/lib/db/index';
import { transactions, learners as students, suppliers, voteheads } from '@/lib/db/schema';
import { eq, sum, or, like } from 'drizzle-orm';

/**
 * Calculates a student's current balance with 100% audit accuracy.
 * Balance = (Total Debits) - (Total Credits) + (Total Reversals)
 * Note: Amounts are stored in cents.
 */
export async function getStudentBalance(studentId) {
  try {
    const results = await db
      .select({
        type: transactions.type,
        total: sum(transactions.amount),
      })
      .from(transactions)
      .where(eq(transactions.studentId, studentId))
      .groupBy(transactions.type);

    const totals = results.reduce((acc, row) => {
      acc[row.type] = Number(row.total || 0);
      return acc;
    }, { credit: 0, debit: 0, reversal: 0 });

    // Balance calculation:
    // Debits increase what is owed.
    // Credits decrease what is owed.
    // Reversals (of credits) increase what is owed again.
    const balanceCents = totals.debit - totals.credit + totals.reversal;
    
    return {
      balance: balanceCents / 100, // Return as major unit
      raw: totals,
      success: true
    };
  } catch (error) {
    console.error('Failed to calculate balance:', error);
    return { success: false, error: 'Ledger calculation failed' };
  }
}

export async function recordManualPayment(formData) {
  try {
    const { studentId, amount, method, description, reference, tenantId } = formData;
    
    const [tx] = await db.insert(transactions).values({
      id: crypto.randomUUID(),
      studentId,
      amount: Math.round(amount * 100), // convert to cents
      type: 'credit',
      method,
      reference: reference || `MANUAL-${Date.now()}`,
      description,
      tenantId
    }).returning();

    // Re-calculate balance for the receipt
    const balanceRes = await getStudentBalance(studentId);

    return {
      success: true,
      transaction: {
        id: tx.id,
        reference: tx.reference,
        amount: tx.amount / 100,
        method: tx.method,
      },
      newBalance: balanceRes.balance
    };
  } catch (error) {
    console.error('Payment Error:', error);
    return { success: false, error: error.message || 'Payment failed' };
  }
}

export async function searchStudents(query) {
  try {
    return await db.select()
      .from(students)
      .where(or(
        like(students.name, `%${query}%`),
        like(students.adm, `%${query}%`)
      ))
      .limit(10);
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

export async function searchSuppliers(query) {
  try {
    return await db.select()
      .from(suppliers)
      .where(like(suppliers.name, `%${query}%`))
      .limit(10);
  } catch (error) {
    console.error('Supplier search error:', error);
    return [];
  }
}

export async function getVoteheads() {
  try {
    return await db.select().from(voteheads);
  } catch (error) {
    console.error('Voteheads error:', error);
    return [];
  }
}

export async function getSuppliers(tenantId) {
  try {
    return await db.select()
      .from(suppliers)
      .where(eq(suppliers.tenantId, tenantId))
      .orderBy(suppliers.name);
  } catch (error) {
    console.error('Get suppliers error:', error);
    return [];
  }
}

export async function addSupplier(data) {
  try {
    const { name, contactPerson, phone, email, category, tenantId } = data;
    const [res] = await db.insert(suppliers).values({
      id: crypto.randomUUID(),
      name,
      contactPerson,
      phone,
      email,
      category,
      tenantId
    }).returning();
    return { success: true, supplier: res };
  } catch (error) {
    console.error('Add supplier error:', error);
    return { success: false, error: error.message };
  }
}

export async function recordExpenditure(formData) {
  try {
    const { supplierId, amount, voteheadId, method, description, reference, tenantId } = formData;
    
    const [tx] = await db.insert(transactions).values({
      id: crypto.randomUUID(),
      supplierId,
      voteheadId,
      amount: Math.round(amount * 100),
      type: 'expenditure',
      method,
      reference: reference || `EXP-${Date.now()}`,
      description,
      tenantId
    }).returning();

    return { 
      success: true, 
      transaction: {
        id: tx.id,
        reference: tx.reference,
        amount: tx.amount / 100
      } 
    };
  } catch (error) {
    console.error('Expenditure Error:', error);
    return { success: false, error: error.message };
  }
}
