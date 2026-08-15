import { useEffect, useState } from 'react';
import api from '../services/api';

function Guests() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingGuestId, setEditingGuestId] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const idTypeOptions = ['NIC', 'Driving license', 'Passport'];
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    street: '',
    city: '',
    country: '',
    email: '',
    phone_number: '',
    loyalty_points: 0,
    id_type: '',
    id_number: '',
    date_of_birth: '',
  });

  useEffect(() => {
    let cancelled = false;

    const loadGuests = async () => {
      try {
        setLoading(true);
        const response = await api.get('/guests');
        if (!cancelled) {
          setGuests(response.data?.data ?? []);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError('Unable to load guests.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadGuests();

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
        loyalty_points: Number(form.loyalty_points),
      };

      if (editingGuestId) {
        await api.patch(`/guests/${encodeURIComponent(editingGuestId)}`, payload);
      } else {
        await api.post('/guests', payload);
      }

      const response = await api.get('/guests');
      setGuests(response.data?.data ?? []);
      setSuccess(editingGuestId ? 'Guest updated successfully.' : 'Guest created successfully.');
      setEditingGuestId('');
      setForm({
        first_name: '',
        last_name: '',
        street: '',
        city: '',
        country: '',
        email: '',
        phone_number: '',
        loyalty_points: 0,
        id_type: '',
        id_number: '',
        date_of_birth: '',
      });
    } catch (err) {
      setError(err.response?.data?.message || (editingGuestId ? 'Unable to update guest.' : 'Unable to create guest.'));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (guest) => {
    setEditingGuestId(guest.person_id);
    setSuccess('');
    setError('');
    setForm({
      first_name: guest.first_name || '',
      last_name: guest.last_name || '',
      street: guest.street || '',
      city: guest.city || '',
      country: guest.country || '',
      email: guest.email || '',
      phone_number: (guest.phone_numbers || '').split(',')[0].trim(),
      loyalty_points: guest.loyalty_points ?? 0,
      id_type: guest.id_type || '',
      id_number: guest.id_number || '',
      date_of_birth: guest.date_of_birth || '',
    });
  };

  const cancelEdit = () => {
    setEditingGuestId('');
    setSuccess('');
    setError('');
    setForm({
      first_name: '',
      last_name: '',
      street: '',
      city: '',
      country: '',
      email: '',
      phone_number: '',
      loyalty_points: 0,
      id_type: '',
      id_number: '',
      date_of_birth: '',
    });
  };

  const deleteGuest = async (guestId) => {
    const confirmed = window.confirm('Delete this guest? This cannot be undone if there are no related bookings.');
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/guests/${encodeURIComponent(guestId)}`);
      const response = await api.get('/guests');
      setGuests(response.data?.data ?? []);
      if (editingGuestId === guestId) {
        cancelEdit();
      }
      setSuccess('Guest deleted successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete guest.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8 min-h-screen text-slate-100 bg-cover bg-center bg-fixed bg-no-repeat"
      style={{
        backgroundImage: `url('/dashboard_bg.png')`
      }}>
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">People</p>
        <h2 className="mt-2 text-3xl font-semibold">Guests</h2>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-cyan-950/20">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium">{editingGuestId ? `Edit Guest #${editingGuestId}` : 'Create Guest'}</h3>
            {editingGuestId ? <p className="mt-1 text-xs uppercase tracking-[0.25em] text-cyan-300">Editing mode</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {editingGuestId ? (
              <button type="button" onClick={cancelEdit} className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5">
                Cancel
              </button>
            ) : null}
            <button type="submit" disabled={saving} className="rounded-full bg-cyan-400/15 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/25 disabled:opacity-60">
              {saving ? 'Saving...' : editingGuestId ? 'Update guest' : 'Create guest'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-2 text-sm text-slate-300">First name<input name="first_name" value={form.first_name} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
          <label className="grid gap-2 text-sm text-slate-300">Last name<input name="last_name" value={form.last_name} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
          <label className="grid gap-2 text-sm text-slate-300">Street<input name="street" value={form.street} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
          <label className="grid gap-2 text-sm text-slate-300">City<input name="city" value={form.city} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
          <label className="grid gap-2 text-sm text-slate-300">Country<input name="country" value={form.country} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
          <label className="grid gap-2 text-sm text-slate-300">Email<input name="email" value={form.email} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
          <label className="grid gap-2 text-sm text-slate-300">Phone<input name="phone_number" value={form.phone_number} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
          <label className="grid gap-2 text-sm text-slate-300">Loyalty points<input type="number" min="0" name="loyalty_points" value={form.loyalty_points} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
          <label className="grid gap-2 text-sm text-slate-300">
            ID type
            <select name="id_type" value={form.id_type} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100">
              <option value="">Select ID type</option>
              {idTypeOptions.map((idType) => (
                <option key={idType} value={idType}>
                  {idType}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300">ID number<input name="id_number" value={form.id_number} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
          <label className="grid gap-2 text-sm text-slate-300">Date of birth<input type="date" max={today} name="date_of_birth" value={form.date_of_birth} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
        </div>

        {success ? <p className="mt-4 text-sm text-emerald-300">{success}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      </form>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-xl shadow-cyan-950/20">
        {loading ? (
          <div className="px-6 py-12 text-sm text-slate-300">Loading guests...</div>
        ) : error ? (
          <div className="px-6 py-12 text-sm text-red-300">{error}</div>
        ) : guests.length === 0 ? (
          <div className="px-6 py-12 text-sm text-slate-300">No guests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="px-6 py-3 font-medium">Guest</th>
                  <th className="px-6 py-3 font-medium">City</th>
                  <th className="px-6 py-3 font-medium">Country</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Phone Numbers</th>
                  <th className="px-6 py-3 font-medium">Loyalty</th>
                  <th className="px-6 py-3 font-medium">ID Type</th>
                  <th className="px-6 py-3 font-medium">ID Number</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {guests.map((guest) => (
                  <tr key={guest.person_id} className="hover:bg-white/5">
                    <td className="px-6 py-4 font-medium text-cyan-300">
                      {guest.first_name} {guest.last_name}
                    </td>
                    <td className="px-6 py-4 text-slate-300">{guest.city || '—'}</td>
                    <td className="px-6 py-4 text-slate-300">{guest.country || '—'}</td>
                    <td className="px-6 py-4 text-slate-300">{guest.email || '—'}</td>
                    <td className="px-6 py-4 text-slate-300">{guest.phone_numbers || '—'}</td>
                    <td className="px-6 py-4 text-slate-300">{guest.loyalty_points ?? 0}</td>
                    <td className="px-6 py-4 text-slate-300">{guest.id_type || '—'}</td>
                    <td className="px-6 py-4 text-slate-300">{guest.id_number || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => startEdit(guest)} className="rounded-full border border-cyan-400/20 px-3 py-1 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/10">
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteGuest(guest.person_id)} className="rounded-full border border-red-400/20 px-3 py-1 text-xs font-medium text-red-200 transition hover:bg-red-400/10">
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

export default Guests;