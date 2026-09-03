import { IAddress } from '@talxis/client-libraries';

/**
 * Attributes a resolved address is written back to.
 *
 * Every one is optional: a control configured with none still writes coordinates, and one configured with a
 * few writes only those. The names match the legacy MapPicker's bound properties, so an existing form maps
 * over without renaming anything.
 */
export interface IMapAddressAttributes {
    /** The whole address on one line. */
    fullAddress?: string;
    country?: string;
    administrativeArea?: string;
    locality?: string;
    sublocality?: string;
    /** The street on its own. */
    street?: string;
    /** The street and its number together, which is how the legacy control wrote it. */
    streetName?: string;
    streetNumber?: string;
    postalCode?: string;
}

/** Values to write onto a record, keyed by the attribute they belong to. */
export interface IMapAddressValues {
    [attribute: string]: string | number | null;
}

/**
 * Composes the street and its number the way a single line street field expects them.
 *
 * @param address Address components.
 * @returns "Václavské náměstí 846/1", or `undefined` when there is no street at all.
 */
export const getStreetLine = (address: IAddress): string | undefined => {
    const line = [address.street, address.streetNumber].filter(Boolean).join(' ').trim();
    return line || undefined;
};

/**
 * Works out what to write onto a record for a resolved address.
 *
 * A component the service could not resolve is written as `null` rather than skipped, so moving a pin from a
 * street address to the middle of a field clears the street instead of leaving the old one behind.
 *
 * @param address Address the geocoder resolved.
 * @param attributes Attributes each component is bound to.
 * @returns The values to write, keyed by attribute. Empty when no attribute is configured.
 */
export const getAddressValues = (address: IAddress, attributes: IMapAddressAttributes): IMapAddressValues => {
    const components: [keyof IMapAddressAttributes, string | undefined][] = [
        ['fullAddress', address.text],
        ['country', address.country],
        ['administrativeArea', address.administrativeArea],
        ['locality', address.locality],
        ['sublocality', address.subLocality],
        ['street', address.street],
        ['streetName', getStreetLine(address)],
        ['streetNumber', address.streetNumber],
        ['postalCode', address.postalCode]
    ];

    const values: IMapAddressValues = {};
    components.forEach(([component, value]) => {
        const attribute = attributes[component];
        if (attribute) {
            values[attribute] = value ?? null;
        }
    });
    return values;
};

/**
 * Whether any address attribute is configured at all, which is what decides if a moved pin needs a lookup.
 *
 * @param attributes Attributes each component is bound to.
 * @returns `true` when at least one component has an attribute behind it.
 */
export const hasAddressAttributes = (attributes: IMapAddressAttributes): boolean =>
    Object.values(attributes).some((attribute) => !!attribute);
