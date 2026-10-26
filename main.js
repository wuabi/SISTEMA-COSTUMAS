const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let usuarioAutenticado = null;

ipcMain.handle('guardar-sesion', (_evento, usuario) => {
    if (!usuario || !Number.isInteger(Number(usuario.id_usuario))) {
        throw new Error('No se pudo guardar la sesión del usuario.');
    }

    usuarioAutenticado = {
        id_usuario: Number(usuario.id_usuario),
        nombre: String(usuario.nombre || ''),
        correo: String(usuario.correo || ''),
        nombre_rol: String(usuario.nombre_rol || ''),
        numero: String(usuario.numero || '')
    };

    return usuarioAutenticado;
});

ipcMain.handle('obtener-sesion', () => usuarioAutenticado);
ipcMain.handle('cerrar-sesion', () => {
    usuarioAutenticado = null;
});

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
