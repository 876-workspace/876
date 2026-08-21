#!/usr/bin/env node

import { chmodSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const hookPath = '.githooks/commit-msg'

chmodSync(hookPath, 0o755)
execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'inherit' })

console.log('Configured repository Git hooks from .githooks/.')
