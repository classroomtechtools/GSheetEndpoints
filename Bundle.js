const Import = Object.create(null);
(function (exports) {

const API = Symbol('discovery_api');
const RESOURCE = Symbol('resource');
const MAP = Symbol('map');

class APIBase {
  constructor (id, service) {
    this.id = id;
    this.service = service;
    this.name = 'sheets';
    this.version = 'v4';
    this[MAP] = new Map();
  }

  get [RESOURCE] () {
    throw new Error("Not implemented: [RESOURCE]");
  }

  [API] (method) {
    const cacheKey = `${this.name}${this.version}${method}`;
    if (this[MAP].has(cacheKey)) return this[MAP].get(cacheKey);
    const ret = Endpoints.createGoogEndpointWithOauth(this.name, this.version, this[RESOURCE], method, this.service);
    this[MAP].set(cacheKey, ret);
    return ret;
  }
}
  
class DeveloperMetadata extends APIBase {
  
  get [RESOURCE] () {
    return 'spreadsheets.developerMetadata';
  }

  get (id) {
    return this[API]('get').createRequest('get', {spreadsheetId: this.id, metadataId: id});
  }

  search () {
    const method = this[API]('search');
    
    const mixin = {
      add: function (prop) {
        this.payload.dataFilters.push( {developerMetadataLookup:prop} );
        return this;
      },
      
      byKey: function (key) {
        return this.add({metadataKey: key});
      },
      
      byId: function (id) {
        return this.add({metadataId: id});
      },
      
      byValue: function (value) {
        return this.add({metadataValue: value});
      },
      
      byKeyValue: function (key, value) {
        this.add({
          metadataValue: value,
          metadataKey: key
        });
      },
      
      byLocation: function () {
        return {
          sheetId: function (id) {
            return this.add({
              metadataLocation: {
                sheetId: id
              }
            });
          }.bind(this),
        };
      }
    };
    
    return method.createRequest('post', {spreadsheetId: this.id}, {
      payload: {
        dataFilters: []
      },
    }, mixin);
  }
}

class Spreadsheets extends APIBase {
  get [RESOURCE] () {
    return 'spreadsheets';
  }
  
  get () {
    return this[API]('get').createRequest('get', {spreadsheetId: this.id});
  }
      
  batchUpdate ({includeSpreadsheetInResponse=true, responseRanges=[], responseIncludeGridData=true}={}) {
    // create mixin which populates requests
    const method = this[API]('batchUpdate');
    
    const mixin = {
      createProperty: function (property, value={}) {
        const prop = {};
        prop[property] = {...{}, ...value};  // create copies
        return prop;
      },
      
      addRequest: function (requestProperty) {
        this.payload.requests.push(requestProperty);
      },
      
      // pass fields=null to override
      // FIXME: fields doesn't work in this manner
      add: function (property, value, fields='*') {
        const prop = this.createProperty(property, value);
        if (fields) prop[property]['fields'] = fields;
        this.addRequest(prop);
      },

      createMetaData: function ({metadataId=null, metadataKey=null, metadataValue=null}={}, {location=null, visibility=null}={}) {
        if (!metadataKey || !location) throw new Error("At least must have key and location");
        this.add('createDeveloperMetadata', {
          developerMetadata: {
            metadataId, metadataKey, metadataValue, location, visibility
          }
        }, null);
      },
    };

    return method.createRequest('post', {spreadsheetId: this.id}, {
      payload: {
        requests: [],
        includeSpreadsheetInResponse,
        responseRanges,
        responseIncludeGridData,
      },
    }, mixin);      
  }
  
  getByDataFilter () {  
    const method = this[API]('getByDataFilter');
    
    function argsToArgument_(key, args) {
      return args.map(function (item) {
        const obj = {};
        obj[key] = item;
        return obj;
      });
    }
    
    const mixin = {
      addA1Notations: function (...ranges) {
        if (!this.payload.dataFilters) this.payload.dataFilters = [];          
        this.payload.dataFilters.push( argsToArgument_('a1Range', ranges) );
      },
    };

    return method.createRequest('post', {spreadsheetId: this.id}, {
      payload: {
        includeGridData: true   // ignored if fields are passed as params, so leave this on
      },
    }, mixin);
  }
}

class Values extends APIBase {
  get [RESOURCE] () {
    return 'spreadsheets.values';
  }
  
  get (a1Range) {
    return this[API]('get').createRequest('get', {spreadsheetId: this.id, range: a1Range});
  }
  
  update (range, values=[], {valueInputOption="RAW", majorDimension="ROWS"}={}) {
    return this[API]('update').createRequest('put', {spreadsheetId: this.id, range}, {
      params: {
        valueInputOption
      },
      payload: {
        values,
        majorDimension
      }
    });
  }
  
  append ({range=A_.req, values=A_.req, majorDimension="ROWS", valueInputOption="RAW"}={}) {
    return this[API]('append').createRequest('post', {
      spreadsheetId: this.id,
      range
    }, {
      params: {valueInputOption},
      payload: {
        range,
        majorDimension,
        values: [values],
      }
    });
  }
  
  batchUpdateByDataFilter ({valueInputOption="RAW", includeValuesInResponse=true, responseValueRenderOption="UNFORMATTED_VALUE", responseDateTimeRenderOption="SERIAL_NUMBER"}={}) {

    const mixin = {
      addMetadata: function (md, {majorDimension="ROWS", values=[]}={}) {
        this.payload.data.push({
          dataFilter: {
            developerMetadataLookup: md
          },
          values,
          majorDimension
        });
      }
    }
  
    return this[API]('batchUpdateByDataFilter').createRequest('post', {spreadsheetId: this.id}, {
      payload: {
        data: [],
        valueInputOption, includeValuesInResponse, responseValueRenderOption, responseDateTimeRenderOption
      },
    }, mixin);
  }
  
  batchGetByDataFilter ({majorDimension="ROWS", valueRenderOption="UNFORMATTED_VALUE", dateTimeRenderOption="SERIAL_NUMBER"}={}) {
    const mixin = {
      metadataId: function (id) {
        this.payload.dataFilters.push({
          developerMetadataLookup: {
            metadataId: id,
          }
        });
      },
      metadataKey: function (key) {
        this.payload.dataFilters.push({
          developerMetadataLookup: {
            metadataKey: key,
          }
        });
      },
      metadataValue: function (value) {
        this.payload.dataFilters.push({
          developerMetadataLookup: {
            metadataValue: value
          }
        });
      }
    }
  
    return this[API]('batchGetByDataFilter').createRequest('post', {spreadsheetId: this.id}, {
      payload: {
        dataFilters: [],
        majorDimension, valueRenderOption, dateTimeRenderOption,
      },
    }, mixin);
  }
  
  batchGet ({range=null, ranges=[], majorDimension="ROWS", valueRenderOption="FORMATTED_VALUE", dateTimeRenderOption="SERIAL_NUMBER"}={}) {
    const mixin = {
      addRange: function (range) {
        this.check();
        this.params.ranges.push(range);
      },
      addRanges: function (...ranges) {
        this.check();
        this.params.ranges.push(...ranges);
      },
      clearRanges: function () {
        this.params.ranges = [];
      },
      check: function () {
        if (!this.params.ranges) this.clearRanges();
      }
    };
    
    // in case just one range is supplied
    if (range) ranges.push(range);
    
    return this[API]('batchGet').createRequest('get', {spreadsheetId: this.id}, {
      params: {ranges, majorDimension, valueRenderOption, dateTimeRenderOption},
    }, mixin);
  }
}

class Sheets extends APIBase {
  get [RESOURCE] () {
    return 'spreadsheets.sheets';
  }
        
  copyTo({sourceSheet=null, destinationSpreadsheetId=null}={}) {
    if (sourceSheet == null || destinationSpreadsheetId == null) throw new Error("copyTo requires two params");
    return this[API]('copyTo').createRequest('post', {
      spreadsheetId: this.id,
      sheetId: sourceSheet
    }, {
      payload: {destinationSpreadsheetId}
    });
  }
}

class GSheetEndpoints {

  constructor (id=null, service=null) {
    this.id = id;
    if (service) this.service = service;
    else this.service = "me";  // me is the default ScriptApp.getOAuthToken() 
  }
  
  get spreadsheets () {
    return new Spreadsheets(this.id, this.service);
  }
  
  get values () {
    return new Values(this.id, this.service);
  }
  
  get sheets () {
    return new Sheets(this.id, this.service);
  }
  
  get developerMetadata () {
    return new DeveloperMetadata(this.id, this.service);
  }

  static fromId (id) {
    return new GSheetEndpoints(id);
  }
  
  static fromAttached () {
    const id = (0, eval)("Spreadsheet" + "App").getActiveSpreadsheet().getId();
    return GSheetEndpoints.fromId(id);
  }
  
  static blank () {
    return new GSheetEndpoints();
  }

  static create ({properties={}, ...kwargs}={}) {
    if (Object.keys(kwargs).length > 0) throw new Error("GSheetEndpoints#create does not take keys: " + Object.keys().join(", "));
    
    // Instantiate a blank object, fill in the ID
    const sheets = GSheetEndpoints.blank();
    const request = sheets.spreadsheets[API]('create').createRequest('post', {}, {
      payload: {properties},
      params: {
        fields: 'spreadsheetId'
      }
    });
    sheets.id = request.fetch().json.spreadsheetId;
    return sheets;
  }

  static fromKeys (id) {
    const service = this.getService();
    return this.withService(id, service);
  }
  
  static getService () {
    return Requests.oauthService({service: 'MySheetsService', config: MyConfig});
  }
  
  static withService (id, service) {
    return new GSheetEndpoints(id, service);
  }

}

exports.GSheetEndpoints = GSheetEndpoints;

})(Import);
