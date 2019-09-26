export default [
  {
    match: {
      subject: { }
    },
    callback: {
      url: 'http://resource/.mu/delta',
      method: 'POST'
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 250,
      ignoreFromSelf: true
    }
  },
  {
    match: {
      predicate: 'http://www.w3.org/ns/adms#status',
      object: 'http://lblod.data.gift/file-download-statuses/ready-to-be-cached'
    },
    callback: {
      url: 'http://download-url/process-remote-data-objects',
      method: 'POST'
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 1000,
      ignoreFromSelf: true
    }
  }
];
