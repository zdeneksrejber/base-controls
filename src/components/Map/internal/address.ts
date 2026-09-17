import { IAddress } from '@talxis/client-libraries';

/**
 * The `AddressAttributeNames` parameter, parsed: for each `IAddress` component, the attribute path it is
 * written to when a pin is moved or created. A component with no entry is not written.
 */
export type IMapAddressAttributeNames = Partial<Record<keyof IAddress, string>>;

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
