import assert from 'node:assert/strict';
import cleaker from '../index.ts';

/**
 * Un ejecutor de pruebas simple para mostrar los resultados.
 * @param name El nombre del test.
 * @param fn La función que contiene el test.
 */
function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run('Quickstart: crear un puntero remoto a partir de una expresión', () => {
  // 1. Define una expresión remota usando el Protocolo de Resolución de Namespaces (NRP).
  const expression = 'ana.cleaker:read/profile';

  // 2. Crea un puntero remoto usando la función principal `cleaker`.
  const remote = cleaker(expression);
  const ptr = remote.__ptr;

  // 3. Verifica que el puntero se haya parseado correctamente.
  assert.strictEqual(ptr.identity.prefix, 'ana', 'El prefijo del namespace debe ser "ana"');
  assert.strictEqual(ptr.identity.constant, 'cleaker', 'El constante del namespace debe ser "cleaker"');
  assert.strictEqual(ptr.intent.selector, 'read', 'El selector debe ser "read"');
  assert.strictEqual(ptr.intent.path, 'profile', 'El path debe ser "profile"');
  assert.strictEqual(ptr.resolution.status, 'unresolved', 'El estado inicial debe ser "unresolved"');
});

console.log('Quickstart test passed.');