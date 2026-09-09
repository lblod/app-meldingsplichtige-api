# Meldingsplichtige API test stack

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

## Sanity test the automatic submission flow

A `mu script` is available to test the automatic submission flow end to
end: it publishes a besluitenlijst for a gemeente of choice, posts it, and follows
the job to completion.

```sh
mu script project-scripts test-automatic-submission
```

The script walks you through the run: it lists all vendors (the vendor
key/password is asked later), then all bestuurseenheden the vendor can act
on behalf of - only gemeenten, because only those are guaranteed to have a
Gemeenteraad - and you pick both from a list. Then it asks for the vendor
key and a status (1=Concept, 2=Inzendbaar); all other besluitenlijst fields
use defaults. The Gemeenteraad of the chosen gemeente is resolved from the
triplestore (latest mandate period); pass its bestuursorgaan (in tijd) URI
as a fourth argument when that cannot resolve on its own.

Everything can also be passed as arguments to skip the prompts:

```sh
mu script project-scripts test-automatic-submission vendor-uri vendor-key bestuurseenheid-uri bestuursorgaan-uri
```

Prerequisites: the stack is up, and the vendor is allowed to act on behalf
of the chosen bestuurseenheid (see the migration
`20260908153000-allow-all-vendors-on-all-bestuurseenheden`).

## Sanity test the vendor SPARQL API

An extended version of the script also verifies what a vendor can see of the
submission: it logs in on `/vendor/login`, polls `/vendor/sparql` until the
submission reaches its final status (Verstuurd, or Concept with form data), and
logs out. It does not force the vendor-data-distribution batch; it waits for
the normal batch flow to pick up the submission. Poll duration accounts for the
`PROCESSING_INTERVAL` configured on vendor-data-distribution in the compose
files.

```sh
mu script project-scripts test-automatic-submission-vendor
```

Same prompts and arguments as `test-automatic-submission`.

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
