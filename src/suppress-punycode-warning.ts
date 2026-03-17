process.on('warning', (w) => {
  if (w.name === 'DeprecationWarning' && /punycode/i.test(w.message)) return;
  console.warn(w.toString());
});
