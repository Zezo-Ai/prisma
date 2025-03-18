import type { GeneratorConfig } from '@prisma/generator-helper'

import { parseEnvValue } from './parseEnvValue'

export function extractPreviewFeatures(generators: GeneratorConfig[]): string[] {
  return generators.find((g) => parseEnvValue(g.provider) === 'prisma-client-js')?.previewFeatures || []
}
