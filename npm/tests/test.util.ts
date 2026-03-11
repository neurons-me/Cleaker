/**
 * A simple async test runner to provide clear PASS/FAIL logs.
 * @param name The name of the test case.
 * @param fn The async function containing the test logic and assertions.
 */
export async function run(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}