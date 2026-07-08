const fs = require('fs');

let reportsPath = 'src/pages/Reports.jsx';
let rContent = fs.readFileSync(reportsPath, 'utf8');
rContent = rContent.split("profile?.role === 'Propietario'").join("['Propietario', 'Superadmin'].includes(profile?.role)");
fs.writeFileSync(reportsPath, rContent);

let usersPath = 'src/pages/Users.jsx';
let uContent = fs.readFileSync(usersPath, 'utf8');
uContent = uContent.split("currentRole === 'Propietario'").join("['Propietario', 'Superadmin'].includes(currentRole)");
fs.writeFileSync(usersPath, uContent);

console.log('Fixed roles check for Superadmin');
