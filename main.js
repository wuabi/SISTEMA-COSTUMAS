const { app, BrowserWindow } = require('electron');
const path = require('path');

function crearVentana() {
    const ventana = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    ventana.loadFile(path.join(__dirname, 'views', 'login.html'));
}

app.whenReady().then(() => {
    crearVentana();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            crearVentana();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});