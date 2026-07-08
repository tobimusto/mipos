import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Escuchar cambios de sesión. Cuando el usuario hace clic en el enlace del correo,
    // Supabase lo loguea automáticamente y redirige a esta página.
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Todo listo para actualizar
      }
    });
  }, []);

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: password });
      
      if (error) throw error;
      setSuccess(true);
      
      // Deslogueamos para que vuelva a iniciar sesión con la nueva contraseña
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err) {
      toast.error(err.message || 'Error al actualizar la contraseña');
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
            <h2 className="text-2xl font-bold text-text mb-2">¡Contraseña Actualizada!</h2>
            <p className="text-muted text-sm md:text-[15px] leading-relaxed mb-6">
              Tu contraseña ha sido cambiada exitosamente. Serás redirigido al login...
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-text mb-2">Nueva Contraseña</h2>
              <p className="text-muted text-sm md:text-[15px]">Ingresá tu nueva clave de acceso</p>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-5">
              <div>
                <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-2 border border-brand/30 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-brand text-text transition-colors tracking-widest"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Confirmar Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input 
                    type="password" 
                    required 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-surface-2 border border-brand/30 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-brand text-text transition-colors tracking-widest"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-brand hover:bg-brand-hover text-text font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_15px_rgba(82,82,255,0.25)] flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Actualizando...' : 'Actualizar contraseña'}
                <ArrowRight size={18} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
