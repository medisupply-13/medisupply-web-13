-- ============================================================================
-- NUEVAS TABLAS PARA: CONSULTAR LOCALIZACIÓN DE PRODUCTO EN BODEGA
-- Agregadas al esquema existente sin modificar tablas actuales
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLA: Cities (Ciudades)
-- Propósito: Filtrar bodegas por ciudad según configuración regional
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products.Cities (
    city_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(50) NOT NULL DEFAULT 'Colombia',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. MODIFICACIÓN: Warehouses (Agregar campos necesarios)
-- Agrega campos sin cambiar la estructura existente
-- ----------------------------------------------------------------------------
ALTER TABLE products.Warehouses 
ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES products.Cities(city_id),
ADD COLUMN IF NOT EXISTS code VARCHAR(50),
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ----------------------------------------------------------------------------
-- 3. TABLA: WarehouseLocations (Ubicaciones Físicas)
-- Propósito: Almacenar Sección, Pasillo, Mueble, Nivel de cada ubicación
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products.WarehouseLocations (
    location_id SERIAL PRIMARY KEY,
    warehouse_id INTEGER NOT NULL REFERENCES products.Warehouses(warehouse_id),
    section VARCHAR(10) NOT NULL,
    aisle VARCHAR(10) NOT NULL,
    shelf VARCHAR(10) NOT NULL,
    level VARCHAR(10) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. TABLA: ProductLots (Lotes de Productos con ubicación detallada)
-- Propósito: Almacenar lotes con Vence, Disponible y Reservada por ubicación
-- Esta tabla complementa ProductStock existente
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products.ProductLots (
    lot_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products.Products(product_id),
    warehouse_id INTEGER NOT NULL REFERENCES products.Warehouses(warehouse_id),
    location_id INTEGER NOT NULL REFERENCES products.WarehouseLocations(location_id),
    lot_number VARCHAR(50) NOT NULL,
    expiry_date DATE NOT NULL,
    available_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    received_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_lot_status CHECK (status IN ('active', 'expired', 'depleted'))
);

-- ----------------------------------------------------------------------------
-- 5. ÍNDICES PARA PERFORMANCE
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_warehouses_city ON products.Warehouses(city_id);
CREATE INDEX IF NOT EXISTS idx_product_lots_product ON products.ProductLots(product_id);
CREATE INDEX IF NOT EXISTS idx_product_lots_warehouse ON products.ProductLots(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_product_lots_expiry ON products.ProductLots(expiry_date);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_warehouse ON products.WarehouseLocations(warehouse_id);

-- ----------------------------------------------------------------------------
-- 6. DATOS DE PRUEBA
-- ----------------------------------------------------------------------------

-- Insertar ciudades
INSERT INTO products.Cities (name, country) VALUES
('Bogotá', 'Colombia'),
('Medellín', 'Colombia'),
('Cali', 'Colombia'),
('Barranquilla', 'Colombia')
ON CONFLICT DO NOTHING;

-- Actualizar bodegas existentes (productos ya tienen las bodegas 1 y 2)
UPDATE products.Warehouses SET city_id = 1, code = 'bog001' WHERE warehouse_id = 1;
UPDATE products.Warehouses SET city_id = 3, code = 'cal001' WHERE warehouse_id = 2;

-- Insertar más bodegas según el front (bog002, med001, bar001)
INSERT INTO products.Warehouses (warehouse_id, name, location, city_id, code) VALUES
(3, 'Bodega Bogotá Norte', 'Bogotá Norte', 1, 'bog002'),
(4, 'Bodega Medellín', 'Medellín', 2, 'med001'),
(5, 'Bodega Barranquilla', 'Barranquilla', 4, 'bar001')
ON CONFLICT (warehouse_id) DO NOTHING;

-- Insertar ubicaciones físicas de ejemplo (según el front)
INSERT INTO products.WarehouseLocations (warehouse_id, section, aisle, shelf, level, description) VALUES
-- Bodega bog001 (Central)
(1, 'A', '1', '2', '3', 'Sección A - Pasillo 1 - Mueble 2 - Nivel 3'),
(1, 'A', '1', '2', '4', 'Sección A - Pasillo 1 - Mueble 2 - Nivel 4'),
(1, 'B', '2', '1', '2', 'Sección B - Pasillo 2 - Mueble 1 - Nivel 2'),
(1, 'C', '3', '1', '1', 'Sección C - Pasillo 3 - Mueble 1 - Nivel 1'),
(1, 'A', '2', '1', '1', 'Sección A - Pasillo 2 - Mueble 1 - Nivel 1'),
(1, 'B', '1', '3', '2', 'Sección B - Pasillo 1 - Mueble 3 - Nivel 2'),
(1, 'C', '2', '2', '1', 'Sección C - Pasillo 2 - Mueble 2 - Nivel 1'),
-- Bodega bog002 (Norte)
(3, 'A', '1', '1', '1', 'Sección A - Pasillo 1 - Mueble 1 - Nivel 1'),
(3, 'B', '2', '2', '1', 'Sección B - Pasillo 2 - Mueble 2 - Nivel 1'),
(3, 'C', '3', '1', '2', 'Sección C - Pasillo 3 - Mueble 1 - Nivel 2')
ON CONFLICT DO NOTHING;

-- Insertar lotes de ejemplo basados en ProductStock existente
-- Acetaminofén 500mg (product_id=1) tiene stock en warehouse_id=1 con lote LOTE2025A y quantity=5000
INSERT INTO products.ProductLots (product_id, warehouse_id, location_id, lot_number, expiry_date, available_quantity, reserved_quantity, received_date) 
SELECT 1, 1, 1, 'LOTE2025A', '2025-12-31', 5000, 0, '2024-01-15' 
WHERE NOT EXISTS (SELECT 1 FROM products.ProductLots WHERE lot_number = 'LOTE2025A')
UNION ALL
-- Amoxicilina 250mg/5ml (product_id=2) tiene stock en warehouse_id=1 con lote LOTE2025B y quantity=2500
SELECT 2, 1, 2, 'LOTE2025B', '2025-03-15', 2500, 0, '2024-03-20' 
WHERE NOT EXISTS (SELECT 1 FROM products.ProductLots WHERE lot_number = 'LOTE2025B')
UNION ALL
-- Ibuprofeno 400mg (product_id=7) tiene stock en warehouse_id=1 con lote IBU2026 y quantity=4500
SELECT 7, 1, 3, 'IBU2026', '2026-11-20', 4500, 0, '2024-02-10' 
WHERE NOT EXISTS (SELECT 1 FROM products.ProductLots WHERE lot_number = 'IBU2026')
UNION ALL
-- Dexametasona 4mg (product_id=11) tiene stock en warehouse_id=1 con lote DEXA2025 y quantity=1500
SELECT 11, 1, 4, 'DEXA2025', '2025-12-15', 1500, 0, '2024-02-28' 
WHERE NOT EXISTS (SELECT 1 FROM products.ProductLots WHERE lot_number = 'DEXA2025')
UNION ALL
-- Tensiómetro Digital (product_id=12) tiene stock en warehouse_id=1 con lote TENS2026 y quantity=500
SELECT 12, 1, 5, 'TENS2026', '2026-10-15', 500, 0, '2024-04-18' 
WHERE NOT EXISTS (SELECT 1 FROM products.ProductLots WHERE lot_number = 'TENS2026');

-- ============================================================================
-- RESUMEN DE TABLAS NUEVAS AGREGADAS:
-- ============================================================================
-- 1. products.Cities (nueva) - Ciudades para filtro por país
-- 2. products.Warehouses (modificada) - Agrega city_id, code, active
-- 3. products.WarehouseLocations (nueva) - Sección, Pasillo, Mueble, Nivel
-- 4. products.ProductLots (nueva) - Lotes con Vence, Disponible, Reservada
-- ============================================================================
-- NOTA: Las tablas existentes (Products, Warehouses, ProductStock) NO SE MODIFICAN
-- Solo se agregan nuevos campos opcionales a Warehouses
-- ============================================================================
