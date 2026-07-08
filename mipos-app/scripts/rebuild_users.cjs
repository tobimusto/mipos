const fs = require('fs');
let content = fs.readFileSync('src/pages/Users.jsx', 'utf8');

// 1. Imports
content = content.replace(
  "import { Search, Filter, Mail, UserPlus, Shield, X, ChevronDown, Loader2, User as UserIcon } from 'lucide-react';",
  "import { Search, Filter, Mail, UserPlus, Shield, X, ChevronDown, Loader2, User as UserIcon, Wallet, Edit2 } from 'lucide-react';\nimport { toast } from 'react-hot-toast';"
);

// 2. States
content = content.replace(
  "  const [roleToChange, setRoleToChange] = useState(null);",
  "  const [roleToChange, setRoleToChange] = useState(null);\n  const [sueldoModal, setSueldoModal] = useState(null);\n  const [sueldoEditVal, setSueldoEditVal] = useState('');"
);

content = content.replace(
  "  const [role, setRole] = useState('Empleado');",
  "  const [role, setRole] = useState('Empleado');\n  const [sueldo, setSueldo] = useState('');"
);

// 3. handleCreateUser update profile
content = content.replace(
  "      if (name) {",
  `      const updateData = {};
      if (name) updateData.full_name = name;
      if (sueldo) updateData.sueldo = Number(sueldo);
      
      if (Object.keys(updateData).length > 0) {`
);

content = content.replace(
  "        const { error: profileError } = await supabase.from('profiles').update({ full_name: name }).eq('id', newUserId);",
  "        const { error: profileError } = await supabase.from('profiles').update(updateData).eq('id', newUserId);"
);

// 4. Reset form
content = content.replace(
  "    setRole('Empleado');",
  "    setRole('Empleado');\n    setSueldo('');"
);

// 5. Table Header
content = content.replace(
  "                  <th className=\"p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border\">Fecha registro</th>",
  `                  <th className="p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border">Fecha registro</th>
                  {['Propietario', 'Superadmin'].includes(currentRole) && (
                    <th className="p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border text-right">Sueldo</th>
                  )}`
);

// 6. Table Cell
const cellContent = `                    <td className="p-4 text-muted text-sm md:text-[15px]">
                      {new Date(u.created_at).toLocaleDateString('es-AR')}
                    </td>
                    {['Propietario', 'Superadmin'].includes(currentRole) && (
                      <td className="p-4 text-right">
                        {u.role !== 'Propietario' ? (
                          <button 
                            onClick={() => {
                              setSueldoModal(u);
                              setSueldoEditVal(u.sueldo || '');
                            }}
                            className="text-sm md:text-[15px] font-medium text-brand bg-brand/10 hover:bg-brand/20 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5"
                          >
                            <Wallet size={16} /> Ver / Editar
                          </button>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    )}`;
content = content.replace(
  `                    <td className="p-4 text-muted text-sm md:text-[15px]">\n                      {new Date(u.created_at).toLocaleDateString('es-AR')}\n                    </td>`,
  cellContent
);

// 7. Add User Modal sueldo input
content = content.replace(
  `                {currentRole === 'Propietario' && (\n                  <div>`,
  `                {['Propietario', 'Superadmin'].includes(currentRole) && (
                  <div>
                    <label className="block text-sm md:text-[15px] font-bold text-text mb-2 mt-2">Sueldo Base (Opcional)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-mono">$</span>
                      <input 
                        type="number" 
                        value={sueldo}
                        onChange={(e) => setSueldo(e.target.value)}
                        placeholder="0"
                        className="w-full bg-surface-2 border border-border rounded-lg py-3 pl-8 pr-4 text-sm md:text-[15px] focus:outline-none focus:border-brand/50 text-text transition-colors"
                      />
                    </div>
                  </div>
                )}
                {['Propietario', 'Superadmin'].includes(currentRole) && (
                  <div>`
);

// 8. Add SueldoModal at the end
const modalJSX = `
      {/* Sueldo Modal */}
      {sueldoModal && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <button 
              onClick={() => setSueldoModal(null)}
              className="absolute right-4 top-4 text-muted hover:text-text transition-colors"
            >
              <X size={20} />
            </button>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand/20 text-brand flex items-center justify-center">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-text">Sueldo Base</h3>
                  <p className="text-sm text-muted">@{sueldoModal.username}</p>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm md:text-[15px] font-bold text-text mb-2">Monto asignado ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
                  <input 
                    type="number" 
                    value={sueldoEditVal}
                    onChange={(e) => setSueldoEditVal(e.target.value)}
                    placeholder="0"
                    autoFocus
                    className="w-full bg-bg border border-border rounded-xl py-3 pl-8 pr-4 text-sm md:text-[15px] focus:outline-none focus:border-brand/50 text-text transition-colors font-mono text-lg"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setSueldoModal(null)}
                  className="flex-1 bg-surface-2 hover:bg-border text-text font-bold py-3 rounded-xl transition-all text-sm md:text-[15px]"
                >
                  Cancelar
                </button>
                <button 
                  disabled={processing}
                  onClick={async () => {
                    setProcessing(true);
                    try {
                      const { error } = await supabase.from('profiles').update({ sueldo: Number(sueldoEditVal) || 0 }).eq('id', sueldoModal.id);
                      if (error) throw error;
                      toast.success('Sueldo actualizado exitosamente');
                      setUsers(prev => prev.map(u => u.id === sueldoModal.id ? { ...u, sueldo: Number(sueldoEditVal) || 0 } : u));
                      setSueldoModal(null);
                    } catch (err) {
                      toast.error('Error al actualizar el sueldo');
                    } finally {
                      setProcessing(false);
                    }
                  }}
                  className="flex-1 bg-brand hover:bg-brand-hover text-text font-bold py-3 rounded-xl transition-all text-sm md:text-[15px] flex justify-center items-center gap-2"
                >
                  {processing ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

content = content.replace("    </div>\n  );\n}", modalJSX);

// Apply fix for user permissions check
content = content.replace("const currentRole = profile?.role || 'Propietario';", "const currentRole = profile?.role || 'Propietario';");
content = content.replace(
  "if (currentRole !== 'Gerente' && currentRole !== 'Propietario' && currentRole !== 'Superadmin')",
  "if (currentRole !== 'Gerente' && currentRole !== 'Propietario' && currentRole !== 'Superadmin')"
);

fs.writeFileSync('src/pages/Users.jsx', content);
console.log('Rebuilt Users.jsx with Sueldo modifications!');
