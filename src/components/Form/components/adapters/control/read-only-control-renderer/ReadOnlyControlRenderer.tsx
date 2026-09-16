import { useMemo } from "react";
import { Link, Text, useTheme } from "@fluentui/react";
import { DataTypes } from "@talxis/client-libraries";
import { useField } from "@components/Form/hooks";
import { IControlProps } from "../Control";
import { getReadOnlyControlRendererStyles } from "./styles";

/** What an empty field reads as, the same as a locked field on a model-driven form. */
export const READ_ONLY_EMPTY_VALUE = "---";

/**
 * Reads the field as text, the way its data type is shown rather than edited.
 *
 * Every type goes through the record's formatted value, so option sets, dates, numbers and lookups read
 * the same as they do in a grid. A lookup with no formatted value falls back to the names its value holds.
 */
const getDisplayValue = (formattedValue: string | null, rawValue: any): string => {
    if (formattedValue) {
        return formattedValue;
    }
    if (Array.isArray(rawValue)) {
        const names = rawValue
            .map((item) => (item && typeof item === "object" ? item.name : item))
            .filter((name) => name !== null && name !== undefined && name !== "");
        return names.length ? names.join(", ") : READ_ONLY_EMPTY_VALUE;
    }
    if (rawValue === null || rawValue === undefined || rawValue === "") {
        return READ_ONLY_EMPTY_VALUE;
    }
    return `${rawValue}`;
};

/** The link a phone, email or url field opens, or nothing for a type that is plain text. */
const getHref = (dataType: string, value: string): string | undefined => {
    switch (dataType) {
        case DataTypes.SingleLinePhone:
            return `tel:${value}`;
        case DataTypes.SingleLineEmail:
            return `mailto:${value}`;
        case DataTypes.SingleLineUrl:
            return value;
    }
    return undefined;
};

/**
 * Shows a bound field as text instead of an editor - what `Form.Control readOnly` renders.
 *
 * A form that only displays a record has no use for a bordered input it cannot type into; this reads the
 * field's formatted value and lets phone, email and url values be followed.
 */
export const ReadOnlyControlRenderer = (props: IControlProps) => {
    //bound only - Form.Control guards against an unbound field before rendering this
    const field = useField()!;
    const theme = useTheme();
    const column = field.getColumn();
    const styles = useMemo(() => getReadOnlyControlRendererStyles(theme), [theme]);

    const value = getDisplayValue(field.getFormattedValue(), field.getValue());
    const isEmpty = value === READ_ONLY_EMPTY_VALUE;
    const href = isEmpty ? undefined : getHref(column.dataType, value);
    const isMultiline = column.dataType === DataTypes.Multiple || column.dataType === DataTypes.SingleLineTextArea;
    const className = [styles.value, isMultiline ? styles.multiline : undefined, isEmpty ? styles.empty : undefined]
        .filter(Boolean)
        .join(" ");

    if (href) {
        return <Link
            id={props.id}
            className={className}
            href={href}
            target={column.dataType === DataTypes.SingleLineUrl ? "_blank" : undefined}
            rel={column.dataType === DataTypes.SingleLineUrl ? "noopener noreferrer" : undefined}
            data-field-name={column.name}>
            {value}
        </Link>;
    }
    return <Text id={props.id} className={className} title={value} data-field-name={column.name}>{value}</Text>;
};
