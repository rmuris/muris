import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await auth.login(email, password);
      login(token, user);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-brand">
            <span className="font-heading font-bold text-white text-lg">M</span>
          </div>
          <div>
            <div className="font-heading font-bold text-white text-lg">Muris TMS</div>
            <div className="text-brand-300 text-xs">Transportation Management</div>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="font-heading font-bold text-4xl text-white leading-tight mb-4">
            Logistics<br />
            <span className="text-transparent bg-clip-text bg-gradient-brand">Intelligence</span><br />
            Redefined.
          </h1>
          <p className="text-brand-300 text-base leading-relaxed max-w-sm">
            Track every shipment, coordinate carriers and customs brokers, and manage your entire operation from one platform.
          </p>
        </div>

        <div className="flex gap-8 relative z-10">
          {[
            { value: '6+', label: 'Portal Types' },
            { value: '100%', label: 'Traceable' },
            { value: '24/7', label: 'Operations' },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="font-heading font-bold text-2xl text-white">{value}</div>
              <div className="text-brand-300 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-brand">
              <span className="font-heading font-bold text-white text-lg">M</span>
            </div>
            <span className="font-heading font-bold text-white text-lg">Muris TMS</span>
          </div>

          <div className="card border border-white/10">
            <div className="mb-8">
              <h2 className="font-heading font-bold text-2xl text-white mb-1.5">Welcome back</h2>
              <p className="text-brand-300 text-sm">Sign in to access your portal</p>
            </div>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-brand-200 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@muris.com"
                  required
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-200 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-dark w-full"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full text-center disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-brand-400">
              Don't have access? Contact your administrator.
            </p>

            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-xs text-brand-400 mb-2.5">Available portals</p>
              <div className="flex flex-wrap gap-1.5">
                {['Staff', 'Customer', 'Supplier', 'US Carrier', 'MX Carrier', 'Customs'].map(p => (
                  <span key={p} className="text-[10px] px-2.5 py-0.5 rounded-full bg-brand-800/60 text-brand-300 border border-white/5">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
