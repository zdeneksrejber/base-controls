import { IMapModuleLabels, IMapModuleTranslations } from '../useModuleLabels';

export const cardsLabels = {
    cardNoDetails: {
        1033: "No details to show.",
        1029: "Nejsou k dispozici žádné podrobnosti."
    },
    cardTemplateFailed: {
        1033: "This card could not be rendered.",
        1029: "Tuto kartu se nepodařilo vykreslit."
    },
    cardGroup: {
        1033: "{{count}} records here",
        1029: "Počet záznamů zde: {{count}}"
    },
    cardGroupMore: {
        1033: "and {{count}} more - zoom in to see them",
        1029: "a další ({{count}}) - přibližte pro zobrazení"
    },
    cardZoomIn: {
        1033: "Zoom in",
        1029: "Přiblížit"
    },
    cardBack: {
        1033: "Back to the list",
        1029: "Zpět na seznam"
    },
    cardDelete: {
        1033: "Delete",
        1029: "Odstranit"
    },
    cardClose: {
        1033: "Close",
        1029: "Zavřít"
    }
};

export type IMapCardsTranslations = IMapModuleTranslations<typeof cardsLabels>;
export type IMapCardsLabels = IMapModuleLabels<typeof cardsLabels>;
