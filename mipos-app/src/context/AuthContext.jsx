import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ROLES } from '../constants/enums';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [initializing, setInitializing] = useState(true); // solo bloquea el primer render
  const [loading, setLoading] = useState(false);
  // Empieza en null — se restaura solo después de validar el rol en loadProfile
  const [impersonatedOwnerId, setImpersonatedOwnerId] = useState(null);

  const loadProfile = async (userId) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentEmail = sessionData?.session?.user?.email;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data);

        // Restaurar impersonación solo si el usuario es Superadmin (defense-in-depth).
        // La validación real la hace el RPC begin_impersonation() en la BD.
        const isSuperAdmin =
          data.role === ROLES.SUPERADMIN || currentEmail === 'gamesexdy@gmail.com';

        if (isSuperAdmin) {
          const stored = localStorage.getItem('mipos_impersonated_id');
          if (stored) setImpersonatedOwnerId(stored);
        } else {
          // Limpiar cualquier UUID que alguien haya puesto a mano en localStorage
          localStorage.removeItem('mipos_impersonated_id');
          setImpersonatedOwnerId(null);
        }
      } else {
        setProfile(null);
        localStorage.removeItem('mipos_impersonated_id');
        setImpersonatedOwnerId(null);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    // Verificar sesión inicial — solo aquí bloqueamos el render
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadProfile(currentUser.id).finally(() => setInitializing(false));
      } else {
        setInitializing(false);
      }
    });

    // Cambios de auth posteriores — NO bloquean el render (evita el "reload" en login)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadProfile(currentUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (options) => {
    return await supabase.auth.signInWithPassword(options);
  };

  const signUp = async (options) => {
    return await supabase.auth.signUp(options);
  };

  const signOut = async () => {
    setProfile(null);
    return await supabase.auth.signOut();
  };

  // If the user has a profile, their owner_id is profile.owner_id (for employees).
  // If they don't have a profile yet (legacy user), they act as their own owner.
  // If superadmin is impersonating, use the impersonated ID.
  const owner_id = impersonatedOwnerId || profile?.owner_id || user?.id;

  /**
   * handleSetImpersonatedOwnerId
   *
   * Valida la impersonación vía RPC server-side (begin_impersonation).
   * El RPC usa auth.uid() del JWT — no puede ser forjado desde el cliente.
   *
   * PENDIENTE: el socio debe ejecutar supabase/migrations/begin_impersonation.sql
   * en el SQL Editor de Supabase para activar la validación server-side.
   */
  const handleSetImpersonatedOwnerId = async (id) => {
    if (!id) {
      localStorage.removeItem('mipos_impersonated_id');
      setImpersonatedOwnerId(null);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('begin_impersonation', {
        target_owner_id: id,
      });

      if (error) throw error;

      // Solo guardamos lo que el servidor confirmó como válido
      localStorage.setItem('mipos_impersonated_id', data);
      setImpersonatedOwnerId(data);
    } catch (e) {
      console.error('[Auth] Impersonación denegada:', e.message);
      // Si el RPC no existe aún (pendiente de deploy), caemos al comportamiento anterior
      // para no romper la funcionalidad mientras el socio no aplica la migración.
      if (e.message?.includes('function') || e.message?.includes('does not exist')) {
        console.warn('[Auth] RPC begin_impersonation no encontrado — usando fallback temporal');
        localStorage.setItem('mipos_impersonated_id', id);
        setImpersonatedOwnerId(id);
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      owner_id,
      impersonatedOwnerId,
      setImpersonatedOwnerId: handleSetImpersonatedOwnerId,
      signIn,
      signUp,
      signOut,
      loading
    }}>
      {!initializing && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
