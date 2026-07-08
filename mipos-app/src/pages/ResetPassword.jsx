import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      
      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      toast.error(err.message || 'Error al enviar el correo de recuperación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-lg overflow-hidden">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="17" fill="#2563EB"/>
            <polyline points="17,32 27,43 47,22" stroke="white" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="font-display font-bold text-3xl tracking-tight text-text lowercase">mipos</span>
      </div>

      <div className="w-full max-w-md bg-surface-2 border border-border rounded-2xl p-4 md:p-8 shadow-2xl relative overflow-hidden">
        
        {success ? (
          <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-green-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-500/20">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-text mb-2">Correo Enviado</h2>
            <p className="text-muted text-sm md:text-[15px] leading-relaxed mb-6">
              Te enviamos un enlace de recuperación a <strong>{email}</strong>. Por favor, revisá tu bandeja de entrada o spam.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full bg-surface-2 hover:bg-surface-2 border border-border py-3.5 rounded-xl text-text font-medium transition-all"
            >
              Volver al Login
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-text mb-2">Recuperar contraseña</h2>
              <p className="text-muted text-sm md:text-[15px]">Ingresá el email asociado a tu cuenta</p>
            </div>

            <form onSubmit={handleResetSubmit} className="space-y-5">
              <div>
                <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-brand/50 text-text transition-colors"
                    placeholder="tu@negocio.com"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-brand hover:bg-brand-hover text-text font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_15px_rgba(82,82,255,0.25)] flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link 
                to="/login"
                className="inline-flex items-center gap-2 text-sm md:text-[15px] text-dim hover:text-text transition-colors"
              >
                <ArrowLeft size={16} /> Volver al Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
