export interface UnitOfWork {
  label: string;
  process(): Promise<void>;
}

export interface JobHandlerStrategy {
  handle(uow: UnitOfWork): () => Promise<void>;
}
