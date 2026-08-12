export type ExpectEqual<A, B>
  = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false

export type AssertTrue<T extends true> = T
