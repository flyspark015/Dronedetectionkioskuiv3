self.crypto = self.crypto || {};
if (typeof self.crypto.randomUUID !== 'function') {
  self.crypto.randomUUID = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
}
importScripts('/maplibre-gl-csp-worker.js');
