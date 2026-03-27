const { app, BrowserWindow } = require('electron');
const path = require('path');

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

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '../out/index.html'));
  } else {
    win.loadURL('http://localhost:3000');
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
