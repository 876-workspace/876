import config from '../../eslint.config.mjs'
import { typesafetyRules } from '../../eslint.typesafety.mjs'

export default [...config, ...typesafetyRules]
