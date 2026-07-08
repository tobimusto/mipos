import { useState, useEffect } from 'react';
import { Search, Filter, Mail, UserPlus, Shield, X, ChevronDown, Loader2, User as UserIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { translateSupabaseError } from '../utils/errors';
import { usePlan } from '../hooks/usePlan';

export default function Users() {
  const { owner_id, profile } = useAuth();
  const plan = usePlan();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('crear'); // crear | invitar
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Empleado');

  useEffect(() => {
    if (owner_id) {
      fetchUsers();
    }
  }, [owner_id]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('owner_id', owner_id)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!username && !email) {
      return toast.error('Completá al menos el Nombre de Usuario o el Email');
    }
    
    if (password.length < 6) {
      return toast.error('La contraseña debe tener al menos 6 caracteres');
    }

    const finalUsername = username || email.split('@')[0];
    const finalEmail = email || `${finalUsername}@${owner_id.split('-')[0]}.local`;

    setProcessing(true);
    try {
      // 1. Llamar a la RPC para crear el usuario en auth.users
      const { data: newUserId, error: rpcError } = await supabase.rpc('create_employee', {
        emp_email: finalEmail,
        emp_password: password,
        emp_username: finalUsername,
        emp_role: role
      });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        throw new Error(rpcError.message || 'Error al crear credenciales del usuario');
      }

      // 2. Actualizar el perfil con el nombre completo (el RPC ya lo creó)
      if (name) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: name })
          .eq('id', newUserId);
        
        if (profileError) throw profileError;
      }

      toast.success('Usuario creado exitosamente');
      setShowModal(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      toast.error(translateSupabaseError(err.message || 'Error al crear el usuario'));
    } finally {
      setProcessing(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      toast.success('Rol actualizado');
      fetchUsers();
    } catch (err) {
      toast.error('Error al actualizar el rol');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    const { id: userId, username } = userToDelete;

    try {
      setProcessing(true);
      // Intenta borrarlo directamente
      const { error: deleteError } = await supabase.rpc('delete_employee', { emp_id: userId });
      
      if (deleteError) {
        // Si falla por foreign key (tiene ventas), lo desactivamos
        if (deleteError.message.includes('foreign key') || deleteError.code === '23503') {
           const { error: deactError } = await supabase.rpc('deactivate_employee', { emp_id: userId });
           if (deactError) throw deactError;
           
           // Lo eliminamos de la vista cambiando su rol a 'Desactivado' en profiles? No, si le cambiamos la pass ya no entra.
           // Lo marcamos visualmente o lo borramos de profiles si no afecta las ventas
           toast.success(`El empleado tiene ventas. Su acceso ha sido desactivado permanentemente.`);
        } else {
           throw deleteError;
        }
      } else {
        toast.success('Empleado borrado exitosamente.');
      }
      
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      console.error('Error al borrar/desactivar:', err);
      toast.error(translateSupabaseError(err.message || 'Error al procesar la solicitud.'));
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setRole('Empleado');
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const currentRole = profile?.role || 'Propietario';
  if (currentRole !== 'Gerente' && currentRole !== 'Propietario' && currentRole !== 'Superadmin') {
    return (
      <div className="flex flex-col h-full bg-bg items-center justify-center p-8 text-center">
        <Shield size={48} className="text-brand mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-text mb-2">Acceso Restringido</h2>
        <p className="text-muted">No tenés permisos para gestionar los usuarios del sistema.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-bg p-4 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-text">Usuarios</h1>
          <p className="text-sm text-muted">Gestiona el equipo de tu negocio</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button className="flex items-center gap-2 text-sm font-medium text-muted hover:text-text transition-colors bg-surface px-4 py-2.5 rounded-xl border border-border">
            <Mail size={16} /> Invitaciones Pendientes
          </button>
          <button 
            onClick={() => {
              if (users.length >= plan.maxUsers) {
                toast.error(`Límite alcanzado: tu plan permite hasta ${plan.maxUsers} usuarios. Mejorá tu plan para sumar más equipo.`);
              } else {
                setShowModal(true);
              }
            }}
            className="bg-brand hover:bg-brand-hover text-text font-bold py-2.5 px-5 rounded-xl transition-all text-sm flex items-center gap-2"
          >
            <UserPlus size={18} />
            Agregar Usuario
          </button>
        </div>
      </div>
      
      <div className="bg-surface-2 border border-border rounded-2xl flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-border bg-surface flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input 
              type="text" 
              placeholder="Buscar usuarios..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brand/50 transition-colors text-text"
            />
          </div>
          <button className="bg-bg border border-border hover:bg-surface px-4 py-2 rounded-xl text-sm font-medium transition-colors text-text flex items-center gap-2 w-full sm:w-auto justify-center">
            <Filter size={16} /> Filtros
          </button>
        </div>

        {/* Header content */}
        <div className="p-4 md:p-6 border-b border-border bg-surface flex justify-between items-center">
          <div>
            <h3 className="font-bold text-text text-sm">Mi equipo</h3>
            <p className="text-xs text-muted mt-1">Gestiona los accesos y roles dentro de tu negocio.</p>
          </div>
          <div className="text-sm text-muted text-right">
            <span className="font-bold text-text">{users.length}</span> / {plan.maxUsers} usuarios
            {users.length >= plan.maxUsers && <div className="text-xs text-[#ff5252] font-bold">Límite alcanzado</div>}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-muted">
              <Loader2 className="animate-spin mr-2" size={24} /> Cargando usuarios...
            </div>
          ) : (
            <table className="w-full min-w-[640px] text-left border-collapse">
              <thead className="bg-surface sticky top-0 z-10">
                <tr>
                  <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border">Nombre / Usuario</th>
                  <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border">Rol</th>
                  <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border">Fecha registro</th>
                  <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-surface transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand/20 text-brand flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                          {u.full_name ? u.full_name.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-text text-sm">{u.full_name || u.username}</div>
                          <div className="text-xs text-dim">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={u.role === 'Propietario'}
                        className="bg-transparent border border-border rounded px-2 py-1 text-sm text-text focus:border-brand disabled:opacity-50"
                      >
                        <option className="bg-surface-2 text-text" value="Propietario" disabled>Propietario</option>
                        <option className="bg-surface-2 text-text" value="Gerente">Gerente</option>
                        <option className="bg-surface-2 text-text" value="Empleado PLUS">Empleado PLUS</option>
                        <option className="bg-surface-2 text-text" value="Empleado">Empleado</option>
                        <option className="bg-surface-2 text-text" value="Cajero">Cajero</option>
                      </select>
                    </td>
                    <td className="p-4 text-muted text-sm">
                      {new Date(u.created_at).toLocaleDateString('es-AR')}
                    </td>
                    <td className="p-4 text-right">
                      {u.role !== 'Propietario' && (
                        <button 
                          onClick={() => setUserToDelete(u)}
                          className="text-xs text-red-400 hover:text-red-300 font-medium bg-red-400/10 hover:bg-red-400/20 px-2 py-1 rounded transition-colors"
                        >
                          Desactivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-muted">
                      No se encontraron usuarios
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Agregar Usuario Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl w-full max-w-[450px] max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button 
              onClick={() => { setShowModal(false); resetForm(); }}
              className="absolute top-4 right-4 text-dim hover:text-text transition-colors"
            >
              <X size={18} />
            </button>
            
            <div className="p-6 pb-4 border-b border-transparent">
              <h2 className="text-lg font-display font-bold text-text mb-1">Agregar usuario al negocio</h2>
              <p className="text-sm text-muted">Crea una cuenta para tu empleado</p>
            </div>

            <div className="p-6 pt-0 space-y-4">
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text mb-2">Nombre Completo</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Juan Pérez"
                    className="w-full bg-surface-2 border border-border rounded-lg py-3 px-4 text-sm focus:outline-none focus:border-brand/50 text-text transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text mb-2">Nombre de Usuario (Opcional si hay email)</label>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="juan.kiosco"
                    className="w-full bg-surface-2 border border-border rounded-lg py-3 px-4 text-sm focus:outline-none focus:border-brand/50 text-text transition-colors"
                  />
                  <p className="text-[10px] text-dim mt-1">Lo usará para iniciar sesión.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text mb-2">Email (Opcional si hay usuario)</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="empleado@correo.com"
                    className="w-full bg-surface-2 border border-border rounded-lg py-3 px-4 text-sm focus:outline-none focus:border-brand/50 text-text transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text mb-2">Contraseña Temporal *</label>
                  <input 
                    type="password" 
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-surface-2 border border-border rounded-lg py-3 px-4 text-sm focus:outline-none focus:border-brand/50 text-text transition-colors tracking-widest"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text mb-2 mt-2">Rol de Acceso *</label>
                  <div className="relative">
                    <select 
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-surface-2 border border-border rounded-lg py-3 px-4 text-sm focus:outline-none focus:border-brand/50 text-text transition-colors appearance-none"
                    >
                      <option className="bg-surface-2 text-text" value="Gerente">Gerente (Acceso total)</option>
                      <option className="bg-surface-2 text-text" value="Empleado PLUS">Empleado PLUS (Caja + Inventario)</option>
                      <option className="bg-surface-2 text-text" value="Empleado">Empleado (Solo Venta e Inventario)</option>
                      <option className="bg-surface-2 text-text" value="Cajero">Cajero (Solo Venta)</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={16} />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={processing}
                  className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-text font-bold py-3.5 rounded-xl transition-all text-sm mt-4 shadow-[0_4px_20px_rgba(82,82,255,0.2)] flex justify-center items-center gap-2"
                >
                  {processing && <Loader2 size={16} className="animate-spin" />}
                  {processing ? 'Creando...' : 'Crear Cuenta'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-bg border border-border rounded-2xl w-full max-w-[400px] shadow-2xl relative overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-display font-bold text-text mb-2">¿Borrar empleado?</h2>
              <p className="text-sm text-muted mb-6">
                Estás a punto de borrar a <span className="font-bold text-text">@{userToDelete.username}</span>. Si este empleado ya tiene ventas registradas, no se borrará para preservar tu historial, sino que <strong>se le quitará el acceso permanentemente</strong>.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setUserToDelete(null)}
                  disabled={processing}
                  className="flex-1 bg-bg border border-border hover:bg-surface text-text font-medium py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteUser}
                  disabled={processing}
                  className="flex-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 border border-red-500/20 font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processing && <Loader2 size={14} className="animate-spin" />}
                  {processing ? 'Procesando...' : 'Sí, continuar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
