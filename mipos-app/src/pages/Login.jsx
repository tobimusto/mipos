import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { translateSupabaseError } from '../utils/errors';
import { Store, User, Mail, Lock, Phone, LayoutDashboard, ChevronRight, CheckCircle2, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState(''); // Email o Username para login
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration States
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Wizard States
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [initialCash, setInitialCash] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { signIn, signUp, signOut } = useAuth();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);

      let loginEmail = identifier;
      
      // Si el identificador no parece un email, asumimos que es un username y lo buscamos
      if (!identifier.includes('@')) {
        const { data: authData, error: authError } = await supabase.rpc('get_email_by_username', { p_username: identifier });
        
        if (authError || !authData) {
          throw new Error('Usuario no encontrado o no se pudo resolver el email. Intentá usar tu email.');
        }
        
        loginEmail = authData;
      }

      const { data: signInData, error } = await signIn({ email: loginEmail, password });
      if (error) throw error;

      if (signInData?.user) {
        // Verificar si el usuario está activo
        const { data: profile } = await supabase
          .from('profiles')
          .select('active')
          .eq('id', signInData.user.id)
          .single();

        if (profile && profile.active === false) {
          await signOut(); // O await supabase.auth.signOut()
          throw new Error('Tu cuenta ha sido desactivada por el administrador.');
        }
      }

      navigate('/pos');
    } catch (err) {
      setError(translateSupabaseError(err.message || 'Error al iniciar sesión'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async () => {
    try {
      setError('');
      setLoading(true);
      
      const finalUsername = username || email.split('@')[0];
      const finalEmail = email || `${finalUsername}@miposlocal.com`;

      const { data: authData, error: authError } = await signUp({ 
        email: finalEmail, 
        password,
        options: {
          data: {
            username: finalUsername,
            full_name: name,
            business_name: businessName,
            category: category,
            phone: phone,
            initial_cash: initialCash
          }
        }
      });
      if (authError) throw authError;

      const user = authData?.user;
      if (user) {
        // Verificar si existen perfiles para determinar el rol
        const { data: existingProfiles, error: countError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);

        const isFirstUser = !existingProfiles || existingProfiles.length === 0;
        const role = isFirstUser ? 'Propietario' : 'Gerente';

        // Insertar en perfiles
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: finalUsername,
            role: role,
            owner_id: user.id // Un gerente/propietario registrado desde aquí es su propio owner
          });

        if (profileError) {
          console.error("Error creating profile:", profileError);
          // Opcional: mostrar un warning pero continuar
        }
      }

      navigate('/pos');
    } catch (err) {
      setError(translateSupabaseError(err.message || 'Error al registrarse'));
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if ((!email && !username) || !password || !confirmPassword) return setError('Completá usuario o email y contraseña');
      if (password !== confirmPassword) return setError('Las contraseñas no coinciden');
      if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres');
    }
    if (step === 2 && (!name || !businessName)) return setError('Completá nombre y negocio');
    if (step === 3 && (!category)) return setError('Seleccioná un rubro');
    
    setError('');
    if (step < 4) setStep(step + 1);
    else handleRegisterSubmit();
  };

  const renderWizardStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Nombre de Usuario (Opcional si hay email)</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  className="w-full bg-surface-2 border border-brand/30 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-brand text-text transition-colors"
                  placeholder="usuario_tienda"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Email del comercio (Opcional si hay usuario)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-2 border border-brand/30 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-brand text-text transition-colors"
                  placeholder="tu@negocio.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-2 border border-brand/30 rounded-xl py-3 pl-10 pr-10 focus:outline-none focus:border-brand text-text transition-colors tracking-widest"
                  placeholder="••••••••"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
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
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <label className="block text-sm md:text-[15px] font-medium text-text mb-2">¿Cómo te llamás?</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-2 border border-brand/30 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-brand text-text transition-colors"
                  placeholder="Juan Pérez"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Nombre de tu negocio</label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input 
                  type="text" 
                  required 
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-surface-2 border border-brand/30 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-brand text-text transition-colors"
                  placeholder="Kiosco El Sol"
                />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <label className="block text-sm md:text-[15px] font-medium text-text mb-2">¿Cuál es tu rubro principal?</label>
              <div className="relative">
                <LayoutDashboard className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <select 
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-surface-2 border border-brand/30 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-brand text-text transition-colors appearance-none"
                >
                  <option className="bg-surface-2 text-text" value="" disabled>Seleccioná un rubro...</option>
                  <option className="bg-surface-2 text-text" value="kiosco">Kiosco / Despensa</option>
                  <option className="bg-surface-2 text-text" value="almacen">Almacén / Minimercado</option>
                  <option className="bg-surface-2 text-text" value="indumentaria">Indumentaria / Ropa</option>
                  <option className="bg-surface-2 text-text" value="gastronomia">Gastronomía</option>
                  <option className="bg-surface-2 text-text" value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Teléfono (opcional)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-brand/50 text-text transition-colors"
                  placeholder="+54 9 11..."
                />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 text-center">
            <div className="bg-brand/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-brand/20">
              <CheckCircle2 size={32} className="text-brand" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-text mb-2">¡Todo listo! Último paso</h3>
              <p className="text-sm md:text-[15px] text-muted">Para arrancar, decinos con cuánto efectivo abrís tu caja hoy.</p>
            </div>
            <div className="relative max-w-[200px] mx-auto">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-text">$</span>
              <input 
                type="number" 
                required 
                value={initialCash}
                onChange={(e) => setInitialCash(e.target.value)}
                className="w-full bg-surface-2 border border-brand rounded-xl py-4 pl-8 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/50 text-text text-xl font-bold text-center transition-all shadow-[0_0_15px_rgba(82,82,255,0.15)]"
                placeholder="0"
              />
            </div>
          </div>
        );
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
        
        {/* Toggle / Header */}
        <div className="mb-8">
          {isLogin ? (
            <>
              <h2 className="text-2xl font-bold text-text mb-2">Bienvenido de nuevo</h2>
              <p className="text-muted text-sm md:text-[15px]">Ingresá para gestionar tu negocio</p>
            </>
          ) : (
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-text mb-1">Crear cuenta</h2>
                <p className="text-muted text-sm md:text-[15px]">Paso {step} de 4</p>
              </div>
              {/* Wizard Progress Dots */}
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-brand' : i < step ? 'w-2 bg-brand' : 'w-2 bg-mipos-txt3'}`} />
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm md:text-[15px] mb-6 animate-in fade-in">
            {error}
          </div>
        )}

        {isLogin ? (
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Usuario o Email</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input 
                  type="text" 
                  required 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-brand/50 text-text transition-colors"
                  placeholder="juan.kiosco o admin@correo.com"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm md:text-[15px] font-medium text-text">Contraseña</label>
                <button 
                  type="button"
                  onClick={() => navigate('/reset-password')}
                  className="text-sm md:text-[15px] text-brand hover:text-text transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl py-3 pl-10 pr-10 focus:outline-none focus:border-brand/50 text-text transition-colors tracking-widest"
                  placeholder="••••••••"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-hover text-text font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_15px_rgba(82,82,255,0.25)] flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando...' : 'Ingresar'}
              <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {renderWizardStep()}
            
            <button 
              onClick={nextStep}
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-hover text-text font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_15px_rgba(82,82,255,0.25)] flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
            >
              {step < 4 ? (
                <>Continuar <ChevronRight size={18} /></>
              ) : (
                <>{loading ? 'Creando cuenta...' : 'Finalizar y entrar'}</>
              )}
            </button>
            
            {step > 1 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="w-full py-2 text-sm md:text-[15px] text-muted hover:text-text transition-colors"
              >
                Volver atrás
              </button>
            )}
          </div>
        )}

        {/* Footer Link */}
        {!isLogin && step > 1 ? null : (
          <div className="mt-8 text-center text-sm md:text-[15px] text-muted border-t border-border pt-6">
            {isLogin ? '¿No tenés cuenta? ' : '¿Ya tenés cuenta? '}
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setStep(1);
                setError('');
              }}
              className="text-brand font-bold hover:underline ml-1"
            >
              {isLogin ? 'Registrate gratis' : 'Iniciá sesión'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 text-sm md:text-[15px] text-dim flex items-center gap-2">
        <span>Desarrollado por</span>
        <a 
          href="https://codetm.site" 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-display font-bold text-text hover:text-brand transition-colors tracking-wide"
        >
          CodeTM
        </a>
      </div>
    </div>
  );
}
