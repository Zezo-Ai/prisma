import { AdapterProviders, Providers } from '../_utils/providers'
import { ConditionalError } from '../_utils/relationMode/conditionalError'
import testMatrix from './_matrix'

/* eslint-disable @typescript-eslint/no-unused-vars */

// @ts-ignore this is just for type checks
declare let prisma: import('./generated/prisma/client').PrismaClient

// @ts-ignore
const describeIf = (condition: boolean) => (condition ? describe : describe.skip)

/**
 * 1:n relation
 */
testMatrix.setupTestSuite(
  (suiteConfig, suiteMeta) => {
    const conditionalError = ConditionalError.new()
      .with('provider', suiteConfig.provider)
      .with('driverAdapter', suiteConfig.driverAdapter)
      // @ts-ignore
      .with('relationMode', 'foreignKeys' as const)

    describe('1:n mandatory (explicit)', () => {
      const userModel = 'userOneToMany'
      const postModel = 'postOneToMany'
      const { defaultUserId } = suiteConfig

      // - create user 1 with one post having id 1
      // - create user 3 with no posts
      async function createTemplate() {
        // creating user id=1
        await prisma[userModel].create({
          data: { id: 1 },
        })

        // creating user id=${defaultUserId}
        await prisma[userModel].create({
          data: { id: defaultUserId },
        })

        // creating post id=1, userId=1
        await prisma[postModel].create({
          data: {
            id: 1,
            userId: 1,
          },
        })
      }

      beforeEach(async () => {
        await prisma.$transaction([prisma[postModel].deleteMany(), prisma[userModel].deleteMany()])
      })

      describe('[create]', () => {
        test('[create] creating a table with SetDefault is accepted', async () => {
          await createTemplate()

          const usersAndPosts = await prisma[userModel].findMany({
            include: {
              posts: true,
            },
            orderBy: { id: 'asc' },
          })
          expect(usersAndPosts).toMatchObject([
            {
              id: 1,
              posts: [
                {
                  id: 1,
                  userId: 1,
                },
              ],
            },
            {
              id: defaultUserId,
              posts: [],
            },
          ])
        })
      })

      describe('[update]', () => {
        describeIf([Providers.MYSQL].includes(suiteConfig.provider))('with mysql', () => {
          test('[update] changing existing user id to a new one triggers NoAction under the hood', async () => {
            await createTemplate()

            await expect(
              prisma[userModel].update({
                where: { id: 1 },
                data: {
                  id: 2,
                },
              }),
            ).rejects.toThrow(
              conditionalError.snapshot({
                foreignKeys: {
                  [Providers.MYSQL]: 'Foreign key constraint violated on the fields: (`userId`)',
                  [AdapterProviders.JS_MARIADB]: 'Foreign key constraint violated on the fields: (`userId`)',
                },
              }),
            )
          })
        })

        describeIf(![Providers.MYSQL].includes(suiteConfig.provider))('without mysql', () => {
          test('[update] changing existing user id to a new one triggers SetDefault', async () => {
            await createTemplate()

            await prisma[userModel].update({
              where: { id: 1 },
              data: {
                id: 2,
              },
            })

            const users = await prisma[userModel].findMany({
              orderBy: { id: 'asc' },
            })

            expect(users).toMatchObject([{ id: 2 }, { id: defaultUserId }])

            const posts = await prisma[postModel].findMany({
              orderBy: { id: 'asc' },
            })

            expect(posts).toMatchObject([
              {
                id: 1,
                userId: defaultUserId,
              },
            ])
          })
        })

        test('[update] removing user with default id and changing existing user id to a new one triggers SetDefault in post, which throws', async () => {
          await createTemplate()

          await prisma[userModel].delete({
            where: { id: defaultUserId },
          })

          // postModel cannot fall back to { userId: defaultUserId }, as no user with that id exists
          await expect(
            prisma[userModel].update({
              where: { id: 1 },
              data: {
                id: 2,
              },
            }),
          ).rejects.toThrow(
            conditionalError.snapshot({
              foreignKeys: {
                [Providers.POSTGRESQL]:
                  'Foreign key constraint violated on the constraint: `PostOneToMany_userId_fkey`',
                [Providers.COCKROACHDB]:
                  'Foreign key constraint violated on the constraint: `PostOneToMany_userId_fkey`',
                [Providers.MYSQL]: 'Foreign key constraint violated on the fields: (`userId`)',
                [Providers.SQLSERVER]: 'Foreign key constraint violated on the constraint: `PostOneToMany_userId_fkey`',
                [Providers.SQLITE]: 'Foreign key constraint violated on the foreign key',
                [AdapterProviders.JS_D1]: 'D1_ERROR: FOREIGN KEY constraint failed',
                [AdapterProviders.JS_NEON]:
                  'Foreign key constraint violated on the constraint: `PostOneToMany_userId_fkey`',
                [AdapterProviders.JS_PG]:
                  'Foreign key constraint violated on the constraint: `PostOneToMany_userId_fkey`',
                [AdapterProviders.JS_PG_COCKROACHDB]:
                  'Foreign key constraint violated on the constraint: `PostOneToMany_userId_fkey`',
                [AdapterProviders.JS_MSSQL]:
                  'Foreign key constraint violated on the constraint: `PostOneToMany_userId_fkey`',
                [AdapterProviders.JS_MARIADB]: 'Foreign key constraint violated on the fields: (`userId`)',
              },
            }),
          )
        })
      })

      describe('[delete]', () => {
        describeIf([Providers.MYSQL].includes(suiteConfig.provider))('with mysql', () => {
          test('[delete] changing existing user id to a new one triggers NoAction under the hood', async () => {
            await createTemplate()

            await expect(
              prisma[userModel].delete({
                where: { id: 1 },
              }),
            ).rejects.toThrow(
              conditionalError.snapshot({
                foreignKeys: {
                  [Providers.MYSQL]: 'Foreign key constraint violated on the fields: (`userId`)',
                  [AdapterProviders.JS_MARIADB]: 'Foreign key constraint violated on the fields: (`userId`)',
                },
              }),
            )
          })
        })

        describeIf(![Providers.MYSQL].includes(suiteConfig.provider))('without mysql', () => {
          test('[delete] deleting existing user one triggers SetDefault', async () => {
            await createTemplate()

            await prisma[userModel].delete({
              where: { id: 1 },
            })

            const users = await prisma[userModel].findMany({
              orderBy: { id: 'asc' },
            })

            expect(users).toMatchObject([{ id: defaultUserId }])

            const posts = await prisma[postModel].findMany({
              include: { user: true },
              orderBy: { id: 'asc' },
            })

            expect(posts).toMatchObject([
              {
                id: 1,
                userId: defaultUserId,
              },
            ])
          })
        })

        test('[delete] removing user with default id and changing existing user id to a new one triggers SetDefault in post, which throws', async () => {
          await createTemplate()

          await prisma[userModel].delete({
            where: { id: defaultUserId },
          })

          // postModel cannot fall back to { userId: defaultUserId }, as no user with that id exists
          await expect(
            prisma[userModel].delete({
              where: { id: 1 },
            }),
          ).rejects.toThrow(
            conditionalError.snapshot({
              foreignKeys: {
                [Providers.POSTGRESQL]:
                  'Foreign key constraint violated on the constraint: `PostOneToMany_userId_fkey`',
                [Providers.COCKROACHDB]:
                  'Foreign key constraint violated on the constraint: `PostOneToMany_userId_fkey`',
                [Providers.MYSQL]: 'Foreign key constraint violated on the fields: (`userId`)',
                [Providers.SQLSERVER]: 'Foreign key constraint violated on the constraint: `PostOneToMany_userId_fkey`',
                [Providers.SQLITE]: 'Foreign key constraint violated on the foreign key',
                [AdapterProviders.JS_D1]: 'D1_ERROR: FOREIGN KEY constraint failed',
                [AdapterProviders.JS_NEON]:
                  'Foreign key constraint violated on the constraint: `PostOneToMany_userId_fkey`',
                [AdapterProviders.JS_PG]:
                  'Foreign key constraint violated on the constraint: `PostOneToMany_userId_fkey`',
                [AdapterProviders.JS_PG_COCKROACHDB]:
                  'Foreign key constraint violated on the constraint: `PostOneToMany_userId_fkey`',
                [AdapterProviders.JS_MSSQL]:
                  'Foreign key constraint violated on the constraint: `PostOneToMany_userId_fkey`',
                [AdapterProviders.JS_MARIADB]: 'Foreign key constraint violated on the fields: (`userId`)',
              },
            }),
          )
        })
      })
    })
  },
  // Use `optOut` to opt out from testing the default selected providers
  // otherwise the suite will require all providers to be specified.
  {
    optOut: {
      from: [Providers.MONGODB],
      reason: 'Only testing relational databases using foreign keys.',
    },
    skipDriverAdapter: {
      from: ['js_planetscale'],
      reason: 'Only testing relational databases using foreign keys.',
    },
  },
)
