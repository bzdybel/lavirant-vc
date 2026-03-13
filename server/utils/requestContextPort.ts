export interface HasRequestHeader {
  request: {
    header(name: string): string | undefined;
  };
}
