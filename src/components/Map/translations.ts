import { ITranslations } from "@interfaces/context";
import { ITranslation } from "@hooks/useControlLabels";

export const mapTranslations = {
    mapProvider: {
        1033: "Map provider",
        1029: "Poskytovatel mapy"
    },
    loadingPins: {
        1033: "Loading pins... {{count}}",
        1029: "Načítání bodů... {{count}}"
    },
    geocodingAddresses: {
        1033: "Resolving addresses, one at a time... {{done}} of {{count}}",
        1029: "Vyhledávání adres, jedné po druhé... {{done}} z {{count}}"
    },
    searchPlaceholder: {
        1033: "Search {{columns}}, or an address",
        1029: "Hledat {{columns}}, nebo adresu"
    },
    searchPlaceholderNoColumns: {
        1033: "Search for an address",
        1029: "Hledat adresu"
    },
    searchRecords: {
        1033: "Search the records",
        1029: "Vyhledat v záznamech"
    },
    searchPlaces: {
        1033: "Places",
        1029: "Místa"
    },
    searchLooking: {
        1033: "Looking...",
        1029: "Vyhledávám..."
    },
    searchClear: {
        1033: "Clear the search",
        1029: "Zrušit hledání"
    },
    filters: {
        1033: "Filters",
        1029: "Filtry"
    },
    filtersActive: {
        1033: "Filters ({{count}})",
        1029: "Filtry ({{count}})"
    },
    filtersClear: {
        1033: "Clear the filters",
        1029: "Zrušit filtry"
    },
    filtersClose: {
        1033: "Close the filters",
        1029: "Zavřít filtry"
    },
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
    cardDelete: {
        1033: "Delete",
        1029: "Odstranit"
    },
    cardClose: {
        1033: "Close",
        1029: "Zavřít"
    },
    savingRecord: {
        1033: "Saving...",
        1029: "Ukládání..."
    },
    legend: {
        1033: "Legend",
        1029: "Legenda"
    },
    legendCollapse: {
        1033: "Collapse the legend",
        1029: "Sbalit legendu"
    },
    pinsTruncated: {
        1033: "Showing the first {{count}} pins of this view.",
        1029: "Zobrazeno prvních {{count}} bodů tohoto pohledu."
    },
    geocodingFailed: {
        1033: "The geo-coding service could not be reached, so {{count}} records have no pin.",
        1029: "Geokódovací službu nebylo možné kontaktovat, takže {{count}} záznamů nemá bod."
    },
    geocodingUnplaceable: {
        1033: "{{count}} addresses could not be found by the geo-coding service, so those records have no pin.",
        1029: "{{count}} adres geokódovací služba nenašla, takže tyto záznamy nemají bod."
    },
    geocodingCapped: {
        1033: "{{count}} addresses were left without a pin for now: the geo-coding service's usage policy limits how many one view may resolve.",
        1029: "{{count}} adres zatím zůstalo bez bodu: pravidla použití geokódovací služby omezují, kolik jich lze v jednom pohledu vyhledat."
    }
};

export type IMapTranslations = Partial<ITranslations<typeof mapTranslations>>;

/** Labels resolved for the current language, handed to providers so their chrome can be localized too. */
export type IMapLabels = Required<ITranslation<IMapTranslations>>;
