/** Configuration the pages share, in the shape a maker would type into a manifest property. */

/** Pin rules, in the shape the legacy MapPicker's `pinIcons` used: an appearance plus what a record matches. */
export const PIN_RULES = JSON.stringify([
    { attributeName: 'category', value: 'depot', color: '#c50f1f', title: 'Distribution depot' },
    { attributeName: 'category', value: 'service', color: '#107c10', title: 'Service point' },
    { color: '#0f6cbd' }
])

/** An Adaptive Card template bound to a site record. */
export const ADAPTIVE_CARD_TEMPLATE = JSON.stringify({
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.5',
    body: [
        { type: 'TextBlock', text: '${$root.name}', weight: 'Bolder', size: 'Medium', wrap: true },
        { type: 'TextBlock', text: '${$root.address}', isSubtle: true, wrap: true, spacing: 'None' },
        {
            type: 'FactSet',
            facts: [
                { title: 'Category', value: '${$root.category}' },
                { title: 'Capacity', value: '${$root.capacity_label}' },
                { title: 'Opened', value: '${$root.openedOn}' }
            ]
        }
    ],
    actions: [{
        type: 'Action.Submit',
        title: 'Plan a visit',
        data: { webResourceName: 'ntg_map.js', functionName: 'TALXIS.Map.planVisit' }
    }]
})

/** Legend markup. The script and the image handler at the end are there to be removed, not rendered. */
export const LEGEND_HTML = `
<h4 style="margin:4px 0">Site types</h4>
<ul style="list-style:none;padding:0;margin:0">
  <li style="display:flex;align-items:center;gap:8px;padding:1px 0">
    <svg width="12" height="12"><circle cx="6" cy="6" r="6" fill="#c50f1f"></circle></svg> Distribution depot
  </li>
  <li style="display:flex;align-items:center;gap:8px;padding:1px 0">
    <svg width="12" height="12"><circle cx="6" cy="6" r="6" fill="#0f6cbd"></circle></svg> Store
  </li>
  <li style="display:flex;align-items:center;gap:8px;padding:1px 0">
    <svg width="12" height="12"><circle cx="6" cy="6" r="6" fill="#107c10"></circle></svg> Service point
  </li>
</ul>
<p style="margin:6px 0 0">Lines are delivery runs.</p>
`

/** The attributes a created or moved pin writes its resolved address back to. */
export const ADDRESS_BINDINGS = {
    FullAddressAttributeName: { raw: 'address' },
    CountryAttributeName: { raw: 'country' },
    AdministrativeAreaAttributeName: { raw: 'region' },
    LocalityAttributeName: { raw: 'city' },
    SublocalityAttributeName: { raw: 'district' },
    StreetAttributeName: { raw: 'street' },
    StreetNameAttributeName: { raw: 'streetLine' },
    StreetNumberAttributeName: { raw: 'streetNumber' },
    PostalCodeAttributeName: { raw: 'postalCode' }
}
