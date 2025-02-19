import { defineMatrix } from '../../_utils/defineMatrix'
import { Providers } from '../../_utils/providers'

export default defineMatrix(() => [
  [
    { provider: Providers.POSTGRESQL },
    { provider: Providers.SQLITE },
    { provider: Providers.COCKROACHDB },
    { provider: Providers.MYSQL },
    { provider: Providers.MONGODB },
  ],
])
