import { ApiProperty } from '@nestjs/swagger'
import { ConfirmedTransactionMeta } from './confirmed-transaction-meta.entity'
import { TransactionData } from './transaction-data.entity'

export class TransactionResponse {
  @ApiProperty({ nullable: true, required: false })
  slot: number | null
  @ApiProperty()
  transaction: TransactionData
  @ApiProperty()
  meta: ConfirmedTransactionMeta | null
  @ApiProperty({ nullable: true, required: false })
  blockTime?: number | null
}
