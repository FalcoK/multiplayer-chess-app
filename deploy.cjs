const Client = require('ssh2-sftp-client');
const fs = require('fs');
const path = require('path');

const config = {
  host: 'access789326235.webspace-data.io',
  port: 22,
  username: 'u97803387',
  password: 'NwgtID7L!123'
};

async function uploadRecursive(sftp, localPath, remotePath) {
  const stats = fs.statSync(localPath);
  if (stats.isDirectory()) {
    const exists = await sftp.exists(remotePath);
    if (!exists) {
      console.log(`Erstelle remote Ordner: ${remotePath}`);
      await sftp.mkdir(remotePath);
    }
    const items = fs.readdirSync(localPath);
    for (const item of items) {
      const localItemPath = path.join(localPath, item);
      const remoteItemPath = remotePath + '/' + item;
      await uploadRecursive(sftp, localItemPath, remoteItemPath);
    }
  } else {
    console.log(`Lade Datei hoch: ${localPath} -> ${remotePath}`);
    await sftp.put(localPath, remotePath);
  }
}

async function main() {
  const sftp = new Client();
  try {
    console.log(`Verbinde zu Ionos SFTP: ${config.host}...`);
    await sftp.connect(config);
    console.log('Verbindung erfolgreich hergestellt!');

    const remotePath = './app789327016/multiplayer-chess-app';
    console.log(`Prüfe ob ${remotePath} existiert...`);
    
    const exists = await sftp.exists(remotePath);
    if (exists) {
      console.log(`Lösche altes Verzeichnis ${remotePath}...`);
      await sftp.rmdir(remotePath, true);
    }
    console.log(`Erstelle Verzeichnis ${remotePath}...`);
    await sftp.mkdir(remotePath);

    const localDist = path.join(__dirname, 'frontend', 'dist');
    console.log(`Starte Upload von ${localDist} nach ${remotePath}...`);
    await uploadRecursive(sftp, localDist, remotePath);
    
    console.log('\n=== UPLOAD ERFOLGREICH ABGESCHLOSSEN ===');
    console.log('Schach-Arena ist live unter: http://crazy-day.de/multiplayer-chess-app/');
  } catch (err) {
    console.error('Fehler beim Deploy:', err.message);
    process.exit(1);
  } finally {
    await sftp.end();
  }
}

main();
