import { DefaultButton } from '@fluentui/react';
import { Fragment, ReactNode, useMemo } from 'react';
import { IRecord } from '@talxis/client-libraries';
import { ITheme } from '@legacy';
import { IMapClusterInfo } from '../internal/clustering';
import { IMapLabels } from '../translations';
import { getMapClusterCardStyles } from './styles';

export interface IMapClusterCardProps {
    cluster: IMapClusterInfo;
    /** The member records the control could resolve, in dataset order. */
    records: IRecord[];
    labels: IMapLabels;
    theme: ITheme;
    /** Renders one member's card, using whichever renderer that record's rules chose. */
    onRenderRecordCard: (record: IRecord) => ReactNode;
    /** Zooms the map to where the group comes apart. */
    onZoomIn: () => void;
}

/**
 * The card a grouped pin opens: the number of records behind it, and each of their cards.
 *
 * A group can stand for thousands of records, so only the ones the clusterer listed are shown and the rest
 * are counted - zooming in is how you reach them.
 */
export const MapClusterCard = (props: IMapClusterCardProps) => {
    const styles = useMemo(() => getMapClusterCardStyles(props.theme), [props.theme]);
    const notShown = props.cluster.count - props.records.length;

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <span className={styles.title}>{props.labels.cardGroup({ count: `${props.cluster.count}` })}</span>
                <DefaultButton text={props.labels.cardZoomIn()} onClick={props.onZoomIn} />
            </div>
            <div className={styles.list}>
                {props.records.map((record) => (
                    <div key={record.getRecordId()} className={styles.member}>
                        {props.onRenderRecordCard(record)}
                    </div>
                ))}
            </div>
            {notShown > 0 && <span className={styles.more}>{props.labels.cardGroupMore({ count: `${notShown}` })}</span>}
        </div>
    );
};
