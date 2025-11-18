import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';

export const debugInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  // Solo interceptar peticiones a productos/by-warehouse para debugging
  if (req.url.includes('products/by-warehouse')) {
    console.log('🔍 DebugInterceptor: ===== PETICIÓN HTTP =====');
    console.log('🔍 DebugInterceptor: URL completa:', req.url);
    console.log('🔍 DebugInterceptor: Método:', req.method);
    console.log('🔍 DebugInterceptor: Headers:', req.headers.keys().reduce((acc: any, key) => {
      acc[key] = req.headers.get(key);
      return acc;
    }, {}));
    console.log('🔍 DebugInterceptor: Query params:', req.params.toString());
    console.log('🔍 DebugInterceptor: URL con query params:', req.urlWithParams);
    console.log('🔍 DebugInterceptor: Tiene include_locations:', req.urlWithParams.includes('include_locations=true'));
    console.log('🔍 DebugInterceptor: ===== FIN PETICIÓN =====');
  }
  
  return next(req);
};



