from flask import Flask, jsonify
from flask_cors import CORS
import json
from pathlib import Path


def load_json(path: Path):
    with path.open('r', encoding='utf-8') as f:
        return json.load(f)


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / 'data'

app = Flask(__name__)
CORS(app, resources={r"/*": {
    "origins": "*",
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization", "Origin", "X-Requested-With", "Accept"],
    "supports_credentials": True
}})

print("🚀 Backend Flask iniciado con CORS configurado")
print("📂 Directorio de datos:", DATA_DIR)


@app.get('/routes/clients')
def get_clients():
    print("🔍 Backend: Petición GET /routes/clients recibida")
    try:
        data = load_json(DATA_DIR / 'clients.json')
        print(f"✅ Backend: Clientes cargados exitosamente: {len(data)} registros")
        return jsonify(data)
    except Exception as e:
        print(f"❌ Backend: Error cargando clientes: {e}")
        return jsonify({"error": "Error cargando clientes"}), 500


@app.get('/routes/vehicles')
def get_vehicles():
    print("🚗 Backend: Petición GET /routes/vehicles recibida")
    try:
        data = load_json(DATA_DIR / 'vehicles.json')
        print(f"✅ Backend: Vehículos cargados exitosamente: {len(data)} registros")
        return jsonify(data)
    except Exception as e:
        print(f"❌ Backend: Error cargando vehículos: {e}")
        return jsonify({"error": "Error cargando vehículos"}), 500


@app.get('/products/available')
def get_products():
    print("🔍 Backend: Petición GET /products/available recibida")
    try:
        # Datos de productos simulados
        products = [
            {
                "product_id": 1,
                "sku": "MED-001",
                "name": "Acetaminofén 500mg",
                "value": 8.5,
                "category_name": "MEDICATION",
                "total_quantity": 5000,
                "image_url": None
            },
            {
                "product_id": 2,
                "sku": "MED-002", 
                "name": "Amoxicilina 250mg/5ml",
                "value": 12.3,
                "category_name": "MEDICATION",
                "total_quantity": 2500,
                "image_url": None
            },
            {
                "product_id": 3,
                "sku": "SURG-001",
                "name": "Kit Sutura Desechable",
                "value": 25.0,
                "category_name": "SURGICAL_SUPPLIES",
                "total_quantity": 1000,
                "image_url": None
            },
            {
                "product_id": 4,
                "sku": "SURG-002",
                "name": "Guantes Nitrilo Talla M",
                "value": 4.99,
                "category_name": "SURGICAL_SUPPLIES",
                "total_quantity": 8000,
                "image_url": None
            },
            {
                "product_id": 5,
                "sku": "REAG-001",
                "name": "Tiras Reactivas Glucosa",
                "value": 15.75,
                "category_name": "REAGENTS",
                "total_quantity": 300,
                "image_url": None
            },
            {
                "product_id": 6,
                "sku": "EQUIP-001",
                "name": "Termómetro Infrarrojo",
                "value": 45.9,
                "category_name": "EQUIPMENT",
                "total_quantity": 500,
                "image_url": None
            },
            {
                "product_id": 7,
                "sku": "MED-003",
                "name": "Ibuprofeno 400mg",
                "value": 9.5,
                "category_name": "MEDICATION",
                "total_quantity": 4500,
                "image_url": None
            },
            {
                "product_id": 8,
                "sku": "SURG-003",
                "name": "Tapabocas N95 (Caja)",
                "value": 15.0,
                "category_name": "SURGICAL_SUPPLIES",
                "total_quantity": 6000,
                "image_url": None
            },
            {
                "product_id": 11,
                "sku": "MED-004",
                "name": "Dexametasona 4mg (Ampolla)",
                "value": 1.5,
                "category_name": "MEDICATION",
                "total_quantity": 1500,
                "image_url": None
            },
            {
                "product_id": 12,
                "sku": "EQUIP-002",
                "name": "Tensiómetro Digital",
                "value": 55.0,
                "category_name": "EQUIPMENT",
                "total_quantity": 500,
                "image_url": None
            },
            {
                "product_id": 13,
                "sku": "TEST-SIMPLE-001",
                "name": "Producto Simple 1",
                "value": 10.5,
                "category_name": "MEDICATION",
                "total_quantity": 50,
                "image_url": None
            },
            {
                "product_id": 14,
                "sku": "TEST-001",
                "name": "Producto de Prueba 1",
                "value": 15.5,
                "category_name": "MEDICATION",
                "total_quantity": 100,
                "image_url": None
            },
            {
                "product_id": 15,
                "sku": "TEST-002",
                "name": "Producto de Prueba 2",
                "value": 25.75,
                "category_name": "SURGICAL_SUPPLIES",
                "total_quantity": 50,
                "image_url": None
            },
            {
                "product_id": 18,
                "sku": "NEW-001",
                "name": "Producto Nuevo 1",
                "value": 25.5,
                "category_name": "MEDICATION",
                "total_quantity": 75,
                "image_url": None
            },
            {
                "product_id": 19,
                "sku": "NEW-002",
                "name": "Producto Nuevo 2",
                "value": 35.75,
                "category_name": "SURGICAL_SUPPLIES",
                "total_quantity": 30,
                "image_url": None
            },
            {
                "product_id": 20,
                "sku": "NEW-003",
                "name": "Producto Nuevo 3",
                "value": 45.0,
                "category_name": "EQUIPMENT",
                "total_quantity": 10,
                "image_url": None
            },
            {
                "product_id": 22,
                "sku": "FRESH-001",
                "name": "Producto Fresco 1",
                "value": 15.99,
                "category_name": "MEDICATION",
                "total_quantity": 100,
                "image_url": None
            },
            {
                "product_id": 23,
                "sku": "FRESH-002",
                "name": "Producto Fresco 2",
                "value": 29.5,
                "category_name": "SURGICAL_SUPPLIES",
                "total_quantity": 25,
                "image_url": None
            },
            {
                "product_id": 24,
                "sku": "FRESH-003",
                "name": "Producto Fresco 3",
                "value": 55.0,
                "category_name": "EQUIPMENT",
                "total_quantity": 5,
                "image_url": None
            }
        ]
        print(f"✅ Backend: Productos cargados exitosamente: {len(products)} registros")
        return jsonify(products)
    except Exception as e:
        print(f"❌ Backend: Error cargando productos: {e}")
        return jsonify({"error": "Error cargando productos"}), 500


@app.post('/products/upload')
def upload_products():
    print("🔍 Backend: Petición POST /products/upload recibida")
    try:
        # Verificar si hay archivos en la petición
        if 'files' not in request.files:
            print("❌ Backend: No se encontró el campo 'files' en la petición")
            return jsonify({
                'success': False,
                'message': 'No se encontró el campo files en la petición',
                'errors': ['Campo files no encontrado'],
                'warnings': []
            }), 400
        
        files = request.files.getlist('files')
        print(f"📁 Backend: Archivos recibidos: {len(files)}")
        
        if not files or files[0].filename == '':
            print("❌ Backend: No se seleccionó ningún archivo")
            return jsonify({
                'success': False,
                'message': 'No se seleccionó ningún archivo',
                'errors': ['No se seleccionó ningún archivo'],
                'warnings': []
            }), 400
        
        # Procesar el primer archivo
        file = files[0]
        print(f"📄 Backend: Procesando archivo: {file.filename}")
        print(f"📄 Backend: Tipo de archivo: {file.content_type}")
        print(f"📄 Backend: Tamaño: {len(file.read())} bytes")
        
        # Resetear el puntero del archivo para leerlo nuevamente
        file.seek(0)
        
        # Leer el contenido del archivo
        content = file.read().decode('utf-8')
        print(f"📄 Backend: Contenido del archivo:")
        print(content[:500] + "..." if len(content) > 500 else content)
        
        # Simular validación exitosa
        return jsonify({
            'success': True,
            'message': 'Productos cargados exitosamente!',
            'total_records': 15,
            'successful_records': 15,
            'failed_records': 0,
            'upload_id': 17,
            'errors': [],
            'warnings': []
        })
        
    except Exception as e:
        print(f"❌ Backend: Error procesando upload: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Error procesando archivos',
            'errors': [f'Error del servidor: {str(e)}'],
            'warnings': []
        }), 500


@app.get('/health')
def health():
    return {'ok': True}


if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', '5002'))
    app.run(host='0.0.0.0', port=port, debug=True)


