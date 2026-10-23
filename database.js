const mysql = require("mysql2"); //Importamos la libreria mysql2 para conectar a MySQL

const conexion = mysql.createConnection({ //Con esto creamos lo que es la conexion
    host: "localhost", //El servidor donde se encuentra nuestra base de datos
    user: "root", //Nuestro usuario de MySQL
    password: "1234", //Contraseña
    database: "sistema_COSTUMAS" //El nombre de la base de datos
    //pov: no lo pude dejar solo como empresa ya que tenia una base de datos con ese nombre
});

conexion.connect((error)=>{ //En esta parte hacemos la conexion a la base de datos
    if(error){ //Si llega a presentarse un error, lo mostramos en consola
        console.log(error);
        return;
    }

    console.log("Conectado a MySQL"); //Si no hay un error igual mostramos un mensaje en consola
});

module.exports = conexion; //Exportamos nuestra conexion esto para poder usarla en otros archivos
