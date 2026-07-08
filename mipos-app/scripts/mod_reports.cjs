const fs = require('fs');

let lines = fs.readFileSync('src/pages/Reports.jsx', 'utf8').split('\n');
let index = lines.findIndex(l => l.includes('{emp.anuladasCount} anuladas</span>'));
if (index !== -1) {
  lines.splice(index + 2, 0,
    "                      {profile?.role === 'Propietario' && (",
    "                        <div className=\"mt-3 bg-surface border border-border rounded-lg px-2.5 py-1.5 flex items-center justify-between\">",
    "                          <span className=\"text-muted font-bold text-[13px] uppercase tracking-wider\">Sueldo Base</span>",
    "                          <span className=\"font-bold text-text text-[15px] md:text-base\">${fmt(emp.sueldo || 0)}</span>",
    "                        </div>",
    "                      )}"
  );
  fs.writeFileSync('src/pages/Reports.jsx', lines.join('\n'));
  console.log('Successfully added sueldo block to Reports.jsx');
} else {
  console.log('Target line not found in Reports.jsx');
}
