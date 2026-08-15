import { useEffect, useState } from 'react';
import api from '../services/api';

function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingRoomNo, setEditingRoomNo] = useState('');
  const [form, setForm] = useState({
    room_no: '',
    floor_no: '',
    status: 'Available',
    type_id: '',
  });

  const roomStatusOptions = ['Available', 'Maintenance'];

  const getRoomDisplayStatus = (room) => {
    const roomStatus = (room.status ?? '').toLowerCase();
    if (roomStatus === 'maintenance') {
      return 'Maintenance';
    }

    const hasActiveBooking = bookings.some(
      (booking) => booking.room_no === room.room_no && (booking.booking_status ?? '').toLowerCase() === 'active',
    );

    return hasActiveBooking ? 'Occupied' : 'Available';
  };

  useEffect(() => {
    let cancelled = false;

    const loadRooms = async () => {
      try {
        setLoading(true);
        const [roomsResponse, roomTypesResponse, bookingsResponse] = await Promise.all([
          api.get('/rooms'),
          api.get('/room-types'),
          api.get('/bookings/all'),
        ]);
        if (!cancelled) {
          setRooms(roomsResponse.data?.data ?? []);
          setRoomTypes(roomTypesResponse.data?.data ?? []);
          setBookings(bookingsResponse.data?.data ?? []);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError('Unable to load rooms.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadRooms();

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
        floor_no: form.floor_no === '' ? null : Number(form.floor_no),
        type_id: Number(form.type_id),
      };

      if (editingRoomNo) {
        await api.patch(`/rooms/${encodeURIComponent(editingRoomNo)}`, payload);
      } else {
        await api.post('/rooms', payload);
      }

      const response = await api.get('/rooms');
      setRooms(response.data?.data ?? []);
      setSuccess(editingRoomNo ? 'Room updated successfully.' : 'Room created successfully.');
      setEditingRoomNo('');
      setForm({ room_no: '', floor_no: '', status: 'Available', type_id: '' });
    } catch (err) {
      setError(err.response?.data?.message || (editingRoomNo ? 'Unable to update room.' : 'Unable to create room.'));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (room) => {
    setEditingRoomNo(room.room_no);
    setSuccess('');
    setError('');
    setForm({
      room_no: room.room_no,
      floor_no: room.floor_no ?? '',
      status: room.status ?? '',
      type_id: String(room.type_id ?? ''),
    });
  };

  const cancelEdit = () => {
    setEditingRoomNo('');
    setForm({ room_no: '', floor_no: '', status: 'Available', type_id: '' });
    setSuccess('');
    setError('');
  };

  const deleteRoom = async (roomNo) => {
    const confirmed = window.confirm(`Delete room ${roomNo}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.delete(`/rooms/${encodeURIComponent(roomNo)}`);
      const response = await api.get('/rooms');
      setRooms(response.data?.data ?? []);
      if (editingRoomNo === roomNo) {
        cancelEdit();
      }
      setSuccess('Room deleted successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete room.');
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
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Inventory</p>
        <h2 className="mt-2 text-3xl font-semibold">Rooms</h2>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-cyan-950/20">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium">{editingRoomNo ? `Edit Room ${editingRoomNo}` : 'Create Room'}</h3>
            {editingRoomNo ? <p className="mt-1 text-xs uppercase tracking-[0.25em] text-cyan-300">Editing mode</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {editingRoomNo ? (
              <button type="button" onClick={cancelEdit} className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5">
                Cancel
              </button>
            ) : null}
            <button type="submit" disabled={saving} className="rounded-full bg-cyan-400/15 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/25 disabled:opacity-60">
              {saving ? 'Saving...' : editingRoomNo ? 'Update room' : 'Create room'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-2 text-sm text-slate-300">Room number<input name="room_no" value={form.room_no} onChange={handleChange} disabled={Boolean(editingRoomNo)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100 disabled:cursor-not-allowed disabled:opacity-70" /></label>
          <label className="grid gap-2 text-sm text-slate-300">Floor<input type="number" name="floor_no" value={form.floor_no} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
          <label className="grid gap-2 text-sm text-slate-300">
            Status
            <select name="status" value={form.status} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100">
              {roomStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300">Type
            <select name="type_id" value={form.type_id} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100">
              <option value="">Select type</option>
              {roomTypes.map((roomType) => (
                <option key={roomType.type_id} value={roomType.type_id}>{roomType.type_name}</option>
              ))}
            </select>
          </label>
        </div>

        {success ? <p className="mt-4 text-sm text-emerald-300">{success}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      </form>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-xl shadow-cyan-950/20">
        {loading ? (
          <div className="px-6 py-12 text-sm text-slate-300">Loading rooms...</div>
        ) : error ? (
          <div className="px-6 py-12 text-sm text-red-300">{error}</div>
        ) : rooms.length === 0 ? (
          <div className="px-6 py-12 text-sm text-slate-300">No rooms found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="px-6 py-3 font-medium">Room</th>
                  <th className="px-6 py-3 font-medium">Floor</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Capacity</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {rooms.map((room) => (
                  <tr key={room.room_no} className="hover:bg-white/5">
                    <td className="px-6 py-4 font-medium text-cyan-300">{room.room_no}</td>
                    <td className="px-6 py-4 text-slate-300">{room.floor_no ?? '—'}</td>
                    <td className="px-6 py-4 text-slate-300">{getRoomDisplayStatus(room)}</td>
                    <td className="px-6 py-4 text-slate-300">{room.type_name}</td>
                    <td className="px-6 py-4 text-slate-300">
                      {room.max_adults} adults / {room.max_children} children
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(room)}
                          className="rounded-full border border-cyan-400/20 px-3 py-1 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/10"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRoom(room.room_no)}
                          disabled={saving}
                          className="rounded-full border border-red-400/30 px-3 py-1 text-xs font-medium text-red-200 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
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

export default Rooms;