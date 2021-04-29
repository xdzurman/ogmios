import { nanoid } from 'nanoid'
import { EraMismatch, Ogmios, ProtocolParametersShelley } from '@cardano-ogmios/schema'
import { EraMismatchError, QueryUnavailableInCurrentEraError, UnknownResultError } from '../../errors'
import { baseRequest } from '../../Request'
import { ensureSocket, InteractionContext } from '../../Connection'

const isEraMismatch = (result: Ogmios['QueryResponse[currentProtocolParameters]']['result']): result is EraMismatch =>
  (result as EraMismatch).eraMismatch !== undefined

const isProtocolParameters = (result: Ogmios['QueryResponse[currentProtocolParameters]']['result']): result is ProtocolParametersShelley =>
  (result as ProtocolParametersShelley).minFeeCoefficient !== undefined

export const currentProtocolParameters = (context?: InteractionContext): Promise<ProtocolParametersShelley> => {
  return ensureSocket<ProtocolParametersShelley>((socket) => {
    return new Promise((resolve, reject) => {
      const requestId = nanoid(5)
      socket.once('message', (message: string) => {
        const response: Ogmios['QueryResponse[currentProtocolParameters]'] = JSON.parse(message)
        if (response.reflection.requestId !== requestId) { return }
        if (response.result === 'QueryUnavailableInCurrentEra') {
          return reject(new QueryUnavailableInCurrentEraError('currentProtocolParameters'))
        } else if (isProtocolParameters(response.result)) {
          return resolve(response.result)
        } else if (isEraMismatch(response.result)) {
          const { eraMismatch } = response.result
          const { ledgerEra, queryEra } = eraMismatch
          return reject(new EraMismatchError(queryEra, ledgerEra))
        } else {
          return reject(new UnknownResultError(response.result))
        }
      })
      socket.send(JSON.stringify({
        ...baseRequest,
        methodname: 'Query',
        args: {
          query: 'currentProtocolParameters'
        },
        mirror: { requestId }
      } as Ogmios['Query']))
    })
  },
  context
  )
}
