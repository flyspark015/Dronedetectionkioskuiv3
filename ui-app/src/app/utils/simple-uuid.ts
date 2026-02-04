let counter = 0;

export function simpleUUID() {
  const ts = Date.now().toString(36);
  counter = (counter + 1) % 16777216;
  const seq = counter.toString(36);
  const rand = Math.floor(Math.random() * 16777216).toString(36);
  return `u_${ts}_${seq}_${rand}`;
}
