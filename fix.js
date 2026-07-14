const fs = require('fs');

['js/db.js', 'js/promptEngine.js', 'js/app.js'].forEach(f => {
  try {
      let text = fs.readFileSync(f, 'utf8');
      text = text.replace(/\\`/g, '`');
      text = text.replace(/\\\${/g, '${');
      // Fix \n if it was escaped as \\n inside template literals. 
      // Actually, if it's supposed to be \n, the replace above is enough.
      fs.writeFileSync(f, text);
      console.log(`Fixed ${f}`);
  } catch(e) {
      console.error(e);
  }
});
