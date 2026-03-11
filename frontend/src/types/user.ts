export interface User {
  id?: string | number;
  username?: string;
  email?: string;
  city?: string;
  yoga_style?: string;
  [key: string]: unknown;
}