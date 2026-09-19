import { globalIgnores } from 'eslint/config'
import config from '../../eslint.config.mjs'
import { generatedIgnores } from '../../eslint.ignores.mjs'
import { typesafetyRules } from '../../eslint.typesafety.mjs'

export default [...config, ...typesafetyRules, globalIgnores(generatedIgnores)]
