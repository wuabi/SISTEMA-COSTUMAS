const { app, BrowserWindow } = require('electron');
const path = require('path');

function crearVentana() {

    const ventana = new BrowserWindow({
        width: 1100,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    ventana.loadFile(path.join(__dirname, 'views', 'login.html'));
}

app.whenReady().then(crearVentana);
