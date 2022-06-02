import { ApiCoreDataAccessService } from '@mogami/api/core/data-access'
import { UserRole } from '@mogami/api/user/data-access'
import { ApiWalletDataAccessService } from '@mogami/api/wallet/data-access'
import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common'
import { AppWebhookType, Prisma } from '@prisma/client'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Keypair } from '@solana/web3.js'
import { Response } from 'express'
import { IncomingHttpHeaders } from 'http'
import { AppCreateInput } from './dto/app-create.input'
import { AppUpdateInput } from './dto/app-update.input'
import { AppUserAddInput } from './dto/app-user-add.input'
import { AppUserRemoveInput } from './dto/app-user-remove.input'
import { AppUserUpdateRoleInput } from './dto/app-user-update-role.input'
import { AppConfig } from './entity/app-config.entity'
import { AppUserRole } from './entity/app-user-role.enum'
import { AppWebhookDirection } from './entity/app-webhook-direction.enum'

function isValidAppWebhookType(type: string) {
  return Object.keys(AppWebhookType)
    .map((item) => item.toLowerCase())
    .includes(type.toLowerCase())
}

@Injectable()
export class ApiAppDataAccessService implements OnModuleInit {
  private include: Prisma.AppInclude = {
    users: { include: { user: true } },
    envs: {
      include: {
        cluster: true,
        mints: {
          include: {
            mint: true,
            wallet: true,
          },
        },
        wallets: true,
      },
    },
    wallets: true,
  }
  private readonly logger = new Logger(ApiAppDataAccessService.name)
  constructor(private readonly data: ApiCoreDataAccessService, private readonly wallet: ApiWalletDataAccessService) {}

  async onModuleInit() {
    await this.configureProvisionedApps()
  }

  async createApp(userId: string, input: AppCreateInput) {
    await this.data.ensureAdminUser(userId)
    const app = await this.data.getAppByIndex(input.index)
    if (app) {
      throw new BadRequestException(`App with index ${input.index} already exists`)
    }
    const clusters = await this.data.getActiveClusters()
    this.logger.verbose(`app ${input.index}: creating ${input.name}...`)
    let wallets
    if (!input.skipWalletCreation) {
      const generated = await this.wallet.generateWallet(userId, input.index)
      wallets = { connect: { id: generated.id } }
      this.logger.verbose(`app ${input.index}: connecting wallet ${generated.publicKey}...`)
    }

    const data: Prisma.AppCreateInput = {
      index: input.index,
      name: input.name,
      users: { create: { role: AppUserRole.Owner, userId } },
      envs: {
        // Create an app environment for each active cluster
        create: [
          ...clusters.map((cluster) => ({
            // Connect the cluster
            cluster: { connect: { id: cluster.id } },
            // Set the name based on the type, so 'SolanaDevnet' => 'devnet'
            name: cluster.type.toLowerCase().replace('solana', ''),
            // Connect the wallet
            wallets,
            // Create the KIN mint and connect it to the wallet
            mints: {
              create: cluster.mints
                .filter((mint) => mint.symbol === 'KIN')
                .map((mint) => ({
                  mint: { connect: { id: mint.id } },
                  wallet: wallets,
                })),
            },
          })),
        ],
      },
      wallets,
    }
    const created = await this.data.app.create({ data, include: this.include })
    this.logger.verbose(`app ${created.index}: created app ${created.name}`)
    return created
  }

  async deleteApp(userId: string, appId: string) {
    await this.ensureAppById(userId, appId)
    await this.data.appUser.deleteMany({ where: { appId } })
    await this.data.appEnv.deleteMany({ where: { appId } })
    return this.data.app.delete({ where: { id: appId } })
  }

  async apps(userId: string) {
    await this.data.ensureAdminUser(userId)
    return this.data.app.findMany({
      include: this.include,
      orderBy: { updatedAt: 'desc' },
    })
  }

  app(userId: string, appId: string) {
    return this.ensureAppById(userId, appId)
  }

  async appTransaction(userId: string, appId: string, appTransactionId: string) {
    await this.ensureAppById(userId, appId)
    return this.data.appTransaction.findUnique({
      where: { id: appTransactionId },
      include: { errors: true },
    })
  }

  async appTransactions(userId: string, appId: string) {
    await this.ensureAppById(userId, appId)
    return this.data.appTransaction.findMany({
      where: { appId },
      take: 100,
      orderBy: { updatedAt: 'desc' },
      include: { errors: true },
    })
  }

  async appWebhook(userId: string, appId: string, appWebhookId: string) {
    await this.ensureAppById(userId, appId)
    return this.data.appWebhook.findUnique({
      where: { id: appWebhookId },
    })
  }

  async appWebhooks(userId: string, appId: string) {
    await this.ensureAppById(userId, appId)
    return this.data.appWebhook.findMany({
      where: { appId },
      take: 100,
      orderBy: { updatedAt: 'desc' },
    })
  }

  async appUserAdd(userId: string, appId: string, input: AppUserAddInput) {
    await this.ensureAppById(userId, appId)
    return this.data.app.update({
      where: { id: appId },
      data: { users: { create: { userId: input.userId, role: input.role } } },
      include: this.include,
    })
  }

  async appUserRemove(userId: string, appId: string, input: AppUserRemoveInput) {
    await this.ensureAppById(userId, appId)
    return this.data.app.update({
      where: { id: appId },
      data: { users: { deleteMany: { userId: input.userId } } },
      include: this.include,
    })
  }

  async appUserUpdateRole(userId: string, appId: string, input: AppUserUpdateRoleInput) {
    await this.ensureAppById(userId, appId)
    const existing = await this.data.appUser.findFirst({ where: { userId: input.userId, appId: appId } })
    return this.data.app.update({
      where: { id: appId },
      data: {
        users: {
          update: {
            where: { id: existing.id },
            data: { role: input.role },
          },
        },
      },
      include: this.include,
    })
  }

  async updateApp(userId: string, appId: string, data: AppUpdateInput) {
    await this.ensureAppById(userId, appId)
    return this.data.app.update({ where: { id: appId }, data, include: this.include })
  }

  private async ensureAppById(userId: string, appId: string) {
    await this.data.ensureAdminUser(userId)
    const app = await this.data.getAppById(appId)
    if (!app) {
      throw new NotFoundException(`App with id ${appId} does not exist.`)
    }
    return app
  }

  async appWalletAdd(userId: string, appId: string, walletId: string) {
    const app = await this.ensureAppById(userId, appId)
    const found = app.wallets.find((item) => item.id === walletId)
    if (found) {
      throw new BadRequestException(`App already has a wallet with id ${walletId}`)
    }
    const wallet = await this.data.wallet.findUnique({ where: { id: walletId } })
    if (!wallet) {
      throw new BadRequestException(`Wallet with id ${walletId} not found`)
    }
    return this.data.app.update({
      where: { id: appId },
      data: { wallets: { connect: { id: wallet.id } } },
      include: this.include,
    })
  }

  async appWalletRemove(userId: string, appId: string, walletId: string) {
    const app = await this.ensureAppById(userId, appId)
    const found = app.wallets.find((item) => item.id === walletId)
    if (!found) {
      throw new BadRequestException(`App has no wallet with id ${walletId}`)
    }
    const wallet = await this.data.wallet.findUnique({ where: { id: walletId } })
    if (!wallet) {
      throw new BadRequestException(`Wallet with id ${walletId} not found`)
    }
    return this.data.app.update({
      where: { id: appId },
      data: { wallets: { disconnect: { id: wallet.id } } },
      include: this.include,
    })
  }

  async getConfig(index: number): Promise<AppConfig> {
    const {
      name,
      wallets: [wallet],
    } = await this.data.getAppByIndex(index)

    return {
      app: {
        index,
        name,
      },
      mint: {
        feePayer: wallet.publicKey,
        programId: TOKEN_PROGRAM_ID.toBase58(),
        publicKey: this.data.config.mogamiMintPublicKey,
      },
    }
  }

  async storeIncomingWebhook(
    index: number,
    type: string,
    headers: IncomingHttpHeaders,
    payload: object,
    res: Response,
  ) {
    // Make sure the webhook type is valid
    if (!isValidAppWebhookType(type)) {
      res.statusCode = 400
      return res.send(new BadRequestException(`Unknown AppWebhookType`))
    }

    try {
      // Get the app by Index
      const app = await this.data.getAppByIndex(index)
      if (!app.webhookAcceptIncoming) {
        this.logger.warn(`storeIncomingWebhook ignoring request, webhookAcceptIncoming is disabled`)
        res.statusCode = 400
        return res.send(new Error(`webhookAcceptIncoming is disabled`))
      }

      // Store the incoming webhook
      const created = await this.data.appWebhook.create({
        data: {
          direction: AppWebhookDirection.Incoming,
          appId: app.id,
          headers,
          payload,
          type: type === 'event' ? AppWebhookType.Event : AppWebhookType.Verify,
        },
      })
      res.statusCode = 200
      return res.send(created)
    } catch (e) {
      res.statusCode = 400
      return res.send(new BadRequestException(`Something went wrong storing incoming webhook`))
    }
  }

  private async configureProvisionedApps() {
    let adminId
    return Promise.all(
      this.data.config.provisionedApps.map(async (app) => {
        const found = await this.data.getAppByIndex(app.index)
        if (found) {
          const { publicKey } = Keypair.fromSecretKey(Buffer.from(app.feePayerByteArray))
          this.logger.verbose(
            `Provisioned app ${app.index} (${app.name}) found: ${publicKey} ${found.envs
              .map((env) => `=> ${env.name}: ${env.mints.map((mint) => mint.mint.symbol).join(', ')}`)
              .join(', ')}`,
          )
        } else {
          if (!adminId) {
            const admin = await this.data.user.findFirst({
              where: { role: UserRole.Admin },
              orderBy: { createdAt: 'asc' },
            })
            adminId = admin.id
          }
          await this.createApp(adminId, { index: app.index, name: app.name })
        }
      }),
    )
  }
}
