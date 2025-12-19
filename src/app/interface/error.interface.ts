export type TErrorSource = {
  path: string | number;
  message: string;
};

export type TGenericErrorReturnType = {
  statusCode: number;
  message: string;
  errorSources: TErrorSource[];
};
