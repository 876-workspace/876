import path from 'node:path'
import type { NextConfig } from 'next'
import { sharedTranspilePackages } from '../../scripts/shared-ui-packages.mjs'
const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: sharedTranspilePackages([
    '@876/account',
    '@876/core',
    '@876/workspace',
    '@876/commerce',
  ]),
}
export default nextConfig
