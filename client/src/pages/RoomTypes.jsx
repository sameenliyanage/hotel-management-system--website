import { useEffect, useState } from 'react';
import api from '../services/api';

function RoomTypes() {
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    type_name: '',
    base_price: 0,
    day_night_price: 0,
    max_adults: 1,
    max_children: 0,
  });

  const loadRoomTypes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/room-types');
      setRoomTypes(response.data?.data ?? []);
      setError('');
    } catch (err) {
      setError('Unable to load room types.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoomTypes();
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
        base_price: Number(form.base_price),
        day_night_price: Number(form.day_night_price),
        max_adults: Number(form.max_adults),
        max_children: Number(form.max_children),
      };

      if (editingTypeId) {
        await api.patch(`/room-types/${encodeURIComponent(editingTypeId)}`, payload);
      } else {
        await api.post('/room-types', payload);
      }

      await loadRoomTypes();
      setSuccess(editingTypeId ? 'Room type updated successfully.' : 'Room type created successfully.');
      setEditingTypeId('');
      setForm({ type_name: '', base_price: 0, day_night_price: 0, max_adults: 1, max_children: 0 });
    } catch (err) {
      setError(err.response?.data?.message || (editingTypeId ? 'Unable to update room type.' : 'Unable to create room type.'));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (roomType) => {
    setEditingTypeId(roomType.type_id);
    setError('');
    setSuccess('');
    setForm({
      type_name: roomType.type_name ?? '',
      base_price: roomType.base_price ?? 0,
      day_night_price: roomType.day_night_price ?? 0,
      max_adults: roomType.max_adults ?? 1,
      max_children: roomType.max_children ?? 0,
    });
  };

  const cancelEdit = () => {
    setEditingTypeId('');
    setForm({ type_name: '', base_price: 0, day_night_price: 0, max_adults: 1, max_children: 0 });
    setError('');
    setSuccess('');
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8 min-h-screen text-slate-100 bg-cover bg-center bg-fixed bg-no-repeat"
      style={{
        backgroundImage: `url('/dashboard_bg.png')`
      }}>
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Inventory</p>
        <h2 className="mt-2 text-3xl font-semibold">Room Types</h2>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-cyan-950/20">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium">{editingTypeId ? `Edit Room Type #${editingTypeId}` : 'Create Room Type'}</h3>
            {editingTypeId ? <p className="mt-1 text-xs uppercase tracking-[0.25em] text-cyan-300">Editing mode</p> : null}
          </div>
          <div className="flex gap-2">
            {editingTypeId ? (
              <button type="button" onClick={cancelEdit} className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5">
                Cancel
              </button>
            ) : null}
            <button type="submit" disabled={saving} className="rounded-full bg-cyan-400/15 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/25 disabled:opacity-60">
              {saving ? 'Saving...' : editingTypeId ? 'Update type' : 'Create type'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <label className="grid gap-2 text-sm text-slate-300">Type name<input name="type_name" value={form.type_name} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
          <label className="grid gap-2 text-sm text-slate-300">Base price(LKR)<input type="number" min="0" step="0.01" name="base_price" value={form.base_price} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
          <label className="grid gap-2 text-sm text-slate-300">Day + Night price(LKR)<input type="number" min="0" step="0.01" name="day_night_price" value={form.day_night_price} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
          <label className="grid gap-2 text-sm text-slate-300">Max adults<input type="number" min="1" name="max_adults" value={form.max_adults} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
          <label className="grid gap-2 text-sm text-slate-300">Max children<input type="number" min="0" name="max_children" value={form.max_children} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
        </div>

        {success ? <p className="mt-4 text-sm text-emerald-300">{success}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      </form>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-xl shadow-cyan-950/20">
        {loading ? (
          <div className="px-6 py-12 text-sm text-slate-300">Loading room types...</div>
        ) : roomTypes.length === 0 ? (
          <div className="px-6 py-12 text-sm text-slate-300">No room types found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Base Price(LKR)</th>
                  <th className="px-6 py-3 font-medium">Day + Night Price(LKR)</th>
                  <th className="px-6 py-3 font-medium">Adults</th>
                  <th className="px-6 py-3 font-medium">Children</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {roomTypes.map((roomType) => (
                  <tr key={roomType.type_id} className="hover:bg-white/5">
                    <td className="px-6 py-4 font-medium text-cyan-300">{roomType.type_name}</td>
                    <td className="px-6 py-4 text-slate-300">{roomType.base_price}</td>
                    <td className="px-6 py-4 text-slate-300">{roomType.day_night_price}</td>
                    <td className="px-6 py-4 text-slate-300">{roomType.max_adults}</td>
                    <td className="px-6 py-4 text-slate-300">{roomType.max_children}</td>
                    <td className="px-6 py-4">
                      <button type="button" onClick={() => startEdit(roomType)} className="rounded-full border border-cyan-400/20 px-3 py-1 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/10">
                        Edit
                      </button>
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

export default RoomTypes;