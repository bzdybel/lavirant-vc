import { sanitizeName, sanitizePhone, formatPostalCode } from './validation';
import { FormField } from './FormField';
import content from "@/lib/content.json";

const { customerInfo } = content.checkout;

const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  e.target.value = sanitizeName(e.target.value);
};

const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  e.target.value = sanitizePhone(e.target.value);
};

const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  e.target.value = formatPostalCode(e.target.value);
};

export const CustomerInfoFields = () => {

  return (
    <div className="bg-[#1a3244]/60 rounded-lg border border-white/10 p-6 space-y-4">
      <h3 className="text-xl font-semibold text-white mb-4">{customerInfo.title}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          id="firstName"
          name="firstName"
          label={customerInfo.firstName}
          placeholder="Jan"
          onChange={handleNameChange}
        />

        <FormField
          id="lastName"
          name="lastName"
          label={customerInfo.lastName}
          placeholder="Kowalski"
          onChange={handleNameChange}
        />

        <FormField
          id="email"
          name="email"
          label={customerInfo.email}
          type="email"
          placeholder="jan@example.com"
        />

        <FormField
          id="phone"
          name="phone"
          label={customerInfo.phone}
          type="tel"
          placeholder="123456789"
          maxLength={9}
          onChange={handlePhoneChange}
        />

        <div className="md:col-span-2">
          <FormField
            id="address"
            name="address"
            label={customerInfo.address}
            placeholder="ul. Przykładowa 123"
          />
        </div>

        <FormField
          id="city"
          name="city"
          label={customerInfo.city}
          placeholder="Warszawa"
        />

        <FormField
          id="postalCode"
          name="postalCode"
          label={customerInfo.postalCode}
          placeholder="00-000"
          maxLength={6}
          onChange={handlePostalCodeChange}
        />

        <div className="md:col-span-2">
          <FormField
            id="country"
            name="country"
            label={customerInfo.country}
            defaultValue="Polska"
            disabled
            readOnly
            className="bg-[#0f2433]/50 border-white/20 text-white cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
};
