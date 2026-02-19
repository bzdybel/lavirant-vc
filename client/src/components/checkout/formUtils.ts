import type { CustomerFormData } from './types';

export const extractFormData = (form: HTMLFormElement | null): CustomerFormData | null => {
  if (!form) return null;

  const formData = new FormData(form);

  return {
    firstName: (formData.get('firstName') as string) || '',
    lastName: (formData.get('lastName') as string) || '',
    email: (formData.get('email') as string) || '',
    phone: (formData.get('phone') as string) || '',
    address: (formData.get('address') as string) || '',
    city: (formData.get('city') as string) || '',
    postalCode: (formData.get('postalCode') as string) || '',
    country: (formData.get('country') as string) || 'Polska',
  };
};
