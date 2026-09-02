import { FontIcon, Spinner, SpinnerSize } from '@fluentui/react';
import { useMemo } from 'react';
import { ITheme } from '@legacy';
import { getMapStatusStyles } from './styles';

export interface IMapStatusProps {
    /** What the control is doing, or warning about. Nothing renders while this is empty. */
    message?: string;
    /** Whether the message is progress on something still running, rather than a finished state. */
    isBusy?: boolean;
    /** Whether the message is a warning, such as a load that stopped at its cap. */
    isWarning?: boolean;
    theme: ITheme;
}

/**
 * A small pill reporting what the control is doing - loading every page, resolving addresses, or that a
 * load stopped short.
 *
 * @param props Message to show, whether it is progress or a warning, and the host theme.
 * @returns The pill, or nothing when there is no message.
 */
export const MapStatus = (props: IMapStatusProps) => {
    const styles = useMemo(() => getMapStatusStyles(props.theme), [props.theme]);

    if (!props.message) {
        return null;
    }

    return (
        <div className={styles.root}>
            {props.isBusy && <Spinner size={SpinnerSize.xSmall} />}
            {props.isWarning && !props.isBusy && <FontIcon iconName='Warning' className={styles.warningIcon} />}
            <span>{props.message}</span>
        </div>
    );
};
