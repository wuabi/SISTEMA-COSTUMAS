CREATE DATABASE IF NOT EXISTS sistema_COSTUMAS
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE sistema_COSTUMAS;

-- 1. ROLES

CREATE TABLE Roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200)
);

-- 2. USUARIOS

CREATE TABLE Usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    id_rol INT NOT NULL,
    numero VARCHAR(20),
    correo VARCHAR(100) UNIQUE,
    estado ENUM('Activo', 'Inactivo')
        NOT NULL DEFAULT 'Activo',
    contrasena VARCHAR(255) NOT NULL,

    CONSTRAINT fk_usuarios_roles
        FOREIGN KEY (id_rol)
        REFERENCES Roles(id_rol)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 3. CLIENTES

CREATE TABLE Clientes (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    numero VARCHAR(20),
    correo VARCHAR(100),
    direccion VARCHAR(200)
);

-- 4. PROVEEDORES

CREATE TABLE Proveedores (
    id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
    nombre_empresa VARCHAR(100) NOT NULL,
    numero VARCHAR(20),
    correo VARCHAR(100),
    direccion VARCHAR(200)
);

-- 5. PRODUCTOS

CREATE TABLE Productos (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(250),
    precio DECIMAL(10,2) NOT NULL,
    id_proveedor INT NOT NULL,
    stock_minimo INT NOT NULL DEFAULT 5,

    CONSTRAINT fk_productos_proveedores
        FOREIGN KEY (id_proveedor)
        REFERENCES Proveedores(id_proveedor)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 6. INVENTARIO

CREATE TABLE Inventario (
    id_inventario INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL UNIQUE,
    stock INT NOT NULL DEFAULT 0,
    fecha_actualizacion TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_inventario_productos
        FOREIGN KEY (id_producto)
        REFERENCES Productos(id_producto)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 7. MOVIMIENTOS DE INVENTARIO

CREATE TABLE Movimientos_Inventario (
    id_movimiento INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    id_usuario INT NOT NULL,
    tipo_movimiento ENUM('Entrada', 'Salida') NOT NULL,
    cantidad INT NOT NULL,
    motivo VARCHAR(200),
    fecha_movimiento DATETIME
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_movimientos_productos
        FOREIGN KEY (id_producto)
        REFERENCES Productos(id_producto)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_movimientos_usuarios
        FOREIGN KEY (id_usuario)
        REFERENCES Usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 8. PEDIDOS DE CLIENTES

CREATE TABLE Pedidos_C (
    id_pedido_c INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    fecha_pedido DATETIME
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    estado ENUM(
        'Pendiente',
        'En proceso',
        'Terminado',
        'Entregado'
    ) NOT NULL DEFAULT 'Pendiente',

    total DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT fk_pedidos_c_clientes
        FOREIGN KEY (id_cliente)
        REFERENCES Clientes(id_cliente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 9. DETALLE DE PEDIDOS DE CLIENTES

CREATE TABLE Detalle_Pedido (
    id_detalle_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido_c INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,

    CONSTRAINT fk_detalle_pedido_pedido
        FOREIGN KEY (id_pedido_c)
        REFERENCES Pedidos_C(id_pedido_c)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_detalle_pedido_producto
        FOREIGN KEY (id_producto)
        REFERENCES Productos(id_producto)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 10. PEDIDOS A PROVEEDORES

CREATE TABLE Pedidos_P (
    id_pedido_p INT AUTO_INCREMENT PRIMARY KEY,
    id_proveedor INT NOT NULL,
    fecha_pedido DATETIME
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    estado ENUM(
        'Pendiente',
        'En proceso',
        'Terminado',
        'Entregado'
    ) NOT NULL DEFAULT 'Pendiente',

    total DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT fk_pedidos_p_proveedores
        FOREIGN KEY (id_proveedor)
        REFERENCES Proveedores(id_proveedor)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 11. DETALLE DE PEDIDOS A PROVEEDORES

CREATE TABLE Detalle_Pedido_P (
    id_detalle_pedido_p INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido_p INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,

    CONSTRAINT fk_detalle_pedido_p_pedido
        FOREIGN KEY (id_pedido_p)
        REFERENCES Pedidos_P(id_pedido_p)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_detalle_pedido_p_producto
        FOREIGN KEY (id_producto)
        REFERENCES Productos(id_producto)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 12. VENTAS

CREATE TABLE Ventas (
    id_venta INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_cliente INT NULL,
    fecha_venta DATETIME
        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT fk_ventas_usuarios
        FOREIGN KEY (id_usuario)
        REFERENCES Usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_ventas_clientes
        FOREIGN KEY (id_cliente)
        REFERENCES Clientes(id_cliente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 13. DETALLE DE VENTAS

CREATE TABLE Detalle_Ventas (
    id_detalle_venta INT AUTO_INCREMENT PRIMARY KEY,
    id_venta INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,

    CONSTRAINT fk_detalle_ventas_venta
        FOREIGN KEY (id_venta)
        REFERENCES Ventas(id_venta)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_detalle_ventas_producto
        FOREIGN KEY (id_producto)
        REFERENCES Productos(id_producto)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 14. PAGOS

CREATE TABLE Pagos (
    id_pago INT AUTO_INCREMENT PRIMARY KEY,
    id_venta INT NOT NULL,
    fecha_pago DATETIME
        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    monto DECIMAL(10,2) NOT NULL,

    metodo_pago ENUM(
        'Efectivo',
        'Tarjeta',
        'Transferencia'
    ) NOT NULL,

    estado_pago ENUM(
        'Pendiente',
        'Pagado',
        'Cancelado'
    ) NOT NULL DEFAULT 'Pendiente',

    CONSTRAINT fk_pagos_ventas
        FOREIGN KEY (id_venta)
        REFERENCES Ventas(id_venta)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- DATOS DE ACCESO DE PRUEBA

INSERT INTO Roles (nombre_rol, descripcion)
VALUES ('Administrador', 'Acceso de administrador al sistema')
ON DUPLICATE KEY UPDATE descripcion = 'Acceso de administrador al sistema';

INSERT INTO Usuarios (nombre, id_rol, correo, estado, contrasena)
SELECT 'Administrador', R.id_rol, 'admin@costumas.com', 'Activo', 'CostumasDemo2026!'
FROM Roles R
WHERE R.nombre_rol = 'Administrador'
    AND NOT EXISTS (
            SELECT 1
            FROM Usuarios U
            WHERE U.correo = 'admin@costumas.com'
    )
LIMIT 1;

-- COMPROBAR LA CREACIÓN

SHOW TABLES;