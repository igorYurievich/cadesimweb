import es from './es';
import en from './en';
import it from './it';
import ru from './ru';

export const INTERFACE_TEXT = { es, en, it, ru } as const;
export type InterfaceText = typeof INTERFACE_TEXT.ru;
