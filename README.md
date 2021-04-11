# GSheetEndpoints

Google sheets advanced service v4 exposed via endpoints abstractions.

## Getting Started

Add as library with id `1eKqiWDenWj5yAVBd6WXJkEqFOyFDji7Iean7u4pVJWTWhKUmRIeNGsqN`

## Use

```js
function myFunction () {
  const endpoints = GSheetEndpoints.fromId(id);
  const spreadsheetResource = endpoints.spreadsheet.get();
  Logger.log(spreadsheetResource.properties.timeZone);
}
```

## TODO

Further documentation on its usage. 
