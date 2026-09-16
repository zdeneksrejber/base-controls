import { IAddress } from '@talxis/client-libraries';

/** The text components of an `IAddress` - the ones an attribute can hold. */
export type IMapAddressComponent = {
    [K in keyof IAddress]-?: NonNullable<IAddress[K]> extends string | number ? K : never;
}[keyof IAddress];

/**
 * The `AddressAttributeNames` parameter, parsed: for each `IAddress` component, the attribute path it is
 * written to when a pin is moved or created. A component with no entry is not written.
 */
export type IMapAddressAttributeNames = Partial<Record<IMapAddressComponent, string>>;

/** Reads the address mapping out of the JSON a maker typed into the manifest. Malformed JSON is reported and writes nothing. */
export const parseMapAddressAttributeNames = (json: string | null | undefined): IMapAddressAttributeNames => {
    if (!json?.trim()) {
        return {};
    }
    try {
        const parsed = JSON.parse(json);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
        console.warn('Map: AddressAttributeNames is not valid JSON, so no address component is written back:', error);
        return {};
    }
};

/** Values to write onto a record, keyed by the attribute they belong to. */
export interface IMapAddressValues {
    [attribute: string]: string | number | null;
}

/**
 * Works out what to write onto a record for a resolved address. A component the service could not resolve
 * is written as `null` rather than skipped, so moving a pin from a street address to the middle of a field
 * clears the street instead of leaving the old one behind.
 */
export const getAddressValues = (address: IAddress, attributeNames: IMapAddressAttributeNames): IMapAddressValues => {
    const values: IMapAddressValues = {};
    for (const [component, attribute] of Object.entries(attributeNames) as [IMapAddressComponent, string][]) {
        if (attribute) {
            values[attribute] = address[component] ?? null;
        }
    }
    return values;
};

/** Whether any address attribute is configured at all, which is what decides if a moved pin needs a lookup. */
export const hasAddressAttributes = (attributeNames: IMapAddressAttributeNames): boolean =>
    Object.values(attributeNames).some((attribute) => !!attribute);
