import { ApiCoreDataAccessService } from '@mogami/api/core/data-access'
import { Injectable } from '@nestjs/common'
import { Transaction } from '@solana/web3.js'
import * as borsh from 'borsh'
import { SubmitPaymentRequest } from './dto/submit-payment-request.dto'
import { HistoryResponse } from './entities/history.entity'
import { MinimumBalanceForRentExemptionResponse } from './entities/minimum-balance-for-rent-exemption.entity'
import { MinimumKinVersionResponse } from './entities/minimum-kin-version.entity'
import { RecentBlockhashResponse } from './entities/recent-blockhash.entity'
import { ServiceConfigResponse } from './entities/service-config.entity'
import { SignTransactionResponse } from './entities/sign-transaction.entity'

@Injectable()
export class ApiTransactionDataAccessService {
  constructor(readonly data: ApiCoreDataAccessService) {}

  getServiceConfig(): ServiceConfigResponse {
    return this.data.config.getServiceConfig()
  }

  getMinimumKinVersion(): MinimumKinVersionResponse {
    return { version: 5 }
  }

  getRecentBlockhash(): Promise<RecentBlockhashResponse> {
    return this.data.solana.getRecentBlockhash()
  }

  async getMinimumBalanceForRentExemption(dataLength: number): Promise<MinimumBalanceForRentExemptionResponse> {
    const lamports = await this.data.solana.getMinimumBalanceForRentExemption(dataLength)
    return { lamports } as MinimumBalanceForRentExemptionResponse
  }

  getHistory(): HistoryResponse {
    return {}
  }

  signTransaction(): SignTransactionResponse {
    return {}
  }

  async submitTransaction(body: SubmitPaymentRequest): Promise<string> {
    console.log(body.tx)
    const txJson = JSON.parse(body.tx)
    const schema = new Map([
      [
        Object,
        {
          kind: 'struct',
          fields: [['data', [341]]],
        },
      ],
    ])

    const buffer = borsh.serialize(schema, txJson)
    const tx = Transaction.from(buffer)
    tx.partialSign(...[this.data.config.mogamiSubsidizerKeypair])
    return this.data.solana.submitTransaction(tx)
  }
}
