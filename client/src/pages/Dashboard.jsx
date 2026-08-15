import { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState('');
  const [summary, setSummary] = useState({
    rooms: 0,
    roomTypes: 0,
    guests: 0,
    staff: 0,
    invoices: 0,
    payments: 0,
    invoiceRows: [],
    paymentRows: [],
  });
  const [rooms, setRooms] = useState([]);
  const [guests, setGuests] = useState([]);
  const [staff, setStaff] = useState([]);
  const [invoicesList, setInvoicesList] = useState([]);
  const [paymentsList, setPaymentsList] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const searchTimer = useRef(null);

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 2,
  });

  const loadBookings = async () => {
    try {
      setLoading(true);
      const [bookingsResponse, roomsResponse, roomTypesResponse, guestsResponse, staffResponse, invoicesResponse, paymentsResponse] =
        await Promise.all([
          api.get('/bookings'),
          api.get('/rooms'),
          api.get('/room-types'),
          api.get('/guests'),
          api.get('/staff'),
          api.get('/invoices'),
          api.get('/payments'),
        ]);

      const bookingsData = bookingsResponse.data?.data ?? [];
      const roomsData = roomsResponse.data?.data ?? [];
      const guestsData = guestsResponse.data?.data ?? [];
      const staffData = staffResponse.data?.data ?? [];
      const invoicesData = invoicesResponse.data?.data ?? [];
      const paymentsData = paymentsResponse.data?.data ?? [];

      setBookings(bookingsData);
      setRooms(roomsData);
      setGuests(guestsData);
      setStaff(staffData);
      setInvoicesList(invoicesData);
      setPaymentsList(paymentsData);

      setSummary({
        rooms: roomsData.length ?? 0,
        roomTypes: roomTypesResponse.data?.data?.length ?? 0,
        guests: guestsData.length ?? 0,
        staff: staffData.length ?? 0,
        invoices: invoicesData.length ?? 0,
        payments: paymentsData.length ?? 0,
        invoiceRows: invoicesData,
        paymentRows: paymentsData,
      });

      setError('');
      setLastLoadedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError('Unable to load active bookings. Check the backend server and API URL.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const activeBookingsList = bookings
    .filter((booking) => {
      if (booking.booking_status) {
        return booking.booking_status.toLowerCase() === 'active';
      }
      return true; 
    })
    .sort((a, b) => Number(b.booking_id) - Number(a.booking_id)); 

  const totalBookings = activeBookingsList.length;
  const totalNights = activeBookingsList.reduce((sum, booking) => sum + Number(booking.nights || 0), 0);
  const averageStay = totalBookings > 0 ? (totalNights / totalBookings).toFixed(1) : '0.0';
  
  const latestCheckIn = activeBookingsList.reduce((latest, booking) => {
    if (!booking.check_in_date) {
      return latest;
    }
    if (!latest || booking.check_in_date > latest) {
      return booking.check_in_date;
    }
    return latest;
  }, '');

  const billingKpis = (() => {
    const invoiceRows = Array.isArray(summary.invoiceRows) ? summary.invoiceRows : [];
    const paymentRows = Array.isArray(summary.paymentRows) ? summary.paymentRows : [];
    return {
      invoiceCount: summary.invoices,
      paymentCount: summary.payments,
      totalBilled: invoiceRows.reduce((sum, invoice) => sum + Number(invoice.net_total || 0), 0),
      totalCollected: paymentRows.reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0),
    };
  })();

  const performSearch = (q) => {
    const query = String(q || '').trim().toLowerCase();
    if (!query) {
      setSearchResults(null);
      return;
    }

    const matchIn = (obj, fields) => fields.some((f) => String(obj[f] ?? '').toLowerCase().includes(query));

    const bookingMatches = bookings
      .filter((b) =>
        matchIn(b, ['booking_id', 'first_name', 'last_name', 'room_no', 'booking_status', 'check_in_date', 'check_out_date']),
      )
      .slice(0, 10);

    const guestMatches = guests
      .filter((g) => matchIn(g, ['person_id', 'first_name', 'last_name', 'email', 'phone_numbers']))
      .slice(0, 10);

    const roomMatches = rooms
      .filter((r) => matchIn(r, ['room_no', 'type_name', 'status']))
      .slice(0, 10);

    const staffMatches = staff
      .filter((s) => matchIn(s, ['person_id', 'first_name', 'last_name', 'role', 'email']))
      .slice(0, 10);

    const invoiceMatches = invoicesList
      .filter((i) => matchIn(i, ['invoice_id', 'first_name', 'last_name', 'room_no', 'booking_id', 'net_total']))
      .slice(0, 10);

    const paymentMatches = paymentsList
      .filter((p) => matchIn(p, ['payment_id', 'invoice_id', 'amount_paid', 'payment_date']))
      .slice(0, 10);

    setSearchResults({ bookings: bookingMatches, guests: guestMatches, rooms: roomMatches, staff: staffMatches, invoices: invoiceMatches, payments: paymentMatches });
  };

  const outstandingBalance = Math.max(billingKpis.totalBilled - billingKpis.totalCollected, 0);
  const collectionRate = billingKpis.totalBilled > 0 ? ((billingKpis.totalCollected / billingKpis.totalBilled) * 100).toFixed(1) : '0.0';
  const averageInvoice = billingKpis.invoiceCount > 0 ? billingKpis.totalBilled / billingKpis.invoiceCount : 0;

  const availableRooms = rooms.filter((r) => ((r.status ?? '').toLowerCase() === 'available')).length - 2;

  return (
    <div className="min-h-screen text-slate-100 bg-cover bg-center bg-fixed bg-no-repeat"
      style={{
        backgroundImage: `url('/dashboard_bg.png')`
      }}>
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/20 backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Hotel Management System</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Bookings Dashboard</h1>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="search"
                aria-label="Search"
                placeholder="Search bookings, guests, rooms, staff, invoices..."
                value={searchQuery}
                onChange={(e) => {
                  const q = e.target.value;
                  setSearchQuery(q);
                  if (searchTimer.current) clearTimeout(searchTimer.current);
                  searchTimer.current = setTimeout(() => {
                    performSearch(q);
                  }, 250);
                }}
                className="rounded-full border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                style={{ minWidth: 380 }}
              />
            </div>
              
            <button
              type="button"
              onClick={loadBookings}
              className="inline-flex items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/20"
              >
              Refresh data
            </button>
          </div>
        </div>

        {searchResults ? (
          <div className="mb-6 rounded-2xl border border-white/10 bg-slate-950/70 p-4 backdrop-blur">
            <h3 className="text-lg font-medium">Search results for "{searchQuery}"</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {searchResults.bookings?.length > 0 && (
                <div>
                  <p className="text-sm text-slate-400">Bookings</p>
                  <ul className="mt-2 text-sm">
                    {searchResults.bookings.map((b) => (
                      <li key={b.booking_id} className="py-1 text-slate-200">#{b.booking_id} — {b.first_name} {b.last_name} — {b.room_no}</li>
                    ))}
                  </ul>
                </div>
              )}

              {searchResults.guests?.length > 0 && (
                <div>
                  <p className="text-sm text-slate-400">Guests</p>
                  <ul className="mt-2 text-sm">
                    {searchResults.guests.map((g) => (
                      <li key={g.person_id} className="py-1 text-slate-200">{g.first_name} {g.last_name} — {g.email || g.phone_numbers}</li>
                    ))}
                  </ul>
                </div>
              )}

              {searchResults.rooms?.length > 0 && (
                <div>
                  <p className="text-sm text-slate-400">Rooms</p>
                  <ul className="mt-2 text-sm">
                    {searchResults.rooms.map((r) => (
                      <li key={r.room_no} className="py-1 text-slate-200">Room {r.room_no} — {r.type_name} — {r.status}</li>
                    ))}
                  </ul>
                </div>
              )}

              {searchResults.staff?.length > 0 && (
                <div>
                  <p className="text-sm text-slate-400">Staff</p>
                  <ul className="mt-2 text-sm">
                    {searchResults.staff.map((s) => (
                      <li key={s.person_id} className="py-1 text-slate-200">{s.first_name} {s.last_name} — {s.role || s.email}</li>
                    ))}
                  </ul>
                </div>
              )}

              {searchResults.invoices?.length > 0 && (
                <div>
                  <p className="text-sm text-slate-400">Invoices</p>
                  <ul className="mt-2 text-sm">
                    {searchResults.invoices.map((i) => (
                      <li key={i.invoice_id} className="py-1 text-slate-200">#{i.invoice_id} — {i.first_name} {i.last_name} — ${i.net_total}</li>
                    ))}
                  </ul>
                </div>
              )}

              {searchResults.payments?.length > 0 && (
                <div>
                  <p className="text-sm text-slate-400">Payments</p>
                  <ul className="mt-2 text-sm">
                    {searchResults.payments.map((p) => (
                      <li key={p.payment_id} className="py-1 text-slate-200">#{p.payment_id} — Invoice #{p.invoice_id} — ${p.amount_paid}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur p-5 shadow-lg shadow-cyan-950/10">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Active bookings</p>
            <p className="mt-3 text-3xl font-semibold text-cyan-300">{totalBookings}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur p-5 shadow-lg shadow-cyan-950/10">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Average stay</p>
            <p className="mt-3 text-3xl font-semibold text-cyan-300">{averageStay} nights</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur p-5 shadow-lg shadow-cyan-950/10">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Latest check-in</p>
            <p className="mt-3 text-3xl font-semibold text-cyan-300">{latestCheckIn || '—'}</p>
            <p className="mt-2 text-xs text-slate-400">Last loaded at {lastLoadedAt || 'not loaded yet'}</p>
          </div>
        </div>

        <div className="mb-8 rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-cyan-400/10 via-slate-900/80 to-slate-950/90 backdrop-blur p-6 shadow-2xl shadow-cyan-950/20">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Billing KPIs</p>
              <h2 className="mt-2 text-xl font-semibold">Revenue and collections at a glance</h2>
            </div>
            <p className="text-xs text-slate-400">Derived from invoices and payments</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-slate-950/50 backdrop-blur p-5 shadow-lg shadow-cyan-950/10">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Total billed</p>
              <p className="mt-3 text-3xl font-semibold text-cyan-300">{currencyFormatter.format(billingKpis.totalBilled)}</p>
              <p className="mt-2 text-xs text-slate-400">{billingKpis.invoiceCount} invoices</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/50 backdrop-blur p-5 shadow-lg shadow-cyan-950/10">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Collected</p>
              <p className="mt-3 text-3xl font-semibold text-emerald-300">{currencyFormatter.format(billingKpis.totalCollected)}</p>
              <p className="mt-2 text-xs text-slate-400">{billingKpis.paymentCount} payments recorded</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/50 backdrop-blur p-5 shadow-lg shadow-cyan-950/10">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Outstanding</p>
              <p className="mt-3 text-3xl font-semibold text-amber-300">{currencyFormatter.format(outstandingBalance)}</p>
              <p className="mt-2 text-xs text-slate-400">Remaining on open invoices</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/50 backdrop-blur p-5 shadow-lg shadow-cyan-950/10">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Collection rate</p>
              <p className="mt-3 text-3xl font-semibold text-fuchsia-300">{collectionRate}%</p>
              <p className="mt-2 text-xs text-slate-400">Average invoice {currencyFormatter.format(averageInvoice)}</p>
            </div>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur p-5 shadow-lg shadow-cyan-950/10">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Rooms</p>
            <p className="mt-3 text-3xl font-semibold text-cyan-300">{summary.rooms}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur p-5 shadow-lg shadow-cyan-950/10">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Available rooms</p>
            <p className="mt-3 text-3xl font-semibold text-cyan-300">{availableRooms}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur p-5 shadow-lg shadow-cyan-950/10">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Guests</p>
            <p className="mt-3 text-3xl font-semibold text-cyan-300">{summary.guests}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur p-5 shadow-lg shadow-cyan-950/10">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Staff</p>
            <p className="mt-3 text-3xl font-semibold text-cyan-300">{summary.staff}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur p-5 shadow-lg shadow-cyan-950/10">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Invoices</p>
            <p className="mt-3 text-3xl font-semibold text-cyan-300">{summary.invoices}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur p-5 shadow-lg shadow-cyan-950/10">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Payments</p>
            <p className="mt-3 text-3xl font-semibold text-cyan-300">{summary.payments}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur shadow-xl shadow-cyan-950/20">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-medium">Current Active Bookings</h2>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-sm text-slate-300">Loading active bookings...</div>
          ) : error ? (
            <div className="px-6 py-12 text-sm text-red-300">{error}</div>
          ) : activeBookingsList.length === 0 ? (
            <div className="px-6 py-12 text-sm text-slate-300">No active bookings found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    <th className="px-6 py-3 font-medium">Booking ID</th>
                    <th className="px-6 py-3 font-medium">Guest</th>
                    <th className="px-6 py-3 font-medium">Age</th>
                    <th className="px-6 py-3 font-medium">Check-in</th>
                    <th className="px-6 py-3 font-medium">Check-out</th>
                    <th className="px-6 py-3 font-medium">Nights</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {activeBookingsList.map((booking) => (
                    <tr key={booking.booking_id} className="hover:bg-white/10 transition-colors">
                      <td className="px-6 py-4 font-medium text-cyan-300">#{booking.booking_id}</td>
                      <td className="px-6 py-4">
                        {booking.first_name} {booking.last_name}
                      </td>
                      <td className="px-6 py-4 text-slate-300">{booking.guest_age}</td>
                      <td className="px-6 py-4 text-slate-300">{booking.check_in_date}</td>
                      <td className="px-6 py-4 text-slate-300">{booking.check_out_date}</td>
                      <td className="px-6 py-4 text-slate-300">{booking.nights}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;