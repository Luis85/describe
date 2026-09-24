import type { DescriptionInput } from './model';

/** UI-independent field identity lets the form reveal and focus the invalid input. */
export class DescriptionValidationError extends Error {
  constructor(readonly field: keyof DescriptionInput, message: string) {
    super(message);
    this.name = 'DescriptionValidationError';
  }
}
