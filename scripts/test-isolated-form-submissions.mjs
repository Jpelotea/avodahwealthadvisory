// Compatibility entrypoint retained for the dedicated isolated Forms workflow.
await import('./run-isolated-form-submissions-v2.mjs');
if (!process.exitCode) {
  await import('./test-milestone-12d-form-options.mjs');
}
