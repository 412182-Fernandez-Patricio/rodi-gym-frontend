import { HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Traduce las claves entre la API y el frontend: snake_case al entrar,
 * camelCase al salir. Evita tener una función de mapeo por modelo.
 *
 * Solo toca objetos y arrays planos de nuestra propia API. Ojo con esto: si
 * algún endpoint devuelve un objeto cuyas *claves son datos* (por ejemplo un
 * mapa de fecha a cantidad), el interceptor también las va a renombrar. En ese
 * caso conviene que la API devuelva una lista de objetos en lugar de un mapa.
 */
export const caseConversionInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiRequest(request.url)) {
    return next(request);
  }

  const outgoing = isConvertible(request.body)
    ? request.clone({ body: convertKeys(request.body, toSnakeCase) })
    : request;

  return next(outgoing).pipe(
    map((event) =>
      event.type === HttpEventType.Response && isConvertible(event.body)
        ? event.clone({ body: convertKeys(event.body, toCamelCase) })
        : event,
    ),
  );
};

function isApiRequest(url: string): boolean {
  return url === environment.apiUrl || url.startsWith(`${environment.apiUrl}/`);
}

function convertKeys(value: unknown, convert: (key: string) => string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => convertKeys(item, convert));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [convert(key), convertKeys(item, convert)]),
    );
  }

  return value;
}

/**
 * Solo objetos literales: deja pasar Date, File, FormData, Blob y cualquier
 * cosa con prototipo propio, que no hay que recorrer ni renombrar.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isConvertible(body: unknown): boolean {
  return Array.isArray(body) || isPlainObject(body);
}

function toCamelCase(key: string): string {
  return key.replace(/_+([a-z0-9])/g, (_, character: string) => character.toUpperCase());
}

function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (character) => `_${character.toLowerCase()}`);
}
