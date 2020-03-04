# Meldingsplichtige API

Test stack for the automatic submission API. This stack will be integrated in [app-digitaal-loket](https://github.com/lblod/app-digitaal-loket) in the near future.

## Running the application

```
docker-compose up
```

The stack is built starting from [mu-project](https://github.com/mu-semtech/mu-project).


### Cleaning the database

  At some times you may want te clean the database and make sure it's in a pristine state.

      # Bring down our current setup
      docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
      # Keep only required database files
      rm -Rf data/db
      git checkout data/db
      # Bring the stack back up
      docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

  Make sure to wait for the migrations to run.

## Features

The stack provides an endpoint to submit publications as specified in the [Loket meldingsplicht API](https://lblod.github.io/pages-vendors/#/reporting-obligation). After submission one can verify the processing of the submission using the [verify-submission-service](https://github.com/lblod/verify-submission-service).

The test stack provides a mock vendor to submit publications with:

```
  Vendor URI: "http://example.com/vendor/d3c9e5e5-d50c-46c9-8f09-6af76712c277",
  Key: "my-super-secret-key"
```

## Technical flow

A publication is submitted on an endpoint of the [automatic-submission-service](https://github.com/lblod/automatic-submission-service). Next, the publication is downloaded by the [download-url-service](https://github.com/lblod/download-url-service). Once the download is finished, the downloaded publication is harvested and the knowledge found about the submission is inserted in the triplestore by the [import-submission-service](https://github.com/lblod/import-submission-service).

The services in the flow are reactive and wired together using the [delta-notifier](https://github.com/mu-semtech/delta-notifier). The configuration can be found in `./config/delta/rules.js`.

## Roadmap
The following services still needs to be added to the stack:
* validate-submission-service
* auto-submit-submission-service
