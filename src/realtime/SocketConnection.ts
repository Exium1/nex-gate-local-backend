export abstract class SocketConnection  {
  protected pending = new Map<number, {
    resolve: (value: any) => void
    reject: (reason: any) => void
    timeout: ReturnType<typeof setTimeout>
  }>()
  private requestCount = 0

  protected abstract send(data: any): void

  protected request<T>(data: any, timeoutMs = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = this.requestCount++
      const timeout = setTimeout(() => {
        this.pending.delete(requestId)
        reject(new Error(`Request ${data.type} timed out`))
      }, timeoutMs)
      this.pending.set(requestId, { resolve, reject, timeout })
      this.send({ request_id: requestId, ...data })
    })
  }

  protected resolveRequest(requestId: number, data: any) {
    const pending = this.pending.get(requestId)
    if (pending) {
      clearTimeout(pending.timeout)
      this.pending.delete(requestId)
      pending.resolve(data)
    }
  }

  protected rejectRequest(requestId: number, error: any) {
    const pending = this.pending.get(requestId)
    if (pending) {
      clearTimeout(pending.timeout)
      this.pending.delete(requestId)
      pending.reject(error)
    }
  }
}