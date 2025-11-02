-- =====================================================
--  SCRIPT DDL RECONSTRUIDO PARA EL ESQUEMA 'products'
-- =====================================================

-- Creación del Esquema
CREATE SCHEMA IF NOT EXISTS products;

-- =====================================================
-- 1. CREACIÓN DE TABLAS
-- =====================================================

-- Tablas de catálogo (Básicas)
CREATE TABLE products.category (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

CREATE TABLE products.cities (
    city_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(50) NOT NULL DEFAULT 'Colombia',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products.providers (
    provider_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE products.units (
    unit_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    symbol VARCHAR(10) NOT NULL,
    type VARCHAR(20) NOT NULL,
    active BOOLEAN DEFAULT true,
    creation_date TIMESTAMP DEFAULT now()
);

-- Tablas de Almacenamiento (Warehousing)
CREATE TABLE products.warehouses (
    warehouse_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255),
    city_id INTEGER,
    phone VARCHAR(20),
    manager_name VARCHAR(100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products.warehouse_locations (
    location_id SERIAL PRIMARY KEY,
    warehouse_id INTEGER,
    section VARCHAR(10) NOT NULL,
    aisle VARCHAR(10) NOT NULL,
    shelf VARCHAR(10) NOT NULL,
    "level" VARCHAR(10) NOT NULL, -- "level" es palabra clave, se usa comillas
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraint único para la ubicación física
    CONSTRAINT warehouse_locations_warehouse_id_section_aisle_shelf_level_key
        UNIQUE (warehouse_id, section, aisle, shelf, "level")
);

-- Tabla Maestra de Productos
CREATE TABLE products.products (
    product_id SERIAL PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    image_url VARCHAR(255),
    provider_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'activo',
    category_id INTEGER NOT NULL,
    objective_profile VARCHAR(255) NOT NULL,
    unit_id INTEGER NOT NULL,
    creation_date TIMESTAMP DEFAULT now()
);

-- Tablas de Carga Masiva (Uploads)
CREATE TABLE products.product_uploads (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(10) NOT NULL,
    file_size BIGINT NOT NULL,
    total_records INTEGER NOT NULL,
    successful_records INTEGER NOT NULL DEFAULT 0,
    failed_records INTEGER NOT NULL DEFAULT 0,
    state VARCHAR(20) NOT NULL DEFAULT 'procesando',
    start_date TIMESTAMP DEFAULT now(),
    end_date TIMESTAMP,
    user_id INTEGER NOT NULL,
    errores TEXT
);

CREATE TABLE products.product_upload_details (
    id SERIAL PRIMARY KEY,
    upload_id INTEGER NOT NULL,
    row_id INTEGER NOT NULL,
    code VARCHAR(50),
    name VARCHAR(200),
    descroption TEXT, -- (mantenido como en el original)
    price DOUBLE PRECISION,
    category VARCHAR(100),
    minimum_stock INTEGER,
    measure_unit VARCHAR(50),
    status VARCHAR(20) NOT NULL,
    errors TEXT,
    product_id INTEGER
);

-- Tablas de Inventario y Movimientos
CREATE TABLE products.product_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    previous_value DOUBLE PRECISION,
    new_value DOUBLE PRECISION,
    change_type VARCHAR(20) NOT NULL,
    update_date TIMESTAMP DEFAULT now(),
    user_id INTEGER NOT NULL,
    upload_id INTEGER
);

CREATE TABLE products.product_lots (
    lot_id SERIAL PRIMARY KEY,
    product_id INTEGER,
    warehouse_id INTEGER,
    location_id INTEGER,
    lot_number VARCHAR(50) NOT NULL,
    expiry_date DATE NOT NULL,
    available_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    received_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products.productstock (
    stock_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    lote VARCHAR(50) NOT NULL,
    warehouse_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    country VARCHAR(50) NOT NULL,
    location_id INTEGER,
    expiry_date DATE,
    reserved_quantity INTEGER DEFAULT 0,
    last_movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active'
);

CREATE TABLE products.stock_movements (
    movement_id SERIAL PRIMARY KEY,
    product_id INTEGER,
    warehouse_id INTEGER,
    lot_id INTEGER,
    movement_type VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    reason VARCHAR(200),
    user_id INTEGER NOT NULL,
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference_document VARCHAR(100)
);


-- =====================================================
-- 2. CREACIÓN DE RELACIONES (FOREIGN KEYS)
-- =====================================================

-- Relaciones de 'warehouses'
ALTER TABLE products.warehouses
    ADD CONSTRAINT warehouses_city_id_fkey FOREIGN KEY (city_id) REFERENCES products.cities(city_id);

-- Relaciones de 'warehouse_locations'
ALTER TABLE products.warehouse_locations
    ADD CONSTRAINT warehouse_locations_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES products.warehouses(warehouse_id);

-- Relaciones de 'products'
ALTER TABLE products.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES products.category(category_id),
    ADD CONSTRAINT products_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES products.providers(provider_id),
    ADD CONSTRAINT products_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES products.units(unit_id);

-- Relaciones de 'product_history'
ALTER TABLE products.product_history
    ADD CONSTRAINT product_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES products.products(product_id),
    ADD CONSTRAINT product_history_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES products.product_uploads(id);

-- Relaciones de 'product_lots'
ALTER TABLE products.product_lots
    ADD CONSTRAINT product_lots_location_id_fkey FOREIGN KEY (location_id) REFERENCES products.warehouse_locations(location_id),
    ADD CONSTRAINT product_lots_product_id_fkey FOREIGN KEY (product_id) REFERENCES products.products(product_id),
    ADD CONSTRAINT product_lots_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES products.warehouses(warehouse_id);

-- Relaciones de 'product_upload_details'
ALTER TABLE products.product_upload_details
    ADD CONSTRAINT product_upload_details_product_id_fkey FOREIGN KEY (product_id) REFERENCES products.products(product_id),
    ADD CONSTRAINT product_upload_details_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES products.product_uploads(id);

-- Relaciones de 'productstock'
ALTER TABLE products.productstock
    ADD CONSTRAINT productstock_location_id_fkey FOREIGN KEY (location_id) REFERENCES products.warehouse_locations(location_id),
    ADD CONSTRAINT productstock_product_id_fkey FOREIGN KEY (product_id) REFERENCES products.products(product_id),
    ADD CONSTRAINT productstock_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES products.providers(provider_id),
    ADD CONSTRAINT productstock_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES products.warehouses(warehouse_id);

-- Relaciones de 'stock_movements'
ALTER TABLE products.stock_movements
    ADD CONSTRAINT stock_movements_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES products.product_lots(lot_id),
    ADD CONSTRAINT stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES products.products(product_id),
    ADD CONSTRAINT stock_movements_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES products.warehouses(warehouse_id);


-- =====================================================
-- 3. CREACIÓN DE ÍNDICES ADICIONALES
-- =====================================================

-- Índices para 'product_lots' (optimizan búsqueda por vencimiento, producto y bodega)
CREATE INDEX idx_product_lots_expiry ON products.product_lots USING btree (expiry_date);
CREATE INDEX idx_product_lots_product ON products.product_lots USING btree (product_id);
CREATE INDEX idx_product_lots_warehouse ON products.product_lots USING btree (warehouse_id);

-- Índices para 'stock_movements' (optimizan búsqueda por fecha y producto)
CREATE INDEX idx_stock_movements_date ON products.stock_movements USING btree (movement_date);
CREATE INDEX idx_stock_movements_product ON products.stock_movements USING btree (product_id);

-- Índices para 'warehouse_locations' (optimiza búsqueda por bodega)
CREATE INDEX idx_warehouse_locations_warehouse ON products.warehouse_locations USING btree (warehouse_id);

-- Índices para 'warehouses' (optimiza búsqueda por ciudad)
CREATE INDEX idx_warehouses_city ON products.warehouses USING btree (city_id);

-- --- FIN ---
