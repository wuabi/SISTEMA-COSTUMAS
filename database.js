const mysql = require("mysql2"); //Importamos la libreria mysql2 para conectar a MySQL

const conexion = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "1234",
    database: process.env.DB_NAME || "sistema_COSTUMAS3"
});

conexion.connect((error)=>{ //En esta parte hacemos la conexion a la base de datos
    if(error){ //Si llega a presentarse un error, lo mostramos en consola
        console.log(error);
        return;
    }

    console.log("Conectado a MySQL"); //Si no hay un error igual mostramos un mensaje en consola
});

module.exports = conexion; //Exportamos nuestra conexion esto para poder usarla en otros archivos
