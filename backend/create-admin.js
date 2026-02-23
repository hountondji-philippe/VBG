'use strict';

const bcrypt   = require('bcrypt');
const mysql    = require('mysql2/promise');
const readline = require('readline');
require('dotenv').config();

// Lit une ligne depuis le terminal, avec masquage optionnel
function prompt(question, hidden = false) {
  return new Promise((resolve) => {
    if (hidden && process.stdin.isTTY) {
      process.stdout.write(question);
      process.stdin.setRawMode(true);
      process.stdin.resume();

      let input = '';
      process.stdin.on('data', function handler(ch) {
        const char = ch.toString();
        if (char === '\n' || char === '\r' || char === '\u0004') {
          process.stdin.setRawMode(false);
          process.stdin.removeListener('data', handler);
          process.stdout.write('\n');
          resolve(input);
        } else if (char === '\u0003') {
          process.exit();
        } else if (char === '\u007f') {
          if (input.length > 0) input = input.slice(0, -1);
        } else {
          input += char;
        }
      });
    } else {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
    }
  });
}

async function main() {
  console.log('\n--- Création / mise à jour du compte administrateur ---\n');

  // Nom d'utilisateur : depuis .env ou saisi manuellement
  let username = process.env.ADMIN_USERNAME || '';
  if (username) {
    console.log(`Nom d'utilisateur : ${username}  (lu depuis .env)`);
  } else {
    username = await prompt("Nom d'utilisateur (ex: admin@vbg.bj) : ");
  }

  if (!username) {
    console.error("\nErreur : le nom d'utilisateur ne peut pas être vide.");
    process.exit(1);
  }

  // Mot de passe : toujours saisi dans le terminal, jamais stocké dans .env
  const password = await prompt('Mot de passe (12 caractères min) : ', true);

  if (!password || password.length < 12) {
    console.error('\nErreur : le mot de passe doit faire au moins 12 caractères.');
    process.exit(1);
  }

  const confirm = await prompt('Confirmez le mot de passe : ', true);

  if (password !== confirm) {
    console.error('\nErreur : les mots de passe ne correspondent pas.');
    process.exit(1);
  }

  console.log('\nCréation du hash bcrypt...');
  const hash = await bcrypt.hash(password, 12);

  const db = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     Number(process.env.DB_PORT) || 3306,
  });

  await db.execute(
    'INSERT INTO admins (username, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE password_hash = ?',
    [username, hash, hash]
  );

  await db.end();

  console.log(`\nAdmin "${username}" enregistré avec succès.`);
  console.log(`Connectez-vous sur /admin/admin.html\n`);
}

main().catch(err => {
  console.error('\nErreur :', err.message);
  process.exit(1);
});
