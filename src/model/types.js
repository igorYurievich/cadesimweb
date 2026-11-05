/** Модель данных схемы. Без DOM и без зависимостей от интерфейса. */
export function createEmptySchema() {
    return {
        formatVersion: 1,
        elements: [],
        wires: [],
        sheet: {
            title: '',
            author: 'IGOR LIPSKIY',
            entity: '',
            date: '',
            fileName: '',
            number: '',
            width: 420,
            height: 297,
        },
    };
}
