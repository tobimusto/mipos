const fs = require('fs');

let usersPath = 'src/pages/Users.jsx';
let content = fs.readFileSync(usersPath, 'utf8');

// 1. Imports
content = content.replace(
  "import { Search, Filter, Mail, UserPlus, Shield, X, ChevronDown, Loader2, User as UserIcon } from 'lucide-react';",
  "import { Search, Filter, Mail, UserPlus, Shield, X, ChevronDown, Loader2, User as UserIcon, Wallet, Edit2 } from 'lucide-react';"
);

// 2. States
content = content.replace(
  "  const [roleToChange, setRoleToChange] = useState(null);",
  "  const [roleToChange, setRoleToChange] = useState(null);\n  const [sueldoModal, setSueldoModal] = useState(null);\n  const [sueldoEditVal, setSueldoEditVal] = useState('');"
);

// 3. Table cell replacement
const oldCell = `                          <div className="flex items-center justify-end gap-1">
                            <span className="text-muted">$</span>
                            <input 
                              type="number"
                              defaultValue={u.sueldo || 0}
                              onBlur={async (e) => {
                                 const val = e.target.value;
                                 if (val !== String(u.sueldo)) {
                                    const { error } = await supabase.from('profiles').update({ sueldo: val }).eq('id', u.id);
                                    if(!error) {
                                       toast.success('Sueldo actualizado');
                                       u.sueldo = val;
                                    } else {
                                       toast.error('Ocurrió un error. Asegurate de que el script SQL se ejecutó.');
                                    }
                                 }
                              }}
                              className="bg-transparent border border-border rounded w-32 px-2 py-1 text-sm md:text-[15px] text-text focus:border-brand text-right"
                            />
                          </div>`;

const newCell = `                          <button 
                            onClick={() => {
                              setSueldoModal(u);
                              setSueldoEditVal(u.sueldo || '');
                            }}
                            className="text-sm md:text-[15px] font-medium text-brand bg-brand/10 hover:bg-brand/20 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5"
                          >
                            <Wallet size={16} /> Ver / Editar
                          </button>`;

content = content.replace(oldCell, newCell);

// 4. Modal at the end
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
                    // Re-using processing state
                    setProcessing(true);
                    try {
                      const { error } = await supabase.from('profiles').update({ sueldo: Number(sueldoEditVal) || 0 }).eq('id', sueldoModal.id);
                      if (error) throw error;
                      toast.success('Sueldo actualizado exitosamente');
                      
                      // Immediate update via DOM since users mapping uses state
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

content = content.replace("    </div>\r\n  );\r\n}", modalJSX).replace("    </div>\n  );\n}", modalJSX);

fs.writeFileSync(usersPath, content);
console.log('Successfully updated Users.jsx with Sueldo modal');
