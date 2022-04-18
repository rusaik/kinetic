import { DeleteIcon, ViewIcon } from '@chakra-ui/icons'
import { Box, Button, ButtonGroup, Code, Flex, SimpleGrid, Stack } from '@chakra-ui/react'
import { AdminUiAlert } from '@mogami/admin/ui/alert'
import { demoKeypairDb, DemoKeypairEntity } from '@mogami/demo/keypair/data-access'
import { ImportMnemonicModal, KeypairDetailsModal } from '@mogami/demo/keypair/ui'
import { Keypair } from '@mogami/keypair'
import { useLiveQuery } from 'dexie-react-hooks'
import React, { useState } from 'react'

export function DemoKeypairFeature() {
  const result = useLiveQuery(() => demoKeypairDb.keypair.toArray())
  const [keypairVisible, toggleKeypairVisible] = useState<boolean>(false)
  const [importVisible, toggleImportVisible] = useState<boolean>(false)
  const [mnemonicImport, setMnemonicImport] = useState<string>('')
  const [selectedKeypair, setSelectedKeypair] = useState<DemoKeypairEntity | null>()

  const deleteKeypair = (id: string) => demoKeypairDb.keypair.delete(id)

  const generateMnemonic = async () => storeMnemonic(Keypair.generateMnemonic())

  const importMnemonic = () => {
    // Save it
    storeMnemonic(mnemonicImport)
    // Reset input
    setMnemonicImport('')
    // Close Modal
    toggleImportVisible(false)
  }

  const showKeypair = (kp: any) => {
    setSelectedKeypair(kp)
    toggleKeypairVisible(true)
  }
  const storeMnemonic = (mnemonic: string) => {
    const [kp] = Keypair.fromMnemonicSet(mnemonic, 0, 1)
    demoKeypairDb.keypair.add({ id: kp.publicKey, mnemonic, publicKey: kp.publicKey, secretKey: kp.secretKey })
  }

  return (
    <Stack spacing={6}>
      <div>
        Here you can generate and import keypairs using the <code>@mogami/keypair</code> package.
      </div>
      <Stack direction="row" spacing={2} alignItems="center">
        <Button className={'generate-keypair-btn'} onClick={generateMnemonic}>
          Generate Keypair
        </Button>
        <Button className={'import-mnemonic-btn'} onClick={() => toggleImportVisible(true)}>
          Import Mnemonic
        </Button>
      </Stack>
      {result?.length ? (
        <SimpleGrid columns={[1, 2]} gap={[3, 6]}>
          {result?.map((kp) => (
            <Box key={kp.publicKey} borderWidth="1px" borderRadius="lg" overflow="hidden" p={6} bg="gray.800">
              <Flex justifyContent="space-between" alignItems="center">
                <Box>
                  <Code>{kp.publicKey}</Code>
                </Box>
                <ButtonGroup variant="outline" spacing="2">
                  <Button size="xs" onClick={() => showKeypair(kp)} colorScheme="teal">
                    <ViewIcon className="keypair-eye-icon" />
                  </Button>
                  <Button size="xs" onClick={() => deleteKeypair(kp.id!)}>
                    <DeleteIcon />
                  </Button>
                </ButtonGroup>
              </Flex>
            </Box>
          ))}
        </SimpleGrid>
      ) : (
        <div>
          <AdminUiAlert
            cyData="card-keypair-warning"
            status="info"
            title="No Keypairs found."
            message="Generate or import one to use the Mogami demo."
          />
        </div>
      )}

      <ImportMnemonicModal
        setValue={setMnemonicImport}
        submit={importMnemonic}
        value={mnemonicImport}
        toggle={() => toggleImportVisible(false)}
        visible={importVisible}
      />
      <KeypairDetailsModal
        keypair={selectedKeypair}
        toggle={() => toggleKeypairVisible(false)}
        visible={keypairVisible}
      />
    </Stack>
  )
}