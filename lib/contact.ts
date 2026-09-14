const COUNTRY_CODE = "60"; // Malaysia
const NATIONAL_NUMBER = "194732003";

export const SUPPORT_PHONE_INTL = `${COUNTRY_CODE}${NATIONAL_NUMBER}`;
export const SUPPORT_PHONE_DISPLAY = `0${NATIONAL_NUMBER}`;
export const SUPPORT_PHONE_TEL = `+${SUPPORT_PHONE_INTL}`;
export const SUPPORT_EMAIL = "dsyafiq36@gmail.com";

export const whatsappUrl = (message?: string) =>
  message
    ? `https://wa.me/${SUPPORT_PHONE_INTL}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${SUPPORT_PHONE_INTL}`;
