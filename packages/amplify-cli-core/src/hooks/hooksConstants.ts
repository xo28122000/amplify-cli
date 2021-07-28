export const suppportedEvents: { [key: string]: Set<string> } = {
  add: new Set([
    'notifications',
    'analytics',
    'api',
    'auth',
    'function',
    'hosting',
    'interactions',
    'predictions',
    'storage',
    'xr',
    'codegen',
    'env',
  ]),
  update: new Set([
    'notifications',
    'analytics',
    'api',
    'auth',
    'function',
    'hosting',
    'interactions',
    'predictions',
    'storage',
    'xr',
    'env',
  ]),
  remove: new Set([
    'notifications',
    'analytics',
    'api',
    'auth',
    'function',
    'hosting',
    'interactions',
    'predictions',
    'storage',
    'xr',
    'env',
  ]),
  push: new Set(['analytics', 'api', 'auth', 'function', 'hosting', 'interactions', 'storage', 'xr']),
  pull: new Set(['env']),
  publish: new Set([]),
  delete: new Set([]),
  checkout: new Set(['env']),
  list: new Set(['env']),
  get: new Set(['env']),
  mock: new Set(['api', 'storage', 'function']),
  build: new Set(['function']),
  status: new Set(['notifications']),
  import: new Set(['auth', 'storage', 'env']),
  gqlcompile: new Set(['api']),
  addgraphqldatasource: new Set(['api']),
  statements: new Set(['codegen']),
  types: new Set(['codegen']),
};

export const supportedEnvEvents: Set<string> = new Set(['add', 'update', 'remove', 'pull', 'checkout', 'list', 'get', 'import']);

export const defaultSupportedExt = { js: { runtime: 'node' }, sh: { runtime: 'bash' } };
