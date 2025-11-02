declare module 'qrcode' {
  interface ToDataURLOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    type?: string
    width?: number
    margin?: number
    color?: {
      dark?: string
      light?: string
    }
  }

  export function toDataURL(text: string, options?: ToDataURLOptions): Promise<string>

  const _default: {
    toDataURL: typeof toDataURL
  }

  export default _default
}
