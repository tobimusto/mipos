const fs = require('fs');

let indexHtml = fs.readFileSync('E:/ANTIGRAVITY/mipos1/mipos/index.html', 'utf8');
let indexUyHtml = fs.readFileSync('E:/ANTIGRAVITY/mipos1/mipos/indexuy.html', 'utf8');

// 1. In indexuy.html, change the Soporte Whatsapp link
const waRegex = /href="[^"]*"([^>]*>)\s*Escribinos por WhatsApp/;
const waReplacement = 'href="https://wa.me/59892220820"$1\n        Escribinos por WhatsApp';
indexUyHtml = indexUyHtml.replace(waRegex, waReplacement);

// 2. In indexuy.html, modify the "Elegir este plan" buttons in pricing
// They currently look like: <a href="https://app.mipos.online/login" class="btn btn-ghost ptag-cta">Elegir este plan</a>
const btnRegex = /<a href="https:\/\/app\.mipos\.online\/login" class="btn btn-ghost ptag-cta">Elegir este plan<\/a>/g;
indexUyHtml = indexUyHtml.replace(btnRegex, '<a href="#" onclick="openTransferModal(this); return false;" class="btn btn-ghost ptag-cta">Elegir este plan</a>');

const btnSolidRegex = /<a href="https:\/\/app\.mipos\.online\/login" class="btn btn-blue ptag-cta">Elegir este plan<\/a>/g;
indexUyHtml = indexUyHtml.replace(btnSolidRegex, '<a href="#" onclick="openTransferModal(this); return false;" class="btn btn-blue ptag-cta">Elegir este plan</a>');

// 3. Extract the modal style and script from index.html
const modalRegex = /(<style>\s*\.tr-modal-overlay \{[\s\S]*?)<\/html>/;
const match = indexHtml.match(modalRegex);

if (match) {
  let modalContent = match[1];
  
  // Modify the WhatsApp link in the modal JS
  modalContent = modalContent.replace(/https:\/\/wa\.me\/5491124017714/g, 'https://wa.me/59892220820');
  
  // Append the modal just before </body> in indexuy.html
  // But wait, the modal in index.html is AFTER </body> </html>. Let's see how indexuy.html ends.
  if (indexUyHtml.includes('</body>')) {
    indexUyHtml = indexUyHtml.replace('</body>', modalContent + '\n</body>');
  } else {
    indexUyHtml += '\n' + modalContent;
  }
} else {
  console.log("Could not find modal in index.html. Check the regex.");
}

fs.writeFileSync('E:/ANTIGRAVITY/mipos1/mipos/indexuy.html', indexUyHtml);
console.log("Updated indexuy.html");
