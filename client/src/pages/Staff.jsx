import { useEffect, useState } from 'react';
import api from '../services/api';

function Staff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingStaffId, setEditingStaffId] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    street: '',
    city: '',
    country: '',
    email: '',
    phone_number: '',
    phone_number_2: '',
    salary: 0,
    department: '',
    role: '',
    date_of_birth: '',
  });

  useEffect(() => {
    let cancelled = false;

    const loadStaff = async () => {
      try {
        setLoading(true);
        const response = await api.get('/staff');
        if (!cancelled) {
          setStaff(response.data?.data ?? []);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError('Unable to load staff.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadStaff();

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
        salary: Number(form.salary),
      };

      if (editingStaffId) {
        await api.patch(`/staff/${encodeURIComponent(editingStaffId)}`, payload);
      } else {
        await api.post('/staff', payload);
      }

      const response = await api.get('/staff');
      setStaff(response.data?.data ?? []);
      setSuccess(editingStaffId ? 'Staff member updated successfully.' : 'Staff member created successfully.');
      setEditingStaffId('');
      setForm({
        first_name: '',
        last_name: '',
        street: '',
        city: '',
        country: '',
        email: '',
        phone_number: '',
        phone_number_2: '',
        salary: 0,
        department: '',
        role: '',
        date_of_birth: '',
      });
    } catch (err) {
      setError(err.response?.data?.message || (editingStaffId ? 'Unable to update staff member.' : 'Unable to create staff member.'));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (person) => {
    setEditingStaffId(person.staff_id);
    setSuccess('');
    setError('');
    setForm({
      first_name: person.first_name || '',
      last_name: person.last_name || '',
      street: person.street || '',
      city: person.city || '',
      country: person.country || '',
      email: person.email || '',
      phone_number: (person.phone_numbers || '').split(',')[0]?.trim() || '',
      phone_number_2: (person.phone_numbers || '').split(',')[1]?.trim() || '',
      salary: person.salary ?? 0,
      department: person.department || '',
      role: person.role || '',
      date_of_birth: person.date_of_birth || '',
    });
  };

  const cancelEdit = () => {
    setEditingStaffId('');
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
        phone_number_2: '',
      salary: 0,
      department: '',
      role: '',
      date_of_birth: '',
    });
  };

  const deleteStaff = async (staffId) => {
    const confirmed = window.confirm('Delete this staff member?');
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/staff/${encodeURIComponent(staffId)}`);
      const response = await api.get('/staff');
      setStaff(response.data?.data ?? []);
      if (editingStaffId === staffId) {
        cancelEdit();
      }
      setSuccess('Staff member deleted successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete staff member.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8 min-h-screen text-slate-100 bg-cover bg-center bg-fixed bg-no-repeat"
      style={{
        backgroundImage: `url('/dashboard_bg.png')`
      }}>
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">People</p>
        <h2 className="mt-2 text-3xl font-semibold">Staff</h2>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-cyan-950/20">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium">{editingStaffId ? `Edit Staff #${editingStaffId}` : 'Create Staff'}</h3>
            {editingStaffId ? <p className="mt-1 text-xs uppercase tracking-[0.25em] text-cyan-300">Editing mode</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {editingStaffId ? (
              <button type="button" onClick={cancelEdit} className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5">
                Cancel
              </button>
            ) : null}
            <button type="submit" disabled={saving} className="rounded-full bg-cyan-400/15 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/25 disabled:opacity-60">
              {saving ? 'Saving...' : editingStaffId ? 'Update staff' : 'Create staff'}
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
          <label className="grid gap-2 text-sm text-slate-300">Phone 1<input name="phone_number" value={form.phone_number} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
          <label className="grid gap-2 text-sm text-slate-300">Phone 2 (optional)<input name="phone_number_2" value={form.phone_number_2} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
          <label className="grid gap-2 text-sm text-slate-300">Salary(LKR)<input type="number" step="0.01" min="0" name="salary" value={form.salary} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
          <label className="grid gap-2 text-sm text-slate-300">Department<input name="department" value={form.department} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
          <label className="grid gap-2 text-sm text-slate-300">Role<input name="role" value={form.role} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
          <label className="grid gap-2 text-sm text-slate-300">Date of birth<input type="date" max={today} name="date_of_birth" value={form.date_of_birth} onChange={handleChange} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-100" /></label>
        </div>

        {success ? <p className="mt-4 text-sm text-emerald-300">{success}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      </form>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-xl shadow-cyan-950/20">
        {loading ? (
          <div className="px-6 py-12 text-sm text-slate-300">Loading staff...</div>
        ) : error ? (
          <div className="px-6 py-12 text-sm text-red-300">{error}</div>
        ) : staff.length === 0 ? (
          <div className="px-6 py-12 text-sm text-slate-300">No staff found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="px-6 py-3 font-medium">Staff</th>
                  <th className="px-6 py-3 font-medium">City</th>
                  <th className="px-6 py-3 font-medium">Country</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Phone</th>
                  <th className="px-6 py-3 font-medium">Department</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Salary(LKR)</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {staff.map((person) => (
                  <tr key={person.staff_id} className="hover:bg-white/5">
                    <td className="px-6 py-4 font-medium text-cyan-300">{person.first_name} {person.last_name}</td>
                    <td className="px-6 py-4 text-slate-300">{person.city || '—'}</td>
                    <td className="px-6 py-4 text-slate-300">{person.country || '—'}</td>
                    <td className="px-6 py-4 text-slate-300">{person.email || '—'}</td>
                    <td className="px-6 py-4 text-slate-300">{person.phone_numbers || '—'}</td>
                    <td className="px-6 py-4 text-slate-300">{person.department || '—'}</td>
                    <td className="px-6 py-4 text-slate-300">{person.role || '—'}</td>
                    <td className="px-6 py-4 text-slate-300">{person.salary}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => startEdit(person)} className="rounded-full border border-cyan-400/20 px-3 py-1 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/10">
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteStaff(person.staff_id)} className="rounded-full border border-red-400/20 px-3 py-1 text-xs font-medium text-red-200 transition hover:bg-red-400/10">
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

export default Staff;