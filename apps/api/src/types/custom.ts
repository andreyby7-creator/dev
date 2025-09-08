// Ручные типы для insert операций (когда Supabase не может сгенерировать)
export type CreateUserArgs = {
  user_email: string;
  user_password: string;
  user_first_name: string;
  user_last_name: string;
  user_role: string;
};
