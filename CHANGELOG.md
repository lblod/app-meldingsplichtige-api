# Changelog

## unreleased

- Update form of LEKP - Fietspaden [DL-6612]

### Deploy Notes

**For updating the forms**

```
drc restart migrations && drc logs -ft --tail=200 migrations
drc up -d enrich-submission
```

## v1.44.1 (2025-05-28)

### General

- Fix municipalities not able to reference worship service document when the CKB is inactive [DL-6614]

### Deploy instructions

```
drc up -d worship-decisions-cross-reference
```

## 1.44.0 (2025-05-07)

- Add new form 'melding interne beslissing tot samenvoeging' [DL-6361]

### Deploy Notes

**For updating the forms**

```
drc restart migrations && drc logs -ft --tail=200 migrations
drc up -d enrich-submission
```

## 1.43.0 (2025-04-24)

- Update multiple forms. [DL-6602] [DL-6486] [DL-6487] [DL-6488]

### Deploy Notes

**For updating the forms**

```
drc restart migrations && drc logs -ft --tail=200 migrations
drc up -d enrich-submission
```

## 1.42.3 (2025-04-16)

- Change `mu-auth` to `mu-authorization:feature-service-roam-r1.1` feature branch.

### Deploy Notes

```
drc up -d database && drc logs -ft --tail=200 database
```

## 1.42.2 (2025-04-15)

- Bump VDDS (vendor-data-distribution-service) for more async processing and
  reduced load on database/Virtuoso. [DL-6595]

### Deploy Instructions

**Bump of the VDDS and to run healing**

Set the VDDS healing operations directly onto Virtuoso. See the environment
variable config here:
https://github.com/lblod/vendor-data-distribution-service?tab=readme-ov-file#environment-variables,
and run the new deploy and (full) healing commands. This healing can take a
while; perhaps something for after work hours?

```
docker compose up -d vendor-data-distribution
docker compose exec vendor-data-distribution curl -X POST http://localhost/healing
```

## 1.42.1 (2025-04-04)
- Bump `virtuoso` memory to 4GB.
### Deploy Notes
```
drc restart virtuoso && drc logs -ft --tail=200 virtuoso
```
## 1.42.0 (2025-03-23)
- Bump `virtuoso` to `v1.3.0-rc.1`.
### Deploy Notes
Follow the steps listed here: [https://github.com/Riadabd/upgrade-virtuoso](https://github.com/Riadabd/upgrade-virtuoso).
## 1.41.6 (2025-03-18)
- Bump some services.
### Deploy Notes
```
drc up -d identifier dispatcher database migrations resource
```
## 1.41.5 (2025-03-14)
- Opt out of `vendor-data-distribution` deltas for `toezicht-flattened-form-data-generator`. [DL-6484]
### Deploy Notes
```
drc restart deltanotifier
```
## 1.41.4 (2025-03-12)
- Change `deltanotifier` image to `image: cecemel/delta-notifier:0.2.0-beta.6`. [DL-6484]
  - This allows us to use `optOutMuScopeIds` for `resources` and opt out of receiving VDDS deltas.
### Deploy Notes
```
drc up -d deltanotifier
```
```
drc restart deltanotifier
```
## 1.41.3 (2025-02-27)
- Update semantic forms with `Opdrachthoudende vereniging met private deelname` classification. [DL-6447]
### Deploy Notes
#### Update Semantic Forms
```
drc restart migrations && drc logs -ft --tail=200 migrations
```
```
drc restart resource cache
```
```
drc up -d enrich-submission
```
## 1.41.2 (2025-01-22)
- Add Jaarrekening PEVA form [DL-6284]
## 1.41.1 (2025-01-22)
### General
- Fix configuration in subjectsAndPaths.js

### Deploy notes
#### docker commands
```
drc restart vendor-data-distribution
```

## 1.41.0 (2025-01-21)

### General
- Add submissions cross referencing components and service

### Deploy notes
#### docker-compose.override.yml
##### worship-decisions-cross-reference

Ensure the environment variables are correctly set for `worship-decisions-cross-reference`, e.g. :

```
worship-decisions-cross-reference:
  environment:
    WORSHIP_DECISIONS_BASE_URL: "https://databankerediensten.lokaalbestuur.vlaanderen.be/search/submissions/"
```
The following links;
- DEV: "https://dev.databankerediensten.lokaalbestuur.lblod.info/search/submissions/"
- QA: "https://databankerediensten.lokaalbestuur.lblod.info/search/submissions/"
- PROD: "https://databankerediensten.lokaalbestuur.vlaanderen.be/search/submissions/"

docker commands

```
drc restart migrations
drc up -d worship-decisions-cross-reference frontend
```
## 1.40.4 (2024-12-13)
- New semantic form `Kerkenbeleidsplan`
- New semantic forms for cross referencing
## 1.40.3 (2024-11-13
- update forms [DL-5977] -> "Toezicht: make form "Besluit APB over retributies" available for AGB"
## 1.40.2 (2024-11-13)
 - bugfix: forgot to add form
## 1.40.1 (2024-11-13)
### Toezicht
 - Update URI form "Aangewezen Burgemeester" [DL-6298]

### Deploy notes
```
drc restart migrations; drc up -d enrich-submission
```

## 1.40.0 (2024-10-09)

- New `enrich-submission-service` v1.12.1
- New semantic form file (DL-5930)

## 1.39.1 (2024-05-29)
  - Fix custom info label field in forms LEKP-rapport - Melding correctie authentieke bron and LEKP-rapport - Toelichting Lokaal Bestuur (DL-5934)
### Deploy Notes
  - `drc up -d enrich-submission; drc restart migrations resource cache`
## 1.39.0 (2024-05-16)

### General
- Update forms
  - Adjust LEKP rapport Klimaattafels (DL-5832)
  - Add new LEKP rapport Wijkverbeteringscontract (DL-5829)

### Deploy Notes
- `drc up -d enrich-submission; drc restart migrations resource cache`
## 1.38.0 (2024-03-14)
- Update forms
  - Adding new form Aanduiding en eedaflegging van de aangewezen burgemeester (DL-5669)
  - Adding new form Strandconcessies - reddingsdiensten kustgemeenten (DL-5625)
  - Adding new form Melding onvolledigheid inzending eredienstbestuur (DL-5643)
  - Adding new form Opstart beroepsprocedure naar aanleiding van een beslissing + Codelist (DL-5646)
  - Adding informational text to forms to minimize usage of the wrong forms (DL-5665)
  - Adding new form Afschrift erkenningszoekende besturen + Codelist (DL-5670)
### Deploy instructions
- drc up -d enrich-submission; drc restart migrations resource cache
## 1.37.0 (2024-01-12)
- Update forms
    - New forms LEKP Collectieve Energiebesparende Renovatie, Fietspaden, Sloopbeleidsplan
    - New forms Niet-bindend advies op statuten and Niet-bindend advies op oprichting
    - Change form LEKP Melding correctie authentieke bron, removed field "type correctie"
### Deploy instructions
- drc up -d enrich-submission; drc restart migrations resource cache
## 1.36.0 (2023-11-27)
- Adding missing data for besluitTypes and BesluitDocumentTypes
- Adjusting label for "Budgetten(wijzigingen) van besturen van de eredienst"
### deploy instructions
- drc restart migrations resource cache
## 1.35.0 (2023-11-15)
- update forms
### deploy instructions
- drc up -d enrich-submission; drc restart migrations resource cache
## 1.34.0 (2023-10-17)
- bump mu-identifier
- update forms
### deploy instructions
- drc up -d; drc restart migrations
## 1.33.0 (2023-09-18)
- release some upgraded versions of services
## 1.29.0 (2023-06-30)
- update forms
## 1.28.0 (2023-05-18)
- fix vendor api + migration to correct issues
- import submission bump
### deploy instructions
```
drc up -d; drc restart migrations
```
## 1.27.0 (2023-04-24)
- update forms
## 1.26.3 (2023-04-08)
  - Bump automatic-submission
  - Adjusted schorsing beslissing eredienstbesturen form for deputatie
## 1.26.2 (2023-02-22)
  - Bump automatic-submission, which should have been
    included in 1.26.0
## 1.26.1 (2023-02-20)
 - Bump the same services as previous release to solve a common issue with
   failing builds because of an incompatibility with the `env-var` library and
   an old JavaScript template.
# 1.26.0 (2023-02-14)
 - Multiple service update related to automatic-submission
   for correct exposure of data
## 1.25.0 (2023-02-08)
 - update forms
## 1.24.1 (2023-01-25)
 - update access vendor RO
## 1.24.0 (2023-01-25)
- syncing forms and data to be in sync with loket (prepare erediensten)
## 1.23.1 (2023-01-11)
- bugfix on remove submissions since introduction of vendor-api
- cleanup dangling submissions
## 1.23.0 (2022-12-12)
- converted automatic submission model to cogs:Job
- experimental support vendor sparql endpoint
## 1.22.0 (2022-11-08)
- added erediensten data
## 1.21.0 (2022-11-08)
- added new forms
## 1.20.0 (2022-10-20)
- added new forms
## 1.19.0 (2022-10-03)
- Move pipeline to cogs:Job model
- added dashboard. (Mainly for testing purposes in this app)
