import { ApiProperty } from '@nestjs/swagger'

export class MinimumKinVersionResponse {
  @ApiProperty()
  version: number
}
