import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'

export type StoreSyncCredentialParams = {
  connectionId: string
  sealedSecret: string
  keyId: string | null
  vaultProvider: string
}

export const retrieve = (id: string) =>
  prisma.workSyncCredential.findUnique({
    where: { id },
    include: { connection: true },
  })

export const retrieveForConnection = (connectionId: string) =>
  prisma.workSyncCredential.findUnique({
    where: { connectionId },
    include: { connection: true },
  })

export async function store(params: StoreSyncCredentialParams) {
  const id = `synccred_${randomUUID().replaceAll('-', '')}`

  return prisma.$transaction(async (tx) => {
    const credential = await tx.workSyncCredential.upsert({
      where: { connectionId: params.connectionId },
      create: {
        id,
        connectionId: params.connectionId,
        sealedSecret: params.sealedSecret,
        keyId: params.keyId,
        vaultProvider: params.vaultProvider,
      },
      update: {
        sealedSecret: params.sealedSecret,
        keyId: params.keyId,
        vaultProvider: params.vaultProvider,
      },
    })

    await tx.workSyncConnection.update({
      where: { id: params.connectionId },
      data: { credentialRef: credential.id },
    })

    return credential
  })
}

export async function removeForConnection(connectionId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.workSyncCredential.deleteMany({ where: { connectionId } })
    await tx.workSyncConnection.update({
      where: { id: connectionId },
      data: { credentialRef: null },
    })
  })
}
