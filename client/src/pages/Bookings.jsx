import { useEffect, useState } from 'react';
import api from '../services/api';

function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [guests, setGuests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    guest_id: '',
    room_no: '',
    check_in_date: '',
    check_out_date: '',
    adults_count: 1,
    children_count: 0,
    booking_status: 'Active',
  });

  const bookingStatusOptions = ['Active', 'Checked Out', 'Cancelled'];

  const isRoomAvailable = (room) => {
    const roomStatus = (room.status ?? '').toLowerCase();
    const hasActiveBooking = bookings.some(
      (booking) => booking.room_no === room.room_no && (booking.booking_status ?? '').toLowerCase() === 'active',
    );

    if (roomStatus === 'maintenance') {
      return false;
    }

    return roomStatus === 'available' || !hasActiveBooking;
  };

  const getRoomOptionLabel = (room) => {
    return `${room.room_no} - ${room.type_name}`;
  };

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        const [bookingsResponse, guestsResponse, roomsResponse] = await Promise.all([
          api.get('/bookings/all'),
          api.get('/guests'),
          api.get('/rooms'),
        ]);
        if (!cancelled) {
          setBookings(bookingsResponse.data?.data ?? []);
          setGuests(guestsResponse.data?.data ?? []);
          setRooms(roomsResponse.data?.data ?? []);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError('Unable to load bookings.');
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
        adults_count: Number(form.adults_count),
        children_count: Number(form.children_count),
        guest_id: Number(form.guest_id),
      };

      if (editingBookingId) {
        await api.patch(`/bookings/${encodeURIComponent(editingBookingId)}`, payload);
      } else {
        await api.post('/bookings', payload);
      }

      const response = await api.get('/bookings/all');
      setBookings(response.data?.data ?? []);
      setSuccess(editingBookingId ? 'Booking updated successfully.' : 'Booking created successfully.');
      setEditingBookingId('');
      setForm({
        guest_id: '',
        room_no: '',
        check_in_date: '',
        check_out_date: '',
        adults_count: 1,
        children_count: 0,
        booking_status: 'Active',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create booking.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (booking) => {
    setEditingBookingId(booking.booking_id);
    setForm({
      guest_id: String(booking.guest_id ?? ''),
      room_no: booking.room_no ?? '',
      check_in_date: booking.check_in_date ?? '',
      check_out_date: booking.check_out_date ?? '',
      adults_count: booking.adults_count ?? 1,
      children_count: booking.children_count ?? 0,
      booking_status: booking.booking_status ?? 'Active',
    });
    setError('');
    setSuccess('');
  };

  const cancelEdit = () => {
    setEditingBookingId('');
    setForm({
      guest_id: '',
      room_no: '',
      check_in_date: '',
      check_out_date: '',
      adults_count: 1,
      children_count: 0,
      booking_status: 'Active',
    });
    setError('');
    setSuccess('');
  };

  const deleteBooking = async (bookingId) => {
    const confirmed = window.confirm(`Delete booking #${bookingId}? This will remove any linked invoice and payment records.`);
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.delete(`/bookings/${encodeURIComponent(bookingId)}`);
      const response = await api.get('/bookings/all');
      setBookings(response.data?.data ?? []);
      if (editingBookingId === bookingId) {
        cancelEdit();
      }
      setSuccess('Booking deleted successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete booking.');
    } finally {
      setSaving(false);
    }
  };

  // Ensure bookings are always sorted by booking_id in descending order
  const sortedBookings = [...bookings].sort((a, b) => Number(b.booking_id) - Number(a.booking_id));

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8 min-h-screen text-slate-100 bg-cover bg-center bg-fixed bg-no-repeat"
      style={{
        backgroundImage: `url('/dashboard_bg.png')`
      }}>
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Operations</p>
        <h2 className="mt-2 text-3xl font-semibold">Bookings</h2>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-cyan-950/20">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium">{editingBookingId ? `Edit Booking #${editingBookingId}` : 'Create Booking'}</h3>
            {editingBookingId ? <p className="mt-1 text-xs uppercase tracking-[0.25em] text-cyan-300">Editing mode</p> : null}
          </div>
          <div className="flex gap-3">
            {editingBookingId ? (
              <button type="button" onClick={cancelEdit} className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5">
                Cancel edit
              </button>
            ) : null}
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-cyan-400/15 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingBookingId ? 'Update booking' : 'Create booking'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-2 text-sm text-slate-300">
            Guest
            <select name="guest_id" value={form.guest_id} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100">
              <option value="">Select guest</option>
              {guests.map((guest) => (
                <option key={guest.person_id} value={guest.person_id}>
                  {guest.first_name} {guest.last_name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Room
            <select name="room_no" value={form.room_no} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100">
              <option value="">Select room</option>
              {rooms
                .slice()
                .sort((leftRoom, rightRoom) => Number(isRoomAvailable(rightRoom)) - Number(isRoomAvailable(leftRoom)))
                .map((room) => (
                  <option key={room.room_no} value={room.room_no} disabled={!isRoomAvailable(room)}>
                    {getRoomOptionLabel(room)}
                  </option>
                ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Status
            <select name="booking_status" value={form.booking_status} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100">
              {bookingStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Check-in date
            <input type="date" name="check_in_date" value={form.check_in_date} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" />
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Check-out date
            <input type="date" name="check_out_date" value={form.check_out_date} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" />
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Adults
            <input type="number" min="1" name="adults_count" value={form.adults_count} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" />
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Children
            <input type="number" min="0" name="children_count" value={form.children_count} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" />
          </label>
        </div>

        {success ? <p className="mt-4 text-sm text-emerald-300">{success}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      </form>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-xl shadow-cyan-950/20">
        {loading ? (
          <div className="px-6 py-12 text-sm text-slate-300">Loading bookings...</div>
        ) : error ? (
          <div className="px-6 py-12 text-sm text-red-300">{error}</div>
        ) : sortedBookings.length === 0 ? (
          <div className="px-6 py-12 text-sm text-slate-300">No bookings found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="px-6 py-3 font-medium">Booking</th>
                  <th className="px-6 py-3 font-medium">Guest</th>
                  <th className="px-6 py-3 font-medium">Room</th>
                  <th className="px-6 py-3 font-medium">Dates</th>
                  <th className="px-6 py-3 font-medium">Guests</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {sortedBookings.map((booking) => (
                  <tr key={booking.booking_id} className="hover:bg-white/5">
                    <td className="px-6 py-4 font-medium text-cyan-300">#{booking.booking_id}</td>
                    <td className="px-6 py-4 text-slate-300">
                      {booking.first_name} {booking.last_name}
                    </td>
                    <td className="px-6 py-4 text-slate-300">{booking.room_no}</td>
                    <td className="px-6 py-4 text-slate-300">
                      {booking.check_in_date} to {booking.check_out_date}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {booking.adults_count} adults, {booking.children_count} children
                    </td>
                    <td className="px-6 py-4 text-slate-300">{booking.booking_status || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => startEdit(booking)} className="rounded-full border border-cyan-400/30 px-3 py-1.5 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/10">
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteBooking(booking.booking_id)} className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-400/10" disabled={saving}>
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

export default Bookings;