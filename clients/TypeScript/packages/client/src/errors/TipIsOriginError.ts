import { CustomError } from 'ts-custom-error'

export class TipIsOriginError extends CustomError {
  public constructor () {
    super()
    this.message = 'Unable to produce point as the chain tip is the origin'
  }
}
