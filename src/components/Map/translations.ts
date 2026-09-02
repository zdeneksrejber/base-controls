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
        1033: "Resolving {{count}} addresses...",
        1029: "Vyhledávání {{count}} adres..."
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
    pinsTruncated: {
        1033: "Showing the first {{count}} pins of this view.",
        1029: "Zobrazeno prvních {{count}} bodů tohoto pohledu."
    }
};

export type IMapTranslations = Partial<ITranslations<typeof mapTranslations>>;

/** Labels resolved for the current language, handed to providers so their chrome can be localized too. */
export type IMapLabels = Required<ITranslation<IMapTranslations>>;
