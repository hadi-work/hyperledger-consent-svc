export function unit8ArrayToJson(bytes: Uint8Array) {

  if (!bytes.length) {
    return null;
  }

  // 1. Convert the Uint8Array to a string using Node.js Buffer
  const jsonString = Buffer.from(bytes).toString('utf8');

  // 2. Parse the JSON string into a JavaScript object
  return JSON.parse(jsonString);
}