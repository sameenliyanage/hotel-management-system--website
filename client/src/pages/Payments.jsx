import { useEffect, useState } from 'react';
import api from '../services/api';

function Payments() {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPaymentKey, setEditingPaymentKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    invoice_id: '',
    payment_date: today,
    amount_paid: 0,
    payment_method: '',
    staff_id: '',
  });

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        const [paymentsResponse, invoicesResponse, staffResponse] = await Promise.all([
          api.get('/payments'),
          api.get('/invoices'),
          api.get('/staff'),
        ]);
        if (!cancelled) {
          setPayments(paymentsResponse.data?.data ?? []);
          setInvoices(invoicesResponse.data?.data ?? []);
          setStaff(staffResponse.data?.data ?? []);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError('Unable to load payments.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...form,
        invoice_id: Number(form.invoice_id),
        amount_paid: Number(form.amount_paid),
        staff_id: form.staff_id === '' ? null : Number(form.staff_id),
      };

      if (editingPaymentKey) {
        const [invoiceId, paymentId] = editingPaymentKey.split(':');
        await api.patch(`/payments/${encodeURIComponent(invoiceId)}/${encodeURIComponent(paymentId)}`, payload);
      } else {
        await api.post('/payments', payload);
      }

      const response = await api.get('/payments');
      setPayments(response.data?.data ?? []);
      setSuccess(editingPaymentKey ? 'Payment updated successfully.' : 'Payment recorded successfully.');
      setEditingPaymentKey('');
      setForm({
        invoice_id: '',
        payment_date: today,
        amount_paid: 0,
        payment_method: '',
        staff_id: '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create payment.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (payment) => {
    setEditingPaymentKey(`${payment.invoice_id}:${payment.payment_id}`);
    setForm({
      invoice_id: String(payment.invoice_id ?? ''),
      payment_date: payment.payment_date ?? today,
      amount_paid: payment.amount_paid ?? 0,
      payment_method: payment.payment_method ?? '',
      staff_id: payment.staff_id == null ? '' : String(payment.staff_id),
    });
    setError('');
    setSuccess('');
  };

  const cancelEdit = () => {
    setEditingPaymentKey('');
    setForm({
      invoice_id: '',
      payment_date: today,
      amount_paid: 0,
      payment_method: '',
      staff_id: '',
    });
    setError('');
    setSuccess('');
  };

  const deletePayment = async (payment) => {
    const confirmed = window.confirm(`Delete payment ${payment.payment_id} for invoice #${payment.invoice_id}?`);
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.delete(`/payments/${encodeURIComponent(payment.invoice_id)}/${encodeURIComponent(payment.payment_id)}`);
      const response = await api.get('/payments');
      setPayments(response.data?.data ?? []);
      if (editingPaymentKey === `${payment.invoice_id}:${payment.payment_id}`) {
        cancelEdit();
      }
      setSuccess('Payment deleted successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8 min-h-screen text-slate-100 bg-cover bg-center bg-fixed bg-no-repeat"
      style={{
        backgroundImage: `url('/dashboard_bg.png')`
      }}>
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Billing</p>
        <h2 className="mt-2 text-3xl font-semibold">Payments</h2>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-cyan-950/20">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium">{editingPaymentKey ? 'Edit Payment' : 'Record Payment'}</h3>
            {editingPaymentKey ? <p className="mt-1 text-xs uppercase tracking-[0.25em] text-cyan-300">Editing mode</p> : null}
          </div>
          <div className="flex gap-3">
            {editingPaymentKey ? (
              <button type="button" onClick={cancelEdit} className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5">
                Cancel edit
              </button>
            ) : null}
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-cyan-400/15 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingPaymentKey ? 'Update payment' : 'Record payment'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-2 text-sm text-slate-300">
            Invoice
            <select name="invoice_id" value={form.invoice_id} onChange={handleChange} disabled={Boolean(editingPaymentKey)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100 disabled:cursor-not-allowed disabled:opacity-70">
              <option value="">Select invoice</option>
              {invoices.map((invoice) => (
                <option key={invoice.invoice_id} value={invoice.invoice_id}>
                  #{invoice.invoice_id} - {invoice.first_name} {invoice.last_name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Payment date
            <input type="date" name="payment_date" value={form.payment_date} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" />
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Amount paid(LKR)
            <input type="number" step="0.01" min="0" name="amount_paid" value={form.amount_paid} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" />
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Payment method
            <select name="payment_method" value={form.payment_method} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100">
              <option value="">Select method</option>
              <option value="Cash">Cash</option>
              <option value="Credit/Debit Card">Credit/Debit Card</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Staff
            <select name="staff_id" value={form.staff_id} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100">
              <option value="">Unassigned</option>
              {staff.map((person) => (
                <option key={person.staff_id} value={person.staff_id}>
                  {person.first_name} {person.last_name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {success ? <p className="mt-4 text-sm text-emerald-300">{success}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      </form>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-xl shadow-cyan-950/20">
        {loading ? (
          <div className="px-6 py-12 text-sm text-slate-300">Loading payments...</div>
        ) : error ? (
          <div className="px-6 py-12 text-sm text-red-300">{error}</div>
        ) : payments.length === 0 ? (
          <div className="px-6 py-12 text-sm text-slate-300">No payments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="px-6 py-3 font-medium">Invoice</th>
                  <th className="px-6 py-3 font-medium">Payment</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Method</th>
                  <th className="px-6 py-3 font-medium">Staff</th>
                  <th className="px-6 py-3 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {payments.map((payment) => (
                  <tr key={`${payment.invoice_id}-${payment.payment_id}`} className="hover:bg-white/5">
                    <td className="px-6 py-4 font-medium text-cyan-300">#{payment.invoice_id}</td>
                    <td className="px-6 py-4 text-slate-300">{payment.payment_id}</td>
                    <td className="px-6 py-4 text-slate-300">{payment.payment_date}</td>
                    <td className="px-6 py-4 text-slate-300">{payment.amount_paid}</td>
                    <td className="px-6 py-4 text-slate-300">{payment.payment_method || '—'}</td>
                    <td className="px-6 py-4 text-slate-300">{payment.staff_name}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => startEdit(payment)} className="rounded-full border border-cyan-400/30 px-3 py-1.5 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/10">
                          Edit
                        </button>
                        <button type="button" onClick={() => deletePayment(payment)} className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-400/10" disabled={saving}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Payments;