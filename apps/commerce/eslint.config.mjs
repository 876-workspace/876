import { globalIgnores } from 'eslint/config'
import config from '../../eslint.config.mjs'
import { generatedIgnores } from '../../eslint.ignores.mjs'

export default [...config, globalIgnores(generatedIgnores)]
