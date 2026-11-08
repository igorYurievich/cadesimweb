import es from './es';
import en from './en';
import it from './it';
import ru from './ru';
import fr from './fr';
import ar from './ar';

export const INTERFACE_TEXT = { es, en, it, ru, fr, ar } as const;
export type InterfaceText = typeof INTERFACE_TEXT.ru;
