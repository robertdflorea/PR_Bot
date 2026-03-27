const { app, BrowserWindow, Menu } = require('electron');
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
    win.loadURL('http://localhost:4600');
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
});
app.on('window-all-closed', () => app.quit());
