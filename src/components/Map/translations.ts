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
    pinsTruncated: {
        1033: "Showing the first {{count}} pins of this view.",
        1029: "Zobrazeno prvních {{count}} bodů tohoto pohledu."
    }
};

export type IMapTranslations = Partial<ITranslations<typeof mapTranslations>>;

/** Labels resolved for the current language, handed to providers so their chrome can be localized too. */
export type IMapLabels = Required<ITranslation<IMapTranslations>>;
