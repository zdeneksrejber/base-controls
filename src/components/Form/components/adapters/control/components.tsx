import { IControlProps } from "./Control";
import { ControlRenderer } from "./control-renderer";
import { ReadOnlyControlRenderer } from "./read-only-control-renderer";

export interface IControlComponents {
    onRenderControl: (props: IControlProps) => React.ReactNode;
}

export const ControlComponents: IControlComponents = {
    onRenderControl: (props: IControlProps) => props.readOnly
        ? <ReadOnlyControlRenderer {...props} />
        : <ControlRenderer {...props} />
}
