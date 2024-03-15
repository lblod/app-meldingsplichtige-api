export default [
  {
    match: {
      subject: { }
    },
    callback: {
      url: "http://resource/.mu/delta",
      method: "POST"
    },
    options: {
      resourceFormat: "v0.0.1",
      gracePeriod: 250,
      ignoreFromSelf: true
    }
  },
  {
    match: {
      predicate: {
        type: 'uri',
        value: 'http://www.w3.org/ns/adms#status'
      },
      object: {
        type: 'uri',
        value: 'http://lblod.data.gift/file-download-statuses/ready-to-be-cached'
      }
    },
    callback: {
      url: 'http://download-url/process-remote-data-objects',
      method: 'POST'
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 0,
      ignoreFromSelf: true
    }
  },
  {
    match: {
      predicate: {
        type: 'uri',
        value: 'http://www.w3.org/ns/adms#status'
      },
      object: {
        type: 'uri',
        value: 'http://lblod.data.gift/file-download-statuses/ongoing'
      }
    },
    callback: {
      url: 'http://automatic-submission/download-status-update',
      method: 'POST'
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 0,
      ignoreFromSelf: true
    }
  },
  {
    match: {
      predicate: {
        type: 'uri',
        value: 'http://www.w3.org/ns/adms#status'
      },
      object: {
        type: 'uri',
        value: 'http://lblod.data.gift/file-download-statuses/success'
      }
    },
    callback: {
      url: 'http://automatic-submission/download-status-update',
      method: 'POST'
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 0,
      ignoreFromSelf: true
    }
  },
  {
    match: {
      predicate: {
        type: 'uri',
        value: 'http://www.w3.org/ns/adms#status'
      },
      object: {
        type: 'uri',
        value: 'http://lblod.data.gift/file-download-statuses/failure'
      }
    },
    callback: {
      url: 'http://automatic-submission/download-status-update',
      method: 'POST'
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 0,
      ignoreFromSelf: true
    }
  },
  {
    match: {
      predicate: {
        type: 'uri',
        value: 'http://www.w3.org/ns/adms#status'
      }
    },
    callback: {
      method: 'POST',
      url: 'http://job-controller/delta'
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 1000,
      ignoreFromSelf: true
    }
  },
  {
    match: {
      predicate: {
        type: 'uri',
        value: 'http://redpencil.data.gift/vocabularies/tasks/operation'
      },
      object: {
        type: 'uri',
        value: 'http://lblod.data.gift/id/jobs/concept/TaskOperation/import'
      }
    },
    callback: {
      url: 'http://import-submission/delta',
      method: 'POST'
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 1000,
      ignoreFromSelf: true
    }
  },
  {
    match: {
      predicate: {
        type: 'uri',
        value: 'http://redpencil.data.gift/vocabularies/tasks/operation'
      },
      object: {
        type: 'uri',
        value: 'http://lblod.data.gift/id/jobs/concept/TaskOperation/enrich'
      }
    },
    callback: {
      url: 'http://enrich-submission/delta',
      method: 'POST'
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 1000,
      ignoreFromSelf: true
    }
  },
  {
    match: {
      predicate: {
        type: 'uri',
        value: 'http://redpencil.data.gift/vocabularies/tasks/operation'
      },
      object: {
        type: 'uri',
        value: 'http://lblod.data.gift/id/jobs/concept/TaskOperation/validate'
      }
    },
    callback: {
      url: 'http://validate-submission/delta',
      method: 'POST'
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 1000,
      ignoreFromSelf: true
    }
  },
  {
    match: {
      predicate: {
        type: 'uri',
        value: 'http://redpencil.data.gift/vocabularies/tasks/operation'
      },
      object: {
        type: 'uri',
        value: 'http://lblod.data.gift/id/jobs/concept/TaskOperation/form-data-generate'
      }
    },
    callback: {
      url: 'http://toezicht-flattened-form-data-generator/automatic/delta',
      method: 'POST'
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 1000,
      ignoreFromSelf: true
    }
  },
  {
    match: {
      predicate: {
        type: 'uri',
        value: 'http://www.w3.org/ns/adms#status'
      },
      object: {
        type: 'uri',
        value: 'http://lblod.data.gift/concepts/9bd8d86d-bb10-4456-a84e-91e9507c374c'
      }
    },
    callback: {
      url: 'http://toezicht-flattened-form-data-generator/manual/delta',
      method: 'POST'
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 1000,
      ignoreFromSelf: true
    }
  },
  {
    match: {},
    callback: {
      url: 'http://vendor-data-distribution/delta',
      method: 'POST'
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 1000,
      ignoreFromSelf: true
    }
  },
];
