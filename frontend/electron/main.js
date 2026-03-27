const { app, BrowserWindow } = require('electron');
const path = require('path');

const DEV = process.env.NODE_ENV !== 'production';
const NEXT_URL = DEV ? 'http://localhost:3000' : `file://${path.join(__dirname, '../.next/server/app/index.html')}`;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'PR Bot',
  });

  win.loadURL(DEV ? 'http://localhost:3000' : NEXT_URL);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
