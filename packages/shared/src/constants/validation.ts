// Validation constants
export const VALIDATION_RULES = {
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_LETTER: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: false,
  },
  EMAIL: {
    MAX_LENGTH: 254,
  },
  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
  },
} as const;

export const VALIDATION_MESSAGES = {
  PASSWORD: {
    TOO_SHORT: 'Пароль должен содержать минимум 8 символов',
    REQUIRE_LETTER: 'Пароль должен содержать хотя бы одну букву',
    REQUIRE_NUMBER: 'Пароль должен содержать хотя бы одну цифру',
    REQUIRE_SPECIAL: 'Пароль должен содержать хотя бы один специальный символ',
  },
  EMAIL: {
    INVALID: 'Введите корректный email адрес',
    TOO_LONG: 'Email слишком длинный',
  },
  PHONE: {
    INVALID: 'Введите корректный номер телефона',
    TOO_SHORT: 'Номер телефона слишком короткий',
    TOO_LONG: 'Номер телефона слишком длинный',
  },
  NAME: {
    TOO_SHORT: 'Имя должно содержать минимум 2 символа',
    TOO_LONG: 'Имя слишком длинное',
  },
} as const;
