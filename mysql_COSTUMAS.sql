CREATE DATABASE IF NOT EXISTS sistema_COSTUMAS3
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE sistema_COSTUMAS3;

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

-- 15. MEDIDAS CAMISA

CREATE TABLE medidas_camisa (
    id_medida_camisa INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    hombro DECIMAL(5,2),
    busto DECIMAL(5,2),
    largo DECIMAL(5,2),
    manga DECIMAL(5,2),
    puno DECIMAL(5,2),
    cuello DECIMAL(5,2),
    talla VARCHAR(4),
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cliente_camisa FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE
);

-- 16. MEDIDAS PANTALÓN

CREATE TABLE medidas_pantalon (
    id_medida_pantalon INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    cintura DECIMAL(5,2) COMMENT 'Medida en centímetros o pulgadas',
    cadera DECIMAL(5,2),
    largo DECIMAL(5,2),
    rodilla DECIMAL(5,2),
    ruedo DECIMAL(5,2),
    tiro DECIMAL(5,2),
    talla VARCHAR(4),
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cliente_pantalon FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE
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


-- =====================================================
-- REGISTROS ADICIONALES DE PRUEBA
-- =====================================================

-- 1. ROLES ADICIONALES

INSERT INTO Roles (nombre_rol, descripcion)
VALUES
('Gerente', 'Acceso de gerente al sistema'),
('Empleado', 'Acceso de empleado al sistema');


-- 2. USUARIOS ADICIONALES

INSERT INTO Usuarios (nombre, id_rol, numero, correo, estado, contrasena)
VALUES
(
    'María Fernanda López',
    (SELECT id_rol FROM Roles WHERE nombre_rol = 'Gerente'),
    '98765432',
    'gerente@costumas.com',
    'Activo',
    'Gerente2026!'
),
(
    'Carlos Alberto Reyes',
    (SELECT id_rol FROM Roles WHERE nombre_rol = 'Empleado'),
    '99887766',
    'empleado@costumas.com',
    'Activo',
    'Empleado2026!'
);


-- 3. CLIENTES

INSERT INTO Clientes (nombre, numero, correo, direccion)
VALUES
('Ana Lucía Martínez', '98761234', 'ana@gmail.com', 'Barrio El Centro, Danlí'),
('Carlos Eduardo Flores', '98762345', 'carlos@gmail.com', 'Colonia La Reforma, Danlí'),
('María José Hernández', '98763456', 'maria@gmail.com', 'Barrio El Carmelo, Danlí'),
('José Antonio Rivera', '98764567', 'jose@gmail.com', 'Colonia Nueva Esperanza, Danlí'),
('Gabriela Sofía Castro', '98765678', 'gabriela@gmail.com', 'Barrio Abajo, Danlí'),
('Daniela Patricia Gómez', '98766789', 'daniela@gmail.com', 'Colonia San José, Danlí'),
('Roberto Carlos Mejía', '98767890', 'roberto@gmail.com', 'Barrio El Centro, Danlí'),
('Karla Vanessa Díaz', '98768901', 'karla@gmail.com', 'Colonia Los Pinos, Danlí'),
('Luis Fernando Cruz', '98769012', 'luis@gmail.com', 'Barrio El Calvario, Danlí'),
('Sofía Alejandra Pineda', '98760123', 'sofia@gmail.com', 'Colonia La Concepción, Danlí');


-- 4. PROVEEDORES

INSERT INTO Proveedores (nombre_empresa, numero, correo, direccion)
VALUES
('Distribuidora Textil del Oriente', '27631234', 'ventas@textiloriente.com', 'Danlí, El Paraíso'),
('Telas y Más Honduras', '27632345', 'contacto@telasymas.com', 'El Paraíso, Honduras'),
('Comercial La Aguja', '27633456', 'ventas@laaguja.com', 'Danlí, El Paraíso'),
('Suministros de Costura Hernández', '27634567', 'info@suministroshernandez.com', 'Tegucigalpa, Honduras'),
('Distribuidora Moda y Estilo', '27635678', 'ventas@modayestilo.com', 'Danlí, El Paraíso');


-- 5. PRODUCTOS

INSERT INTO Productos (nombre, descripcion, precio, id_proveedor, stock_minimo)
VALUES
('Tela de algodón', 'Tela de algodón para confección', 120.00, 1, 10),
('Tela de mezclilla', 'Tela de mezclilla para pantalones', 180.00, 2, 8),
('Tela de poliéster', 'Tela de poliéster para uniformes', 95.00, 1, 10),
('Hilo blanco', 'Carrete de hilo blanco', 25.00, 3, 15),
('Hilo negro', 'Carrete de hilo negro', 25.00, 3, 15),
('Botones', 'Paquete de botones para prendas', 35.00, 4, 10),
('Cierres', 'Cierres de diferentes tamaños', 20.00, 4, 10),
('Elástico', 'Rollo de elástico para confección', 45.00, 5, 8),
('Encaje', 'Metro de encaje decorativo', 65.00, 5, 5),
('Forro de tela', 'Tela para forro de prendas', 75.00, 2, 8);


-- 6. INVENTARIO

INSERT INTO Inventario (id_producto, stock)
VALUES
(1, 30),
(2, 20),
(3, 25),
(4, 50),
(5, 45),
(6, 35),
(7, 40),
(8, 18),
(9, 12),
(10, 22);


-- 7. MOVIMIENTOS DE INVENTARIO

INSERT INTO Movimientos_Inventario
(id_producto, id_usuario, tipo_movimiento, cantidad, motivo, fecha_movimiento)
VALUES
(1, 1, 'Entrada', 30, 'Compra inicial de tela de algodón', '2026-10-01 09:00:00'),
(2, 1, 'Entrada', 20, 'Compra inicial de tela de mezclilla', '2026-10-01 09:30:00'),
(3, 2, 'Entrada', 25, 'Compra de tela para uniformes', '2026-10-02 10:00:00'),
(4, 2, 'Entrada', 50, 'Compra de carretes de hilo blanco', '2026-10-02 10:30:00'),
(5, 3, 'Entrada', 45, 'Compra de carretes de hilo negro', '2026-10-03 08:00:00'),
(6, 1, 'Entrada', 35, 'Compra de botones', '2026-10-03 09:00:00'),
(7, 2, 'Entrada', 40, 'Compra de cierres', '2026-10-04 09:30:00'),
(8, 3, 'Entrada', 18, 'Compra de rollos de elástico', '2026-10-04 10:00:00'),
(9, 1, 'Entrada', 12, 'Compra de encaje', '2026-10-05 08:30:00'),
(10, 2, 'Entrada', 22, 'Compra de tela para forro', '2026-10-05 09:00:00'),
(1, 2, 'Salida', 2, 'Material utilizado en confección', '2026-10-06 10:00:00'),
(4, 3, 'Salida', 3, 'Material utilizado en confección', '2026-10-06 11:00:00');


-- 8. PEDIDOS DE CLIENTES

INSERT INTO Pedidos_C (id_cliente, fecha_pedido, estado, total)
VALUES
(1, '2026-10-10 09:00:00', 'Pendiente', 360.00),
(2, '2026-10-11 10:30:00', 'En proceso', 540.00),
(3, '2026-10-12 11:00:00', 'Terminado', 285.00),
(4, '2026-10-13 14:00:00', 'Entregado', 480.00),
(5, '2026-10-14 09:30:00', 'En proceso', 350.00);


-- 9. DETALLE DE PEDIDOS DE CLIENTES

INSERT INTO Detalle_Pedido
(id_pedido_c, id_producto, cantidad, precio_unitario, subtotal)
VALUES
(1, 1, 3, 120.00, 360.00),
(2, 2, 3, 180.00, 540.00),
(3, 3, 3, 95.00, 285.00),
(4, 1, 4, 120.00, 480.00),
(5, 10, 2, 75.00, 150.00),
(5, 9, 2, 65.00, 130.00),
(5, 6, 2, 35.00, 70.00);


-- 10. PEDIDOS A PROVEEDORES

INSERT INTO Pedidos_P (id_proveedor, fecha_pedido, estado, total)
VALUES
(1, '2026-10-15 08:00:00', 'Entregado', 600.00),
(2, '2026-10-16 09:00:00', 'En proceso', 900.00),
(3, '2026-10-17 10:00:00', 'Pendiente', 250.00);


-- 11. DETALLE DE PEDIDOS A PROVEEDORES

INSERT INTO Detalle_Pedido_P
(id_pedido_p, id_producto, cantidad, precio_unitario, subtotal)
VALUES
(1, 1, 5, 120.00, 600.00),
(2, 2, 5, 180.00, 900.00),
(3, 4, 5, 25.00, 125.00),
(3, 5, 5, 25.00, 125.00);


-- 12. VENTAS

INSERT INTO Ventas (id_usuario, id_cliente, fecha_venta, total)
VALUES
(1, 1, '2026-10-18 09:00:00', 240.00),
(2, 2, '2026-10-18 10:30:00', 360.00),
(3, 3, '2026-10-19 11:00:00', 190.00),
(1, 4, '2026-10-20 14:00:00', 175.00),
(2, NULL, '2026-10-21 15:00:00', 250.00);


-- 13. DETALLE DE VENTAS

INSERT INTO Detalle_Ventas
(id_venta, id_producto, cantidad, precio_unitario, subtotal)
VALUES
(1, 1, 2, 120.00, 240.00),
(2, 2, 2, 180.00, 360.00),
(3, 3, 2, 95.00, 190.00),
(4, 6, 5, 35.00, 175.00),
(5, 4, 10, 25.00, 250.00);


-- 14. PAGOS

INSERT INTO Pagos
(id_venta, fecha_pago, monto, metodo_pago, estado_pago)
VALUES
(1, '2026-10-18 09:15:00', 240.00, 'Efectivo', 'Pagado'),
(2, '2026-10-18 10:45:00', 200.00, 'Transferencia', 'Pagado'),
(2, '2026-10-18 10:50:00', 160.00, 'Efectivo', 'Pagado'),
(3, '2026-10-19 11:15:00', 190.00, 'Tarjeta', 'Pagado'),
(4, '2026-10-20 14:15:00', 175.00, 'Efectivo', 'Pagado'),
(5, '2026-10-21 15:15:00', 100.00, 'Transferencia', 'Pendiente');


-- 15. MEDIDAS CAMISA

INSERT INTO medidas_camisa
(id_cliente, hombro, busto, largo, manga, puno, cuello, talla, fecha_registro)
VALUES
(1, 38.00, 92.00, 65.00, 58.00, 22.00, 36.00, 'M', '2026-10-10 09:00:00'),
(2, 42.00, 100.00, 70.00, 60.00, 24.00, 40.00, 'L', '2026-10-11 10:00:00'),
(3, 36.00, 88.00, 62.00, 55.00, 20.00, 34.00, 'S', '2026-10-12 11:00:00'),
(4, 44.00, 108.00, 74.00, 63.00, 26.00, 42.00, 'XL', '2026-10-13 14:00:00'),
(5, 40.00, 96.00, 68.00, 59.00, 23.00, 38.00, 'M', '2026-10-14 09:30:00');


-- 16. MEDIDAS PANTALÓN

INSERT INTO medidas_pantalon
(id_cliente, cintura, cadera, largo, rodilla, ruedo, tiro, talla, fecha_registro)
VALUES
(1, 72.00, 94.00, 100.00, 42.00, 20.00, 26.00, 'M', '2026-10-10 09:15:00'),
(2, 84.00, 102.00, 105.00, 46.00, 22.00, 28.00, 'L', '2026-10-11 10:15:00'),
(3, 68.00, 90.00, 96.00, 40.00, 18.00, 24.00, 'S', '2026-10-12 11:15:00'),
(4, 92.00, 110.00, 108.00, 50.00, 24.00, 30.00, 'XL', '2026-10-13 14:15:00'),
(5, 78.00, 98.00, 102.00, 44.00, 21.00, 27.00, 'M', '2026-10-14 09:45:00');


-- COMPROBAR LOS REGISTROS

SELECT * FROM Roles;
SELECT * FROM Usuarios;
SELECT * FROM Clientes;
SELECT * FROM Proveedores;
SELECT * FROM Productos;
SELECT * FROM Inventario;
SELECT * FROM Movimientos_Inventario;
SELECT * FROM Pedidos_C;
SELECT * FROM Detalle_Pedido;
SELECT * FROM Pedidos_P;
SELECT * FROM Detalle_Pedido_P;
SELECT * FROM Ventas;
SELECT * FROM Detalle_Ventas;
SELECT * FROM Pagos;
SELECT * FROM medidas_camisa;
SELECT * FROM medidas_pantalon;

SHOW TABLES;
