const { app, BrowserWindow, session } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // 🔴 App එක Open වන මොහොතේම Session/Cache Clear කරයි (Error එන්නේ නැත)
  session.defaultSession.clearStorageData();

  win.loadFile(path.join(__dirname, 'dist/index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});