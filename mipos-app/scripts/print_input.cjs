const fs = require('fs');
let lines = fs.readFileSync('src/pages/Users.jsx', 'utf8').split('\n');
let i = lines.findIndex(l => l.includes('defaultValue={u.sueldo || 0}'));
if(i !== -1) {
  for(let j=i-2; j<=i+15; j++) {
    console.log(j + ': ' + lines[j]);
  }
}
