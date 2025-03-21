import type * as DMMF from '@prisma/dmmf'
import type { GetDMMFOptions } from '@prisma/internals'
import { getDMMF as getRawDMMF } from '@prisma/internals'

import { externalToInternalDmmf } from '../runtime/externalToInternalDmmf'
import type { DMMF as PrismaClientDMMF } from './dmmf-types'

export function getPrismaClientDMMF(dmmf: DMMF.Document): PrismaClientDMMF.Document {
  return externalToInternalDmmf(dmmf)
}

// Mostly used for tests
export async function getDMMF(options: GetDMMFOptions): Promise<PrismaClientDMMF.Document> {
  const dmmf = await getRawDMMF(options)
  return getPrismaClientDMMF(dmmf)
}
