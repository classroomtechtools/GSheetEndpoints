const {GSheetEndpoints} = Import;

function fromId(id) {
  return GSheetEndpoints.fromId(id);
}

function fromAttached() {
  return GSheetEndpoints.fromAttached();
}

function create(properties={}) {
  return GSheetEndpoints.create({properties});
}

function batch () {
  return Endpoints.batch();
}
