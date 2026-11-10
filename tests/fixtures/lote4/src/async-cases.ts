const fetchValue = (): Promise<number> => Promise.resolve(1);

export const awaitDirect = async (): Promise<number> => {
  return await fetchValue();
};

export const noAwait = async (): Promise<number> => {
  return 1;
};

export const returnsPromise = async (): Promise<number> => {
  return fetchValue();
};

export const returnsThenable = async (): Promise<number> => {
  const thenable: PromiseLike<number> = {
    then: (onFulfilled) => Promise.resolve(onFulfilled?.(1)),
  };
  return thenable;
};

export const rejectString = (): Promise<never> => Promise.reject('Erro');

export const rejectError = (): Promise<never> => Promise.reject(new Error('Erro'));
