import { Keypair } from '@kin-kinetic/keypair'
import { KineticSdk, Transaction } from '@kin-kinetic/sdk'
import { Button, ButtonGroup } from '@saas-ui/react'
import { useState } from 'react'
import { WebToolboxUiCard } from './web-toolbox-ui-card'

export function WebToolboxUiCreateAccount({ keypair, sdk }: { keypair: Keypair; sdk: KineticSdk }) {
  const [error, setError] = useState<unknown | undefined>()
  const [loading, setLoading] = useState<boolean>(false)

  const [response, setResponse] = useState<Transaction | undefined>()

  function createAccount() {
    setResponse(undefined)
    setError(undefined)
    setLoading(true)

    sdk
      .createAccount({ owner: keypair })
      .then((res) => {
        setResponse(res)
        if (res.errors?.length) {
          setError(res.errors)
        }
        setLoading(false)
      })
      .catch((err) => {
        setError(err)
        setLoading(false)
      })
  }

  return (
    <WebToolboxUiCard response={response} error={error}>
      <ButtonGroup>
        <Button variant="primary" isLoading={loading} size="lg" onClick={createAccount}>
          Create Account
        </Button>
        {response?.status && (
          <Button size="lg" disabled={true}>
            {response?.status}
          </Button>
        )}
      </ButtonGroup>
    </WebToolboxUiCard>
  )
}
