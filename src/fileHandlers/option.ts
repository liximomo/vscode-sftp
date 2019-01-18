export interface FileHandleOption {
  ignore?: ((filepath: string) => boolean) | null;
}
