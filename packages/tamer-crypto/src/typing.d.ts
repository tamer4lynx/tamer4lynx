declare var NativeModules: {
  TamerCryptoModule?: {
    invokeAsync(json: string, callback: (json: string) => void): void
    getRandomValuesSync?(length: number): string
    randomUUIDSync?(): string
  }
}
