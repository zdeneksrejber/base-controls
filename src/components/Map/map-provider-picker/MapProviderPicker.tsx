import { Dropdown, IDropdownOption, ThemeProvider } from "@fluentui/react";
import { useMemo } from "react";
import { ITheme } from "@legacy";
import { IMapProviderOption } from "../providers/IMapProvider";
import { getMapProviderPickerStyles } from "./styles";

export interface IMapProviderPickerProps {
    /** Providers to choose from, in the order the host listed them. */
    options: IMapProviderOption[];
    /** Id of the provider currently drawing the map. */
    selectedId?: string;
    /** Label of the picker, resolved for the current language. */
    label: string;
    /** Theme of the host control. Scoped to the picker - the map is themed by its provider. */
    theme: ITheme;
    /** Called with the id of the provider the user picked. */
    onChange: (id: string) => void;
}

/**
 * Chrome the Map control renders over the map when there is more than one provider. Deliberately not part
 * of the provider contract - a map vendor should not have to know it can be swapped.
 */
export const MapProviderPicker = (props: IMapProviderPickerProps) => {
    const { theme } = props;
    const styles = useMemo(() => getMapProviderPickerStyles(theme), [theme]);
    const options = useMemo<IDropdownOption[]>(() => props.options.map((option) => ({
        key: option.id,
        text: option.label ?? option.id
    })), [props.options]);

    return (
        <ThemeProvider theme={theme} applyTo="none" className={styles.root}>
            <Dropdown
                ariaLabel={props.label}
                title={props.label}
                options={options}
                //null, not undefined, so the dropdown stays controlled while the selection is resolving
                selectedKey={props.selectedId ?? null}
                onChange={(_event, option) => option && props.onChange(`${option.key}`)} />
        </ThemeProvider>
    );
};
