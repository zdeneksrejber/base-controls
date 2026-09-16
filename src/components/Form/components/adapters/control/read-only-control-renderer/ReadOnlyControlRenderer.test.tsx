import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { DataTypes, IColumn } from '@talxis/client-libraries';
import { PcfContextProvider } from '@utils';
import { Form } from '../../../Form';
import { MemoryStrategy } from '../../../../strategies';
import { READ_ONLY_EMPTY_VALUE } from './ReadOnlyControlRenderer';

const COLUMNS: IColumn[] = [
    { name: 'id', displayName: 'Id', dataType: DataTypes.SingleLineText },
    { name: 'name', displayName: 'Name', dataType: DataTypes.SingleLineText },
    { name: 'phone', displayName: 'Phone', dataType: DataTypes.SingleLinePhone },
    { name: 'note', displayName: 'Note', dataType: DataTypes.Multiple },
    { name: 'statuscode', displayName: 'Status', dataType: DataTypes.OptionSet, metadata: {
        OptionSet: [{ Value: 1, Label: 'Active', Color: '' }]
    } as any }
];

const DATA = {
    id: '1',
    name: 'Contoso',
    phone: '+420 123 456 789',
    note: null,
    statuscode: 1,
    'statuscode@OData.Community.Display.V1.FormattedValue': 'Active'
};

const renderForm = () => {
    const strategy = new MemoryStrategy({
        onGetColumns: () => COLUMNS,
        onGetData: () => ({ ...DATA }),
        onGetMetadata: () => ({ PrimaryIdAttribute: 'id', PrimaryNameAttribute: 'name' })
    });
    return render(
        <PcfContextProvider>
            <Form.Root strategy={strategy}>
                <Form.Section label="Details" appearance="banded" layout={{ lg: 1 }}>
                    <Form.Field name="name"><Form.Cell><Form.Control readOnly /></Form.Cell></Form.Field>
                    <Form.Field name="phone"><Form.Cell><Form.Control readOnly /></Form.Cell></Form.Field>
                    <Form.Field name="note"><Form.Cell><Form.Control readOnly /></Form.Cell></Form.Field>
                    <Form.Field name="statuscode"><Form.Cell><Form.Control readOnly /></Form.Cell></Form.Field>
                </Form.Section>
            </Form.Root>
        </PcfContextProvider>
    );
};

describe('Form.Control readOnly', () => {
    //vitest globals are off, so testing-library cannot register its own cleanup
    afterEach(cleanup);

    it('shows the field values as text, not as editors', async () => {
        renderForm();
        await waitFor(() => expect(screen.getByText('Contoso')).toBeTruthy());
        expect(document.querySelectorAll('input, textarea')).toHaveLength(0);
    });

    it('lets a phone number be called', async () => {
        renderForm();
        const link = await screen.findByText('+420 123 456 789');
        expect(link.closest('a')?.getAttribute('href')).toBe('tel:+420 123 456 789');
    });

    it('reads an option set through its formatted value', async () => {
        renderForm();
        expect(await screen.findByText('Active')).toBeTruthy();
    });

    it('marks an empty field the way a locked form field does', async () => {
        renderForm();
        expect(await screen.findByText(READ_ONLY_EMPTY_VALUE)).toBeTruthy();
    });

    it('labels the cells from the columns and draws the section banded', async () => {
        renderForm();
        await screen.findByText('Contoso');
        //the label renders twice - once visible, once inside its tooltip host
        expect(screen.getAllByText('Phone').length).toBeGreaterThan(0);
        expect(document.querySelector('[data-appearance="banded"]')).toBeTruthy();
    });
});
