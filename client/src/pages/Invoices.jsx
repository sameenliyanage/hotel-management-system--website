import { useEffect, useState } from 'react';
import api from '../services/api';

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const addonOptions = [
    { key: 'breakfast_buffet', label: 'Breakfast buffet', dailyAmount: 4000 },
    { key: 'lunch_buffet', label: 'Lunch buffet', dailyAmount: 5400 },
    { key: 'dinner_buffet', label: 'Dinner buffet', dailyAmount: 6000 },
    { key: 'pool', label: 'Pool access', dailyAmount: 1500 },
    { key: 'gym', label: 'Gym access', dailyAmount: 1200 },
  ];
  const addonDayOptions = Array.from({ length: 30 }, (_, index) => index + 1);
  const [form, setForm] = useState({
    booking_id: '',
    issue_date: today,
    room_charges: 0,
    addon_total: 0,
    tax_amount: 0,
    net_total: 0,
  });
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [addonDays, setAddonDays] = useState({});

  const parseAddonItems = (addonItems) => {
    if (!addonItems) {
      return [];
    }

    if (Array.isArray(addonItems)) {
      return addonItems;
    }

    try {
      const parsed = JSON.parse(addonItems);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const getBookingStayDays = () => {
    const selectedBooking = bookings.find((booking) => Number(booking.booking_id) === Number(form.booking_id));
    if (!selectedBooking?.check_in_date || !selectedBooking?.check_out_date) {
      return 0;
    }

    const checkInDate = new Date(`${selectedBooking.check_in_date}T00:00:00`);
    const checkOutDate = new Date(`${selectedBooking.check_out_date}T00:00:00`);
    const differenceInMs = checkOutDate.getTime() - checkInDate.getTime();
    const differenceInDays = Math.ceil(differenceInMs / (1000 * 60 * 60 * 24));
    return Math.max(differenceInDays, 0);
  };

  const getSelectedBooking = () => bookings.find((booking) => Number(booking.booking_id) === Number(form.booking_id));
  const stayDays = getBookingStayDays();
  const selectedBooking = getSelectedBooking();
  const roomChargesFromBooking = Number(selectedBooking?.day_night_price ?? 0) * stayDays;
  const selectedAddonDetails = addonOptions.filter((addon) => selectedAddons.includes(addon.key));
  const addonBreakdown = selectedAddonDetails.map((addon) => ({
    ...addon,
    days: Number(addonDays[addon.key] ?? 1),
    totalAmount: addon.dailyAmount * Number(addonDays[addon.key] ?? 1),
  }));
  const addonTotal = addonBreakdown.reduce((sum, addon) => sum + addon.totalAmount, 0);
  const preTaxTotal = roomChargesFromBooking + addonTotal;
  const computedTaxAmount = preTaxTotal * 0.18;
  const computedNetTotal = preTaxTotal + computedTaxAmount;

  useEffect(() => {
    setForm((current) => ({
      ...current,
      room_charges: roomChargesFromBooking,
      tax_amount: computedTaxAmount,
      net_total: computedNetTotal,
    }));
  }, [roomChargesFromBooking, computedTaxAmount, computedNetTotal]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        const [invoicesResponse, bookingsResponse] = await Promise.all([
          api.get('/invoices'),
          api.get('/bookings/all'),
        ]);
        if (!cancelled) {
          setInvoices(invoicesResponse.data?.data ?? []);
          setBookings(bookingsResponse.data?.data ?? []);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError('Unable to load invoices.');
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
        booking_id: Number(form.booking_id),
        room_charges: roomChargesFromBooking,
        addon_total: addonTotal,
        addon_items: JSON.stringify(addonBreakdown.map((addon) => ({ key: addon.key, days: addon.days }))),
        tax_amount: computedTaxAmount,
        net_total: computedNetTotal,
      };

      if (editingInvoiceId) {
        await api.patch(`/invoices/${encodeURIComponent(editingInvoiceId)}`, payload);
      } else {
        await api.post('/invoices', payload);
      }

      const response = await api.get('/invoices');
      setInvoices(response.data?.data ?? []);
      setSuccess(editingInvoiceId ? 'Invoice updated successfully.' : 'Invoice created successfully.');
      setEditingInvoiceId('');
      setForm({
        booking_id: '',
        issue_date: today,
        room_charges: 0,
        addon_total: 0,
        tax_amount: 0,
        net_total: 0,
      });
      setSelectedAddons([]);
      setAddonDays({});
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create invoice.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (invoice) => {
    const restoredAddonItems = parseAddonItems(invoice.addon_items);
    const restoredAddonKeys = restoredAddonItems
      .map((addonItem) => (typeof addonItem === 'string' ? addonItem : addonItem.key))
      .filter(Boolean);
    setEditingInvoiceId(invoice.invoice_id);
    setForm({
      booking_id: String(invoice.booking_id ?? ''),
      issue_date: invoice.issue_date ?? today,
      room_charges: invoice.room_charges ?? 0,
      addon_total: invoice.addon_total ?? 0,
      tax_amount: invoice.tax_amount ?? 0,
      net_total: invoice.net_total ?? 0,
    });
    setSelectedAddons(restoredAddonKeys);
    const restoredAddonDays = {};
    restoredAddonItems.forEach((addonItem) => {
      if (typeof addonItem === 'string') {
        restoredAddonDays[addonItem] = 1;
        return;
      }

      restoredAddonDays[addonItem.key] = Number(addonItem.days ?? 1);
    });
    setAddonDays(restoredAddonDays);
    setError('');
    setSuccess('');
  };

  const cancelEdit = () => {
    setEditingInvoiceId('');
    setForm({
      booking_id: '',
      issue_date: today,
      room_charges: 0,
      addon_total: 0,
      tax_amount: 0,
      net_total: 0,
    });
    setSelectedAddons([]);
    setAddonDays({});
    setError('');
    setSuccess('');
  };

  const toggleAddon = (addonKey) => {
    setSelectedAddons((current) => {
      const isSelected = current.includes(addonKey);

      if (isSelected) {
        setAddonDays((currentDays) => {
          const nextDays = { ...currentDays };
          delete nextDays[addonKey];
          return nextDays;
        });
        return current.filter((key) => key !== addonKey);
      }

      setAddonDays((currentDays) => ({ ...currentDays, [addonKey]: currentDays[addonKey] ?? 1 }));
      return [...current, addonKey];
    });
  };

  const handleAddonDaysChange = (addonKey, value) => {
    setAddonDays((current) => ({ ...current, [addonKey]: Number(value) }));
  };

  const deleteInvoice = async (invoiceId) => {
    const confirmed = window.confirm(`Delete invoice #${invoiceId}? Linked payments will also be removed.`);
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.delete(`/invoices/${encodeURIComponent(invoiceId)}`);
      const response = await api.get('/invoices');
      setInvoices(response.data?.data ?? []);
      if (editingInvoiceId === invoiceId) {
        cancelEdit();
      }
      setSuccess('Invoice deleted successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete invoice.');
    } finally {
      setSaving(false);
    }
  };

  const printInvoice = (invoice) => {
    const addonItems = parseAddonItems(invoice.addon_items);
    const addonRows = addonItems.length
      ? addonItems
          .map((item) => {
            const key = typeof item === 'string' ? item : item.key;
            const days = Number(typeof item === 'string' ? 1 : item.days ?? 1);
            const addonDef = addonOptions.find((a) => a.key === key) || { label: key, dailyAmount: 0 };
            const total = addonDef.dailyAmount * days;
            return `
              <tr>
                <td style="padding:8px;border:1px solid #ddd;">${addonDef.label}</td>
                <td style="padding:8px;border:1px solid #ddd; text-align:right;">LKR ${addonDef.dailyAmount.toFixed(2)}</td>
                <td style="padding:8px;border:1px solid #ddd; text-align:center;">${days}</td>
                <td style="padding:8px;border:1px solid #ddd; text-align:right;">LKR ${total.toFixed(2)}</td>
              </tr>
            `;
          })
          .join('')
      : '';

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Invoice #${invoice.invoice_id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111; padding:24px; }
            .header { display:flex; align-items:center; gap:16px; margin-bottom:24px; }
            .logo { height:80px; }
            .hotel-name { font-size:28px; font-weight:700; letter-spacing:2px; }
            table { border-collapse:collapse; width:100%; margin-top:12px; }
            th, td { padding:8px; border:1px solid #ddd; }
            .right { text-align:right; }
            .muted { color:#666; }
            .totals { margin-top:12px; width:100%; }
            .totals td { border: none; padding:6px; }
            @media print { body { padding:12px; } .no-print { display:none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/logo.png" alt="Central Grand Hotel" class="logo" onerror="this.style.display='none'" />
            <div>
              <div class="hotel-name">Central Grand Hotel</div>
              <div class="muted">Invoice ##${invoice.invoice_id}</div>
            </div>
          </div>

          <div>
            <strong>Guest:</strong> ${invoice.first_name} ${invoice.last_name}<br />
            <strong>Room:</strong> ${invoice.room_no ?? '-'}<br />
            <strong>Booking ID:</strong> ${invoice.booking_id ?? '-'}<br />
            <strong>Issue date:</strong> ${invoice.issue_date ?? ''}
          </div>

          <h3 style="margin-top:18px;">Charges</h3>
          <table>
            <thead>
              <tr>
                <th style="text-align:left;">Description</th>
                <th style="text-align:right;">Unit</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:8px;border:1px solid #ddd;">Room charges</td>
                <td style="padding:8px;border:1px solid #ddd; text-align:right;">LKR ${Number(invoice.room_charges ?? 0).toFixed(2)}</td>
                <td style="padding:8px;border:1px solid #ddd; text-align:center;">1</td>
                <td style="padding:8px;border:1px solid #ddd; text-align:right;">LKR ${Number(invoice.room_charges ?? 0).toFixed(2)}</td>
              </tr>
              ${addonRows}
            </tbody>
          </table>

          <table class="totals">
            <tbody>
              <tr>
                <td class="right muted" style="width:80%;">Subtotal:</td>
                <td class="right">LKR ${(Number(invoice.room_charges ?? 0) + (addonItems.length ? addonItems.reduce((s, it) => {
                      const key = typeof it === 'string' ? it : it.key;
                      const days = Number(typeof it === 'string' ? 1 : it.days ?? 1);
                      const addonDef = addonOptions.find((a) => a.key === key) || { dailyAmount: 0 };
                      return s + addonDef.dailyAmount * days;
                    }, 0) : 0)).toFixed(2)}</td>
              </tr>
              <tr>
                <td class="right muted">Tax (18%):</td>
                <td class="right">LKR ${Number(invoice.tax_amount ?? 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td class="right" style="font-weight:700;">Net total:</td>
                <td class="right" style="font-weight:700;">LKR ${Number(invoice.net_total ?? 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top:28px;" class="muted">Thank you for staying at Central Grand Hotel.</div>

          <div style="margin-top:20px;" class="no-print">
            <button onclick="window.print()" style="padding:8px 12px;border-radius:6px;background:#0ea5a5;color:#fff;border:none;">Print</button>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      alert('Unable to create print frame. Please try opening the invoice in a new tab.');
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    const tryPrint = () => {
      try {
        iframe.contentWindow.focus();
        setTimeout(() => {
          try {
            iframe.contentWindow.print();
          } catch (e) {
            console.warn('Print failed', e);
          }
          setTimeout(() => {
            try {
              document.body.removeChild(iframe);
            } catch (e) {
            }
          }, 500);
        }, 250);
      } catch (e) {
        alert('Printing is not supported in this browser.');
        try {
          document.body.removeChild(iframe);
        } catch (er) {
        }
      }
    };

    const img = doc.querySelector('img');
    if (img) {
      if (img.complete) {
        tryPrint();
      } else {
        img.onload = tryPrint;
        img.onerror = tryPrint;
      }
    } else {
      tryPrint();
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8 min-h-screen text-slate-100 bg-cover bg-center bg-fixed bg-no-repeat"
      style={{
        backgroundImage: `url('/dashboard_bg.png')`
      }}>
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Billing</p>
        <h2 className="mt-2 text-3xl font-semibold">Invoices</h2>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-cyan-950/20">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium">{editingInvoiceId ? `Edit Invoice #${editingInvoiceId}` : 'Create Invoice'}</h3>
            {editingInvoiceId ? <p className="mt-1 text-xs uppercase tracking-[0.25em] text-cyan-300">Editing mode</p> : null}
          </div>
          <div className="flex gap-3">
            {editingInvoiceId ? (
              <button type="button" onClick={cancelEdit} className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5">
                Cancel edit
              </button>
            ) : null}
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-cyan-400/15 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingInvoiceId ? 'Update invoice' : 'Create invoice'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-2 text-sm text-slate-300">
            Booking
            <select name="booking_id" value={form.booking_id} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100">
              <option value="">Select booking</option>
              {bookings.map((booking) => (
                <option key={booking.booking_id} value={booking.booking_id}>
                  #{booking.booking_id} - {booking.first_name} {booking.last_name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Issue date
            <input type="date" name="issue_date" value={form.issue_date} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" />
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Room charges(LKR)
            <input type="number" step="0.01" min="0" name="room_charges" value={form.room_charges} readOnly className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" />
          </label>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <p className="text-sm font-medium text-slate-200">Add-ons</p>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-400">Choose the number of days for each add-on</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {addonOptions.map((addon) => (
              <div key={addon.key} className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <span>
                    {addon.label}
                    <span className="ml-2 text-slate-400">LKR {addon.dailyAmount}/day</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={selectedAddons.includes(addon.key)}
                    onChange={() => toggleAddon(addon.key)}
                    className="h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-400"
                  />
                </div>
                <div className="mt-3 grid gap-2">
                  <label className="grid gap-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                    Days
                    <select
                      value={addonDays[addon.key] ?? 1}
                      onChange={(event) => handleAddonDaysChange(addon.key, event.target.value)}
                      disabled={!selectedAddons.includes(addon.key)}
                      className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {addonDayOptions.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="text-xs text-slate-400">
                    Total: LKR {(addon.dailyAmount * Number(addonDays[addon.key] ?? 1)).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="px-4 py-2 font-medium">Addon</th>
                  <th className="px-4 py-2 font-medium">Daily</th>
                  <th className="px-4 py-2 font-medium">Days</th>
                  <th className="px-4 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-slate-950/50">
                {addonBreakdown.length === 0 ? (
                  <tr>
                    <td className="px-4 py-3 text-slate-400" colSpan="4">
                      No add-ons selected.
                    </td>
                  </tr>
                ) : (
                  addonBreakdown.map((addon) => (
                    <tr key={addon.key}>
                      <td className="px-4 py-3 text-slate-200">{addon.label}</td>
                      <td className="px-4 py-3 text-slate-300">LKR {addon.dailyAmount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-300">{addon.days}</td>
                      <td className="px-4 py-3 text-cyan-200">LKR {addon.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-300">
            Add-on total: <span className="font-medium text-cyan-200">LKR {addonTotal.toFixed(2)}</span>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-300">
            Tax amount (18%): <span className="font-medium text-cyan-200">LKR {computedTaxAmount.toFixed(2)}</span>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-300">
            Net total: <span className="font-medium text-cyan-200">LKR {computedNetTotal.toFixed(2)}</span>
          </div>
        </div>

        {success ? <p className="mt-4 text-sm text-emerald-300">{success}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      </form>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-xl shadow-cyan-950/20">
        {loading ? (
          <div className="px-6 py-12 text-sm text-slate-300">Loading invoices...</div>
        ) : error ? (
          <div className="px-6 py-12 text-sm text-red-300">{error}</div>
        ) : invoices.length === 0 ? (
          <div className="px-6 py-12 text-sm text-slate-300">No invoices found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="px-6 py-3 font-medium">Invoice</th>
                  <th className="px-6 py-3 font-medium">Guest</th>
                  <th className="px-6 py-3 font-medium">Room</th>
                  <th className="px-6 py-3 font-medium">Issue Date</th>
                  <th className="px-6 py-3 font-medium">Net Total(LKR)</th>
                  <th className="px-6 py-3 font-medium">Booking ID</th>
                  <th className="px-6 py-3 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {invoices.map((invoice) => (
                  <tr key={invoice.invoice_id} className="hover:bg-white/5">
                    <td className="px-6 py-4 font-medium text-cyan-300">#{invoice.invoice_id}</td>
                    <td className="px-6 py-4 text-slate-300">
                      {invoice.first_name} {invoice.last_name}
                    </td>
                    <td className="px-6 py-4 text-slate-300">{invoice.room_no}</td>
                    <td className="px-6 py-4 text-slate-300">{invoice.issue_date}</td>
                    <td className="px-6 py-4 text-slate-300">{invoice.net_total}</td>
                    <td className="px-6 py-4 text-slate-300">{invoice.booking_id}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => printInvoice(invoice)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/5">
                          Print
                        </button>
                        <button type="button" onClick={() => startEdit(invoice)} className="rounded-full border border-cyan-400/30 px-3 py-1.5 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/10">
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteInvoice(invoice.invoice_id)} className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-400/10" disabled={saving}>
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

export default Invoices;