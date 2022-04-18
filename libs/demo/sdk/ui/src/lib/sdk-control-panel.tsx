import { Stack } from '@chakra-ui/react'
import { AdminUiAlert } from '@mogami/admin/ui/alert'
import { DemoKeypairEntity } from '@mogami/demo/keypair/data-access'
import { Sdk } from '@mogami/sdk'
import React from 'react'

import { SdkControlPanelAccountBalance } from './sdk-control-panel-account-balance'
import { SdkControlPanelAccountHistory } from './sdk-control-panel-account-history'
import { SdkControlPanelCreateAccount } from './sdk-control-panel-create-account'
import { SdkControlPanelRequestAirdrop } from './sdk-control-panel-request-airdrop'
import { SdkControlPanelServerConfig } from './sdk-control-panel-server-config'
import { SdkControlPanelSubmitPayment } from './sdk-control-panel-submit-payment'
import { SdkControlPanelTokenAccounts } from './sdk-control-panel-token-accounts'

export function SdkControlPanel({ keypair, sdk }: { keypair: DemoKeypairEntity; sdk: Sdk }) {
  return (
    <Stack spacing={6}>
      <AdminUiAlert status="success" title="SDK Configured" message={`The SDK is connected to ${sdk.endpoint}`} />
      <SdkControlPanelServerConfig sdk={sdk} />
      <SdkControlPanelAccountBalance keypair={keypair} sdk={sdk} />
      <SdkControlPanelTokenAccounts keypair={keypair} sdk={sdk} />
      <SdkControlPanelAccountHistory keypair={keypair} sdk={sdk} />
      <SdkControlPanelRequestAirdrop keypair={keypair} sdk={sdk} />
      <SdkControlPanelCreateAccount keypair={keypair} sdk={sdk} />
      <SdkControlPanelSubmitPayment keypair={keypair} sdk={sdk} />
    </Stack>
  )
}