# Meldingsplichtige API teststack

Test stack for the automatic submission API. This stack will be integrated in
[app-digitaal-loket](https://github.com/lblod/app-digitaal-loket) in the near
future. It also serves as a playground for testing out various features of the
automatic submission flow.

## Running the application

To run this stack of services run:

```sh
docker-compose -f docker-compose.yml up -d
```

If you want to run in development, you can add `-f docker-compose.dev.yml` to
the parameters of `docker-compose`. You can also add extra additions in a file
like `docker-compose.override.yml` and include it as you wish.

The stack is built starting from
[mu-project](https://github.com/mu-semtech/mu-project).

## Cleaning the database

Given that this application is for testing purposes, you might want to clean the
database regularly to start with a clean slate. You can do this as follows:

```sh
# Bring down our current setup
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
# Keep only required database files
rm -Rf data/db
git checkout data/db
# Bring the stack back up
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Make sure to include or dismiss `docker-compose.[...].yml` files as you
intended.

Also make sure to wait for any migrations to run on every clean start of the
database.

## Features

The stack provides an endpoint to submit publications as specified in the
[Meldingsplicht
API](https://lblod.github.io/pages-vendors/#/docs/submission-api). After
submission one can verify the processing of the submission using the [Vendor
SPARQL API](https://lblod.github.io/pages-vendors/#/docs/vendor-sparql-api).

The test stack provides a mock vendor to submit publications with:

```
Vendor URI: "http://example.com/vendor/d3c9e5e5-d50c-46c9-8f09-6af76712c277",
Key: "my-super-secret-key"
```

## Technical flow

A publication is submitted on an endpoint of the
[automatic-submission-service](https://github.com/lblod/automatic-submission-service).
Next, the publication is downloaded by the
[download-url-service](https://github.com/lblod/download-url-service). Once the
download is finished, the downloaded publication is harvested and the knowledge
found about the submission is inserted in the triplestore by the
[import-submission-service](https://github.com/lblod/import-submission-service).

The services in the flow are reactive and wired together using the
[delta-notifier](https://github.com/mu-semtech/delta-notifier). The
configuration can be found in `./config/delta/rules.js`.

## Roadmap

The following services still needs to be added to the stack:

* auto-submit-submission-service
