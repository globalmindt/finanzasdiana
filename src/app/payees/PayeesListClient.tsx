"use client";
import PayeeEditForm from './PayeeEditForm';
import PayeeDeleteButton from './PayeeDeleteButton';
import { useState } from 'react';

type Category = { _id: string; name: string; kind: 'income' | 'expense' };
type Payee = {
  _id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  defaultCategoryId?: string;
  defaultAmount?: number;
  defaultNotes?: string;
  isFixed?: boolean;
  frequency?: string;
  billingDate?: string;
  billingDayOfMonth?: number;
};

function formatDisplay(payee: Payee) {
  if (payee.isFixed) {
    if (payee.frequency === 'mensual' && typeof payee.billingDayOfMonth === 'number') {
      return `día ${payee.billingDayOfMonth} de cada mes`;
    }
    if (payee.billingDate) {
      try {
        const d = new Date(payee.billingDate);
        const formatted = d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
        return formatted;
      } catch {
        return payee.billingDate;
      }
    }
    return 'Fija';
  }
  return 'Variable';
}

export default function PayeesListClient({ list, categories }: { list: Payee[]; categories: Category[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <ul className="space-y-4">
      {list.map((p) => (
        <li key={p._id} className="border rounded p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-gray-600">{p.type === 'income' ? 'Ingreso' : p.type === 'expense' ? 'Gasto' : 'Ambos'}</p>
              <p className="text-xs text-gray-500">{formatDisplay(p)}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded bg-yellow-500 text-white px-3 py-1"
                onClick={() => setEditingId(editingId === p._id ? null : p._id)}
                aria-expanded={editingId === p._id}
              >
                {editingId === p._id ? 'Cerrar' : 'Editar'}
              </button>
              <PayeeDeleteButton id={p._id} />
            </div>
          </div>
          {editingId === p._id && (
            <PayeeEditForm payee={p} categories={categories} onClose={() => setEditingId(null)} />
          )}
        </li>
      ))}
    </ul>
  );
}