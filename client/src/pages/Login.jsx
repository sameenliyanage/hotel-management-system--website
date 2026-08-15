import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://127.0.0.1:5005/api/login', {
        email,
        password
      });

      if (response.data.success) {
        localStorage.setItem('hotelStaff', JSON.stringify(response.data.user));
        navigate('/dashboard'); 
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to connect to the server. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed bg-no-repeat flex items-center justify-center p-4 text-slate-100"
    style={{
        backgroundImage: `url('/login_bg.png')`
      }}
    >
      
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-800/80 p-8 shadow-2xl shadow-cyan-950/20 backdrop-blur">
        
        <div className="text-center mb-8">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Hotel Management System</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Staff Login</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">Sign in to access the HMS portal</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-900/30 p-4 text-center text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Staff Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-slate-100 transition focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              placeholder="admin@hotel.local"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-slate-100 transition focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`mt-4 flex w-full items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/20 ${
              loading ? 'cursor-not-allowed opacity-70' : ''
            }`}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;