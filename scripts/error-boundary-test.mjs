import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const element = (type, props) => ({ type, props })
const component = () => null

function load(source, reload) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  })
  const exports = {}
  const rootWindow = {
    location: { reload },
    dispatchEvent() {},
  }
  const mocks = {
    'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: Symbol() },
    'react': { useEffect: callback => callback(), useSyncExternalStore: () => 'de' },
    'next/navigation': { usePathname: () => '/dashboard' },
    '@/lib/locales/config': { localeTags: { de: 'de-CH' } },
  }
  const mockImport = name => mocks[name] ?? new Proxy({}, { get: () => component })
  new Function('require', 'exports', 'window', 'document', 'navigator', 'caches', outputText)(
    mockImport, exports, rootWindow, {}, {}, {
      keys: () => { throw new Error('A render error must not clear browser caches') },
    },
  )
  return exports.default
}

function recoveryAction(root) {
  if (Array.isArray(root)) {
    for (const node of root) {
      const action = recoveryAction(node)
      if (action) return action
    }
  }
  if (root?.props) {
    const { onClick, onRetry, children, action, actions } = root.props
    return onClick ?? onRetry ?? recoveryAction([children, action, actions])
  }
}

for (const file of ["app/error.tsx","app/global-error.tsx"]) {
  let reloads = 0
  let retries = 0
  let resets = 0
  const source = await readFile(file, 'utf8')
  const render = load(source, () => { reloads++ })
  const input = {
    error: Object.assign(new Error('synthetic-private-detail'), { digest: 'fixture-id' }),
    reset: () => { resets++ },
    retry: () => { retries++ },
  }
  const preferred = recoveryAction(render(input))
  assert.equal(typeof preferred, 'function', file)
  assert.equal(reloads, 0, file + ': render must not reload')
  preferred()
  assert.equal(retries, 1, file + ': framework retry must be called')

  recoveryAction(render({ ...input, retry: undefined }))()
  assert.equal(resets, 1, file + ': reset must remain usable')
}
console.log('Error boundary retry, reset and render safety checks passed')
